# KitTrix Express - Production Dockerfile
# Optimized for low memory usage and fast builds

# =====================================
# Stage 1: Build Vite Frontend
# =====================================
FROM node:18-alpine AS frontend-builder
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Vite frontend
RUN npm run build

# =====================================
# Stage 2: Production Runtime
# =====================================
FROM node:18-alpine AS runner
WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built frontend from builder
COPY --from=frontend-builder /app/dist ./dist

# Copy server code
COPY server ./server

# Copy Prisma files for database operations
COPY prisma ./prisma
COPY --from=frontend-builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=frontend-builder /app/node_modules/@prisma ./node_modules/@prisma

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 expressjs && \
    chown -R expressjs:nodejs /app

USER expressjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Start Express server
CMD ["node", "server/index.cjs"]
