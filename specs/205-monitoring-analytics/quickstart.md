# Quickstart: Monitoring & Analytics

**Feature**: 005-monitoring-analytics
**Date**: 2025-01-27
**Purpose**: Get up and running with monitoring and analytics quickly

## Overview

The Monitoring & Analytics system provides comprehensive error tracking with Sentry and user behavior analytics with PostHog. It includes secure configuration management, graceful degradation for service failures, and performance optimization to maintain application responsiveness.

## Prerequisites

- PostHog account and API key
- Sentry account and DSN
- Next.js 14+ application
- Environment variable management

## Quick Start

### 1. Install Dependencies

```bash
# Install monitoring and analytics packages
pnpm add @sentry/nextjs posthog-js posthog-node

# Install development dependencies
pnpm add -D @types/node
```

### 2. Environment Configuration

Create `.env.local` with your monitoring credentials:

```bash
# PostHog Configuration
POSTHOG_API_KEY=phc_your_api_key
POSTHOG_HOST=https://app.posthog.com

# Sentry Configuration
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
SENTRY_AUTH_TOKEN=your-auth-token

# Environment
NODE_ENV=development
NEXT_PUBLIC_ANALYTICS_DEBUG=true
```

### 3. Initialize Monitoring Services

Create `src/lib/monitoring/index.ts`:

```typescript
import { init as initSentry } from '@sentry/nextjs';
import posthog from 'posthog-js';

// Initialize Sentry
initSentry({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  debug: process.env.NODE_ENV === 'development',
});

// Initialize PostHog
if (typeof window !== 'undefined') {
  posthog.init(process.env.POSTHOG_API_KEY!, {
    api_host: process.env.POSTHOG_HOST || 'https://app.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: false, // We'll handle this manually
    capture_pageleave: true,
  });
}

export { posthog };
```

### 4. Create Analytics Service

Create `src/lib/analytics/analytics-service.ts`:

```typescript
import posthog from 'posthog-js';

export interface AnalyticsEvent {
  event: 'drill_started' | 'drill_submitted' | 'score_returned' | 'content_pack_loaded';
  userId?: string;
  sessionId: string;
  properties?: Record<string, any>;
  context?: {
    browser?: string;
    os?: string;
    device?: string;
    url?: string;
  };
}

export class AnalyticsService {
  static track(event: AnalyticsEvent): void {
    if (typeof window === 'undefined') return;

    try {
      posthog.capture(event.event, {
        ...event.properties,
        sessionId: event.sessionId,
        context: event.context,
        timestamp: new Date().toISOString(),
      });

      // Identify user if userId is provided
      if (event.userId) {
        posthog.identify(event.userId);
      }
    } catch (error) {
      console.error('Analytics tracking failed:', error);
    }
  }

  static identify(userId: string, properties?: Record<string, any>): void {
    if (typeof window === 'undefined') return;

    try {
      posthog.identify(userId, properties);
    } catch (error) {
      console.error('Analytics identification failed:', error);
    }
  }

  static reset(): void {
    if (typeof window === 'undefined') return;

    try {
      posthog.reset();
    } catch (error) {
      console.error('Analytics reset failed:', error);
    }
  }
}
```

### 5. Create Error Tracking Service

Create `src/lib/monitoring/error-service.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  component?: string;
  action?: string;
  url?: string;
  userAgent?: string;
}

export class ErrorService {
  static captureError(
    error: Error,
    context?: ErrorContext,
    severity: 'critical' | 'error' | 'warning' | 'info' | 'debug' = 'error'
  ): void {
    try {
      Sentry.withScope((scope) => {
        // Set user context
        if (context?.userId) {
          scope.setUser({ id: context.userId });
        }

        // Set additional context
        if (context?.sessionId) {
          scope.setTag('sessionId', context.sessionId);
        }
        if (context?.component) {
          scope.setTag('component', context.component);
        }
        if (context?.action) {
          scope.setTag('action', context.action);
        }

        // Set severity level
        scope.setLevel(severity);

        // Capture the error
        Sentry.captureException(error);
      });
    } catch (captureError) {
      console.error('Error capture failed:', captureError);
    }
  }

  static captureMessage(
    message: string,
    context?: ErrorContext,
    severity: 'critical' | 'error' | 'warning' | 'info' | 'debug' = 'info'
  ): void {
    try {
      Sentry.withScope((scope) => {
        if (context?.userId) {
          scope.setUser({ id: context.userId });
        }
        if (context?.sessionId) {
          scope.setTag('sessionId', context.sessionId);
        }
        scope.setLevel(severity);
        Sentry.captureMessage(message);
      });
    } catch (captureError) {
      console.error('Message capture failed:', captureError);
    }
  }
}
```

