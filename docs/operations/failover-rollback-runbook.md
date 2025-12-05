# Failover & Rollback Runbook

**Purpose**: Operational recovery procedures for common production incidents
**Last Updated**: 2025-01-27
**Owner**: Operations Team

This runbook provides step-by-step recovery procedures for three critical scenarios:
1. Stuck BullMQ Queue
2. Redis Service Outage
3. Failed Deployment Rollback

---

## Scenario 1: Stuck BullMQ Queue Recovery

### Symptoms
- Evaluation jobs remain in "processing" status indefinitely
- Worker logs show no activity despite jobs in queue
- Users report evaluation requests timing out
- Queue metrics show jobs stuck in "active" state

### Diagnosis Steps

1. **Check queue status**:
   ```bash
   # Connect to Redis CLI (requires Redis URL and password from environment)
   redis-cli -h <REDIS_HOST> -p 6379 -a <REDIS_PASSWORD> --tls

   # List all queues
   KEYS bull:evaluationQueue:*

   # Check active jobs
   LLEN bull:evaluationQueue:active

   # Check waiting jobs
   LLEN bull:evaluationQueue:waiting

   # Check failed jobs
   LLEN bull:evaluationQueue:failed
   ```

2. **Check worker status**:
   ```bash
   # Verify worker process is running
   ps aux | grep "worker.ts\|worker.js"

   # Check worker logs
   # (Location depends on deployment - check Vercel logs or container logs)
   ```

3. **Identify stuck jobs**:
   ```bash
   # Get active job IDs
   LRANGE bull:evaluationQueue:active 0 -1

   # Check job details (replace JOB_ID)
   HGETALL bull:evaluationQueue:JOB_ID
   ```

### Recovery Procedures

#### Option A: Restart Worker (Recommended for transient issues)

1. **Stop worker process**:
   ```bash
   # If running as PM2
   pm2 stop evaluation-worker

   # If running as systemd service
   sudo systemctl stop evaluation-worker

   # If running in Vercel/container, restart the deployment
   ```

2. **Clear stuck active jobs** (jobs will be re-queued):
   ```bash
   # Move active jobs back to waiting (use with caution)
   redis-cli -h <REDIS_HOST> -p 6379 -a <REDIS_PASSWORD> --tls \
     EVAL "local jobs = redis.call('LRANGE', KEYS[1], 0, -1)
           redis.call('DEL', KEYS[1])
           for i=1,#jobs do
             redis.call('RPUSH', KEYS[2], jobs[i])
           end
           return #jobs" 2 \
     bull:evaluationQueue:active bull:evaluationQueue:waiting
   ```

3. **Restart worker**:
   ```bash
   # Restart worker process
   pm2 start evaluation-worker
   # OR
   sudo systemctl start evaluation-worker
   # OR restart Vercel deployment
   ```

4. **Verify recovery**:
   ```bash
   # Monitor queue status
   watch -n 5 'redis-cli -h <REDIS_HOST> -p 6379 -a <REDIS_PASSWORD> --tls LLEN bull:evaluationQueue:active'

   # Check worker logs for processing activity
   ```

#### Option B: Manual Job Cleanup (For persistent stuck jobs)

1. **Identify stuck job IDs**:
   ```bash
   # List active jobs older than 15 minutes
   redis-cli -h <REDIS_HOST> -p 6379 -a <REDIS_PASSWORD> --tls \
     LRANGE bull:evaluationQueue:active 0 -1
   ```

2. **Move specific jobs to failed** (replace JOB_ID):
   ```bash
   # Remove from active
   LREM bull:evaluationQueue:active 1 JOB_ID

   # Add to failed (with error reason)
   LPUSH bull:evaluationQueue:failed JOB_ID
   ```

3. **Or retry specific jobs**:
   ```bash
   # Move back to waiting for retry
   LREM bull:evaluationQueue:active 1 JOB_ID
   LPUSH bull:evaluationQueue:waiting JOB_ID
   ```

### Prevention

- Monitor queue depth and processing time
- Set up alerts for jobs stuck > 10 minutes
- Implement job timeout configuration
- Regular worker health checks

### Expected Recovery Time

