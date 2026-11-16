#!/bin/bash
# Native Deployment Script for Turf Booking Platform on Oracle Server
# Run as root or with sudo

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

PROJECT_DIR="/home/ubuntu/turf_2.0"
APP_USER="ubuntu"

# 1. Update system
log_info "Updating system packages..."
apt-get update && apt-get upgrade -y

# 2. Install Node.js 20
log_info "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 3. Install Oracle Instant Client
log_info "Installing Oracle Instant Client..."
apt-get install -y libaio1 libnsl-dev wget unzip

cd /opt
wget -q https://download.oracle.com/otn_software/linux/instantclient/2112000/instantclient-basic-linux.x64-21.12.0.0.0-1dbru.zip
wget -q https://download.oracle.com/otn_software/linux/instantclient/2112000/instantclient-sdk-linux.x64-21.12.0.0.0-1dbru.zip
unzip -q instantclient-basic-linux.x64-21.12.0.0.0-1dbru.zip
unzip -q instantclient-sdk-linux.x64-21.12.0.0.0-1dbru.zip
rm *.zip
ln -sf /opt/instantclient_21_12 /opt/instantclient
echo /opt/instantclient_21_12 > /etc/ld.so.conf.d/oracle-instantclient.conf
ldconfig

export ORACLE_HOME=/opt/instantclient_21_12
export LD_LIBRARY_PATH=$ORACLE_HOME:$LD_LIBRARY_PATH
export PATH=$ORACLE_HOME:$PATH

# Add to profile
cat >> /etc/profile.d/oracle.sh << 'EOF'
export ORACLE_HOME=/opt/instantclient_21_12
export LD_LIBRARY_PATH=$ORACLE_HOME:$LD_LIBRARY_PATH
export PATH=$ORACLE_HOME:$PATH
EOF

# 4. Install Redis
log_info "Installing Redis..."
apt-get install -y redis-server
systemctl enable redis-server
systemctl start redis-server

# 5. Install PM2
log_info "Installing PM2..."
npm install -g pm2

# 6. Install Nginx
log_info "Installing Nginx..."
apt-get install -y nginx
systemctl enable nginx

# 7. Install Certbot for SSL
log_info "Installing Certbot..."
apt-get install -y certbot python3-certbot-nginx

# 8. Setup project
log_info "Setting up project..."
cd $PROJECT_DIR

# Install dependencies
sudo -u $APP_USER npm ci

# Generate Prisma client
sudo -u $APP_USER npx prisma generate

# Build Next.js
sudo -u $APP_USER npm run build

log_info "Native deployment setup complete!"
log_info "Next steps:"
log_info "1. Configure .env.production with your credentials"
log_info "2. Run database setup: npx prisma db push && npx prisma db seed"
log_info "3. Setup SSL: certbot --nginx -d erp.rohadas.in"
log_info "4. Start app: pm2 start docker/pm2.config.js"
log_info "5. Configure nginx (see nginx-native.conf)"