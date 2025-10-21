#!/bin/bash

# Emergency Recovery Script
# This script provides automated recovery procedures for disaster scenarios

set -euo pipefail

# Configuration
LOG_FILE="/var/log/emergency-recovery.log"
ALERT_WEBHOOK="${ALERT_WEBHOOK:-}"
BACKUP_BUCKET="${BACKUP_BUCKET:-interview-drills-backups}"
DR_SITE="${DR_SITE:-false}"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Alert function
alert() {
    local message="$1"
    log "ALERT: $message"

    if [[ -n "$ALERT_WEBHOOK" ]]; then
        curl -X POST "$ALERT_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"Emergency Recovery Alert: $message\"}" \
            || log "Failed to send alert to webhook"
    fi
}

# Stop all services
stop_services() {
    log "Stopping all application services..."

    # Scale down application
    kubectl scale deployment interview-app --replicas=0 || log "Failed to scale down interview-app"
    kubectl scale deployment redis --replicas=0 || log "Failed to scale down redis"
    kubectl scale deployment postgres --replicas=0 || log "Failed to scale down postgres"

    # Wait for pods to terminate
    kubectl wait --for=delete pod -l app=interview-app --timeout=300s || log "Timeout waiting for interview-app pods"
    kubectl wait --for=delete pod -l app=redis --timeout=300s || log "Timeout waiting for redis pods"
    kubectl wait --for=delete pod -l app=postgres --timeout=300s || log "Timeout waiting for postgres pods"

    log "All services stopped"
}

# Restore database
restore_database() {
    local backup_id="$1"

    log "Restoring database from backup: $backup_id"

    # Check if Supabase CLI is available
    if ! command -v supabase &> /dev/null; then
        alert "Supabase CLI not found - cannot restore database"
        return 1
    fi

    # Restore database
    if ! supabase db restore --backup-id "$backup_id" --target-db production; then
        alert "Database restore failed for backup: $backup_id"
        return 1
    fi

    # Verify restore
    if ! supabase db verify --backup-id "$backup_id"; then
        alert "Database restore verification failed for backup: $backup_id"
        return 1
    fi

    log "Database restored successfully from backup: $backup_id"
    return 0
}

# Restore Redis
restore_redis() {
    log "Restoring Redis from backup..."

    # Check if Redis CLI is available
    if ! command -v redis-cli &> /dev/null; then
        alert "Redis CLI not found - cannot restore Redis"
        return 1
    fi

    # Find latest Redis backup
    local redis_backup
    redis_backup=$(find /var/lib/redis/backups -name "dump-*.rdb" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)

    if [[ -z "$redis_backup" ]]; then
        alert "No Redis backup found"
        return 1
    fi

    # Stop Redis
    kubectl scale deployment redis --replicas=0
    kubectl wait --for=delete pod -l app=redis --timeout=300s

    # Restore Redis data
    kubectl create configmap redis-backup --from-file=dump.rdb="$redis_backup" || log "Failed to create Redis backup configmap"

    # Start Redis
    kubectl scale deployment redis --replicas=1
    kubectl wait --for=condition=ready pod -l app=redis --timeout=300s

    # Verify Redis
    if ! kubectl exec -it $(kubectl get pods -l app=redis -o jsonpath='{.items[0].metadata.name}') -- redis-cli ping | grep -q PONG; then
        alert "Redis restore verification failed"
        return 1
    fi

    log "Redis restored successfully from backup: $redis_backup"
    return 0
}

# Restore application
restore_application() {
    log "Restoring application..."

    # Check if Kubernetes CLI is available
    if ! command -v kubectl &> /dev/null; then
        alert "Kubectl not found - cannot restore application"
        return 1
    fi

    # Apply application manifests
    if [[ -d "/backup/manifests" ]]; then
        kubectl apply -f /backup/manifests/ || log "Failed to apply application manifests"
    else
        alert "Application manifests backup not found"
        return 1
    fi

    # Restore secrets
    if [[ -f "/backup/secrets.env" ]]; then
        kubectl create secret generic app-secrets --from-env-file=/backup/secrets.env --dry-run=client -o yaml | kubectl apply -f - || log "Failed to restore secrets"
    else
        alert "Secrets backup not found"
        return 1
    fi

    # Restore configuration
    if [[ -d "/backup/config" ]]; then
        kubectl apply -f /backup/config/ || log "Failed to apply configuration"
    else
        alert "Configuration backup not found"
        return 1
    fi

    # Wait for application to be ready
    kubectl wait --for=condition=ready pod -l app=interview-app --timeout=600s || log "Timeout waiting for application pods"

    log "Application restored successfully"
    return 0
}

