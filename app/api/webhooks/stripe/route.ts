import { serverDatabaseService } from '@/lib/db/database-service'
import { userEntitlementCache } from '@/lib/redis'
import type { UserEntitlementLevel } from '@/types'
import { type NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

/**
 * Stripe webhook handler
 * Processes Stripe events for subscription management and entitlement updates
 * @param request - Next.js request object containing Stripe webhook payload and signature
 * @returns Promise resolving to NextResponse with webhook processing result or error
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe signature' },
        { status: 400 }
      )
    }

    // Initialize Stripe with webhook secret
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
      apiVersion: '2025-09-30.clover',
    })

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured')
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      )
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Process the event
    const result = await processStripeEvent(event)

    return NextResponse.json({
      received: true,
      processed: result.success,
      eventType: event.type,
      eventId: event.id,
      timestamp: new Date().toISOString(),
      message: result.message,
    })
  } catch (error) {
    console.error('Stripe webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Process different types of Stripe events
 * @param event - Stripe webhook event
 * @returns Promise resolving to processing result
 */
async function processStripeEvent(event: Stripe.Event): Promise<{
  success: boolean
  message: string
}> {
  try {
    switch (event.type) {
      case 'customer.subscription.created':
        return await handleSubscriptionCreated(
          event.data.object as Stripe.Subscription
        )

      case 'customer.subscription.updated':
        return await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        )

      case 'customer.subscription.deleted':
        return await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        )

      case 'invoice.payment_succeeded':
        return await handlePaymentSucceeded(event.data.object as Stripe.Invoice)

      case 'invoice.payment_failed':
        return await handlePaymentFailed(event.data.object as Stripe.Invoice)

      default:
        console.log(`Unhandled event type: ${event.type}`)
        return {
          success: true,
          message: `Event type ${event.type} not handled`,
        }
    }
  } catch (error) {
    console.error('Error processing Stripe event:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Handle subscription created event
 * @param subscription - Stripe subscription object
 * @returns Promise resolving to processing result
 */
async function handleSubscriptionCreated(
  subscription: Stripe.Subscription
): Promise<{ success: boolean; message: string }> {
  try {
    const customerId = subscription.customer as string
    const entitlementLevel = mapPriceToEntitlement(
      subscription.items.data[0]?.price.id
    )

    if (!entitlementLevel) {
      return {
        success: false,
        message: 'Unknown subscription plan',
      }
    }

    // Update user entitlement in database
    const updateResult = await serverDatabaseService.update(
      'users',
      customerId,
      {
        entitlement_level: entitlementLevel,
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      }
    )

    if (!updateResult.success) {
      return {
        success: false,
        message: `Failed to update user entitlement: ${updateResult.error}`,
      }
    }

    // Cache entitlement in Redis
    await userEntitlementCache.set(customerId, entitlementLevel)

    return {
      success: true,
      message: `Subscription created for customer ${customerId} with ${entitlementLevel} access`,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Handle subscription updated event
 * @param subscription - Stripe subscription object
 * @returns Promise resolving to processing result
 */
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<{ success: boolean; message: string }> {
  try {
    const customerId = subscription.customer as string
    const entitlementLevel = mapPriceToEntitlement(
      subscription.items.data[0]?.price.id
    )

    if (!entitlementLevel) {
      return {
        success: false,
        message: 'Unknown subscription plan',
      }
    }

    // Update user entitlement in database
    const updateResult = await serverDatabaseService.update(
      'users',
      customerId,
      {
        entitlement_level: entitlementLevel,
        updated_at: new Date().toISOString(),
      }
    )

    if (!updateResult.success) {
      return {
        success: false,
        message: `Failed to update user entitlement: ${updateResult.error}`,
      }
    }

    // Update entitlement cache in Redis
    await userEntitlementCache.set(customerId, entitlementLevel)

    return {
      success: true,
      message: `Subscription updated for customer ${customerId} to ${entitlementLevel} access`,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Handle subscription deleted event
 * @param subscription - Stripe subscription object
 * @returns Promise resolving to processing result
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<{ success: boolean; message: string }> {
  try {
    const customerId = subscription.customer as string

    // Downgrade user to FREE tier
    const updateResult = await serverDatabaseService.update(
      'users',
      customerId,
      {
        entitlement_level: 'FREE',
        updated_at: new Date().toISOString(),
      }
    )

    if (!updateResult.success) {
      return {
        success: false,
        message: `Failed to update user entitlement: ${updateResult.error}`,
      }
    }

    // Update entitlement cache in Redis
    await userEntitlementCache.set(customerId, 'FREE')

    return {
      success: true,
      message: `Subscription cancelled for customer ${customerId}, downgraded to FREE access`,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Handle successful payment event
 * @param invoice - Stripe invoice object
 * @returns Promise resolving to processing result
 */
async function handlePaymentSucceeded(
  invoice: Stripe.Invoice
): Promise<{ success: boolean; message: string }> {
  try {
    const customerId = invoice.customer as string

    // Log successful payment for analytics
    console.log(
      `Payment succeeded for customer ${customerId}, amount: ${invoice.amount_paid}`
    )

    return {
      success: true,
      message: `Payment succeeded for customer ${customerId}`,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Handle failed payment event
 * @param invoice - Stripe invoice object
 * @returns Promise resolving to processing result
 */
async function handlePaymentFailed(
  invoice: Stripe.Invoice
): Promise<{ success: boolean; message: string }> {
  try {
    const customerId = invoice.customer as string

    // Log failed payment for monitoring
    console.error(
      `Payment failed for customer ${customerId}, amount: ${invoice.amount_due}`
    )

    // Optionally downgrade user or send notification
    // For now, just log the failure

    return {
      success: true,
      message: `Payment failed for customer ${customerId}`,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Map Stripe price ID to user entitlement level
 * @param priceId - Stripe price ID
 * @returns User entitlement level or null if unknown
 */
function mapPriceToEntitlement(priceId?: string): UserEntitlementLevel | null {
  if (!priceId) return null

  // Map your Stripe price IDs to entitlement levels
  // These should match your actual Stripe price IDs
  const priceMapping: Record<string, UserEntitlementLevel> = {
    // Add your actual Stripe price IDs here
    price_trial: 'TRIAL',
    price_pro: 'PRO',
    // Add more mappings as needed
  }

  return priceMapping[priceId] || null
}
