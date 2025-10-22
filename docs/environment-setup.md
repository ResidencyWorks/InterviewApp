# Environment Variables Setup

This document explains how to properly configure environment variables for the InterviewApp to ensure magic links and other redirects work correctly in all environments.

## Required Environment Variables

### Application URLs
```bash
# Primary app URL - set this for production
NEXT_PUBLIC_APP_URL=https://your-app-domain.com

# Vercel deployment URL (automatically set by Vercel)
VERCEL_URL=your-app-domain.com
VERCEL_ENV=production
```

### Database (Supabase)
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Redis (Upstash)
```bash
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

### External Services
```bash
OPENAI_API_KEY=your-openai-key
POSTHOG_API_KEY=your-posthog-key
SENTRY_DSN=your-sentry-dsn
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
```

### Authentication
```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

## URL Resolution Priority

The application uses the following priority order to determine the correct app URL:

1. `NEXT_PUBLIC_APP_URL` - Explicitly set app URL
2. `VERCEL_URL` - Automatically set by Vercel (prefixed with https://)
3. `http://localhost:3000` - Fallback for development

## Magic Link Configuration

Magic links will redirect to the URL determined by the priority above. Make sure to:

1. Set `NEXT_PUBLIC_APP_URL` in your production environment
2. Configure Supabase auth settings to allow your production domain
3. Update any hardcoded localhost URLs in your configuration

## Development vs Production

### Development
- Uses `http://localhost:3000` as fallback
- Supabase config allows localhost redirects
- All localhost URLs are whitelisted in security middleware

### Production
- Must set `NEXT_PUBLIC_APP_URL` to your production domain
- Supabase config uses environment variable substitution
- Security middleware validates against production domain

## Troubleshooting

If magic links are redirecting to localhost in production:

1. Check that `NEXT_PUBLIC_APP_URL` is set correctly
2. Verify Supabase auth settings include your production domain
3. Ensure the domain is in the allowed origins list
4. Check that environment variables are properly loaded

## Security Considerations

- Never commit `.env` files to version control
- Use different environment variables for different environments
- Regularly rotate API keys and secrets
- Validate all redirect URLs to prevent open redirects
