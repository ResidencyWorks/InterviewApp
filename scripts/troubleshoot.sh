#!/bin/bash

# Troubleshooting Script
# This script provides comprehensive troubleshooting and diagnostic capabilities

set -euo pipefail

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
RESULTS_DIR="${RESULTS_DIR:-./troubleshoot-results}"
LOG_LEVEL="${LOG_LEVEL:-info}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Create results directory
mkdir -p "$RESULTS_DIR"

# Check system connectivity
check_connectivity() {
    log "Checking system connectivity..."

    local connectivity_file="$RESULTS_DIR/connectivity.txt"

    # Check if base URL is accessible
    if curl -f "$BASE_URL/api/health" &> /dev/null; then
        success "Base URL is accessible"
        echo "✅ Base URL accessible: $BASE_URL" > "$connectivity_file"
    else
        error "Base URL is not accessible"
        echo "❌ Base URL not accessible: $BASE_URL" > "$connectivity_file"
        return 1
    fi

    # Check DNS resolution
    local hostname
    hostname=$(echo "$BASE_URL" | sed 's|https\?://||' | cut -d: -f1)
    if nslookup "$hostname" &> /dev/null; then
        success "DNS resolution working"
        echo "✅ DNS resolution working for $hostname" >> "$connectivity_file"
    else
        warning "DNS resolution issues"
        echo "⚠️ DNS resolution issues for $hostname" >> "$connectivity_file"
    fi

    # Check port connectivity
    local port
    port=$(echo "$BASE_URL" | sed 's|https\?://||' | cut -d: -f2)
    port=${port:-80}

    if nc -z "$hostname" "$port" 2>/dev/null; then
        success "Port connectivity working"
        echo "✅ Port $port accessible on $hostname" >> "$connectivity_file"
    else
        warning "Port connectivity issues"
        echo "⚠️ Port $port not accessible on $hostname" >> "$connectivity_file"
    fi

    success "Connectivity check completed"
}

# Check application health
check_application_health() {
    log "Checking application health..."

    local health_file="$RESULTS_DIR/health.json"

    # Get health information
    if curl -s "$BASE_URL/api/health" > "$health_file"; then
        success "Health check completed"

        # Parse health status
        local status
        status=$(jq -r '.status' "$health_file" 2>/dev/null || echo "unknown")

        if [[ "$status" == "healthy" ]]; then
            success "Application is healthy"
        elif [[ "$status" == "degraded" ]]; then
            warning "Application is degraded"
        else
            error "Application is unhealthy"
        fi

        # Check individual services
        local services
        services=$(jq -r '.services[] | "\(.name): \(.status)"' "$health_file" 2>/dev/null || echo "")

        if [[ -n "$services" ]]; then
            log "Service status:"
            echo "$services" | while read -r service; do
                if [[ "$service" == *": healthy" ]]; then
                    success "  $service"
                elif [[ "$service" == *": degraded" ]]; then
                    warning "  $service"
                else
                    error "  $service"
                fi
            done
        fi
    else
        error "Failed to get health information"
        return 1
    fi

    success "Application health check completed"
}

# Get diagnostic information
get_diagnostic_info() {
    log "Getting diagnostic information..."

    local diagnostic_file="$RESULTS_DIR/diagnostics.json"
    local report_file="$RESULTS_DIR/diagnostics-report.md"

    # Get diagnostic information
    if curl -s "$BASE_URL/api/diagnostics" > "$diagnostic_file"; then
        success "Diagnostic information retrieved"

        # Generate diagnostic report
        if curl -s "$BASE_URL/api/diagnostics?format=report" > "$report_file"; then
            success "Diagnostic report generated"
        else
            warning "Failed to generate diagnostic report"
        fi

        # Parse key information
        local system_info
        system_info=$(jq -r '.system | "Platform: \(.platform), Arch: \(.arch), Node: \(.nodeVersion)"' "$diagnostic_file" 2>/dev/null || echo "")

        if [[ -n "$system_info" ]]; then
            log "System information: $system_info"
        fi

        local app_info
        app_info=$(jq -r '.application | "Version: \(.version), Environment: \(.environment)"' "$diagnostic_file" 2>/dev/null || echo "")

        if [[ -n "$app_info" ]]; then
            log "Application information: $app_info"
        fi

        # Check for errors
        local error_count
        error_count=$(jq -r '.errors | length' "$diagnostic_file" 2>/dev/null || echo "0")

        if [[ "$error_count" -gt 0 ]]; then
            warning "Found $error_count errors in diagnostic information"

            # List errors
            jq -r '.errors[] | "\(.severity): \(.message) (Component: \(.component))"' "$diagnostic_file" 2>/dev/null | while read -r error; do
                warning "  $error"
            done
        else
            success "No errors found in diagnostic information"
        fi
    else
        error "Failed to get diagnostic information"
        return 1
    fi

    success "Diagnostic information check completed"
}