# Restore files
restore_files() {
    log "Restoring files from S3 backup..."

    # Check if AWS CLI is available
    if ! command -v aws &> /dev/null; then
        alert "AWS CLI not found - cannot restore files"
        return 1
    fi

    # Restore files from S3
    if ! aws s3 sync "s3://$BACKUP_BUCKET/files/" /restore/ --delete; then
        alert "Failed to restore files from S3"
        return 1
    fi

    # Verify restored files
    local file_count
    file_count=$(find /restore -type f | wc -l)

    if [[ "$file_count" -eq 0 ]]; then
        alert "No files restored from S3 backup"
        return 1
    fi

    log "Files restored successfully ($file_count files)"
    return 0
}

# Verify recovery
verify_recovery() {
    log "Verifying recovery..."

    # Check application health
    local app_pods
    app_pods=$(kubectl get pods -l app=interview-app --field-selector=status.phase=Running --no-headers | wc -l)

    if [[ "$app_pods" -eq 0 ]]; then
        alert "No healthy application pods found after recovery"
        return 1
    fi

    # Check database connectivity
    if ! kubectl exec -it $(kubectl get pods -l app=interview-app -o jsonpath='{.items[0].metadata.name}') -- psql "$DATABASE_URL" -c "SELECT 1" &> /dev/null; then
        alert "Database connectivity check failed after recovery"
        return 1
    fi

    # Check Redis connectivity
    if ! kubectl exec -it $(kubectl get pods -l app=interview-app -o jsonpath='{.items[0].metadata.name}') -- redis-cli -h redis ping | grep -q PONG; then
        alert "Redis connectivity check failed after recovery"
        return 1
    fi

    # Check application endpoints
    local app_url
    app_url=$(kubectl get service interview-app -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

    if [[ -n "$app_url" ]]; then
        if ! curl -f "http://$app_url/health" &> /dev/null; then
            alert "Application health endpoint check failed after recovery"
            return 1
        fi
    fi

    log "Recovery verification passed"
    return 0
}

# Cross-region failover
cross_region_failover() {
    log "Initiating cross-region failover..."

    # Update DNS records
    if [[ -f "/backup/dns-records.json" ]]; then
        aws route53 change-resource-record-sets --hosted-zone-id "$HOSTED_ZONE_ID" --change-batch file:///backup/dns-records.json || log "Failed to update DNS records"
    else
        alert "DNS records backup not found"
        return 1
    fi

    # Update load balancer
    kubectl patch service interview-app -p '{"spec":{"externalTrafficPolicy":"Local"}}' || log "Failed to update load balancer"

    # Wait for DNS propagation
    sleep 60

    # Verify failover
    if ! curl -f "https://interview-drills.com/health" &> /dev/null; then
        alert "Cross-region failover verification failed"
        return 1
    fi

    log "Cross-region failover completed successfully"
    return 0
}

# Main recovery function
main() {
    local recovery_type="${1:-full}"
    local backup_id="${2:-}"

    log "Starting emergency recovery process (type: $recovery_type)"

    case "$recovery_type" in
        "full")
            if [[ -z "$backup_id" ]]; then
                alert "Backup ID required for full recovery"
                exit 1
            fi

            stop_services
            restore_database "$backup_id"
            restore_redis
            restore_application
            restore_files
            verify_recovery
            ;;
        "database")
            if [[ -z "$backup_id" ]]; then
                alert "Backup ID required for database recovery"
                exit 1
            fi

            stop_services
            restore_database "$backup_id"
            restore_application
            verify_recovery
            ;;
        "application")
            restore_application
            verify_recovery
            ;;
        "failover")
            cross_region_failover
            ;;
        *)
            alert "Unknown recovery type: $recovery_type"
            exit 1
            ;;
    esac

    log "Emergency recovery process completed successfully"
}

# Show usage
usage() {
    echo "Usage: $0 <recovery_type> [backup_id]"
    echo ""
    echo "Recovery types:"
    echo "  full       - Full system recovery (requires backup_id)"
    echo "  database   - Database recovery only (requires backup_id)"
    echo "  application - Application recovery only"
    echo "  failover   - Cross-region failover"
    echo ""
    echo "Examples:"
    echo "  $0 full backup-20240115-020000"
    echo "  $0 database backup-20240115-020000"
    echo "  $0 application"
    echo "  $0 failover"
}

# Check arguments
if [[ $# -lt 1 ]]; then
    usage
    exit 1
fi

# Run main function
main "$@"
