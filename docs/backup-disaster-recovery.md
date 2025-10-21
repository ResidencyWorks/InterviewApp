# Backup and Disaster Recovery Procedures

## Overview

This document outlines comprehensive backup and disaster recovery procedures for the Interview Drills application, ensuring data protection, business continuity, and rapid recovery capabilities.

## Backup Strategy

### 1. Database Backups

#### Supabase Database
- **Automated Backups**: Daily automated backups via Supabase dashboard
- **Point-in-Time Recovery**: Available for the last 7 days
- **Manual Backups**: Weekly manual exports for long-term storage
- **Cross-Region Replication**: Enabled for disaster recovery

#### Backup Schedule
```
Daily: 02:00 UTC (Automated)
Weekly: Sunday 03:00 UTC (Manual export)
Monthly: First Sunday 04:00 UTC (Long-term storage)
```

#### Backup Retention
- **Daily Backups**: 30 days
- **Weekly Backups**: 12 weeks
- **Monthly Backups**: 12 months
- **Yearly Backups**: 7 years

### 2. Application Data Backups

#### Redis Cache
- **Snapshot Backups**: Every 6 hours
- **AOF (Append Only File)**: Continuous logging
- **Cross-Region Replication**: Real-time replication to secondary region

#### File Storage
- **User Uploads**: Daily incremental backups
- **Content Packs**: Version-controlled with Git + S3 backup
- **Static Assets**: CDN with origin backup

### 3. Configuration Backups

#### Environment Variables
- **Encrypted Storage**: All secrets stored in encrypted vault
- **Version Control**: Non-sensitive config in Git
- **Backup Locations**: Multiple secure locations

#### Infrastructure as Code
- **Terraform State**: Remote state with locking
- **Docker Images**: Registry with retention policies
- **Kubernetes Manifests**: Version controlled

## Disaster Recovery Procedures

### 1. Recovery Time Objectives (RTO)

| Component | RTO | RPO |
|-----------|-----|-----|
| Database | 4 hours | 1 hour |
| Application | 2 hours | 15 minutes |
| Cache | 1 hour | 5 minutes |
| Static Assets | 30 minutes | 0 minutes |

### 2. Recovery Procedures

#### Database Recovery

**Full Database Restore**
```bash
# 1. Stop application services
kubectl scale deployment interview-app --replicas=0

# 2. Restore from backup
supabase db restore --backup-id <backup-id> --target-db production

# 3. Verify data integrity
supabase db verify --backup-id <backup-id>

# 4. Restart application services
kubectl scale deployment interview-app --replicas=3
```

**Point-in-Time Recovery**
```bash
# 1. Identify recovery point
supabase db list-backups --format json | jq '.[] | select(.created_at < "2024-01-15T10:30:00Z")'

# 2. Restore to specific timestamp
supabase db restore --timestamp "2024-01-15T10:30:00Z" --target-db production

# 3. Validate recovery
supabase db verify --timestamp "2024-01-15T10:30:00Z"
```

#### Application Recovery

**Complete Application Restore**
```bash
# 1. Deploy from backup
kubectl apply -f backup/manifests/

# 2. Restore environment variables
kubectl create secret generic app-secrets --from-env-file=backup/secrets.env

# 3. Restore configuration
kubectl apply -f backup/config/

# 4. Verify deployment
kubectl get pods -l app=interview-app
kubectl get services -l app=interview-app
```

#### Cache Recovery

**Redis Recovery**
```bash
# 1. Stop Redis service
kubectl scale deployment redis --replicas=0

# 2. Restore from snapshot
kubectl exec -it redis-pod -- redis-cli --rdb /backup/dump.rdb

# 3. Restart Redis
kubectl scale deployment redis --replicas=1

# 4. Verify cache
kubectl exec -it redis-pod -- redis-cli ping
```

### 3. Cross-Region Failover

