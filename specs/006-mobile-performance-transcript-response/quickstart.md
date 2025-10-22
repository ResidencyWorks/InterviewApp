# Quickstart Guide: ResidencyWorks M0 Trial

**Date**: 2025-01-27
**Branch**: `006-mobile-performance-transcript-response`
**Purpose**: Setup and run the ResidencyWorks MatchReady Interview Drills trial system

## Prerequisites

### System Requirements

- **Node.js**: 22.x (LTS)
- **pnpm**: ^10.18.3
- **Git**: Latest version
- **Docker**: For local development (optional)

### Required Accounts

- **Supabase**: Database and authentication
- **Vercel**: Deployment and hosting
- **OpenAI**: AI services (Whisper, GPT)
- **Stripe**: Payment processing
- **PostHog**: Analytics
- **Sentry**: Error tracking
- **Upstash**: Redis caching

## Quick Setup (5 minutes)

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/your-org/interview-app.git
cd interview-app

# Install dependencies
pnpm install

# Setup git hooks
pnpm prepare
```

### 2. Environment Configuration

```bash
# Copy environment template
cp env.example .env.local

# Edit environment variables
nano .env.local
```

**Required Environment Variables**:

```bash
# Application
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Sentry
SENTRY_DSN=your_sentry_dsn
SENTRY_ORG=your_sentry_org
SENTRY_PROJECT=your_sentry_project

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
```

### 3. Database Setup

```bash
# Generate TypeScript types from Supabase
pnpm update-types

# Run database migrations (if any)
pnpm db:migrate
```

### 4. Start Development Server

```bash
# Start the development server
pnpm dev

# Open in browser
open http://localhost:3000
```

## Detailed Setup

### Supabase Configuration

1. **Create Supabase Project**:
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Note the URL and anon key

2. **Database Schema**:
   ```sql
   -- Run the SQL from data-model.md
   -- Enable RLS policies
   -- Create necessary indexes
   ```

3. **Authentication Setup**:
   - Enable email authentication
   - Configure magic link settings
   - Set up redirect URLs

### Vercel Deployment

1. **Connect Repository**:
   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Deploy to Vercel
   vercel
   ```

2. **Environment Variables**:
   - Add all environment variables in Vercel dashboard
   - Set production URLs
   - Configure webhook endpoints

3. **Domain Configuration**:
   - Set up custom domain: `m0residencyworks.vercel.app`
   - Configure SSL certificates
   - Set up redirects

### Content Pack Setup

1. **Create Sample Content Pack**:
   ```json
   {
     "version": "1.2.0",
     "metadata": {
       "title": "Medical Interview Basics",
       "description": "Basic medical interview questions",
       "categories": [
         "Communication",
         "Clinical Knowledge",
         "Professionalism",
         "Problem Solving",
         "Patient Care",
         "Medical Ethics",
         "Time Management"
       ]
     },
     "questions": [
       {
         "id": "q_001",
         "category": "Communication",
         "prompt": "How would you explain a complex medical procedure to a patient?",
         "expected_duration_s": 120,
         "evaluation_criteria": [
           "Clear explanation",
           "Patient understanding",
           "Empathy"
         ]
       }
     ]
     // ... more questions
   }
   ```

2. **Upload Content Pack**:
   ```bash
   # Use the admin interface or API
   curl -X POST http://localhost:3000/api/content-packs \
     -H "Authorization: Bearer $SESSION_TOKEN" \
     -F "file=@content-pack.json" \
     -F "name=Medical Interview Basics v1.2.0"
   ```

## Testing the System

### 1. Authentication Flow

```bash
# Test magic link login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Check email for magic link
# Click link to authenticate
```

### 2. Drill Session

```bash
# Start a drill session
curl -X POST http://localhost:3000/api/evaluate \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "I would approach this patient with empathy and professionalism...",
    "questionId": "q_001",
    "userId": "user-uuid"
  }'
```

### 3. Content Pack Management

