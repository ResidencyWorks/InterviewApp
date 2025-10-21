#!/bin/bash

# Backup Verification Script
# This script verifies the integrity and completeness of all backup systems

set -euo pipefail

# Configuration
LOG_FILE="/var/log/backup-verification.log"
ALERT_WEBHOOK="${ALERT_WEBHOOK:-}"
BACKUP_BUCKET="${BACKUP_BUCKET:-interview-drills-backups}"
DATABASE_URL="${DATABASE_URL:-}"

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
            -d "{\"text\":\"Backup Verification Alert: $message\"}" \
            || log "Failed to send alert to webhook"
    fi
}

# Database backup verification
verify_database_backup() {
    log "Verifying database backup..."

    # Check if Supabase CLI is available
    if ! command -v supabase &> /dev/null; then
        alert "Supabase CLI not found"
        return 1
    fi

    # Get latest backup
    local latest_backup
    latest_backup=$(supabase db list-backups --format json | jq -r '.[0].id' 2>/dev/null || echo "")

    if [[ -z "$latest_backup" ]]; then
        alert "No database backups found"
        return 1
    fi

    # Verify backup integrity
    if ! supabase db verify --backup-id "$latest_backup"; then
        alert "Database backup verification failed for backup $latest_backup"
        return 1
    fi

    log "Database backup verification passed for backup $latest_backup"
    return 0
}

# Redis backup verification
verify_redis_backup() {
    log "Verifying Redis backup..."

    # Check if Redis CLI is available
    if ! command -v redis-cli &> /dev/null; then
        alert "Redis CLI not found"
        return 1
    fi

    # Test Redis connection
    if ! redis-cli ping | grep -q PONG; then
        alert "Redis connection failed"
        return 1
    fi

    # Check if backup file exists
    local backup_file="/var/lib/redis/dump.rdb"
    if [[ ! -f "$backup_file" ]]; then
        alert "Redis backup file not found: $backup_file"
        return 1
    fi

    # Check backup file size (should be > 0)
    local backup_size
    backup_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null || echo "0")

    if [[ "$backup_size" -eq 0 ]]; then
        alert "Redis backup file is empty"
        return 1
    fi

    log "Redis backup verification passed (size: $backup_size bytes)"
    return 0
}

# S3 backup verification
verify_s3_backup() {
    log "Verifying S3 backup..."

    # Check if AWS CLI is available
    if ! command -v aws &> /dev/null; then
        alert "AWS CLI not found"
        return 1
    fi

    # Check if bucket exists and is accessible
    if ! aws s3 ls "s3://$BACKUP_BUCKET" &> /dev/null; then
        alert "S3 backup bucket not accessible: $BACKUP_BUCKET"
        return 1
    fi

    # Check for recent backups (last 24 hours)
    local recent_backups
    recent_backups=$(aws s3 ls "s3://$BACKUP_BUCKET/" --recursive | \
        awk '$1 >= "'$(date -d "yesterday" '+%Y-%m-%d')'" {print $0}' | wc -l)

    if [[ "$recent_backups" -eq 0 ]]; then
        alert "No recent S3 backups found in the last 24 hours"
        return 1
    fi

    log "S3 backup verification passed ($recent_backups recent backups found)"
    return 0
}

# Application backup verification
verify_application_backup() {
    log "Verifying application backup..."

    # Check if Kubernetes CLI is available
    if ! command -v kubectl &> /dev/null; then
        alert "Kubectl not found"
        return 1
    fi

    # Check if application is running
    local app_pods
    app_pods=$(kubectl get pods -l app=interview-app --no-headers | wc -l)

    if [[ "$app_pods" -eq 0 ]]; then
        alert "No application pods found"
        return 1
    fi

    # Check if application is healthy
    local healthy_pods
    healthy_pods=$(kubectl get pods -l app=interview-app --field-selector=status.phase=Running --no-headers | wc -l)

    if [[ "$healthy_pods" -eq 0 ]]; then
        alert "No healthy application pods found"
        return 1
    fi

    log "Application backup verification passed ($healthy_pods/$app_pods pods healthy)"
    return 0
}

# File system backup verification
verify_filesystem_backup() {
    log "Verifying filesystem backup..."

    # Check critical directories
    local critical_dirs=(
        "/var/lib/app"
        "/etc/kubernetes"
        "/var/log"
    )

    for dir in "${critical_dirs[@]}"; do
        if [[ ! -d "$dir" ]]; then
            alert "Critical directory not found: $dir"
            return 1
        fi

        # Check if directory has content
        if [[ -z "$(ls -A "$dir" 2>/dev/null)" ]]; then
            alert "Critical directory is empty: $dir"
            return 1
        fi
    done

    log "Filesystem backup verification passed"
    return 0
}

# Main verification function
main() {
    log "Starting backup verification process..."

    local failed_checks=0

    # Run all verification checks
    verify_database_backup || ((failed_checks++))
    verify_redis_backup || ((failed_checks++))
    verify_s3_backup || ((failed_checks++))
    verify_application_backup || ((failed_checks++))
    verify_filesystem_backup || ((failed_checks++))

    # Summary
    if [[ "$failed_checks" -eq 0 ]]; then
        log "All backup verifications passed successfully"
        exit 0
    else
        alert "Backup verification failed: $failed_checks checks failed"
        exit 1
    fi
}

# Run main function
main "$@"