#### Automated Failover
```bash
# 1. Update DNS records
aws route53 change-resource-record-sets --hosted-zone-id Z123456789 --change-batch file://failover-dns.json

# 2. Update load balancer
kubectl patch service interview-app -p '{"spec":{"externalTrafficPolicy":"Local"}}'

# 3. Verify failover
curl -I https://interview-drills.com/health
```

#### Manual Failover
```bash
# 1. Activate secondary region
kubectl config use-context secondary-region

# 2. Scale up services
kubectl scale deployment interview-app --replicas=3

# 3. Update database connections
kubectl set env deployment/interview-app DATABASE_URL=<secondary-db-url>

# 4. Verify services
kubectl get pods -l app=interview-app
```

## Backup Validation

### 1. Automated Testing

#### Daily Backup Verification
```bash
#!/bin/bash
# backup-verification.sh

# Test database backup
supabase db verify --backup-id $(date -d "yesterday" +%Y%m%d)

# Test Redis backup
redis-cli --rdb /tmp/test-restore.rdb
redis-cli ping

# Test file backup
aws s3 ls s3://backup-bucket/$(date -d "yesterday" +%Y/%m/%d)/

echo "Backup verification completed successfully"
```

#### Weekly Recovery Testing
```bash
#!/bin/bash
# recovery-test.sh

# Create test environment
kubectl create namespace recovery-test

# Restore database to test environment
supabase db restore --backup-id <backup-id> --target-db test-recovery

# Deploy test application
kubectl apply -f test-manifests/ -n recovery-test

# Run health checks
kubectl exec -it test-pod -n recovery-test -- curl localhost:3000/health

# Cleanup
kubectl delete namespace recovery-test
```

### 2. Manual Validation

#### Database Integrity Checks
```sql
-- Check table counts
SELECT
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes
FROM pg_stat_user_tables;

-- Check for corruption
SELECT * FROM pg_check_consistency();

-- Verify foreign key constraints
SELECT * FROM pg_constraint WHERE contype = 'f';
```

#### Application Health Checks
```bash
# Check application endpoints
curl -f https://interview-drills.com/health
curl -f https://interview-drills.com/api/health

# Check database connectivity
kubectl exec -it app-pod -- psql $DATABASE_URL -c "SELECT 1"

# Check Redis connectivity
kubectl exec -it app-pod -- redis-cli -h redis ping
```

## Monitoring and Alerting

### 1. Backup Monitoring

#### Backup Success Alerts
```yaml
# Prometheus alert rules
groups:
- name: backup.rules
  rules:
  - alert: BackupFailed
    expr: backup_success == 0
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Backup failed for {{ $labels.job }}"
      description: "Backup job {{ $labels.job }} has failed"

  - alert: BackupSizeAnomaly
    expr: backup_size_bytes / backup_size_bytes offset 1d > 2
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "Backup size anomaly detected"
      description: "Backup size increased by {{ $value }}x"
```

#### Recovery Time Monitoring
```yaml
- alert: RecoveryTimeExceeded
  expr: recovery_time_seconds > 14400  # 4 hours
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Recovery time exceeded RTO"
    description: "Recovery took {{ $value }}s, exceeding 4 hour RTO"
```

### 2. Health Checks

#### Automated Health Monitoring
```bash
#!/bin/bash
# health-check.sh

# Database health
if ! supabase db ping; then
    echo "Database health check failed"
    exit 1
fi

# Redis health
if ! redis-cli ping | grep -q PONG; then
    echo "Redis health check failed"
    exit 1
fi

# Application health
if ! curl -f https://interview-drills.com/health; then
    echo "Application health check failed"
    exit 1
fi

echo "All health checks passed"
```

## Emergency Procedures

### 1. Data Corruption

#### Immediate Response
```bash
# 1. Stop all write operations
kubectl scale deployment interview-app --replicas=0

# 2. Isolate affected systems
kubectl label node <node> maintenance=true

# 3. Notify stakeholders
curl -X POST https://hooks.slack.com/services/... -d '{"text":"Data corruption detected"}'

# 4. Begin recovery process
./scripts/emergency-recovery.sh
```

