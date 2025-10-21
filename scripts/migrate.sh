#!/bin/bash

# Migration Script
# This script provides database migration and versioning capabilities

set -euo pipefail

# Configuration
PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"
LOG_FILE="${LOG_FILE:-/var/log/migration.log}"
MIGRATION_TYPE="${MIGRATION_TYPE:-run}"

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

    # Check if Node.js is available
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
        exit 1
    fi

    # Check if npm is available
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
        exit 1
    fi

    # Check if project has package.json
    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        error "package.json not found in project root"
        exit 1
    fi

    # Check if database is accessible
    if ! curl -f "http://localhost:3000/api/health" &> /dev/null; then
        warning "Application health check failed - ensure the application is running"
    fi

    success "Prerequisites check completed"
}

# Run migrations
run_migrations() {
    log "Running database migrations..."

    # Check current migration status
    local status_response
    status_response=$(curl -s "http://localhost:3000/api/migrations?action=status" 2>/dev/null || echo "")

    if [[ -n "$status_response" ]]; then
        log "Current migration status:"
        echo "$status_response" | jq -r '.status[] | "\(.name): \(.applied)"' 2>/dev/null || echo "$status_response"
    fi

    # Run migrations
    local run_response
    run_response=$(curl -s -X POST "http://localhost:3000/api/migrations" \
        -H "Content-Type: application/json" \
        -d '{"action": "run"}' 2>/dev/null || echo "")

    if [[ -n "$run_response" ]]; then
        log "Migration results:"
        echo "$run_response" | jq -r '.results[] | "\(.migrationId): \(.success)"' 2>/dev/null || echo "$run_response"

        # Check if any migrations failed
        local failed_migrations
        failed_migrations=$(echo "$run_response" | jq -r '.results[] | select(.success == false) | .migrationId' 2>/dev/null || echo "")

        if [[ -n "$failed_migrations" ]]; then
            error "Some migrations failed: $failed_migrations"
            return 1
        else
            success "All migrations completed successfully"
        fi
    else
        error "Failed to run migrations - check application status"
        return 1
    fi
}

# Rollback migration
rollback_migration() {
    local migration_id="$1"

    if [[ -z "$migration_id" ]]; then
        error "Migration ID is required for rollback"
        return 1
    fi

    log "Rolling back migration: $migration_id"

    # Rollback migration
    local rollback_response
    rollback_response=$(curl -s -X POST "http://localhost:3000/api/migrations" \
        -H "Content-Type: application/json" \
        -d "{\"action\": \"rollback\", \"migrationId\": \"$migration_id\"}" 2>/dev/null || echo "")

    if [[ -n "$rollback_response" ]]; then
        log "Rollback result:"
        echo "$rollback_response" | jq -r '.result | "\(.migrationId): \(.success)"' 2>/dev/null || echo "$rollback_response"

        # Check if rollback was successful
        local success_status
        success_status=$(echo "$rollback_response" | jq -r '.result.success' 2>/dev/null || echo "false")

        if [[ "$success_status" == "true" ]]; then
            success "Migration rollback completed successfully"
        else
            error "Migration rollback failed"
            return 1
        fi
    else
        error "Failed to rollback migration - check application status"
        return 1
    fi
}

# Rollback to version
rollback_to_version() {
    local version="$1"

    if [[ -z "$version" ]]; then
        error "Version is required for rollback"
        return 1
    fi

    log "Rolling back to version: $version"

    # Rollback to version
    local rollback_response
    rollback_response=$(curl -s -X POST "http://localhost:3000/api/migrations" \
        -H "Content-Type: application/json" \
        -d "{\"action\": \"rollback-to-version\", \"version\": \"$version\"}" 2>/dev/null || echo "")

    if [[ -n "$rollback_response" ]]; then
        log "Rollback results:"
        echo "$rollback_response" | jq -r '.results[] | "\(.migrationId): \(.success)"' 2>/dev/null || echo "$rollback_response"

        # Check if any rollbacks failed
        local failed_rollbacks
        failed_rollbacks=$(echo "$rollback_response" | jq -r '.results[] | select(.success == false) | .migrationId' 2>/dev/null || echo "")

        if [[ -n "$failed_rollbacks" ]]; then
            error "Some rollbacks failed: $failed_rollbacks"
            return 1
        else
            success "All rollbacks completed successfully"
        fi
    else
        error "Failed to rollback to version - check application status"
        return 1
    fi
}

