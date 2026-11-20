#!/bin/bash
# SSL Setup Script for Let's Encrypt with domain strikora.in

set -e

DOMAIN="strikora.in"
EMAIL="admin@rohadas.in"  # Change this to your email
NGINX_CONTAINER="turf-nginx"
WEBROOT="/var/www/html"

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
if [ "$EUID" -ne 0 ]; then
    log_error "Please run as root (sudo)"
    exit 1
fi

# Check if domain resolves to this server
log_info "Checking DNS resolution for $DOMAIN..."
SERVER_IP=$(curl -s ifconfig.me)
DOMAIN_IP=$(dig +short $DOMAIN | tail -n1)

if [ "$SERVER_IP" != "$DOMAIN_IP" ]; then
    log_warn "Domain $DOMAIN resolves to $DOMAIN_IP, but this server IP is $SERVER_IP"
    log_warn "Make sure DNS A record points to this server before continuing"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Create webroot directory
mkdir -p $WEBROOT

# Stop nginx if running
log_info "Stopping nginx container..."
docker stop $NGINX_CONTAINER 2>/dev/null || true

# Run certbot to get certificate
log_info "Requesting Let's Encrypt certificate for $DOMAIN..."
docker run --rm \
    -v "/etc/letsencrypt:/etc/letsencrypt" \
    -v "/var/lib/letsencrypt:/var/lib/letsencrypt" \
    -v "$WEBROOT:$WEBROOT" \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=$WEBROOT \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d $DOMAIN

# Copy certificates to nginx ssl directory
log_info "Copying certificates to nginx ssl directory..."
mkdir -p /home/ubuntu/turf_2.0/docker/ssl
cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /home/ubuntu/turf_2.0/docker/ssl/
cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /home/ubuntu/turf_2.0/docker/ssl/

# Set proper permissions
chmod 644 /home/ubuntu/turf_2.0/docker/ssl/fullchain.pem
chmod 600 /home/ubuntu/turf_2.0/docker/ssl/privkey.pem

# Create renewal cron job
log_info "Setting up auto-renewal cron job..."
CRON_JOB="0 3 * * * docker run --rm -v /etc/letsencrypt:/etc/letsencrypt -v /var/lib/letsencrypt:/var/lib/letsencrypt -v $WEBROOT:$WEBROOT certbot/certbot renew --quiet --webroot --webroot-path=$WEBROOT && cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /home/ubuntu/turf_2.0/docker/ssl/ && cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /home/ubuntu/turf_2.0/docker/ssl/ && docker kill -s HUP $NGINX_CONTAINER"

(crontab -l 2>/dev/null | grep -v "certbot.*$DOMAIN"; echo "$CRON_JOB") | crontab -

log_info "SSL setup complete!"
log_info "Certificates stored in /home/ubuntu/turf_2.0/docker/ssl/"
log_info "Auto-renewal configured via cron (runs daily at 3 AM)"

# Restart nginx
log_info "Starting nginx container..."
cd /home/ubuntu/turf_2.0
docker-compose -f docker/docker-compose.yml up -d nginx

log_info "Done! Your site should be available at https://$DOMAIN"