- **Option A (Restart)**: 2-5 minutes
- **Option B (Manual cleanup)**: 5-15 minutes depending on number of stuck jobs

---

## Scenario 2: Redis Service Outage Recovery

### Symptoms
- Application errors: "Redis connection failed"
- Cache lookups failing
- Queue operations timing out
- Worker unable to connect to Redis

### Diagnosis Steps

1. **Test Redis connectivity**:
   ```bash
   # Test basic connection
   redis-cli -h <REDIS_HOST> -p 6379 -a <REDIS_PASSWORD> --tls PING
   # Expected: PONG
   ```

2. **Check Redis service status** (Upstash Dashboard):
   - Navigate to https://console.upstash.com
   - Check database status
   - Review metrics for connection errors
   - Check for rate limiting or quota issues

3. **Verify environment variables**:
   ```bash
   # Check Redis configuration
   echo $UPSTASH_REDIS_REST_URL
   echo $UPSTASH_REDIS_REST_TOKEN
   # Verify REDIS_URL if using native connection
   ```

### Recovery Procedures

#### Step 1: Verify Outage Scope

1. **Check Upstash status page**: https://status.upstash.com
2. **Test from multiple locations** to rule out network issues
3. **Check application logs** for specific error messages

#### Step 2: Immediate Mitigation (If Redis is Down)

1. **Enable fallback behavior**:
   - Application should handle Redis failures gracefully
   - Cache misses should fall back to database queries
   - Queue operations should fail gracefully with user-facing errors

2. **Monitor application health**:
   ```bash
   # Check application health endpoint
   curl https://your-app.vercel.app/api/system/status

   # Verify application is still serving requests
   # (May be degraded but should not be completely down)
   ```

#### Step 3: Redis Recovery

1. **If Upstash outage**:
   - Wait for Upstash to restore service
   - Monitor Upstash status page
   - No action needed - service will auto-recover

2. **If configuration issue**:
   ```bash
   # Verify environment variables are set correctly
   # Check Vercel environment variables:
   # - UPSTASH_REDIS_REST_URL
   # - UPSTASH_REDIS_REST_TOKEN

   # Redeploy if variables were changed
   vercel --prod
   ```

3. **If connection limit reached**:
   - Check Upstash dashboard for connection metrics
   - Review connection pooling configuration
   - Consider upgrading Upstash plan if consistently hitting limits

#### Step 4: Post-Recovery Verification

1. **Test Redis connectivity**:
   ```bash
   redis-cli -h <REDIS_HOST> -p 6379 -a <REDIS_PASSWORD> --tls PING
   ```

2. **Verify queue operations**:
   ```bash
   # Check queue is accessible
   redis-cli -h <REDIS_HOST> -p 6379 -a <REDIS_PASSWORD> --tls \
     LLEN bull:evaluationQueue:waiting
   ```

3. **Restart worker** (if needed):
   ```bash
   # Worker should auto-reconnect, but restart if needed
   pm2 restart evaluation-worker
   ```

4. **Monitor application metrics**:
   - Check error rates return to normal
   - Verify cache hit rates restore
   - Confirm queue processing resumes

### Fallback Mechanisms

The application is designed to handle Redis outages:
- **Cache**: Falls back to database queries when cache unavailable
- **Queue**: Jobs will fail gracefully; users see error messages
- **Application**: Continues serving requests (degraded performance)

### Expected Recovery Time

- **Upstash outage**: Depends on Upstash SLA (typically < 5 minutes)
- **Configuration issue**: 5-10 minutes (redeploy time)
- **Connection limit**: Immediate (after plan upgrade or connection cleanup)

---

## Scenario 3: Deployment Rollback Procedures

### Symptoms
- Increased error rates after deployment
- Feature regression reported by users
- Performance degradation
- Critical bugs introduced

### Diagnosis Steps

1. **Identify problematic deployment**:
   ```bash
   # Check Vercel deployment history
   vercel list

   # Or check Vercel dashboard:
   # https://vercel.com/your-team/your-project/deployments
   ```

2. **Review deployment logs**:
   ```bash
   # Get deployment logs
   vercel logs <deployment-url>

   # Check for errors in deployment
   ```

