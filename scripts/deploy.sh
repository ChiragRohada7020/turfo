#!/bin/bash
# Production Deployment Script for Turf Booking Platform

set -e

# Configuration
PROJECT_DIR="/home/ubuntu/turf_2.0"
COMPOSE_FILE="docker/docker-compose.yml"
ENV_FILE=".env.production"
BACKUP_DIR="/home/ubuntu/backups"

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

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    log_error "Please don't run as root"
    exit 1
fi

# Check required files
if [ ! -f "$PROJECT_DIR/$ENV_FILE" ]; then
    log_error "Environment file $ENV_FILE not found"
    exit 1
fi

if [ ! -f "$PROJECT_DIR/$COMPOSE_FILE" ]; then
    log_error "Docker compose file not found"
    exit 1
fi

cd "$PROJECT_DIR"

log_info "Starting deployment..."

# Pull latest code
log_info "Pulling latest code..."
git pull origin main

# Backup current deployment
log_info "Creating backup..."
mkdir -p "$BACKUP_DIR"
BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
docker-compose -f "$COMPOSE_FILE" exec -T oracle-db bash -c "
    expdp system/oracle@XEPDB1 directory=DATA_PUMP_DIR dumpfile=$BACKUP_NAME.dmp logfile=$BACKUP_NAME.log
" || log_warn "Database backup failed, continuing..."

# Build new images
log_info "Building Docker images..."
docker-compose -f "$COMPOSE_FILE" build --no-cache app

# Run database migrations
log_info "Running database migrations..."
docker-compose -f "$COMPOSE_FILE" run --rm app npx prisma migrate deploy

# Stop services gracefully
log_info "Stopping services..."
docker-compose -f "$COMPOSE_FILE" down --timeout 30

# Start services
log_info "Starting services..."
docker-compose -f "$COMPOSE_FILE" up -d

# Wait for services to be healthy
log_info "Waiting for services to be healthy..."
sleep 30

# Health check
log_info "Running health checks..."
for i in {1..10}; do
    if curl -f http://localhost/api/health > /dev/null 2>&1; then
        log_info "Health check passed!"
        break
    fi
    if [ $i -eq 10 ]; then
        log_error "Health check failed after 10 attempts"
        exit 1
    fi
    sleep 10
done

# Clean up old images
log_info "Cleaning up old Docker images..."
docker image prune -f

log_info "Deployment completed successfully!"
log_info "Application is running at https://your-domain.com"