# Check system resources
check_system_resources() {
    log "Checking system resources..."

    local resources_file="$RESULTS_DIR/resources.txt"

    # Check memory usage
    local memory_info
    memory_info=$(free -h 2>/dev/null || echo "Memory info not available")
    echo "Memory Information:" > "$resources_file"
    echo "$memory_info" >> "$resources_file"
    echo "" >> "$resources_file"

    # Check disk usage
    local disk_info
    disk_info=$(df -h 2>/dev/null || echo "Disk info not available")
    echo "Disk Usage:" >> "$resources_file"
    echo "$disk_info" >> "$resources_file"
    echo "" >> "$resources_file"

    # Check CPU usage
    local cpu_info
    cpu_info=$(top -bn1 | grep "Cpu(s)" 2>/dev/null || echo "CPU info not available")
    echo "CPU Usage:" >> "$resources_file"
    echo "$cpu_info" >> "$resources_file"
    echo "" >> "$resources_file"

    # Check load average
    local load_info
    load_info=$(uptime 2>/dev/null || echo "Load info not available")
    echo "Load Average:" >> "$resources_file"
    echo "$load_info" >> "$resources_file"

    success "System resources check completed"
}

# Check application logs
check_application_logs() {
    log "Checking application logs..."

    local logs_file="$RESULTS_DIR/logs.txt"

    # Check for common log files
    local log_files=(
        "/var/log/nginx/error.log"
        "/var/log/nginx/access.log"
        "/var/log/system.log"
        "/var/log/syslog"
        "logs/app.log"
        "logs/error.log"
        "logs/combined.log"
    )

    echo "Application Logs:" > "$logs_file"

    for log_file in "${log_files[@]}"; do
        if [[ -f "$log_file" ]]; then
            echo "=== $log_file ===" >> "$logs_file"
            tail -n 50 "$log_file" >> "$logs_file" 2>/dev/null || echo "Could not read $log_file" >> "$logs_file"
            echo "" >> "$logs_file"
        fi
    done

    # Check for Docker logs if running in container
    if command -v docker &> /dev/null; then
        local containers
        containers=$(docker ps --format "{{.Names}}" 2>/dev/null || echo "")

        if [[ -n "$containers" ]]; then
            echo "=== Docker Container Logs ===" >> "$logs_file"
            echo "$containers" | while read -r container; do
                echo "--- $container ---" >> "$logs_file"
                docker logs --tail 20 "$container" >> "$logs_file" 2>/dev/null || echo "Could not read logs for $container" >> "$logs_file"
                echo "" >> "$logs_file"
            done
        fi
    fi

    success "Application logs check completed"
}

# Check network connectivity
check_network_connectivity() {
    log "Checking network connectivity..."

    local network_file="$RESULTS_DIR/network.txt"

    echo "Network Connectivity:" > "$network_file"

    # Check internet connectivity
    if ping -c 3 8.8.8.8 &> /dev/null; then
        success "Internet connectivity working"
        echo "✅ Internet connectivity working" >> "$network_file"
    else
        error "Internet connectivity issues"
        echo "❌ Internet connectivity issues" >> "$network_file"
    fi

    # Check DNS resolution
    if nslookup google.com &> /dev/null; then
        success "DNS resolution working"
        echo "✅ DNS resolution working" >> "$network_file"
    else
        error "DNS resolution issues"
        echo "❌ DNS resolution issues" >> "$network_file"
    fi

    # Check external service connectivity
    local services=(
        "api.openai.com:443"
        "us.posthog.com:443"
        "o4510196119699456.ingest.us.sentry.io:443"
    )

    for service in "${services[@]}"; do
        local host
        local port
        host=$(echo "$service" | cut -d: -f1)
        port=$(echo "$service" | cut -d: -f2)

        if nc -z "$host" "$port" 2>/dev/null; then
            success "External service $host:$port accessible"
            echo "✅ $host:$port accessible" >> "$network_file"
        else
            warning "External service $host:$port not accessible"
            echo "⚠️ $host:$port not accessible" >> "$network_file"
        fi
    done

    success "Network connectivity check completed"
}

