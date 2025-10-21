# Deployment Guide

## Overview

This guide covers deploying the Interview Drills application to production environments.

## Prerequisites

### Required Services
- **Vercel** (or similar hosting platform)
- **Supabase** (database and authentication)
- **Upstash Redis** (caching)
- **OpenAI API** (evaluation)
- **PostHog** (analytics)
- **Sentry** (error monitoring)

### Environment Variables

Create the following environment variables in your deployment platform:

```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Redis
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
POSTHOG_HOST=https://us.posthog.com

# Error Monitoring
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
SENTRY_ORG=your_sentry_org
SENTRY_PROJECT=your_sentry_project

# Application
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
```

## Deployment Steps

### 1. Vercel Deployment

#### Using Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

#### Using Vercel Dashboard
1. Connect your GitHub repository
2. Configure environment variables
3. Set build command: `pnpm build`
4. Set output directory: `.next`
5. Deploy

### 2. Database Setup

#### Supabase Configuration
1. Create a new Supabase project
2. Run database migrations:
   ```bash
   # Install Supabase CLI
   npm install -g supabase

   # Link to your project
   supabase link --project-ref your-project-ref

   # Run migrations
   supabase db push
   ```

3. Configure Row Level Security (RLS) policies
4. Set up database backups

### 3. Redis Setup

#### Upstash Configuration
1. Create a new Upstash Redis database
2. Configure connection settings
3. Set up monitoring and alerts
4. Configure backup policies

### 4. External Services

#### OpenAI API
1. Create OpenAI API account
2. Generate API key
3. Set usage limits and monitoring
4. Configure rate limiting

#### PostHog Analytics
1. Create PostHog project
2. Configure event tracking
3. Set up dashboards
4. Configure alerts

#### Sentry Error Monitoring
1. Create Sentry project
2. Configure error tracking
3. Set up release tracking
4. Configure alert rules

## Production Configuration

### Security Settings

#### Content Security Policy
Update `next.config.js` with production CSP:
```javascript
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://us.posthog.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://us.posthog.com https://*.supabase.co https://api.openai.com; frame-ancestors 'none';"
  }
];
```

#### Rate Limiting
Configure rate limiting in your hosting platform or use a CDN service like Cloudflare.

### Performance Optimization

#### Caching Strategy
- Static assets: CDN caching
- API responses: Redis caching
- Database queries: Query optimization
- Images: Next.js Image optimization

#### Monitoring
- Set up performance monitoring
- Configure alerting thresholds
- Monitor Core Web Vitals
- Track error rates

## Health Checks

### Endpoint Monitoring
The application provides a health check endpoint at `/api/health` that monitors:
- Database connectivity
- Redis connectivity
- OpenAI API status
- Error monitoring status

### Uptime Monitoring
Set up external monitoring services to check:
- Application availability
- Response times
- Error rates
- SSL certificate status

## Backup and Recovery

### Database Backups
- Configure automated daily backups
- Test restore procedures
- Store backups in multiple locations
- Document recovery processes

### Application Backups
- Version control all code changes
- Tag releases for easy rollback
- Document deployment procedures
- Maintain staging environment

## Scaling Considerations

### Horizontal Scaling
- Use Vercel's automatic scaling
- Configure Redis clustering if needed
- Set up database read replicas
- Implement CDN for static assets

### Performance Monitoring
- Monitor response times
- Track resource usage
- Set up capacity alerts
- Plan for traffic spikes

## Security Checklist

### Pre-Deployment
- [ ] All environment variables configured
- [ ] Security headers implemented
- [ ] Rate limiting configured
- [ ] Input validation in place
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Monitoring set up

### Post-Deployment
- [ ] SSL certificate valid
- [ ] Security headers present
- [ ] Health checks passing
- [ ] Monitoring alerts configured
- [ ] Backup procedures tested
- [ ] Performance benchmarks met

## Troubleshooting

### Common Issues

#### Build Failures
- Check environment variables
- Verify dependencies
- Review build logs
- Test locally first

#### Runtime Errors
- Check service connectivity
- Review error logs
- Verify API keys
- Test health endpoints

#### Performance Issues
- Monitor resource usage
- Check database queries
- Review caching strategy
- Optimize images and assets

### Support Contacts
- **Technical Issues**: dev-team@company.com
- **Infrastructure**: ops-team@company.com
- **Security**: security@company.com

## Maintenance

### Regular Tasks
- Monitor system health
- Review error logs
- Update dependencies
- Backup verification
- Performance optimization
- Security updates

### Update Procedures
1. Test changes in staging
2. Create deployment plan
3. Schedule maintenance window
4. Deploy changes
5. Verify functionality
6. Monitor for issues
7. Document changes

## Rollback Procedures

### Quick Rollback
1. Identify last known good version
2. Update environment variables if needed
3. Redeploy previous version
4. Verify functionality
5. Investigate issues

### Database Rollback
1. Stop application traffic
2. Restore database from backup
3. Verify data integrity
4. Restart application
5. Monitor for issues

## Monitoring and Alerting

### Key Metrics
- Response time (p95 < 500ms)
- Error rate (< 1%)
- Availability (> 99.9%)
- Database connections
- Redis memory usage
- API rate limits

### Alert Thresholds
- Error rate > 5%
- Response time > 1s
- Availability < 99%
- Database errors
- Redis connection failures
- High memory usage

### Notification Channels
- Email alerts for critical issues
- Slack notifications for warnings
- PagerDuty for emergencies
- Dashboard for monitoring

## Compliance

### Data Protection
- GDPR compliance
- Data encryption at rest and in transit
- User data retention policies
- Right to deletion procedures

### Security Standards
- OWASP compliance
- Regular security audits
- Penetration testing
- Vulnerability scanning

## Cost Optimization

### Resource Management
- Monitor usage patterns
- Optimize database queries
- Implement caching strategies
- Use appropriate instance sizes

### Service Optimization
- Review API usage
- Optimize image delivery
- Implement lazy loading
- Monitor third-party costs
