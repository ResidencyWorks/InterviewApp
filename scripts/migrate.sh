#!/bin/bash

# Supabase Migration Script
# This script provides database migration capabilities using Supabase CLI

set -euo pipefail

# Configuration
PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"
LOG_FILE="${LOG_FILE:-/var/log/migration.log}"

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

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."

    # Check if Supabase CLI is available
    if ! command -v supabase &> /dev/null; then
        error "Supabase CLI is not installed. Please install it first:"
        error "npm install -g supabase"
        exit 1
    fi

    # Check if project has supabase directory
    if [[ ! -d "$PROJECT_ROOT/supabase" ]]; then
        error "supabase directory not found in project root"
        exit 1
    fi

    # Check if supabase config exists
    if [[ ! -f "$PROJECT_ROOT/supabase/config.toml" ]]; then
        error "supabase/config.toml not found. Please initialize Supabase first:"
        error "supabase init"
        exit 1
    fi

    success "Prerequisites check completed"
}

# Run migrations
run_migrations() {
    log "Running database migrations using Supabase CLI..."

    # Check current migration status
    log "Current migration status:"
    if supabase migration list; then
        success "Migration list retrieved successfully"
    else
        warning "Could not retrieve migration list"
    fi

    # Push migrations to database
    log "Pushing migrations to database..."
    if supabase db push; then
        success "All migrations applied successfully"
    else
        error "Failed to apply migrations"
        return 1
    fi
}

# Reset database (Supabase equivalent of rollback)
reset_database() {
    log "Resetting database using Supabase CLI..."

    warning "This will reset the entire database and apply all migrations from scratch"
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Database reset cancelled"
        return 0
    fi

    if supabase db reset; then
        success "Database reset completed successfully"
    else
        error "Failed to reset database"
        return 1
    fi
}

# Create new migration
create_migration() {
    local name="$1"

    if [[ -z "$name" ]]; then
        error "Migration name is required"
        return 1
    fi

    log "Creating new migration: $name"

    if supabase migration new "$name"; then
        success "Migration created successfully"
        log "Edit the migration file in supabase/migrations/ to add your SQL statements"
    else
        error "Failed to create migration"
        return 1
    fi
}

# Get migration status
get_migration_status() {
    log "Getting migration status using Supabase CLI..."

    # List migrations
    log "Migration status:"
    if supabase migration list; then
        success "Migration status retrieved successfully"
    else
        error "Failed to retrieve migration status"
        return 1
    fi

    # Show migration files
    log "Available migration files:"
    if [[ -d "$PROJECT_ROOT/supabase/migrations" ]]; then
        ls -la "$PROJECT_ROOT/supabase/migrations/"*.sql 2>/dev/null || log "No migration files found"
    else
        warning "supabase/migrations directory not found"
    fi
}


# Show usage
usage() {
    echo "Usage: $0 [OPTIONS] [COMMAND] [ARGUMENTS]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -p, --project-root  Project root directory (default: current directory)"
    echo "  -l, --log-file      Log file path (default: /var/log/migration.log)"
    echo ""
    echo "Commands:"
    echo "  run                 Run pending migrations (supabase db push)"
    echo "  status              Show migration status (supabase migration list)"
    echo "  reset               Reset database and apply all migrations (supabase db reset)"
    echo "  create <name>       Create new migration (supabase migration new)"
    echo ""
    echo "Examples:"
    echo "  $0 run                              # Run pending migrations"
    echo "  $0 status                           # Show migration status"
    echo "  $0 reset                            # Reset database"
    echo "  $0 create \"add_user_table\"          # Create new migration"
    echo ""
    echo "Note: This script uses Supabase CLI for database migrations."
    echo "Make sure you have Supabase CLI installed: npm install -g supabase"
}

# Parse command line arguments
COMMAND=""
ARG1=""
ARG2=""

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
        run|status|reset|create)
            COMMAND="$1"
            shift
            ;;
        *)
            if [[ -z "$ARG1" ]]; then
                ARG1="$1"
            fi
            shift
            ;;
    esac
done

# Main execution
main() {
    log "Starting Supabase migration script..."
    log "Project root: $PROJECT_ROOT"
    log "Command: $COMMAND"

    # Change to project root
    cd "$PROJECT_ROOT"

    # Check prerequisites
    check_prerequisites

    # Execute command
    case "$COMMAND" in
        "run")
            run_migrations
            ;;
        "status")
            get_migration_status
            ;;
        "reset")
            reset_database
            ;;
        "create")
            create_migration "$ARG1"
            ;;
        "")
            error "No command specified"
            usage
            exit 1
            ;;
        *)
            error "Unknown command: $COMMAND"
            usage
            exit 1
            ;;
    esac

    success "Migration script completed successfully!"
    log "Check the log file for details: $LOG_FILE"
}

# Run main function
main "$@"
