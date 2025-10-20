# Deployment Documentation

This directory contains deployment guides and configurations for the InterviewApp project.

## Deployment Platforms

### Vercel (Recommended)

Vercel is the recommended deployment platform for Next.js applications.

#### Prerequisites

- Vercel account
- GitHub repository connected to Vercel
- Environment variables configured

#### Deployment Steps

1. **Connect Repository**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Environment Variables**
   - Go to Project Settings > Environment Variables
   - Add all required environment variables from `env.example`

3. **Deploy**
   - Vercel will automatically deploy on every push to main
   - Preview deployments are created for pull requests

#### Environment Variables

Required for production:

```bash
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Database (Supabase)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# External Services
OPENAI_API_KEY=your-openai-api-key
POSTHOG_API_KEY=your-posthog-api-key
SENTRY_DSN=your-sentry-dsn
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
```

### Docker

For containerized deployments:

```bash
# Build Docker image
docker build -t interview-app .

# Run container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_APP_URL=http://localhost:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your-url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key \
  interview-app
```

### Self-Hosted

For self-hosted deployments:

1. **Install Dependencies**
   ```bash
   pnpm install --production
   ```

2. **Build Application**
   ```bash
   pnpm build
   ```

3. **Start Application**
   ```bash
   pnpm start
   ```

## Environment Configuration

### Development

- Use `.env.local` for local development
- Copy from `env.local.example`

### Staging

- Use Vercel preview deployments
- Configure staging environment variables

### Production

- Use Vercel production environment
- Configure production environment variables
- Enable monitoring and analytics

## Monitoring

### Sentry

Error tracking and performance monitoring:

1. Create Sentry project
2. Add `SENTRY_DSN` to environment variables
3. Configure error boundaries in React components

### PostHog

Analytics and feature flags:

1. Create PostHog project
2. Add `POSTHOG_API_KEY` to environment variables
3. Initialize PostHog in your application

### Vercel Analytics

Built-in analytics for Vercel deployments:

1. Enable in Vercel dashboard
2. No additional configuration required

## Security

### Environment Variables

- Never commit `.env` files
- Use Vercel's environment variable management
- Rotate secrets regularly

### HTTPS

- Vercel provides HTTPS by default
- Use secure cookies for authentication
- Enable HSTS headers

### Content Security Policy

Configure CSP headers in `next.config.js`:

```javascript
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline';"
  }
]
```

## Performance

### Build Optimization

- Use Next.js Image component
- Enable compression
- Optimize bundle size

### Caching

- Configure CDN caching
- Use Vercel's edge caching
- Implement Redis caching for dynamic content

### Database

- Use connection pooling
- Optimize queries
- Monitor database performance

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check environment variables
   - Verify TypeScript compilation
   - Check for missing dependencies

2. **Runtime Errors**
   - Check Sentry for error details
   - Verify environment configuration
   - Check database connectivity

3. **Performance Issues**
   - Monitor Core Web Vitals
   - Check bundle size
   - Optimize images and assets

### Debug Mode

Enable debug logging:

```bash
DEBUG=true pnpm dev
```

## Rollback

### Vercel

1. Go to Vercel dashboard
2. Select deployment
3. Click "Promote to Production"

### Database

- Use Supabase point-in-time recovery
- Backup before major changes

## Maintenance

### Regular Tasks

- Update dependencies
- Monitor error rates
- Review performance metrics
- Security audits

### Monitoring

- Set up alerts for errors
- Monitor uptime
- Track performance metrics
- Review user feedback
