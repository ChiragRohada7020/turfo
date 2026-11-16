#!/bin/bash
# Health Check Script for Turf Booking Platform

set -e

# Configuration
PROJECT_DIR="/home/ubuntu/turf_2.0"
COMPOSE_FILE="docker/docker-compose.yml"
HEALTH_ENDPOINT="http://localhost/api/health"
TIMEOUT=10

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_service() {
    local service=$1
    local check_cmd=$2
    local description=$3

    if eval "$check_cmd" > /dev/null 2>&1; then
        log_info "✓ $description"
        return 0
    else
        log_error "✗ $description"
        return 1
    fi
}

cd "$PROJECT_DIR"

log_info "=== Turf Booking Platform Health Check ==="
log_info "Timestamp: $(date)"

# 1. Check Docker services
log_info "\n--- Docker Services ---"
SERVICES=("oracle-db" "redis" "app" "nginx")
FAILED=0

for service in "${SERVICES[@]}"; do
    if docker-compose -f "$COMPOSE_FILE" ps "$service" | grep -q "Up"; then
        log_info "✓ $service is running"
    else
        log_error "✗ $service is NOT running"
        FAILED=1
    fi
done

# 2. Check Oracle Database
log_info "\n--- Oracle Database ---"
check_service "oracle-db" \
    "docker-compose -f $COMPOSE_FILE exec -T oracle-db sqlplus -S sys/oracle@//localhost:1521/XEPDB1 AS SYSDBA @/dev/stdin <<< 'SELECT 1 FROM DUAL;'" \
    "Oracle Database connectivity"

check_service "oracle-db" \
    "docker-compose -f $COMPOSE_FILE exec -T oracle-db bash -c 'lsnrctl status | grep -q LISTENER'" \
    "Oracle Listener"

# 3. Check Redis
log_info "\n--- Redis ---"
check_service "redis" \
    "docker-compose -f $COMPOSE_FILE exec -T redis redis-cli ping | grep -q PONG" \
    "Redis connectivity"

check_service "redis" \
    "docker-compose -f $COMPOSE_FILE exec -T redis redis-cli info memory | grep -q used_memory" \
    "Redis memory info"

# 4. Check Application
log_info "\n--- Application ---"
check_service "app" \
    "curl -f -s --max-time $TIMEOUT $HEALTH_ENDPOINT | grep -q 'healthy'" \
    "Application health endpoint"

check_service "app" \
    "docker-compose -f $COMPOSE_FILE logs --tail=10 app 2>&1 | grep -q 'Ready'" \
    "Application ready state"

# 5. Check Nginx
log_info "\n--- Nginx ---"
check_service "nginx" \
    "curl -f -s --max-time $TIMEOUT http://localhost/ | grep -q 'Turf'" \
    "Nginx serving frontend"

check_service "nginx" \
    "curl -f -s --max-time $TIMEOUT -I https://localhost/ 2>&1 | grep -q '200'" \
    "Nginx SSL termination"

# 6. Check Disk Space
log_info "\n--- System Resources ---"
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 85 ]; then
    log_info "✓ Disk usage: ${DISK_USAGE}%"
else
    log_warn "⚠ Disk usage: ${DISK_USAGE}% (above 85%)"
fi

MEMORY_USAGE=$(free | awk 'NR==2 {printf "%.0f", $3/$2 * 100}')
if [ "$MEMORY_USAGE" -lt 85 ]; then
    log_info "✓ Memory usage: ${MEMORY_USAGE}%"
else
    log_warn "⚠ Memory usage: ${MEMORY_USAGE}% (above 85%)"
fi

# 7. Check SSL Certificate Expiry
log_info "\n--- SSL Certificate ---"
if [ -f "docker/ssl/fullchain.pem" ]; then
    EXPIRY=$(openssl x509 -enddate -noout -in docker/ssl/fullchain.pem | cut -d= -f2)
    EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
    NOW_EPOCH=$(date +%s)
    DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
    
    if [ "$DAYS_LEFT" -gt 30 ]; then
        log_info "✓ SSL certificate valid for $DAYS_LEFT days"
    elif [ "$DAYS_LEFT" -gt 7 ]; then
        log_warn "⚠ SSL certificate expires in $DAYS_LEFT days"
    else
        log_error "✗ SSL certificate expires in $DAYS_LEFT days (URGENT)"
        FAILED=1
    fi
else
    log_warn "⚠ SSL certificate file not found"
fi

# Summary
log_info "\n=== Summary ==="
if [ $FAILED -eq 0 ]; then
    log_info "All checks passed! ✓"
    exit 0
else
    log_error "Some checks failed! ✗"
    exit 1
fi