#!/bin/bash

# Security Scanning Script
# This script performs comprehensive security scanning and compliance checks

set -euo pipefail

# Configuration
PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"
RESULTS_DIR="${RESULTS_DIR:-./security-results}"
SNYK_TOKEN="${SNYK_TOKEN:-}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
DOCKER_IMAGE="${DOCKER_IMAGE:-interview-app:latest}"

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

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."

    local missing_tools=()

    # Check for required tools
    command -v npm &> /dev/null || missing_tools+=("npm")
    command -v node &> /dev/null || missing_tools+=("node")
    command -v docker &> /dev/null || missing_tools+=("docker")
    command -v curl &> /dev/null || missing_tools+=("curl")

    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        error "Missing required tools: ${missing_tools[*]}"
        exit 1
    fi

    # Check for optional tools
    if ! command -v snyk &> /dev/null; then
        warning "Snyk CLI not found. Install with: npm install -g snyk"
    fi

    if ! command -v audit-ci &> /dev/null; then
        warning "audit-ci not found. Install with: npm install -g audit-ci"
    fi

    success "Prerequisites check completed"
}

# Install security tools
install_security_tools() {
    log "Installing security tools..."

    # Install Snyk CLI if not present
    if ! command -v snyk &> /dev/null; then
        log "Installing Snyk CLI..."
        npm install -g snyk
    fi

    # Install audit-ci if not present
    if ! command -v audit-ci &> /dev/null; then
        log "Installing audit-ci..."
        npm install -g audit-ci
    fi

    # Install npm audit fix
    if ! command -v npm-audit-fix &> /dev/null; then
        log "Installing npm-audit-fix..."
        npm install -g npm-audit-fix
    fi

    success "Security tools installation completed"
}

# Authenticate with Snyk
authenticate_snyk() {
    if [[ -n "$SNYK_TOKEN" ]]; then
        log "Authenticating with Snyk..."
        echo "$SNYK_TOKEN" | snyk auth
        success "Snyk authentication completed"
    else
        warning "SNYK_TOKEN not provided. Snyk scans will be limited."
    fi
}

# Run npm audit
run_npm_audit() {
    log "Running npm audit..."

    local audit_file="$RESULTS_DIR/npm-audit.json"
    local audit_summary="$RESULTS_DIR/npm-audit-summary.txt"

    # Run npm audit
    if npm audit --json > "$audit_file" 2>/dev/null; then
        success "No vulnerabilities found in npm audit"
        echo "No vulnerabilities found" > "$audit_summary"
    else
        warning "Vulnerabilities found in npm audit"

        # Generate summary
        npm audit --audit-level=moderate > "$audit_summary" 2>&1 || true

        # Count vulnerabilities
        local vuln_count
        vuln_count=$(jq -r '.vulnerabilities | length' "$audit_file" 2>/dev/null || echo "unknown")
        log "Found $vuln_count vulnerabilities"
    fi

    success "npm audit completed"
}

# Run audit-ci
run_audit_ci() {
    log "Running audit-ci..."

    local audit_ci_file="$RESULTS_DIR/audit-ci.json"

    # Run audit-ci with JSON output
    if audit-ci --config .audit-ci.json --output json > "$audit_ci_file" 2>/dev/null; then
        success "audit-ci passed"
    else
        warning "audit-ci found issues"

        # Run with standard output for details
        audit-ci --config .audit-ci.json > "$RESULTS_DIR/audit-ci-details.txt" 2>&1 || true
    fi

    success "audit-ci completed"
}

# Run Snyk dependency scan
run_snyk_dependency_scan() {
    log "Running Snyk dependency scan..."

    local snyk_file="$RESULTS_DIR/snyk-dependencies.json"

    if command -v snyk &> /dev/null; then
        # Test for vulnerabilities
        if snyk test --json > "$snyk_file" 2>/dev/null; then
            success "Snyk dependency scan passed"
        else
            warning "Snyk dependency scan found issues"

            # Run with standard output for details
            snyk test > "$RESULTS_DIR/snyk-dependencies-details.txt" 2>&1 || true
        fi

        # Monitor project if token is provided
        if [[ -n "$SNYK_TOKEN" ]]; then
            log "Monitoring project with Snyk..."
            snyk monitor --json > "$RESULTS_DIR/snyk-monitor.json" 2>/dev/null || true
        fi
    else
        warning "Snyk CLI not available"
    fi

    success "Snyk dependency scan completed"
}

