#!/bin/bash

# Disaster Recovery Script
# This script provides comprehensive disaster recovery and rollback capabilities

set -euo pipefail

# Configuration
PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"
LOG_FILE="${LOG_FILE:-/var/log/disaster-recovery.log}"
RECOVERY_TYPE="${RECOVERY_TYPE:-full}"
BACKUP_DIR="${BACKUP_DIR:-/backup}"
RESTORE_DIR="${RESTORE_DIR:-/restore}"

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

# Create restore directory
mkdir -p "$RESTORE_DIR"

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."

    # Check if backup directory exists
    if [[ ! -d "$BACKUP_DIR" ]]; then
        error "Backup directory not found: $BACKUP_DIR"
        exit 1
    fi

    # Check if required tools are available
    local required_tools=("psql" "redis-cli" "curl" "jq" "tar" "gzip")

    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error "Required tool not found: $tool"
            exit 1
        fi
    done

    # Check if database is accessible
    if ! psql -h localhost -U postgres -c "SELECT 1;" &> /dev/null; then
        warning "Database not accessible - will attempt to restore"
    fi

    # Check if Redis is accessible
    if ! redis-cli ping &> /dev/null; then
        warning "Redis not accessible - will attempt to restore"
    fi

    success "Prerequisites check completed"
}

# Full system recovery
full_recovery() {
    log "Starting full system recovery..."

    # Stop all services
    stop_services

    # Recover database
    recover_database

    # Recover Redis
    recover_redis

    # Recover application files
    recover_application_files

    # Recover configuration
    recover_configuration

    # Start services
    start_services

    # Validate recovery
    validate_recovery

    success "Full system recovery completed"
}

# Database recovery
recover_database() {
    log "Recovering database..."

    # Find latest database backup
    local latest_db_backup
    latest_db_backup=$(ls -t "$BACKUP_DIR"/db_*.sql.gz | head -n 1)

    if [[ -z "$latest_db_backup" ]]; then
        error "No database backup found in $BACKUP_DIR"
        exit 1
    fi

    log "Using database backup: $latest_db_backup"

    # Drop existing database
    log "Dropping existing database..."
    psql -h localhost -U postgres -c "DROP DATABASE IF EXISTS interview_app;" || warning "Failed to drop database"

    # Create new database
    log "Creating new database..."
    psql -h localhost -U postgres -c "CREATE DATABASE interview_app;" || error "Failed to create database"

    # Restore database
    log "Restoring database from backup..."
    if gunzip -c "$latest_db_backup" | psql -h localhost -U postgres interview_app; then
        success "Database restored successfully"
    else
        error "Failed to restore database"
        exit 1
    fi

    # Verify database integrity
    log "Verifying database integrity..."
    local user_count
    user_count=$(psql -h localhost -U postgres interview_app -c "SELECT COUNT(*) FROM users;" -t | xargs)

    if [[ "$user_count" -gt 0 ]]; then
        success "Database integrity verified - $user_count users found"
    else
        warning "Database appears empty - check backup integrity"
    fi
}

# Redis recovery
recover_redis() {
    log "Recovering Redis..."

    # Find latest Redis backup
    local latest_redis_backup
    latest_redis_backup=$(ls -t "$BACKUP_DIR"/redis_*.rdb | head -n 1)

    if [[ -z "$latest_redis_backup" ]]; then
        warning "No Redis backup found in $BACKUP_DIR"
        return 0
    fi

    log "Using Redis backup: $latest_redis_backup"

    # Stop Redis
    log "Stopping Redis..."
    sudo systemctl stop redis || warning "Failed to stop Redis"

    # Copy backup to Redis data directory
    log "Copying Redis backup..."
    sudo cp "$latest_redis_backup" /var/lib/redis/dump.rdb || error "Failed to copy Redis backup"
    sudo chown redis:redis /var/lib/redis/dump.rdb || error "Failed to set Redis backup ownership"

    # Start Redis
    log "Starting Redis..."
    sudo systemctl start redis || error "Failed to start Redis"

    # Verify Redis
    if redis-cli ping &> /dev/null; then
        success "Redis recovered successfully"
    else
        error "Failed to recover Redis"
        exit 1
    fi
}