### 6. Create React Hook

Create `src/hooks/useAnalytics.ts`:

```typescript
import { useCallback } from 'react';
import { AnalyticsService, AnalyticsEvent } from '@/features/notifications/application/analytics';

export function useAnalytics() {
  const trackEvent = useCallback((event: Omit<AnalyticsEvent, 'sessionId'>) => {
    const sessionId = getSessionId();
    AnalyticsService.track({ ...event, sessionId });
  }, []);

  const identifyUser = useCallback((userId: string, properties?: Record<string, any>) => {
    AnalyticsService.identify(userId, properties);
  }, []);

  const reset = useCallback(() => {
    AnalyticsService.reset();
  }, []);

  return {
    trackEvent,
    identifyUser,
    reset,
  };
}

function getSessionId(): string {
  if (typeof window === 'undefined') return 'server-session';

  let sessionId = sessionStorage.getItem('analytics-session-id');
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics-session-id', sessionId);
  }
  return sessionId;
}
```

### 7. Usage Examples

#### Track Analytics Events

```typescript
import { useAnalytics } from '@/hooks/useAnalytics';

function DrillComponent() {
  const { trackEvent } = useAnalytics();

  const handleDrillStart = () => {
    trackEvent({
      event: 'drill_started',
      userId: 'user_123',
      properties: {
        questionId: 'q_001',
        difficulty: 'medium',
        category: 'technical',
      },
      context: {
        browser: navigator.userAgent,
        url: window.location.href,
      },
    });
  };

  const handleDrillSubmit = (response: string) => {
    trackEvent({
      event: 'drill_submitted',
      userId: 'user_123',
      properties: {
        questionId: 'q_001',
        responseLength: response.length,
        timeSpent: 120,
      },
    });
  };

  return (
    <div>
      <button onClick={handleDrillStart}>Start Drill</button>
      <button onClick={() => handleDrillSubmit('My answer')}>Submit</button>
    </div>
  );
}
```

#### Capture Errors

```typescript
import { ErrorService } from '@/features/scheduling/infrastructure/monitoring/error-service';

function ApiService() {
  const handleApiCall = async () => {
    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        body: JSON.stringify({ content: 'test' }),
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      ErrorService.captureError(error as Error, {
        userId: 'user_123',
        sessionId: 'sess_456',
        component: 'ApiService',
        action: 'handleApiCall',
        url: window.location.href,
      });
      throw error;
    }
  };
}
```

#### Error Boundary

Create `src/components/ErrorBoundary.tsx`:

```typescript
'use client';

import React from 'react';
import { ErrorService } from '@/features/scheduling/infrastructure/monitoring/error-service';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    ErrorService.captureError(error, {
      component: errorInfo.componentStack,
      action: 'componentDidCatch',
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong.</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## Configuration

### Environment Variables

```bash
# Required
POSTHOG_API_KEY=phc_your_api_key
SENTRY_DSN=https://your-dsn@sentry.io/project-id