#### Recovery Steps
```bash
# 1. Restore from last known good backup
supabase db restore --backup-id <last-good-backup>

# 2. Validate data integrity
supabase db verify --backup-id <last-good-backup>

# 3. Test application functionality
kubectl exec -it test-pod -- npm test

# 4. Gradual service restoration
kubectl scale deployment interview-app --replicas=1
```

### 2. Complete System Failure

#### Emergency Response
```bash
# 1. Activate disaster recovery site
kubectl config use-context dr-site

# 2. Restore from cross-region backup
aws s3 sync s3://backup-bucket/latest/ s3://dr-bucket/

# 3. Deploy emergency infrastructure
terraform apply -var-file=dr.tfvars

# 4. Restore services
kubectl apply -f dr-manifests/
```

## Documentation and Training

### 1. Runbook Procedures

#### Daily Operations
- [ ] Verify backup completion
- [ ] Check backup integrity
- [ ] Monitor storage usage
- [ ] Review alert logs

#### Weekly Operations
- [ ] Test recovery procedures
- [ ] Update backup documentation
- [ ] Review disaster recovery plan
- [ ] Conduct team training

#### Monthly Operations
- [ ] Full disaster recovery drill
- [ ] Backup strategy review
- [ ] Update recovery procedures
- [ ] Security audit

### 2. Team Training

#### Backup Procedures
- Database backup and restore
- Application deployment
- Configuration management
- Monitoring and alerting

#### Disaster Recovery
- Emergency response procedures
- Cross-region failover
- Data recovery techniques
- Communication protocols

## Compliance and Audit

### 1. Audit Trail

#### Backup Logs
```bash
# Backup audit log
tail -f /var/log/backup.log | grep -E "(SUCCESS|FAILED|ERROR)"

# Recovery audit log
tail -f /var/log/recovery.log | grep -E "(START|COMPLETE|FAILED)"
```

#### Access Logs
```bash
# Database access logs
supabase db logs --filter="backup" --since="24h"

# S3 access logs
aws s3api list-objects-v2 --bucket backup-bucket --query 'Contents[?LastModified>=`2024-01-15`]'
```

### 2. Compliance Requirements

#### Data Retention
- **GDPR**: 7 years for audit logs
- **SOX**: 7 years for financial data
- **HIPAA**: 6 years for health data
- **PCI DSS**: 1 year for card data

#### Security Requirements
- **Encryption**: All backups encrypted at rest
- **Access Control**: Role-based access to backup systems
- **Audit Logging**: All backup operations logged
- **Testing**: Regular recovery testing required

## Cost Optimization

### 1. Storage Optimization

#### Lifecycle Policies
```json
{
  "Rules": [
    {
      "Id": "BackupLifecycle",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        },
        {
          "Days": 365,
          "StorageClass": "DEEP_ARCHIVE"
        }
      ]
    }
  ]
}
```

#### Compression and Deduplication
```bash
# Enable compression for backups
supabase db backup --compress --target-db production

# Deduplicate backup storage
aws s3 sync s3://backup-bucket/ s3://dedup-bucket/ --delete
```

### 2. Recovery Optimization

#### Parallel Recovery
```bash
# Parallel database restore
supabase db restore --parallel 8 --target-db production

# Parallel file restore
aws s3 sync s3://backup-bucket/ /restore/ --cli-read-timeout 0 --cli-connect-timeout 60
```

## Contact Information

### Emergency Contacts
- **On-Call Engineer**: +1-555-0123
- **Database Team**: db-team@company.com
- **Infrastructure Team**: infra-team@company.com
- **Security Team**: security@company.com

### Escalation Procedures
1. **Level 1**: On-call engineer (0-30 minutes)
2. **Level 2**: Team lead (30-60 minutes)
3. **Level 3**: Engineering manager (1-2 hours)
4. **Level 4**: CTO (2+ hours)

---

**Last Updated**: 2024-01-15
**Next Review**: 2024-04-15
**Document Owner**: DevOps Team
