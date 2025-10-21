#!/bin/bash

# Load Testing Script
# This script runs various load tests and performance benchmarks

set -euo pipefail

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
RESULTS_DIR="${RESULTS_DIR:-./test-results}"
K6_BINARY="${K6_BINARY:-k6}"

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

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."

    # Check if k6 is installed
    if ! command -v "$K6_BINARY" &> /dev/null; then
        error "k6 is not installed. Please install k6 first."
        echo "Installation instructions:"
        echo "  macOS: brew install k6"
        echo "  Linux: sudo apt-get install k6"
        echo "  Windows: choco install k6"
        exit 1
    fi

    # Check if base URL is accessible
    if ! curl -f "$BASE_URL/api/health" &> /dev/null; then
        error "Base URL $BASE_URL is not accessible"
        exit 1
    fi

    # Create results directory
    mkdir -p "$RESULTS_DIR"

    success "Prerequisites check passed"
}

# Run load test
run_load_test() {
    log "Running load test..."

    local test_file="tests/load/load-test.js"
    local output_file="$RESULTS_DIR/load-test-results.json"

    if [[ ! -f "$test_file" ]]; then
        error "Load test file not found: $test_file"
        return 1
    fi

    "$K6_BINARY" run \
        --out json="$output_file" \
        --env BASE_URL="$BASE_URL" \
        "$test_file"

    if [[ $? -eq 0 ]]; then
        success "Load test completed successfully"
        log "Results saved to: $output_file"
    else
        error "Load test failed"
        return 1
    fi
}

# Run performance benchmarks
run_performance_benchmarks() {
    log "Running performance benchmarks..."

    local test_file="tests/load/performance-benchmarks.js"
    local output_file="$RESULTS_DIR/performance-benchmarks-results.json"

    if [[ ! -f "$test_file" ]]; then
        error "Performance benchmarks file not found: $test_file"
        return 1
    fi

    "$K6_BINARY" run \
        --out json="$output_file" \
        --env BASE_URL="$BASE_URL" \
        "$test_file"

    if [[ $? -eq 0 ]]; then
        success "Performance benchmarks completed successfully"
        log "Results saved to: $output_file"
    else
        error "Performance benchmarks failed"
        return 1
    fi
}

# Run stress test
run_stress_test() {
    log "Running stress test..."

    local test_file="tests/load/stress-test.js"
    local output_file="$RESULTS_DIR/stress-test-results.json"

    if [[ ! -f "$test_file" ]]; then
        error "Stress test file not found: $test_file"
        return 1
    fi

    "$K6_BINARY" run \
        --out json="$output_file" \
        --env BASE_URL="$BASE_URL" \
        "$test_file"

    if [[ $? -eq 0 ]]; then
        success "Stress test completed successfully"
        log "Results saved to: $output_file"
    else
        error "Stress test failed"
        return 1
    fi
}

# Generate performance report
generate_report() {
    log "Generating performance report..."

    local report_file="$RESULTS_DIR/performance-report.md"

    cat > "$report_file" << EOF
# Performance Test Report

Generated on: $(date)

## Test Configuration
- Base URL: $BASE_URL
- Test Environment: $(uname -s) $(uname -m)
- k6 Version: $("$K6_BINARY" version | head -1)

## Test Results

### Load Test Results
EOF

    if [[ -f "$RESULTS_DIR/load-test-results.json" ]]; then
        echo "- ✅ Load test completed successfully" >> "$report_file"
    else
        echo "- ❌ Load test failed or not run" >> "$report_file"
    fi

    cat >> "$report_file" << EOF

### Performance Benchmarks
EOF

    if [[ -f "$RESULTS_DIR/performance-benchmarks-results.json" ]]; then
        echo "- ✅ Performance benchmarks completed successfully" >> "$report_file"
    else
        echo "- ❌ Performance benchmarks failed or not run" >> "$report_file"
    fi

    cat >> "$report_file" << EOF

### Stress Test Results
EOF

    if [[ -f "$RESULTS_DIR/stress-test-results.json" ]]; then
        echo "- ✅ Stress test completed successfully" >> "$report_file"
    else
        echo "- ❌ Stress test failed or not run" >> "$report_file"
    fi

    cat >> "$report_file" << EOF

## Performance Thresholds

### Load Test Thresholds
- 99% of requests must complete below 1 second
- 95% of requests must complete below 500ms
- Error rate must be below 1%

### Performance Benchmark Thresholds
- 95% of requests must complete below 500ms
- 99% of requests must complete below 1 second
- Evaluation API: 95% of requests below 2 seconds
- Authentication API: 95% of requests below 300ms
- Content API: 95% of requests below 500ms

### Stress Test Thresholds
- 95% of requests must complete below 2 seconds
- 99% of requests must complete below 5 seconds
- Error rate must be below 5%

## Recommendations

1. **Monitor System Resources**: Keep an eye on CPU, memory, and database usage during tests
2. **Scale Horizontally**: If performance degrades, consider horizontal scaling
3. **Optimize Database Queries**: Review slow queries and add appropriate indexes
4. **Implement Caching**: Add Redis caching for frequently accessed data
5. **Rate Limiting**: Implement rate limiting to prevent abuse

## Next Steps

1. Review the detailed JSON results in the results directory
2. Identify performance bottlenecks
3. Implement optimizations
4. Re-run tests to validate improvements
5. Set up continuous performance monitoring

EOF

    success "Performance report generated: $report_file"
}

# Clean up old results
cleanup_results() {
    log "Cleaning up old test results..."

    if [[ -d "$RESULTS_DIR" ]]; then
        find "$RESULTS_DIR" -name "*.json" -mtime +7 -delete
        log "Cleaned up results older than 7 days"
    fi
}

# Show usage
usage() {
    echo "Usage: $0 [OPTIONS] [TEST_TYPE]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -u, --url URL       Base URL for testing (default: http://localhost:3000)"
    echo "  -o, --output DIR    Output directory for results (default: ./test-results)"
    echo "  -k, --k6-binary     Path to k6 binary (default: k6)"
    echo ""
    echo "Test Types:"
    echo "  load                Run load test only"
    echo "  performance         Run performance benchmarks only"
    echo "  stress              Run stress test only"
    echo "  all                 Run all tests (default)"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Run all tests"
    echo "  $0 load                              # Run load test only"
    echo "  $0 -u https://staging.example.com    # Test staging environment"
    echo "  $0 -o ./results stress               # Run stress test with custom output dir"
}

# Parse command line arguments
TEST_TYPE="all"

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
        -k|--k6-binary)
            K6_BINARY="$2"
            shift 2
            ;;
        load|performance|stress|all)
            TEST_TYPE="$1"
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
    log "Starting load testing suite..."
    log "Base URL: $BASE_URL"
    log "Results directory: $RESULTS_DIR"
    log "Test type: $TEST_TYPE"

    # Check prerequisites
    check_prerequisites

    # Clean up old results
    cleanup_results

    # Run tests based on type
    case "$TEST_TYPE" in
        "load")
            run_load_test
            ;;
        "performance")
            run_performance_benchmarks
            ;;
        "stress")
            run_stress_test
            ;;
        "all")
            run_load_test
            run_performance_benchmarks
            run_stress_test
            ;;
        *)
            error "Unknown test type: $TEST_TYPE"
            usage
            exit 1
            ;;
    esac

    # Generate report
    generate_report

    success "Load testing suite completed successfully!"
    log "Check the results in: $RESULTS_DIR"
}

# Run main function
main "$@"
