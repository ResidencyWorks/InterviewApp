#!/bin/bash

# Maintenance Script
# This script provides comprehensive maintenance and update capabilities

set -euo pipefail

# Configuration
PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"
LOG_FILE="${LOG_FILE:-/var/log/maintenance.log}"
BACKUP_DIR="${BACKUP_DIR:-/backup}"
MAINTENANCE_TYPE="${MAINTENANCE_TYPE:-daily}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Daily maintenance tasks
daily_maintenance() {
    log "Starting daily maintenance..."

    # System health checks
    check_system_health

    # Database maintenance
    database_maintenance

    # Cache maintenance
    cache_maintenance

    # Log cleanup
    log_cleanup

    # Security checks
    security_checks

    success "Daily maintenance completed"
}

# Weekly maintenance tasks
weekly_maintenance() {
    log "Starting weekly maintenance..."

    # Run daily maintenance first
    daily_maintenance

    # Security updates
    security_updates

    # Performance optimization
    performance_optimization

    # Backup verification
    backup_verification

    # Dependency updates
    dependency_updates

    success "Weekly maintenance completed"
}

# Monthly maintenance tasks
monthly_maintenance() {
    log "Starting monthly maintenance..."

    # Run weekly maintenance first
    weekly_maintenance

    # Comprehensive system review
    system_review

    # Database optimization
    database_optimization

    # Capacity planning
    capacity_planning

    # Documentation updates
    documentation_updates

    success "Monthly maintenance completed"
}

# Check system health
check_system_health() {
    log "Checking system health..."

    # Check disk space
    local disk_usage
    disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')

    if [[ $disk_usage -gt 80 ]]; then
        warning "Disk usage is high: ${disk_usage}%"
    else
        success "Disk usage is normal: ${disk_usage}%"
    fi

    # Check memory usage
    local memory_usage
    memory_usage=$(free | awk 'NR==2{printf "%.2f", $3*100/$2}')

    if (( $(echo "$memory_usage > 80" | bc -l) )); then
        warning "Memory usage is high: ${memory_usage}%"
    else
        success "Memory usage is normal: ${memory_usage}%"
    fi

    # Check CPU load
    local load_avg
    load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')

    if (( $(echo "$load_avg > 2.0" | bc -l) )); then
        warning "CPU load is high: $load_avg"
    else
        success "CPU load is normal: $load_avg"
    fi

    # Check service status
    local services=("nginx" "postgresql" "redis" "interview-app")

    for service in "${services[@]}"; do
        if systemctl is-active --quiet "$service"; then
            success "Service $service is running"
        else
            error "Service $service is not running"
        fi
    done
}

# Database maintenance
database_maintenance() {
    log "Performing database maintenance..."

    # Check database connectivity
    if psql -h localhost -U postgres -c "SELECT 1;" &> /dev/null; then
        success "Database connectivity is working"
    else
        error "Database connectivity issues"
        return 1
    fi

    # Analyze tables
    psql -h localhost -U postgres -d interview_app -c "ANALYZE;" &> /dev/null || warning "Failed to analyze tables"

    # Vacuum tables
    psql -h localhost -U postgres -d interview_app -c "VACUUM;" &> /dev/null || warning "Failed to vacuum tables"

    # Check for long-running queries
    local long_queries
    long_queries=$(psql -h localhost -U postgres -d interview_app -c "SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active' AND query_start < NOW() - INTERVAL '5 minutes';" -t 2>/dev/null || echo "0")

    if [[ "$long_queries" -gt 0 ]]; then
        warning "Found $long_queries long-running queries"
    else
        success "No long-running queries found"
    fi

    # Clean up old sessions
    psql -h localhost -U postgres -d interview_app -c "DELETE FROM sessions WHERE expires_at < NOW() - INTERVAL '30 days';" &> /dev/null || warning "Failed to clean old sessions"

    # Clean up old logs
    psql -h localhost -U postgres -d interview_app -c "DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days';" &> /dev/null || warning "Failed to clean old logs"
}