```bash
# List content packs
curl -X GET http://localhost:3000/api/content-packs \
  -H "Authorization: Bearer $SESSION_TOKEN"

# Get active content pack
curl -X GET http://localhost:3000/api/content-packs/active \
  -H "Authorization: Bearer $SESSION_TOKEN"
```

## Development Workflow

### Code Quality

```bash
# Run linting and formatting
pnpm lint:fix

# Type checking
pnpm typecheck

# Run all checks
pnpm check:all
```

### Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Coverage report
pnpm test:coverage
```

### Database Operations

```bash
# Update types from Supabase
pnpm update-types

# Reset database (development only)
pnpm db:reset

# Seed test data
pnpm db:seed
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**:
   ```bash
   # Check Supabase configuration
   # Verify environment variables
   # Check RLS policies
   ```

2. **API Errors**:
   ```bash
   # Check server logs
   # Verify API keys
   # Test endpoints individually
   ```

3. **Database Issues**:
   ```bash
   # Check connection string
   # Verify migrations
   # Check RLS policies
   ```

### Debug Mode

```bash
# Enable debug logging
DEBUG=true pnpm dev

# Check specific services
DEBUG=supabase,openai pnpm dev
```

### Performance Monitoring

```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/health

# Monitor memory usage
pnpm dev --inspect
```

## Production Deployment

### Pre-deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] Content packs uploaded
- [ ] Webhook endpoints configured
- [ ] SSL certificates valid
- [ ] Performance tests passed
- [ ] Security scan completed

### Deployment Commands

```bash
# Build for production
pnpm build

# Deploy to Vercel
vercel --prod

# Verify deployment
curl https://m0residencyworks.vercel.app/api/health
```

### Post-deployment Verification

1. **Health Checks**:
   ```bash
   curl https://m0residencyworks.vercel.app/api/health
   curl https://m0residencyworks.vercel.app/api/evaluate
   ```

2. **Authentication**:
   - Test magic link flow
   - Verify session management
   - Check entitlement caching

3. **Core Functionality**:
   - Create test drill session
   - Submit evaluation request
   - Verify response format
   - Check analytics events

## Monitoring and Maintenance

### Health Monitoring

- **Vercel Dashboard**: Deployment status and logs
- **Supabase Dashboard**: Database performance and queries
- **PostHog Dashboard**: User analytics and events
- **Sentry Dashboard**: Error tracking and alerts

### Performance Metrics

- **Response Times**: < 250ms for core loop
- **Error Rates**: < 1% target
- **Uptime**: 99.5% target
- **User Satisfaction**: Monitor feedback

### Maintenance Tasks

- **Daily**: Check error logs and performance metrics
- **Weekly**: Review analytics and user feedback
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Performance optimization and scaling review

## Support and Resources

### Documentation

- **API Documentation**: `/contracts/api-specification.md`
- **Data Model**: `/specs/006-mobile-performance-transcript-response/data-model.md`
- **Research Findings**: `/specs/006-mobile-performance-transcript-response/research.md`

### Contact Information

- **Technical Support**: support@residencyworks.com
- **Emergency Contact**: +1-XXX-XXX-XXXX
- **Documentation**: [Internal Wiki Link]

### Useful Commands

```bash
# Quick health check
pnpm health

# Reset development environment
pnpm clean:all

# Update all dependencies
pnpm update

# Generate API documentation
pnpm docs:generate
```

## Next Steps

After successful setup:

1. **Test Core Loop**: Record → Transcribe → Score → Save
2. **Verify Performance**: < 10s transcript response
3. **Check Mobile**: Fast load, no layout shift
4. **Validate Analytics**: Events firing correctly
5. **Test Payments**: Stripe webhook integration
6. **Prepare Demo**: 90-second Loom video

## Emergency Procedures

### System Outage

1. Check Vercel status page
2. Verify Supabase connectivity
3. Review error logs in Sentry
4. Contact support team
5. Implement fallback procedures

### Data Recovery

1. Check Supabase backups
2. Verify Redis cache state
3. Review transaction logs
4. Restore from latest backup if needed

### Security Incident

1. Immediately revoke compromised keys
2. Check access logs
3. Notify security team
4. Implement additional monitoring
5. Review and update security policies
