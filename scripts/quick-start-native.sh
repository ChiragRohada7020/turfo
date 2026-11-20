#!/bin/bash
# Quick Start for Native Deployment
# Run this after setup-native.sh completes

set -e

PROJECT_DIR="/home/ubuntu/turf_2.0"
APP_USER="ubuntu"

cd $PROJECT_DIR

echo "=== Turf Booking Platform - Native Quick Start ==="

# 1. Check environment file
if [ ! -f ".env.production" ]; then
    echo "Creating .env.production from template..."
    cp .env.production.template .env.production
    echo "Please edit .env.production with your credentials:"
    echo "  nano .env.production"
    exit 1
fi

# 2. Source Oracle env
export ORACLE_HOME=/opt/instantclient_21_12
export LD_LIBRARY_PATH=$ORACLE_HOME:$LD_LIBRARY_PATH
export PATH=$ORACLE_HOME:$PATH

# 3. Database setup
echo "Setting up database..."
sudo -u $APP_USER bash -c "export ORACLE_HOME=/opt/instantclient_21_12 && export LD_LIBRARY_PATH=\$ORACLE_HOME:\$LD_LIBRARY_PATH && cd $PROJECT_DIR && npx prisma db push"
sudo -u $APP_USER bash -c "export ORACLE_HOME=/opt/instantclient_21_12 && export LD_LIBRARY_PATH=\$ORACLE_HOME:\$LD_LIBRARY_PATH && cd $PROJECT_DIR && npx prisma db seed"

# 4. Create logs directory
mkdir -p logs

# 5. Start with PM2
echo "Starting application with PM2..."
sudo -u $APP_USER bash -c "export ORACLE_HOME=/opt/instantclient_21_12 && export LD_LIBRARY_PATH=\$ORACLE_HOME:\$LD_LIBRARY_PATH && cd $PROJECT_DIR && pm2 start pm2.config.js"

# 6. Save PM2 config
sudo -u $APP_USER pm2 save
sudo -u $APP_USER pm2 startup

# 7. Configure Nginx
echo "Configuring Nginx..."
cp docker/nginx-native.conf /etc/nginx/sites-available/strikora.in
ln -sf /etc/nginx/sites-available/strikora.in /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 8. Setup SSL with Certbot
echo "Setting up SSL certificate..."
certbot --nginx -d strikora.in --non-interactive --agree-tos --email admin@rohadas.in --redirect

echo ""
echo "=== Deployment Complete ==="
echo "App running at: https://strikora.in"
echo ""
echo "Useful commands:"
echo "  pm2 status          - Check app status"
echo "  pm2 logs turf-app   - View app logs"
echo "  pm2 restart all     - Restart app"
echo "  pm2 monit           - Monitor resources"
echo "  nginx -t            - Test nginx config"
echo "  systemctl status nginx - Check nginx"