# Run Snyk code scan
run_snyk_code_scan() {
    log "Running Snyk code scan..."

    local snyk_code_file="$RESULTS_DIR/snyk-code.json"

    if command -v snyk &> /dev/null; then
        # Test code for vulnerabilities
        if snyk code test --json > "$snyk_code_file" 2>/dev/null; then
            success "Snyk code scan passed"
        else
            warning "Snyk code scan found issues"

            # Run with standard output for details
            snyk code test > "$RESULTS_DIR/snyk-code-details.txt" 2>&1 || true
        fi

        # Generate SARIF output
        snyk code test --sarif --sarif-file-output="$RESULTS_DIR/snyk-code.sarif" 2>/dev/null || true
    else
        warning "Snyk CLI not available"
    fi

    success "Snyk code scan completed"
}

# Run Snyk container scan
run_snyk_container_scan() {
    log "Running Snyk container scan..."

    local snyk_container_file="$RESULTS_DIR/snyk-container.json"

    if command -v snyk &> /dev/null && command -v docker &> /dev/null; then
        # Test container for vulnerabilities
        if snyk container test "$DOCKER_IMAGE" --json > "$snyk_container_file" 2>/dev/null; then
            success "Snyk container scan passed"
        else
            warning "Snyk container scan found issues"

            # Run with standard output for details
            snyk container test "$DOCKER_IMAGE" > "$RESULTS_DIR/snyk-container-details.txt" 2>&1 || true
        fi
    else
        warning "Snyk CLI or Docker not available"
    fi

    success "Snyk container scan completed"
}

# Run Snyk IaC scan
run_snyk_iac_scan() {
    log "Running Snyk IaC scan..."

    local snyk_iac_file="$RESULTS_DIR/snyk-iac.json"

    if command -v snyk &> /dev/null; then
        # Test IaC files for vulnerabilities
        if snyk iac test . --json > "$snyk_iac_file" 2>/dev/null; then
            success "Snyk IaC scan passed"
        else
            warning "Snyk IaC scan found issues"

            # Run with standard output for details
            snyk iac test . > "$RESULTS_DIR/snyk-iac-details.txt" 2>&1 || true
        fi
    else
        warning "Snyk CLI not available"
    fi

    success "Snyk IaC scan completed"
}

# Run OWASP ZAP scan
run_owasp_zap_scan() {
    log "Running OWASP ZAP scan..."

    local zap_file="$RESULTS_DIR/zap-scan.json"

    # Check if ZAP is available
    if command -v zap-baseline.py &> /dev/null; then
        # Run ZAP baseline scan
        zap-baseline.py -t "http://localhost:3000" -J "$zap_file" 2>/dev/null || true

        if [[ -f "$zap_file" ]]; then
            success "OWASP ZAP scan completed"
        else
            warning "OWASP ZAP scan failed or no issues found"
        fi
    else
        warning "OWASP ZAP not available. Install with: docker pull owasp/zap2docker-stable"
    fi

    success "OWASP ZAP scan completed"
}