# Optional
POSTHOG_HOST=https://app.posthog.com
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
SENTRY_AUTH_TOKEN=your-auth-token
NEXT_PUBLIC_ANALYTICS_DEBUG=true
```

### Sentry Configuration

Create `sentry.client.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  debug: process.env.NODE_ENV === 'development',
  beforeSend(event) {
    // Filter out sensitive data
    if (event.user) {
      delete event.user.email;
    }
    return event;
  },
});
```

Create `sentry.server.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  debug: process.env.NODE_ENV === 'development',
});
```

## Testing

### Unit Tests

```typescript
import { describe, it, expect, vi } from 'vitest';
import { AnalyticsService } from './analytics-service';

// Mock PostHog
vi.mock('posthog-js', () => ({
  capture: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
}));

describe('AnalyticsService', () => {
  it('should track events', () => {
    const event = {
      event: 'drill_started' as const,
      sessionId: 'sess_123',
      properties: { questionId: 'q_001' },
    };

    AnalyticsService.track(event);

    expect(posthog.capture).toHaveBeenCalledWith('drill_started', {
      questionId: 'q_001',
      sessionId: 'sess_123',
      timestamp: expect.any(String),
    });
  });
});
```

### Integration Tests

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useAnalytics } from '@/hooks/useAnalytics';

// Mock analytics service
vi.mock('@/features/notifications/application/analytics', () => ({
  AnalyticsService: {
    track: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
  },
}));

describe('Analytics Integration', () => {
  it('should track drill events', async () => {
    render(<DrillComponent />);

    const startButton = screen.getByText('Start Drill');
    await user.click(startButton);

    expect(AnalyticsService.track).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'drill_started',
        sessionId: expect.any(String),
      })
    );
  });
});
```

## Debugging

### Development Mode

Enable debug mode in development:

```bash
NEXT_PUBLIC_ANALYTICS_DEBUG=true
```

This will log all analytics events to the console.

### Event Validation

```typescript
import { z } from 'zod';

const AnalyticsEventSchema = z.object({
  event: z.enum(['drill_started', 'drill_submitted', 'score_returned', 'content_pack_loaded']),
  sessionId: z.string().min(1),
  userId: z.uuid().optional(),
  properties: z.record(z.any()).optional(),
});

// Validate events before sending
function validateEvent(event: unknown) {
  try {
    return AnalyticsEventSchema.parse(event);
  } catch (error) {
    console.error('Invalid analytics event:', error);
    return null;
  }
}
```

## Performance Considerations

### Lazy Loading

```typescript
// Load analytics only when needed
const loadAnalytics = async () => {
  const { AnalyticsService } = await import('@/features/notifications/application/analytics');
  return AnalyticsService;
};
```

### Event Batching

```typescript
// Batch events for better performance
class EventBatcher {
  private events: AnalyticsEvent[] = [];
  private batchSize = 10;
  private flushInterval = 5000;

  addEvent(event: AnalyticsEvent) {
    this.events.push(event);

    if (this.events.length >= this.batchSize) {
      this.flush();
    }
  }

  private flush() {
    if (this.events.length === 0) return;

    // Send batched events
    AnalyticsService.trackBatch(this.events);
    this.events = [];
  }
}
```

## Troubleshooting

### Common Issues

1. **Events not appearing in PostHog**
   - Check API key configuration
   - Verify network connectivity
   - Check browser console for errors

2. **Errors not appearing in Sentry**
   - Verify DSN configuration
   - Check Sentry project settings
   - Ensure error is being captured correctly

3. **Performance impact**
   - Enable performance monitoring
   - Check event batching configuration
   - Monitor bundle size

### Debug Commands

```bash
# Check environment variables
pnpm run check-env

# Validate configuration
pnpm run validate-config

# Test analytics events
pnpm run test-analytics

# Test error tracking
pnpm run test-errors
```

## Next Steps

1. **Custom Events**: Add custom event types for your specific use cases
2. **Advanced Filtering**: Implement event filtering and data scrubbing
3. **Performance Monitoring**: Add performance tracking and monitoring
4. **A/B Testing**: Integrate with PostHog's feature flags
5. **Custom Dashboards**: Create custom analytics dashboards
6. **Alerting**: Set up alerts for critical errors and performance issues