# Check database connectivity
check_database_connectivity() {
    log "Checking database connectivity..."

    local db_file="$RESULTS_DIR/database.txt"

    echo "Database Connectivity:" > "$db_file"

    # Check if database is accessible via health endpoint
    local db_status
    db_status=$(curl -s "$BASE_URL/api/health" | jq -r '.services[] | select(.name=="database") | .status' 2>/dev/null || echo "unknown")

    if [[ "$db_status" == "healthy" ]]; then
        success "Database is healthy"
        echo "✅ Database is healthy" >> "$db_file"
    elif [[ "$db_status" == "degraded" ]]; then
        warning "Database is degraded"
        echo "⚠️ Database is degraded" >> "$db_file"
    else
        error "Database is unhealthy"
        echo "❌ Database is unhealthy" >> "$db_file"
    fi

    # Check database connection details
    local db_info
    db_info=$(curl -s "$BASE_URL/api/health" | jq -r '.services[] | select(.name=="database")' 2>/dev/null || echo "")

    if [[ -n "$db_info" ]]; then
        echo "Database Information:" >> "$db_file"
        echo "$db_info" | jq -r 'to_entries[] | "\(.key): \(.value)"' >> "$db_file" 2>/dev/null || echo "$db_info" >> "$db_file"
    fi

    success "Database connectivity check completed"
}

# Check cache connectivity
check_cache_connectivity() {
    log "Checking cache connectivity..."

    local cache_file="$RESULTS_DIR/cache.txt"

    echo "Cache Connectivity:" > "$cache_file"

    # Check if cache is accessible via health endpoint
    local cache_status
    cache_status=$(curl -s "$BASE_URL/api/health" | jq -r '.services[] | select(.name=="redis") | .status' 2>/dev/null || echo "unknown")

    if [[ "$cache_status" == "healthy" ]]; then
        success "Cache is healthy"
        echo "✅ Cache is healthy" >> "$cache_file"
    elif [[ "$cache_status" == "degraded" ]]; then
        warning "Cache is degraded"
        echo "⚠️ Cache is degraded" >> "$cache_file"
    else
        error "Cache is unhealthy"
        echo "❌ Cache is unhealthy" >> "$cache_file"
    fi

    # Check cache connection details
    local cache_info
    cache_info=$(curl -s "$BASE_URL/api/health" | jq -r '.services[] | select(.name=="redis")' 2>/dev/null || echo "")

    if [[ -n "$cache_info" ]]; then
        echo "Cache Information:" >> "$cache_file"
        echo "$cache_info" | jq -r 'to_entries[] | "\(.key): \(.value)"' >> "$cache_file" 2>/dev/null || echo "$cache_info" >> "$cache_file"
    fi

    success "Cache connectivity check completed"
}