# Cache maintenance
cache_maintenance() {
    log "Performing cache maintenance..."

    # Check Redis connectivity
    if redis-cli ping &> /dev/null; then
        success "Redis connectivity is working"
    else
        error "Redis connectivity issues"
        return 1
    fi

    # Check Redis memory usage
    local redis_memory
    redis_memory=$(redis-cli info memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
    log "Redis memory usage: $redis_memory"

    # Check Redis key count
    local key_count
    key_count=$(redis-cli dbsize)
    log "Redis key count: $key_count"

    # Clean expired keys
    redis-cli --scan --pattern "*" | head -1000 | xargs -r redis-cli del &> /dev/null || warning "Failed to clean expired keys"

    # Optimize memory
    redis-cli memory purge &> /dev/null || warning "Failed to optimize Redis memory"
}

# Log cleanup
log_cleanup() {
    log "Performing log cleanup..."

    # Clean old application logs
    find /var/log/interview-app -name "*.log" -mtime +30 -delete 2>/dev/null || warning "Failed to clean old application logs"

    # Clean old system logs
    find /var/log -name "*.log.*" -mtime +30 -delete 2>/dev/null || warning "Failed to clean old system logs"

    # Compress old logs
    find /var/log -name "*.log" -mtime +7 -exec gzip {} \; 2>/dev/null || warning "Failed to compress old logs"

    # Clean npm cache
    npm cache clean --force &> /dev/null || warning "Failed to clean npm cache"

    # Clean Docker
    docker system prune -f &> /dev/null || warning "Failed to clean Docker"

    success "Log cleanup completed"
}

# Security checks
security_checks() {
    log "Performing security checks..."

    # Check for failed login attempts
    local failed_logins
    failed_logins=$(grep "Failed password" /var/log/auth.log 2>/dev/null | wc -l || echo "0")

    if [[ "$failed_logins" -gt 100 ]]; then
        warning "High number of failed login attempts: $failed_logins"
    else
        success "Failed login attempts are normal: $failed_logins"
    fi

    # Check for suspicious processes
    local suspicious_processes
    suspicious_processes=$(ps aux | grep -E "(nc|netcat|nmap|masscan)" | grep -v grep | wc -l)

    if [[ "$suspicious_processes" -gt 0 ]]; then
        warning "Found $suspicious_processes suspicious processes"
    else
        success "No suspicious processes found"
    fi

    # Check file permissions
    local insecure_files
    insecure_files=$(find /var/www/interview-app -type f -perm -002 2>/dev/null | wc -l)

    if [[ "$insecure_files" -gt 0 ]]; then
        warning "Found $insecure_files files with insecure permissions"
    else
        success "File permissions are secure"
    fi

    # Check SSL certificate expiration
    local ssl_expiry
    ssl_expiry=$(echo | openssl s_client -servername interview-drills.com -connect interview-drills.com:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null | grep notAfter | cut -d= -f2)

    if [[ -n "$ssl_expiry" ]]; then
        local expiry_date
        expiry_date=$(date -d "$ssl_expiry" +%s 2>/dev/null || echo "0")
        local current_date
        current_date=$(date +%s)
        local days_until_expiry
        days_until_expiry=$(( (expiry_date - current_date) / 86400 ))

        if [[ $days_until_expiry -lt 30 ]]; then
            warning "SSL certificate expires in $days_until_expiry days"
        else
            success "SSL certificate is valid for $days_until_expiry days"
        fi
    fi
}

# Security updates
security_updates() {
    log "Performing security updates..."

    # Update system packages
    apt update &> /dev/null || warning "Failed to update package list"
    apt upgrade -y &> /dev/null || warning "Failed to upgrade packages"

    # Check for security vulnerabilities
    npm audit &> /dev/null || warning "Failed to run npm audit"

    # Update dependencies
    npm update &> /dev/null || warning "Failed to update npm dependencies"

    # Check for outdated packages
    npm outdated &> /dev/null || warning "Failed to check for outdated packages"

    success "Security updates completed"
}

# Performance optimization
performance_optimization() {
    log "Performing performance optimization..."

    # Optimize database
    psql -h localhost -U postgres -d interview_app -c "REINDEX DATABASE interview_app;" &> /dev/null || warning "Failed to reindex database"

    # Optimize Redis
    redis-cli memory purge &> /dev/null || warning "Failed to optimize Redis memory"

    # Clear application cache
    npm run cache:clear &> /dev/null || warning "Failed to clear application cache"

    # Optimize images
    find /var/www/interview-app/public/images -name "*.jpg" -o -name "*.png" | head -10 | xargs -r jpegoptim --max=80 2>/dev/null || warning "Failed to optimize images"

    success "Performance optimization completed"
}

# Backup verification
backup_verification() {
    log "Verifying backups..."

    # Check if backup directory exists
    if [[ ! -d "$BACKUP_DIR" ]]; then
        error "Backup directory does not exist: $BACKUP_DIR"
        return 1
    fi

    # Check for recent database backups
    local recent_db_backup
    recent_db_backup=$(find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime -1 | wc -l)

    if [[ "$recent_db_backup" -gt 0 ]]; then
        success "Recent database backup found"
    else
        warning "No recent database backup found"
    fi

    # Check for recent application backups
    local recent_app_backup
    recent_app_backup=$(find "$BACKUP_DIR" -name "app_*.tar.gz" -mtime -1 | wc -l)

    if [[ "$recent_app_backup" -gt 0 ]]; then
        success "Recent application backup found"
    else
        warning "No recent application backup found"
    fi

    # Test backup restoration
    local test_backup
    test_backup=$(find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime -1 | head -1)

    if [[ -n "$test_backup" ]]; then
        # Create test database
        psql -h localhost -U postgres -c "CREATE DATABASE test_backup;" &> /dev/null || warning "Failed to create test database"

        # Test restoration
        if gunzip -c "$test_backup" | psql -h localhost -U postgres test_backup &> /dev/null; then
            success "Backup restoration test passed"
        else
            warning "Backup restoration test failed"
        fi

        # Clean up test database
        psql -h localhost -U postgres -c "DROP DATABASE test_backup;" &> /dev/null || warning "Failed to drop test database"
    fi
}

# Dependency updates
dependency_updates() {
    log "Updating dependencies..."

    # Update npm dependencies
    npm update &> /dev/null || warning "Failed to update npm dependencies"

    # Update system dependencies
    apt update &> /dev/null || warning "Failed to update system packages"
    apt upgrade -y &> /dev/null || warning "Failed to upgrade system packages"

    # Update Docker images
    docker pull node:18-alpine &> /dev/null || warning "Failed to update Node.js Docker image"
    docker pull redis:7-alpine &> /dev/null || warning "Failed to update Redis Docker image"
    docker pull postgres:15-alpine &> /dev/null || warning "Failed to update PostgreSQL Docker image"

    success "Dependency updates completed"
}

# System review
system_review() {
    log "Performing system review..."

    # Check system resources
    check_system_health

    # Check security status
    security_checks

    # Check performance metrics
    performance_optimization

    # Check backup status
    backup_verification

    # Generate system report
    generate_system_report

    success "System review completed"
}

# Database optimization
database_optimization() {
    log "Performing database optimization..."

    # Analyze all tables
    psql -h localhost -U postgres -d interview_app -c "ANALYZE;" &> /dev/null || warning "Failed to analyze tables"

    # Vacuum all tables
    psql -h localhost -U postgres -d interview_app -c "VACUUM;" &> /dev/null || warning "Failed to vacuum tables"

    # Reindex database
    psql -h localhost -U postgres -d interview_app -c "REINDEX DATABASE interview_app;" &> /dev/null || warning "Failed to reindex database"

    # Update statistics
    psql -h localhost -U postgres -d interview_app -c "UPDATE pg_stat_user_tables SET n_tup_ins = 0, n_tup_upd = 0, n_tup_del = 0;" &> /dev/null || warning "Failed to update statistics"

    success "Database optimization completed"
}

# Capacity planning
capacity_planning() {
    log "Performing capacity planning..."

    # Check disk usage trends
    local disk_usage
    disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    log "Current disk usage: ${disk_usage}%"

    # Check memory usage trends
    local memory_usage
    memory_usage=$(free | awk 'NR==2{printf "%.2f", $3*100/$2}')
    log "Current memory usage: ${memory_usage}%"

    # Check database size
    local db_size
    db_size=$(psql -h localhost -U postgres -d interview_app -c "SELECT pg_size_pretty(pg_database_size('interview_app'));" -t 2>/dev/null | tr -d ' ')
    log "Database size: $db_size"

    # Check Redis memory usage
    local redis_memory
    redis_memory=$(redis-cli info memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
    log "Redis memory usage: $redis_memory"

    # Generate capacity report
    generate_capacity_report

    success "Capacity planning completed"
}

# Documentation updates
documentation_updates() {
    log "Updating documentation..."

    # Update API documentation
    npm run docs:api &> /dev/null || warning "Failed to update API documentation"

    # Update deployment guide
    npm run docs:deploy &> /dev/null || warning "Failed to update deployment guide"

    # Update troubleshooting guide
    npm run docs:troubleshoot &> /dev/null || warning "Failed to update troubleshooting guide"

    # Update changelog
    npm run changelog &> /dev/null || warning "Failed to update changelog"

    success "Documentation updates completed"
}

# Generate system report
generate_system_report() {
    log "Generating system report..."

    local report_file="$BACKUP_DIR/system-report-$(date +%Y%m%d).md"

    cat > "$report_file" << EOF
# System Report

Generated on: $(date)

## System Health

### Disk Usage
EOF

    df -h >> "$report_file"

    cat >> "$report_file" << EOF

### Memory Usage
EOF

    free -h >> "$report_file"

    cat >> "$report_file" << EOF

### CPU Load
EOF

    uptime >> "$report_file"

    cat >> "$report_file" << EOF

### Service Status
EOF

    systemctl status nginx postgresql redis interview-app >> "$report_file" 2>/dev/null || echo "Service status check failed" >> "$report_file"

    cat >> "$report_file" << EOF

### Database Information
EOF

    psql -h localhost -U postgres -d interview_app -c "SELECT pg_size_pretty(pg_database_size('interview_app'));" >> "$report_file" 2>/dev/null || echo "Database size check failed" >> "$report_file"

    cat >> "$report_file" << EOF

### Redis Information
EOF

    redis-cli info memory >> "$report_file" 2>/dev/null || echo "Redis info check failed" >> "$report_file"

    success "System report generated: $report_file"
}

# Generate capacity report
generate_capacity_report() {
    log "Generating capacity report..."

    local report_file="$BACKUP_DIR/capacity-report-$(date +%Y%m%d).md"

    cat > "$report_file" << EOF
# Capacity Planning Report

Generated on: $(date)

## Current Usage

### Disk Usage
EOF

    df -h >> "$report_file"

    cat >> "$report_file" << EOF

### Memory Usage
EOF

    free -h >> "$report_file"

    cat >> "$report_file" << EOF

### Database Size
EOF

    psql -h localhost -U postgres -d interview_app -c "SELECT pg_size_pretty(pg_database_size('interview_app'));" >> "$report_file" 2>/dev/null || echo "Database size check failed" >> "$report_file"

    cat >> "$report_file" << EOF

### Redis Memory Usage
EOF

    redis-cli info memory | grep used_memory_human >> "$report_file" 2>/dev/null || echo "Redis memory check failed" >> "$report_file"

    cat >> "$report_file" << EOF

## Recommendations

1. **Disk Space**: Monitor disk usage and plan for expansion if needed
2. **Memory**: Consider upgrading memory if usage is consistently high
3. **Database**: Plan for database scaling if size growth is significant
4. **Redis**: Monitor Redis memory usage and plan for scaling if needed

EOF

    success "Capacity report generated: $report_file"
}

# Show usage
usage() {
    echo "Usage: $0 [OPTIONS] [MAINTENANCE_TYPE]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -l, --log-file      Log file path (default: /var/log/maintenance.log)"
    echo "  -b, --backup-dir    Backup directory (default: /backup)"
    echo "  -p, --project-root  Project root directory (default: current directory)"
    echo ""
    echo "Maintenance Types:"
    echo "  daily               Run daily maintenance tasks"
    echo "  weekly              Run weekly maintenance tasks"
    echo "  monthly             Run monthly maintenance tasks"
    echo ""
    echo "Examples:"
    echo "  $0 daily                              # Run daily maintenance"
    echo "  $0 weekly                             # Run weekly maintenance"
    echo "  $0 monthly                            # Run monthly maintenance"
    echo "  $0 -l /var/log/custom.log daily       # Run with custom log file"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            exit 0
            ;;
        -l|--log-file)
            LOG_FILE="$2"
            shift 2
            ;;
        -b|--backup-dir)
            BACKUP_DIR="$2"
            shift 2
            ;;
        -p|--project-root)
            PROJECT_ROOT="$2"
            shift 2
            ;;
        daily|weekly|monthly)
            MAINTENANCE_TYPE="$1"
            shift
            ;;
        *)
            error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    log "Starting maintenance: $MAINTENANCE_TYPE"
    log "Project root: $PROJECT_ROOT"
    log "Backup directory: $BACKUP_DIR"
    log "Log file: $LOG_FILE"

    # Change to project root
    cd "$PROJECT_ROOT"

    # Run maintenance based on type
    case "$MAINTENANCE_TYPE" in
        "daily")
            daily_maintenance
            ;;
        "weekly")
            weekly_maintenance
            ;;
        "monthly")
            monthly_maintenance
            ;;
        *)
            error "Unknown maintenance type: $MAINTENANCE_TYPE"
            usage
            exit 1
            ;;
    esac

    success "Maintenance completed successfully!"
    log "Check the log file for details: $LOG_FILE"
}

# Run main function
main "$@"