3. **Verify issue is deployment-related**:
   - Check error timestamps match deployment time
   - Review Sentry errors for new patterns
   - Confirm issue doesn't exist in previous deployment

### Recovery Procedures

#### Option A: Vercel Dashboard Rollback (Fastest)

1. **Navigate to Vercel Dashboard**:
   - Go to https://vercel.com/your-team/your-project
   - Click on "Deployments" tab

2. **Select previous stable deployment**:
   - Find the deployment before the problematic one
   - Click the "..." menu
   - Select "Promote to Production"

3. **Confirm rollback**:
   - Verify the deployment you're promoting
   - Confirm the rollback
   - Wait for promotion to complete (~30 seconds)

4. **Verify rollback**:
   ```bash
   # Check current production URL
   curl https://your-app.vercel.app/api/system/status

   # Verify application is working
   # Check error rates in Sentry/PostHog
   ```

#### Option B: Git-Based Rollback (If dashboard unavailable)

1. **Identify last known good commit**:
   ```bash
   # View recent commits
   git log --oneline -10

   # Find commit hash before problematic deployment
   ```

2. **Revert to previous commit**:
   ```bash
   # Create revert commit (recommended)
   git revert <bad-commit-hash>
   git push origin main

   # OR reset to previous commit (use with caution)
   git reset --hard <good-commit-hash>
   git push origin main --force
   ```

3. **Trigger new deployment**:
   ```bash
   # Vercel will auto-deploy on push
   # Or trigger manually:
   vercel --prod
   ```

4. **Verify deployment**:
   - Monitor Vercel deployment status
   - Check application health endpoint
   - Verify error rates return to normal

#### Option C: Hotfix Deployment (If rollback not possible)

1. **Create hotfix branch**:
   ```bash
   git checkout -b hotfix/rollback-fix
   ```

2. **Apply minimal fix**:
   - Revert only the problematic changes
   - Or add feature flag to disable broken feature

3. **Deploy hotfix**:
   ```bash
   git push origin hotfix/rollback-fix
   # Create PR and merge to main
   # Or deploy directly:
   vercel --prod
   ```

### Post-Rollback Verification

1. **Monitor error rates**:
   - Check Sentry for new errors
   - Verify error rates return to baseline
   - Monitor PostHog for user impact

2. **Test critical flows**:
   - User authentication
   - Evaluation submission
   - Content pack loading
   - Analytics tracking

3. **Communicate status**:
   - Update status page if applicable
   - Notify team of rollback
   - Document root cause for post-mortem

### Prevention

- **Staging deployments**: Always deploy to staging first
- **Feature flags**: Use feature flags for risky changes
- **Gradual rollouts**: Use Vercel's preview deployments
- **Monitoring**: Set up alerts for error rate spikes
- **Testing**: Run integration tests before production deploy

### Expected Recovery Time

- **Vercel Dashboard rollback**: 1-2 minutes
- **Git-based rollback**: 5-10 minutes (including deployment time)
- **Hotfix deployment**: 10-20 minutes (depending on fix complexity)

---

## General Recovery Checklist

Before executing any recovery procedure:

- [ ] Verify the issue is reproducible
- [ ] Check if issue affects all users or subset
- [ ] Review recent changes (deployments, config changes)
- [ ] Check external service status (Upstash, Vercel, etc.)
- [ ] Document symptoms and timeline
- [ ] Notify team of incident
- [ ] Execute recovery procedure
- [ ] Verify recovery success
- [ ] Monitor for 15 minutes post-recovery
- [ ] Document root cause and lessons learned

---

## Emergency Contacts

- **On-Call Engineer**: [Configure in your alerting system]
- **Vercel Support**: https://vercel.com/support
- **Upstash Support**: https://console.upstash.com/support
- **Sentry**: Check Sentry dashboard for error details

---

## Related Documentation

- Queue Configuration: `src/infrastructure/bullmq/queue.ts`
- Worker Implementation: `src/infrastructure/bullmq/worker.ts`
- Redis Configuration: `src/infrastructure/redis/index.ts`
- Deployment Configuration: `vercel.json` (if exists)

---

**Note**: This runbook should be tested regularly in staging environments to ensure procedures remain accurate and effective.