# Run security headers check
run_security_headers_check() {
    log "Running security headers check..."

    local headers_file="$RESULTS_DIR/security-headers.json"
    local base_url="${BASE_URL:-http://localhost:3000}"

    # Check security headers
    curl -s -I "$base_url" | grep -i "x-" > "$RESULTS_DIR/security-headers.txt" || true

    # Check for specific security headers
    local headers=(
        "X-Content-Type-Options"
        "X-Frame-Options"
        "X-XSS-Protection"
        "Strict-Transport-Security"
        "Content-Security-Policy"
        "Referrer-Policy"
    )

    local missing_headers=()
    for header in "${headers[@]}"; do
        if ! curl -s -I "$base_url" | grep -i "$header" > /dev/null; then
            missing_headers+=("$header")
        fi
    done

    if [[ ${#missing_headers[@]} -eq 0 ]]; then
        success "All security headers present"
        echo '{"status": "pass", "missing_headers": []}' > "$headers_file"
    else
        warning "Missing security headers: ${missing_headers[*]}"
        echo "{\"status\": \"fail\", \"missing_headers\": [\"${missing_headers[*]}\"]}" > "$headers_file"
    fi

    success "Security headers check completed"
}

# Run SSL/TLS check
run_ssl_check() {
    log "Running SSL/TLS check..."

    local ssl_file="$RESULTS_DIR/ssl-check.json"
    local base_url="${BASE_URL:-https://localhost:3000}"

    # Check SSL certificate
    if [[ "$base_url" == https://* ]]; then
        local ssl_info
        ssl_info=$(echo | openssl s_client -servername "${base_url#https://}" -connect "${base_url#https://}" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "SSL check failed")

        echo "$ssl_info" > "$RESULTS_DIR/ssl-info.txt"

        # Check for common SSL issues
        local ssl_issues=()

        # Check certificate expiration
        if echo "$ssl_info" | grep -q "notAfter"; then
            local expiry_date
            expiry_date=$(echo "$ssl_info" | grep "notAfter" | cut -d= -f2)
            local expiry_timestamp
            expiry_timestamp=$(date -d "$expiry_date" +%s 2>/dev/null || echo "0")
            local current_timestamp
            current_timestamp=$(date +%s)
            local days_until_expiry
            days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))

            if [[ $days_until_expiry -lt 30 ]]; then
                ssl_issues+=("Certificate expires in $days_until_expiry days")
            fi
        fi

        if [[ ${#ssl_issues[@]} -eq 0 ]]; then
            success "SSL/TLS check passed"
            echo '{"status": "pass", "issues": []}' > "$ssl_file"
        else
            warning "SSL/TLS issues found: ${ssl_issues[*]}"
            echo "{\"status\": \"fail\", \"issues\": [\"${ssl_issues[*]}\"]}" > "$ssl_file"
        fi
    else
        warning "SSL check skipped (not HTTPS)"
        echo '{"status": "skipped", "reason": "Not HTTPS"}' > "$ssl_file"
    fi

    success "SSL/TLS check completed"
}

# Generate security report
generate_security_report() {
    log "Generating security report..."

    local report_file="$RESULTS_DIR/security-report.md"

    cat > "$report_file" << EOF
# Security Scan Report

Generated on: $(date)

## Scan Summary

### Dependency Scans
EOF

    # Add npm audit results
    if [[ -f "$RESULTS_DIR/npm-audit.json" ]]; then
        local vuln_count
        vuln_count=$(jq -r '.vulnerabilities | length' "$RESULTS_DIR/npm-audit.json" 2>/dev/null || echo "unknown")
        echo "- **npm audit**: $vuln_count vulnerabilities found" >> "$report_file"
    fi

    # Add Snyk results
    if [[ -f "$RESULTS_DIR/snyk-dependencies.json" ]]; then
        echo "- **Snyk Dependencies**: Scan completed" >> "$report_file"
    fi

    if [[ -f "$RESULTS_DIR/snyk-code.json" ]]; then
        echo "- **Snyk Code**: Scan completed" >> "$report_file"
    fi

    if [[ -f "$RESULTS_DIR/snyk-container.json" ]]; then
        echo "- **Snyk Container**: Scan completed" >> "$report_file"
    fi

    if [[ -f "$RESULTS_DIR/snyk-iac.json" ]]; then
        echo "- **Snyk IaC**: Scan completed" >> "$report_file"
    fi

    cat >> "$report_file" << EOF

### Security Headers
EOF

    if [[ -f "$RESULTS_DIR/security-headers.json" ]]; then
        local headers_status
        headers_status=$(jq -r '.status' "$RESULTS_DIR/security-headers.json" 2>/dev/null || echo "unknown")
        echo "- **Security Headers**: $headers_status" >> "$report_file"
    fi

    cat >> "$report_file" << EOF

### SSL/TLS
EOF

    if [[ -f "$RESULTS_DIR/ssl-check.json" ]]; then
        local ssl_status
        ssl_status=$(jq -r '.status' "$RESULTS_DIR/ssl-check.json" 2>/dev/null || echo "unknown")
        echo "- **SSL/TLS**: $ssl_status" >> "$report_file"
    fi

    cat >> "$report_file" << EOF

## Recommendations

1. **Regular Scanning**: Run security scans regularly in CI/CD pipeline
2. **Dependency Updates**: Keep dependencies updated to latest secure versions
3. **Security Headers**: Ensure all security headers are properly configured
4. **SSL/TLS**: Use strong SSL/TLS configuration
5. **Code Review**: Implement security-focused code review process
6. **Monitoring**: Set up continuous security monitoring

## Files Generated

- \`npm-audit.json\`: npm audit results
- \`snyk-dependencies.json\`: Snyk dependency scan results
- \`snyk-code.json\`: Snyk code scan results
- \`snyk-container.json\`: Snyk container scan results
- \`snyk-iac.json\`: Snyk IaC scan results
- \`security-headers.json\`: Security headers check results
- \`ssl-check.json\`: SSL/TLS check results

## Next Steps

1. Review all scan results
2. Address high and critical vulnerabilities
3. Update dependencies as needed
4. Implement security recommendations
5. Set up automated security scanning

EOF

    success "Security report generated: $report_file"
}

# Clean up old results
cleanup_results() {
    log "Cleaning up old security scan results..."

    if [[ -d "$RESULTS_DIR" ]]; then
        find "$RESULTS_DIR" -name "*.json" -mtime +7 -delete
        find "$RESULTS_DIR" -name "*.txt" -mtime +7 -delete
        find "$RESULTS_DIR" -name "*.md" -mtime +7 -delete
        log "Cleaned up results older than 7 days"
    fi
}

# Show usage
usage() {
    echo "Usage: $0 [OPTIONS] [SCAN_TYPE]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -o, --output DIR    Output directory for results (default: ./security-results)"
    echo "  -t, --token TOKEN   Snyk API token"
    echo "  -u, --url URL       Base URL for security checks (default: http://localhost:3000)"
    echo "  -i, --image IMAGE   Docker image to scan (default: interview-app:latest)"
    echo ""
    echo "Scan Types:"
    echo "  dependencies        Run dependency scans only"
    echo "  code                Run code scans only"
    echo "  container           Run container scans only"
    echo "  iac                 Run IaC scans only"
    echo "  headers             Run security headers check only"
    echo "  ssl                 Run SSL/TLS check only"
    echo "  all                 Run all scans (default)"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Run all scans"
    echo "  $0 dependencies                       # Run dependency scans only"
    echo "  $0 -t your-snyk-token                 # Run with Snyk token"
    echo "  $0 -u https://staging.example.com     # Test staging environment"
}

# Parse command line arguments
SCAN_TYPE="all"

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            exit 0
            ;;
        -o|--output)
            RESULTS_DIR="$2"
            shift 2
            ;;
        -t|--token)
            SNYK_TOKEN="$2"
            shift 2
            ;;
        -u|--url)
            BASE_URL="$2"
            shift 2
            ;;
        -i|--image)
            DOCKER_IMAGE="$2"
            shift 2
            ;;
        dependencies|code|container|iac|headers|ssl|all)
            SCAN_TYPE="$1"
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
    log "Starting security scanning suite..."
    log "Results directory: $RESULTS_DIR"
    log "Scan type: $SCAN_TYPE"

    # Check prerequisites
    check_prerequisites

    # Install security tools
    install_security_tools

    # Authenticate with Snyk
    authenticate_snyk

    # Clean up old results
    cleanup_results

    # Run scans based on type
    case "$SCAN_TYPE" in
        "dependencies")
            run_npm_audit
            run_audit_ci
            run_snyk_dependency_scan
            ;;
        "code")
            run_snyk_code_scan
            ;;
        "container")
            run_snyk_container_scan
            ;;
        "iac")
            run_snyk_iac_scan
            ;;
        "headers")
            run_security_headers_check
            ;;
        "ssl")
            run_ssl_check
            ;;
        "all")
            run_npm_audit
            run_audit_ci
            run_snyk_dependency_scan
            run_snyk_code_scan
            run_snyk_container_scan
            run_snyk_iac_scan
            run_security_headers_check
            run_ssl_check
            run_owasp_zap_scan
            ;;
        *)
            error "Unknown scan type: $SCAN_TYPE"
            usage
            exit 1
            ;;
    esac

    # Generate report
    generate_security_report

    success "Security scanning suite completed successfully!"
    log "Check the results in: $RESULTS_DIR"
}

# Run main function
main "$@"
