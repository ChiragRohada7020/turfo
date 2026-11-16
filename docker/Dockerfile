# Multi-stage build for Next.js with Oracle Instant Client
FROM node:20-alpine AS base

# Install Oracle Instant Client dependencies
RUN apk add --no-cache \
    libaio \
    libnsl \
    libstdc++ \
    gcc \
    make \
    python3 \
    g++ \
    libgcc

# Download and install Oracle Instant Client
ARG ORACLE_INSTANT_CLIENT_VERSION=21.12.0.0.0
ENV ORACLE_HOME=/opt/oracle/instantclient_21_12
ENV LD_LIBRARY_PATH=$ORACLE_HOME:$LD_LIBRARY_PATH
ENV PATH=$ORACLE_HOME:$PATH

RUN mkdir -p /opt/oracle && \
    cd /opt/oracle && \
    wget -q https://download.oracle.com/otn_software/linux/instantclient/${ORACLE_INSTANT_CLIENT_VERSION}/instantclient-basic-linux.x64-${ORACLE_INSTANT_CLIENT_VERSION}-1dbru.zip && \
    wget -q https://download.oracle.com/otn_software/linux/instantclient/${ORACLE_INSTANT_CLIENT_VERSION}/instantclient-sdk-linux.x64-${ORACLE_INSTANT_CLIENT_VERSION}-1dbru.zip && \
    unzip -q instantclient-basic-linux.x64-${ORACLE_INSTANT_CLIENT_VERSION}-1dbru.zip && \
    unzip -q instantclient-sdk-linux.x64-${ORACLE_INSTANT_CLIENT_VERSION}-1dbru.zip && \
    rm *.zip && \
    ln -s /opt/oracle/instantclient_21_12 /opt/oracle/instantclient && \
    echo /opt/oracle/instantclient_21_12 > /etc/ld.so.conf.d/oracle-instantclient.conf && \
    ldconfig

FROM base AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy Oracle Instant Client from base
COPY --from=base /opt/oracle /opt/oracle

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]