# Turf Booking Platform

A multi-sided marketplace for sports facility bookings where owners list facilities (turfs, courts, gyms, pools, multi-sport complexes) with flexible durations, and players/teams discover and book via map-based search.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes + tRPC
- **Database**: Oracle Database 19c/21c + Prisma ORM (Oracle connector)
- **Auth**: NextAuth.js (Auth.js)
- **Payments**: Cashfree Payments (PG + Payouts API)
- **Maps**: Mapbox GL JS
- **Notifications**: SendGrid (email) + MSG91 (SMS/OTP) + Firebase (push)
- **File Storage**: Oracle Object Storage (S3-compatible API)
- **Hosting**: Self-hosted on Oracle Server (VM/Bare Metal)
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Nginx + SSL (Let's Encrypt)
- **Process Manager**: PM2
- **Cache/Session**: Redis

## Project Structure

```
turf_2.0/
├── .github/workflows/          # CI/CD pipelines
├── prisma/
│   └── schema.prisma           # Prisma schema (Oracle datasource)
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/             # Auth pages (login, register)
│   │   ├── (dashboard)/        # Dashboard pages
│   │   ├── (public)/           # Public pages
│   │   ├── api/                # API routes
│   │   ├── search/             # Search page
│   │   └── facility/[id]/      # Facility detail page
│   ├── components/
│   │   └── ui/                 # Reusable UI components
│   ├── lib/                    # Utilities, configs
│   ├── server/                 # tRPC routers, server-only code
│   ├── hooks/                  # Custom React hooks
│   └── middleware.ts           # Auth middleware
├── docker/
│   ├── Dockerfile              # Multi-stage Next.js build
│   ├── docker-compose.yml      # All services: app, oracle-db, redis, nginx
│   ├── nginx.conf              # Reverse proxy config
│   └── pm2.config.js           # PM2 cluster config
├── scripts/
│   ├── deploy.sh               # Production deploy script
│   ├── backup.sh               # RMAN + object storage backup
│   ├── healthcheck.sh          # Service health checks
│   └── init-oracle.sql         # Oracle DB initialization
├── .env.example                # Environment variables template
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Oracle Database (or use Docker Oracle XE)
- Redis
- Cashfree Payments account
- MSG91 account for SMS/OTP
- Mapbox account for maps
- SendGrid account for emails

### Local Development

1. **Clone and install dependencies**
   ```bash
   cd turf_2.0
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

3. **Start infrastructure with Docker Compose**
   ```bash
   docker-compose -f docker/docker-compose.yml up -d oracle-db redis
   ```

4. **Set up database**
   ```bash
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open http://localhost:3000**

### Docker Production Deployment

1. **Build and start all services**
   ```bash
   docker-compose -f docker/docker-compose.yml up -d --build
   ```

2. **Configure Nginx SSL**
   - Place SSL certificates in `docker/ssl/`
   - Update `docker/nginx.conf` with your domain

3. **Set up DNS** to point to your server IP

## Environment Variables

See `.env.example` for all required variables:

- `DATABASE_URL` - Oracle connection string
- `NEXTAUTH_SECRET` - Secret for NextAuth (min 32 chars)
- `NEXTAUTH_URL` - Your app URL
- `CASHFREE_APP_ID` - Cashfree App ID
- `CASHFREE_SECRET_KEY` - Cashfree Secret Key
- `MSG91_AUTH_KEY` - MSG91 Auth Key
- `SENDGRID_API_KEY` - SendGrid API Key
- `NEXT_PUBLIC_MAPBOX_TOKEN` - Mapbox Public Token
- `OBJECT_STORAGE_*` - Oracle Object Storage credentials

## Key Features

### For Players
- Map-based facility discovery with filters
- Flexible booking durations (30 min, 1 hr, 2 hr, etc.)
- Secure payments via Cashfree (UPI, Cards, Net Banking)
- Team creation and management
- Recurring bookings for leagues
- Reviews and ratings

### For Facility Owners
- Facility and court management
- Dynamic pricing rules (day/time based)
- Availability calendar with blocking
- KYC onboarding for payouts
- Revenue analytics dashboard
- Automated payouts via Cashfree

### Platform Features
- Role-based access (Player, Owner, Admin)
- Phone verification via MSG91 OTP
- Multi-channel notifications (Email, SMS, Push)
- Oracle Object Storage for images
- Admin dashboard for moderation

## API Structure (tRPC)

```
auth.*              # register, login, logout, me, updateProfile, verifyPhone
facilities.*        # list, get, create, update, delete, myFacilities, search
courts.*            # create, update, delete, availability
pricing.*           # create, update, delete, getRules
bookings.*          # create, get, cancel, myBookings, upcoming, recurring
payments.*          # createOrder, webhook, payouts, history, refund
cashfree.*          # onboarding, kyc, beneficiary, payout
teams.*             # create, join, leave, bookings
reviews.*           # create, get, update, delete
notifications.*     # list, markRead, preferences
upload.*            # presign, confirm
admin.*             # users, facilities, bookings, analytics, payouts
```

## Database Schema

See `prisma/schema.prisma` for the complete schema with models:
- User, Facility, Court, PricingRule, Availability
- Booking, Payment, Review, Team, TeamMember
- Notification, CashfreeAccount

## Deployment on Oracle Server

### Server Requirements
- OS: Oracle Linux 8/9 or Ubuntu 22.04 LTS
- CPU: 4+ vCPUs
- RAM: 16 GB minimum (32 GB recommended)
- Disk: 200 GB+ SSD
- Network: Public IP, ports 80/443 open

### Services (Docker Compose)
- Oracle Database 21c XE
- Redis 7
- Next.js App (PM2, 4 workers)
- Nginx (Reverse proxy, SSL)

### Backup Strategy
- Oracle DB: RMAN daily incremental, weekly full
- Object Storage: Versioning enabled
- App config: Daily backup to Object Storage

## Development Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript check
npm run test         # Run Jest tests
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed database
```

## Testing

```bash
npm run test              # Unit tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - see LICENSE file for details