# Application files recovery
recover_application_files() {
    log "Recovering application files..."

    # Find latest application backup
    local latest_app_backup
    latest_app_backup=$(ls -t "$BACKUP_DIR"/app_*.tar.gz | head -n 1)

    if [[ -z "$latest_app_backup" ]]; then
        error "No application backup found in $BACKUP_DIR"
        exit 1
    fi

    log "Using application backup: $latest_app_backup"

    # Clear existing application directory
    log "Clearing existing application directory..."
    sudo rm -rf "$PROJECT_ROOT"/* || warning "Failed to clear application directory"

    # Restore application files
    log "Restoring application files..."
    if sudo tar -xzf "$latest_app_backup" -C "$PROJECT_ROOT" --strip-components=1; then
        success "Application files restored successfully"
    else
        error "Failed to restore application files"
        exit 1
    fi

    # Set correct permissions
    log "Setting correct permissions..."
    sudo chown -R www-data:www-data "$PROJECT_ROOT" || warning "Failed to set ownership"
    sudo chmod -R 755 "$PROJECT_ROOT" || warning "Failed to set permissions"
    sudo chmod 600 "$PROJECT_ROOT"/.env* || warning "Failed to set environment file permissions"
}

# Configuration recovery
recover_configuration() {
    log "Recovering configuration..."

    # Restore configuration files
    local config_files=(
        "/etc/nginx/sites-available/interview-app"
        "/etc/systemd/system/interview-app.service"
        "/etc/redis/redis.conf"
        "/etc/postgresql/15/main/postgresql.conf"
    )

    for config_file in "${config_files[@]}"; do
        local backup_file="$BACKUP_DIR/$(basename "$config_file")"

        if [[ -f "$backup_file" ]]; then
            log "Restoring configuration: $config_file"
            sudo cp "$backup_file" "$config_file" || warning "Failed to restore $config_file"
        else
            warning "Configuration backup not found: $backup_file"
        fi
    done

    # Restart configuration-dependent services
    log "Restarting configuration-dependent services..."
    sudo systemctl reload nginx || warning "Failed to reload nginx"
    sudo systemctl restart redis || warning "Failed to restart redis"
    sudo systemctl restart postgresql || warning "Failed to restart postgresql"
}

# Stop services
stop_services() {
    log "Stopping services..."

    local services=("interview-app" "nginx" "redis" "postgresql")

    for service in "${services[@]}"; do
        if systemctl is-active --quiet "$service"; then
            log "Stopping $service..."
            sudo systemctl stop "$service" || warning "Failed to stop $service"
        fi
    done

    success "Services stopped"
}

# Start services
start_services() {
    log "Starting services..."

    local services=("postgresql" "redis" "nginx" "interview-app")

    for service in "${services[@]}"; do
        log "Starting $service..."
        if sudo systemctl start "$service"; then
            success "$service started successfully"
        else
            error "Failed to start $service"
            exit 1
        fi
    done

    # Wait for services to be ready
    log "Waiting for services to be ready..."
    sleep 10

    # Check service status
    for service in "${services[@]}"; do
        if systemctl is-active --quiet "$service"; then
            success "$service is running"
        else
            error "$service is not running"
            exit 1
        fi
    done
}

# Validate recovery
validate_recovery() {
    log "Validating recovery..."

    # Check database connectivity
    if psql -h localhost -U postgres -c "SELECT 1;" &> /dev/null; then
        success "Database connectivity verified"
    else
        error "Database connectivity failed"
        exit 1
    fi

    # Check Redis connectivity
    if redis-cli ping &> /dev/null; then
        success "Redis connectivity verified"
    else
        error "Redis connectivity failed"
        exit 1
    fi

    # Check application health
    if curl -f http://localhost:3000/api/health &> /dev/null; then
        success "Application health verified"
    else
        error "Application health check failed"
        exit 1
    fi

    # Check nginx
    if curl -f http://localhost/ &> /dev/null; then
        success "Nginx connectivity verified"
    else
        error "Nginx connectivity failed"
        exit 1
    fi

    # Run basic functionality tests
    log "Running basic functionality tests..."

    # Test user registration
    local test_user_id
    test_user_id=$(curl -s -X POST http://localhost:3000/api/auth/register \
        -H "Content-Type: application/json" \
        -d '{"email":"test@example.com","name":"Test User"}' | jq -r '.id' 2>/dev/null || echo "")

    if [[ -n "$test_user_id" ]]; then
        success "User registration test passed"
    else
        warning "User registration test failed"
    fi

    # Test evaluation
    local evaluation_id
    evaluation_id=$(curl -s -X POST http://localhost:3000/api/evaluate \
        -H "Content-Type: application/json" \
        -d '{"userId":"'$test_user_id'","questionId":"test","response":"Test response"}' | jq -r '.id' 2>/dev/null || echo "")

    if [[ -n "$evaluation_id" ]]; then
        success "Evaluation test passed"
    else
        warning "Evaluation test failed"
    fi

    success "Recovery validation completed"
}

# Rollback to previous version
rollback_to_previous_version() {
    log "Rolling back to previous version..."

    # Get current version
    local current_version
    current_version=$(git describe --tags --abbrev=0 2>/dev/null || echo "unknown")
    log "Current version: $current_version"

    # Get previous version
    local previous_version
    previous_version=$(git describe --tags --abbrev=0 HEAD~1 2>/dev/null || echo "unknown")
    log "Previous version: $previous_version"

    if [[ "$previous_version" == "unknown" ]]; then
        error "Cannot determine previous version"
        exit 1
    fi

    # Stop services
    stop_services

    # Rollback code
    log "Rolling back code to $previous_version..."
    git checkout "$previous_version" || error "Failed to checkout previous version"

    # Install dependencies
    log "Installing dependencies..."
    npm install || error "Failed to install dependencies"

    # Build application
    log "Building application..."
    npm run build || error "Failed to build application"

    # Rollback database schema if needed
    log "Checking database schema version..."
    local current_schema_version
    current_schema_version=$(psql -h localhost -U postgres interview_app -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;" -t 2>/dev/null | xargs || echo "unknown")

    if [[ "$current_schema_version" != "unknown" ]]; then
        log "Current schema version: $current_schema_version"

        # Determine target schema version based on code version
        local target_schema_version
        case "$previous_version" in
            "v1.0.0")
                target_schema_version="1.0.0"
                ;;
            "v1.1.0")
                target_schema_version="1.1.0"
                ;;
            "v1.2.0")
                target_schema_version="1.2.0"
                ;;
            *)
                warning "Unknown version, skipping schema rollback"
                target_schema_version=""
                ;;
        esac

        if [[ -n "$target_schema_version" && "$current_schema_version" != "$target_schema_version" ]]; then
            log "Rolling back database schema to $target_schema_version..."
            ./scripts/migrate.sh rollback-to "$target_schema_version" || warning "Failed to rollback database schema"
        fi
    fi

    # Start services
    start_services

    # Validate rollback
    validate_recovery

    success "Rollback to $previous_version completed"
}

# Emergency recovery
emergency_recovery() {
    log "Starting emergency recovery..."

    # This is a minimal recovery procedure for critical situations
    # It focuses on getting the system back online as quickly as possible

    # Stop all services
    stop_services

    # Restore from latest backup without validation
    log "Performing emergency database restore..."
    local latest_db_backup
    latest_db_backup=$(ls -t "$BACKUP_DIR"/db_*.sql.gz | head -n 1)

    if [[ -n "$latest_db_backup" ]]; then
        psql -h localhost -U postgres -c "DROP DATABASE IF EXISTS interview_app;"
        psql -h localhost -U postgres -c "CREATE DATABASE interview_app;"
        gunzip -c "$latest_db_backup" | psql -h localhost -U postgres interview_app
    fi

    # Start essential services only
    log "Starting essential services..."
    sudo systemctl start postgresql
    sudo systemctl start redis
    sudo systemctl start nginx

    # Deploy minimal application
    log "Deploying minimal application..."
    git checkout v1.0.0  # Use stable version
    npm install --production
    npm run build
    sudo systemctl start interview-app

    # Basic health check
    sleep 5
    if curl -f http://localhost:3000/api/health &> /dev/null; then
        success "Emergency recovery completed - system is online"
    else
        error "Emergency recovery failed - manual intervention required"
        exit 1
    fi
}

# Show usage
usage() {
    echo "Usage: $0 [OPTIONS] [RECOVERY_TYPE]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -p, --project-root  Project root directory (default: current directory)"
    echo "  -l, --log-file      Log file path (default: /var/log/disaster-recovery.log)"
    echo "  -b, --backup-dir    Backup directory (default: /backup)"
    echo "  -r, --restore-dir   Restore directory (default: /restore)"
    echo ""
    echo "Recovery Types:"
    echo "  full                Full system recovery (default)"
    echo "  database            Database recovery only"
    echo "  redis               Redis recovery only"
    echo "  application         Application files recovery only"
    echo "  configuration       Configuration recovery only"
    echo "  rollback            Rollback to previous version"
    echo "  emergency           Emergency recovery (minimal)"
    echo ""
    echo "Examples:"
    echo "  $0 full                              # Full system recovery"
    echo "  $0 database                          # Database recovery only"
    echo "  $0 rollback                          # Rollback to previous version"
    echo "  $0 emergency                         # Emergency recovery"
    echo "  $0 -b /custom/backup full            # Full recovery from custom backup"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            exit 0
            ;;
        -p|--project-root)
            PROJECT_ROOT="$2"
            shift 2
            ;;
        -l|--log-file)
            LOG_FILE="$2"
            shift 2
            ;;
        -b|--backup-dir)
            BACKUP_DIR="$2"
            shift 2
            ;;
        -r|--restore-dir)
            RESTORE_DIR="$2"
            shift 2
            ;;
        full|database|redis|application|configuration|rollback|emergency)
            RECOVERY_TYPE="$1"
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
    log "Starting disaster recovery: $RECOVERY_TYPE"
    log "Project root: $PROJECT_ROOT"
    log "Backup directory: $BACKUP_DIR"
    log "Restore directory: $RESTORE_DIR"

    # Change to project root
    cd "$PROJECT_ROOT"

    # Check prerequisites
    check_prerequisites

    # Execute recovery based on type
    case "$RECOVERY_TYPE" in
        "full")
            full_recovery
            ;;
        "database")
            recover_database
            ;;
        "redis")
            recover_redis
            ;;
        "application")
            recover_application_files
            ;;
        "configuration")
            recover_configuration
            ;;
        "rollback")
            rollback_to_previous_version
            ;;
        "emergency")
            emergency_recovery
            ;;
        *)
            error "Unknown recovery type: $RECOVERY_TYPE"
            usage
            exit 1
            ;;
    esac

    success "Disaster recovery completed successfully!"
    log "Check the log file for details: $LOG_FILE"
}

# Run main function
main "$@"
