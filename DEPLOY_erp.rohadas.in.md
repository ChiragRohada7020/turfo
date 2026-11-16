# Quick Deployment Guide for erp.rohadas.in

## Prerequisites
- Domain `erp.rohadas.in` pointing to your server IP (A record)
- Server with Docker & Docker Compose installed
- Ports 80, 443 open on firewall

## 1. Clone & Configure
```bash
cd /home/ubuntu/turf_2.0
cp .env.production.template .env.production
# Edit .env.production with your actual credentials
nano .env.production
```

## 2. Generate NEXTAUTH_SECRET
```bash
openssl rand -base64 32
# Copy output to NEXTAUTH_SECRET in .env.production
```

## 3. Start Infrastructure (DB + Redis)
```bash
docker-compose -f docker/docker-compose.yml up -d oracle-db redis
```

## 4. Wait for Database to be Healthy
```bash
docker-compose -f docker/docker-compose.yml logs -f oracle-db
# Wait for "DATABASE IS READY TO USE"
```

## 5. Setup Database
```bash
docker-compose -f docker/docker-compose.yml run --rm app npx prisma generate
docker-compose -f docker/docker-compose.yml run --rm app npx prisma db push
docker-compose -f docker/docker-compose.yml run --rm app npx prisma db seed
```

## 6. Build Application
```bash
docker-compose -f docker/docker-compose.yml build app
```

## 7. Setup SSL Certificate (Let's Encrypt)
```bash
# Run as root
sudo ./scripts/setup-ssl.sh
# Enter your email when prompted
```

## 8. Start All Services
```bash
docker-compose -f docker/docker-compose.yml up -d
```

## 9. Verify Deployment
```bash
# Check all containers running
docker-compose -f docker/docker-compose.yml ps

# Check health
curl https://erp.rohadas.in/api/health

# View logs
docker-compose -f docker/docker-compose.yml logs -f app
docker-compose -f docker/docker-compose.yml logs -f nginx
```

## 10. Access Application
Open https://erp.rohadas.in in browser

## Default Test Accounts (from seed)
- **Admin**: admin@turfbooking.com / admin123
- **Owner**: owner@turfbooking.com / owner123
- **Player**: player@turfbooking.com / player123

## Useful Commands
```bash
# View logs
docker-compose -f docker/docker-compose.yml logs -f [service]

# Restart services
docker-compose -f docker/docker-compose.yml restart

# Stop all
docker-compose -f docker/docker-compose.yml down

# Backup database
./scripts/backup.sh

# Health check
./scripts/healthcheck.sh

# Update deployment
./scripts/deploy.sh
```

## Troubleshooting

### SSL Certificate Issues
```bash
# Check certificate
openssl x509 -in docker/ssl/fullchain.pem -text -noout

# Renew manually
sudo certbot renew --webroot --webroot-path=/var/www/html
```

### Database Connection Issues
```bash
# Check Oracle logs
docker-compose -f docker/docker-compose.yml logs oracle-db

# Test connection
docker-compose -f docker/docker-compose.yml exec oracle-db sqlplus sys/oracle@//localhost:1521/XEPDB1 AS SYSDBA
```

### App Not Starting
```bash
# Check app logs
docker-compose -f docker/docker-compose.yml logs app

# Common issues:
# - NEXTAUTH_SECRET not set
# - DATABASE_URL incorrect
# - Prisma client not generated
```

## Firewall Rules (if using ufw)
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

## DNS Configuration
Ensure your domain provider has:
- A record: `erp.rohadas.in` → YOUR_SERVER_IP
- Optional: `www.erp.rohadas.in` → YOUR_SERVER_IP (add to nginx config if needed)