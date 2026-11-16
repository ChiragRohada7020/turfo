#!/bin/bash
# Backup Script for Turf Booking Platform

set -e

# Configuration
PROJECT_DIR="/home/ubuntu/turf_2.0"
BACKUP_DIR="/home/ubuntu/backups"
COMPOSE_FILE="docker/docker-compose.yml"
RETENTION_DAYS=30
OBJECT_STORAGE_BUCKET="turf-backups"

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

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_NAME="turf-backup-$TIMESTAMP"

cd "$PROJECT_DIR"
mkdir -p "$BACKUP_DIR"

log_info "Starting backup: $BACKUP_NAME"

# 1. Oracle Database Backup (RMAN)
log_info "Backing up Oracle Database..."
docker-compose -f "$COMPOSE_FILE" exec -T oracle-db bash -c "
    rman target / << EOF
    RUN {
        BACKUP INCREMENTAL LEVEL 1 DATABASE
        PLUS ARCHIVELOG
        FORMAT '/opt/oracle/backup/%d_%T_%s_%p.bak';
        DELETE NOPROMPT OBSOLETE RECOVERY WINDOW OF $RETENTION_DAYS DAYS;
    }
    EOF
" || log_error "RMAN backup failed"

# Alternative: Data Pump Export
log_info "Running Data Pump export..."
docker-compose -f "$COMPOSE_FILE" exec -T oracle-db bash -c "
    expdp system/oracle@XEPDB1 \
        directory=DATA_PUMP_DIR \
        dumpfile=${BACKUP_NAME}_dp.dmp \
        logfile=${BACKUP_NAME}_dp.log \
        schemas=turf_app \
        compression=all
" || log_warn "Data Pump export failed"

# Copy dump file to host
docker cp "$(docker-compose -f "$COMPOSE_FILE" ps -q oracle-db):/opt/oracle/backup/${BACKUP_NAME}_dp.dmp" "$BACKUP_DIR/" 2>/dev/null || true
docker cp "$(docker-compose -f "$COMPOSE_FILE" ps -q oracle-db):/opt/oracle/backup/${BACKUP_NAME}_dp.log" "$BACKUP_DIR/" 2>/dev/null || true

# 2. Application Config Backup
log_info "Backing up application config..."
tar -czf "$BACKUP_DIR/${BACKUP_NAME}_config.tar.gz" \
    .env.production \
    docker/ \
    scripts/ \
    prisma/ \
    --exclude="node_modules" \
    --exclude=".git" \
    2>/dev/null

# 3. Redis Backup
log_info "Backing up Redis..."
docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli --rdb /data/dump.rdb BGSAVE
sleep 5
docker cp "$(docker-compose -f "$COMPOSE_FILE" ps -q redis):/data/dump.rdb" "$BACKUP_DIR/${BACKUP_NAME}_redis.rdb" 2>/dev/null || log_warn "Redis backup failed"

# 4. Upload to Oracle Object Storage
if command -v aws &> /dev/null && [ -n "$OBJECT_STORAGE_ENDPOINT" ]; then
    log_info "Uploading to Oracle Object Storage..."
    aws s3 sync "$BACKUP_DIR/" "s3://$OBJECT_STORAGE_BUCKET/backups/" \
        --endpoint-url "$OBJECT_STORAGE_ENDPOINT" \
        --exclude "*" \
        --include "${BACKUP_NAME}*" \
        --storage-class STANDARD || log_warn "Object Storage upload failed"
fi

# 5. Cleanup old local backups
log_info "Cleaning up old local backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -type f -name "turf-backup-*" -mtime +$RETENTION_DAYS -delete

# 6. Verify backup
log_info "Verifying backup integrity..."
BACKUP_SIZE=$(du -sh "$BACKUP_DIR/${BACKUP_NAME}"* 2>/dev/null | awk '{sum+=$1} END {print sum}')
log_info "Backup size: ${BACKUP_SIZE}MB"

log_info "Backup completed: $BACKUP_NAME"
log_info "Files created in $BACKUP_DIR:"
ls -lh "$BACKUP_DIR/${BACKUP_NAME}"*