# Get migration status
get_migration_status() {
    log "Getting migration status..."

    # Get current version
    local version_response
    version_response=$(curl -s "http://localhost:3000/api/migrations?action=current-version" 2>/dev/null || echo "")

    if [[ -n "$version_response" ]]; then
        local current_version
        current_version=$(echo "$version_response" | jq -r '.version' 2>/dev/null || echo "unknown")
        log "Current database version: $current_version"
    fi

    # Get migration status
    local status_response
    status_response=$(curl -s "http://localhost:3000/api/migrations?action=status" 2>/dev/null || echo "")

    if [[ -n "$status_response" ]]; then
        log "Migration status:"
        echo "$status_response" | jq -r '.status[] | "\(.name) (\(.version)): \(.applied)"' 2>/dev/null || echo "$status_response"
    fi

    # Validate checksums
    local validation_response
    validation_response=$(curl -s "http://localhost:3000/api/migrations?action=validate" 2>/dev/null || echo "")

    if [[ -n "$validation_response" ]]; then
        local validation_status
        validation_status=$(echo "$validation_response" | jq -r '.valid' 2>/dev/null || echo "unknown")

        if [[ "$validation_status" == "true" ]]; then
            success "Migration checksums are valid"
        else
            warning "Migration checksums are invalid"
            local invalid_migrations
            invalid_migrations=$(echo "$validation_response" | jq -r '.invalid[]' 2>/dev/null || echo "")
            if [[ -n "$invalid_migrations" ]]; then
                log "Invalid migrations: $invalid_migrations"
            fi
        fi
    fi
}

# Create migration
create_migration() {
    local name="$1"
    local version="$2"

    if [[ -z "$name" || -z "$version" ]]; then
        error "Migration name and version are required"
        return 1
    fi

    log "Creating migration: $name (version: $version)"

    # Generate migration ID
    local migration_id
    migration_id=$(printf "%03d-%s" "$(date +%s)" "$(echo "$name" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')")

    # Create migration file
    local migration_file="$PROJECT_ROOT/src/lib/migration/migrations/${migration_id}.ts"

    cat > "$migration_file" << EOF
import { databaseService } from "../../db/database-service";
import { logger } from "../../logging/logger";

/**
 * ${name} migration
 * Version: ${version}
 * Description: ${name}
 */
export const migration${migration_id//-} = {
  id: "${migration_id}",
  name: "${name}",
  version: "${version}",
  description: "${name}",
  checksum: "$(openssl rand -hex 16)",

  async up(): Promise<void> {
    logger.info("Running migration: ${name}", {
      component: "Migration",
      action: "up",
      metadata: { migrationId: "${migration_id}" },
    });

    // Add your migration logic here
    const sql = \`
      -- Add your SQL statements here
    \`;

    const result = await databaseService.query(sql);
    if (result.error) {
      throw new Error(\`Failed to execute migration: \${result.error}\`);
    }

    logger.info("Migration completed: ${name}", {
      component: "Migration",
      action: "up",
      metadata: { migrationId: "${migration_id}" },
    });
  },

  async down(): Promise<void> {
    logger.info("Rolling back migration: ${name}", {
      component: "Migration",
      action: "down",
      metadata: { migrationId: "${migration_id}" },
    });

    // Add your rollback logic here
    const sql = \`
      -- Add your rollback SQL statements here
    \`;

    const result = await databaseService.query(sql);
    if (result.error) {
      throw new Error(\`Failed to execute rollback: \${result.error}\`);
    }

    logger.info("Migration rollback completed: ${name}", {
      component: "Migration",
      action: "down",
      metadata: { migrationId: "${migration_id}" },
    });
  },
};
EOF

    success "Migration file created: $migration_file"
    log "Remember to:"
    log "1. Implement the migration logic in the 'up' method"
    log "2. Implement the rollback logic in the 'down' method"
    log "3. Register the migration in the migration service"
    log "4. Test the migration before applying to production"
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
    echo "  run                 Run pending migrations"
    echo "  status              Show migration status"
    echo "  rollback <id>       Rollback specific migration"
    echo "  rollback-to <version>  Rollback to specific version"
    echo "  create <name> <version>  Create new migration"
    echo ""
    echo "Examples:"
    echo "  $0 run                              # Run pending migrations"
    echo "  $0 status                           # Show migration status"
    echo "  $0 rollback 001-initial-schema      # Rollback specific migration"
    echo "  $0 rollback-to 1.0.0               # Rollback to version 1.0.0"
    echo "  $0 create \"Add User Table\" 1.1.0   # Create new migration"
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
        run|status|rollback|rollback-to|create)
            COMMAND="$1"
            shift
            ;;
        *)
            if [[ -z "$ARG1" ]]; then
                ARG1="$1"
            elif [[ -z "$ARG2" ]]; then
                ARG2="$1"
            fi
            shift
            ;;
    esac
done

# Main execution
main() {
    log "Starting migration script..."
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
        "rollback")
            rollback_migration "$ARG1"
            ;;
        "rollback-to")
            rollback_to_version "$ARG1"
            ;;
        "create")
            create_migration "$ARG1" "$ARG2"
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