# Generate troubleshooting report
generate_troubleshoot_report() {
    log "Generating troubleshooting report..."

    local report_file="$RESULTS_DIR/troubleshoot-report.md"

    cat > "$report_file" << EOF
# Troubleshooting Report

Generated on: $(date)

## Summary

This report contains comprehensive troubleshooting information for the Interview Drills application.

## Files Generated

EOF

    # List all generated files
    find "$RESULTS_DIR" -name "*.txt" -o -name "*.json" -o -name "*.md" | while read -r file; do
        local filename
        filename=$(basename "$file")
        echo "- \`$filename\`: $(basename "$file" | sed 's/\.[^.]*$//' | tr '-' ' ' | sed 's/\b\w/\U&/g')" >> "$report_file"
    done

    cat >> "$report_file" << EOF

## Quick Diagnostics

### Health Status
EOF

    # Add health status
    if [[ -f "$RESULTS_DIR/health.json" ]]; then
        local health_status
        health_status=$(jq -r '.status' "$RESULTS_DIR/health.json" 2>/dev/null || echo "unknown")
        echo "- **Overall Status**: $health_status" >> "$report_file"

        # Add service status
        local services
        services=$(jq -r '.services[] | "\(.name): \(.status)"' "$RESULTS_DIR/health.json" 2>/dev/null || echo "")
        if [[ -n "$services" ]]; then
            echo "- **Service Status**:"
            echo "$services" | while read -r service; do
                echo "  - $service" >> "$report_file"
            done
        fi
    fi

    cat >> "$report_file" << EOF

### System Information
EOF

    # Add system information
    if [[ -f "$RESULTS_DIR/diagnostics.json" ]]; then
        local system_info
        system_info=$(jq -r '.system | "Platform: \(.platform), Architecture: \(.arch), Node Version: \(.nodeVersion)"' "$RESULTS_DIR/diagnostics.json" 2>/dev/null || echo "")
        if [[ -n "$system_info" ]]; then
            echo "- **System**: $system_info" >> "$report_file"
        fi

        local app_info
        app_info=$(jq -r '.application | "Version: \(.version), Environment: \(.environment)"' "$RESULTS_DIR/diagnostics.json" 2>/dev/null || echo "")
        if [[ -n "$app_info" ]]; then
            echo "- **Application**: $app_info" >> "$report_file"
        fi
    fi

    cat >> "$report_file" << EOF

## Recommendations

1. **Review Health Status**: Check the health.json file for any unhealthy services
2. **Check Diagnostics**: Review the diagnostics.json file for detailed system information
3. **Monitor Resources**: Check the resources.txt file for system resource usage
4. **Review Logs**: Check the logs.txt file for any error messages
5. **Network Issues**: Check the network.txt file for connectivity problems
6. **Database Issues**: Check the database.txt file for database connectivity problems
7. **Cache Issues**: Check the cache.txt file for cache connectivity problems

## Next Steps

1. Identify the root cause of any issues
2. Implement fixes based on the findings
3. Monitor the system after fixes
4. Document any new issues or solutions

EOF

    success "Troubleshooting report generated: $report_file"
}

# Show usage
usage() {
    echo "Usage: $0 [OPTIONS] [CHECK_TYPE]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -u, --url URL       Base URL for troubleshooting (default: http://localhost:3000)"
    echo "  -o, --output DIR    Output directory for results (default: ./troubleshoot-results)"
    echo "  -l, --log-level     Log level (default: info)"
    echo ""
    echo "Check Types:"
    echo "  connectivity        Check system connectivity only"
    echo "  health              Check application health only"
    echo "  diagnostics         Get diagnostic information only"
    echo "  resources           Check system resources only"
    echo "  logs                Check application logs only"
    echo "  network             Check network connectivity only"
    echo "  database            Check database connectivity only"
    echo "  cache               Check cache connectivity only"
    echo "  all                 Run all checks (default)"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Run all checks"
    echo "  $0 health                            # Check health only"
    echo "  $0 -u https://staging.example.com    # Troubleshoot staging environment"
}

# Parse command line arguments
CHECK_TYPE="all"

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            exit 0
            ;;
        -u|--url)
            BASE_URL="$2"
            shift 2
            ;;
        -o|--output)
            RESULTS_DIR="$2"
            shift 2
            ;;
        -l|--log-level)
            LOG_LEVEL="$2"
            shift 2
            ;;
        connectivity|health|diagnostics|resources|logs|network|database|cache|all)
            CHECK_TYPE="$1"
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
    log "Starting troubleshooting suite..."
    log "Base URL: $BASE_URL"
    log "Results directory: $RESULTS_DIR"
    log "Check type: $CHECK_TYPE"

    # Run checks based on type
    case "$CHECK_TYPE" in
        "connectivity")
            check_connectivity
            ;;
        "health")
            check_application_health
            ;;
        "diagnostics")
            get_diagnostic_info
            ;;
        "resources")
            check_system_resources
            ;;
        "logs")
            check_application_logs
            ;;
        "network")
            check_network_connectivity
            ;;
        "database")
            check_database_connectivity
            ;;
        "cache")
            check_cache_connectivity
            ;;
        "all")
            check_connectivity
            check_application_health
            get_diagnostic_info
            check_system_resources
            check_application_logs
            check_network_connectivity
            check_database_connectivity
            check_cache_connectivity
            ;;
        *)
            error "Unknown check type: $CHECK_TYPE"
            usage
            exit 1
            ;;
    esac

    # Generate report
    generate_troubleshoot_report

    success "Troubleshooting suite completed successfully!"
    log "Check the results in: $RESULTS_DIR"
}

# Run main function
main "$@"
