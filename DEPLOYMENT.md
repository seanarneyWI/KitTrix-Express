# KitTrix Express - Docker Deployment Guide

## Overview
This guide covers deploying KitTrix Express to Digital Ocean with nginx-proxy integration for automatic HTTPS.

## Prerequisites

### Local Machine
- Docker Desktop installed and running
- Docker Hub account (for pushing images)
- Git configured

### Digital Ocean Server
- nginx-proxy and letsencrypt-companion running
- motiostack_net Docker network exists
- PostgreSQL database running (motioPGDB)
- DNS: kits.digiglue.io → 137.184.182.28

## Deployment Strategy

**Build Locally → Push to Registry → Pull on Server**

Why? Server has only 1.9GB RAM - building there will fail.

---

## Step-by-Step Deployment

### Step 1: Prepare Local Build

```bash
# Navigate to project
cd /Users/motioseanmbp/Documents/GitHub/CursorTest/KitTrix-Express

# Ensure Docker is running
docker --version

# Login to Docker Hub
docker login
```

### Step 2: Build Docker Image

```bash
# Build the image (takes 2-3 minutes)
docker build -t motionalysis/kittrix:latest .

# Verify build succeeded
docker images | grep kittrix
```

### Step 3: Test Image Locally (Optional)

```bash
# Run container locally to test
docker run -d \
  --name kittrix-test \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://motioseanmbp@host.docker.internal:5432/kitting_dev" \
  motionalysis/kittrix:latest

# Check logs
docker logs kittrix-test

# Test health endpoint
curl http://localhost:3000/api/health

# Stop and remove test container
docker stop kittrix-test && docker rm kittrix-test
```

### Step 4: Push to Docker Hub

```bash
# Push image to Docker Hub
docker push motionalysis/kittrix:latest

# Verify push
# Visit: https://hub.docker.com/r/motionalysis/kittrix
```

### Step 5: Deploy to Digital Ocean

```bash
# SSH to server
ssh sean@137.184.182.28

# Stop current KitTrix process
pkill -f 'npm.*dev'

# Create deployment directory
mkdir -p ~/KitTrix-Express
cd ~/KitTrix-Express

# Create docker-compose.yml on server
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  kittrix:
    image: motionalysis/kittrix:latest
    container_name: kittrix-app
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=postgresql://motioadmin:M0t10n4lys1s@172.17.0.1:5432/motioPGDB
      - VIRTUAL_HOST=kits.digiglue.io
      - LETSENCRYPT_HOST=kits.digiglue.io
      - LETSENCRYPT_EMAIL=sean@motiontools.com
    networks:
      - motiostack_net
    restart: always
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    deploy:
      resources:
        limits:
          memory: 256M

networks:
  motiostack_net:
    external: true
EOF

# Pull the image
docker pull motionalysis/kittrix:latest

# Start the container
docker-compose up -d

# Check status
docker ps | grep kittrix
docker logs kittrix-app
```

### Step 6: Verify Deployment

```bash
# Check container is running
docker ps

# Check logs
docker logs kittrix-app --tail 50

# Test health endpoint (internal)
curl http://localhost:3000/api/health

# Wait 30-60 seconds for SSL certificate generation
# Then test HTTPS (from local machine)
curl https://kits.digiglue.io/api/health
```

### Step 7: Monitor nginx-proxy Integration

```bash
# Check nginx-proxy logs
docker logs reverse-proxy --tail 50

# Check Let's Encrypt companion logs
docker logs letsencrypt-helper --tail 50

# Verify SSL certificate
curl -I https://kits.digiglue.io
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs kittrix-app

# Check if port 3000 is available
lsof -i :3000

# Inspect container
docker inspect kittrix-app
```

### Database Connection Issues

```bash
# Test PostgreSQL connectivity from container
docker exec kittrix-app node -e "console.log(process.env.DATABASE_URL)"

# Check if PostgreSQL is accessible
docker exec kittrix-app nc -zv 172.17.0.1 5432
```

### SSL Certificate Not Generated

```bash
# Verify DNS
nslookup kits.digiglue.io

# Check nginx-proxy detected container
docker logs reverse-proxy | grep kits.digiglue.io

# Manually trigger certificate renewal
docker exec letsencrypt-helper /app/signal_le_service
```

### Memory Issues

```bash
# Check container memory usage
docker stats kittrix-app

# Check server memory
free -h

# Restart container if memory limit exceeded
docker-compose restart kittrix
```

---

## Updating Deployment

### Quick Update (Same Image)

```bash
# On server
cd ~/KitTrix-Express
docker-compose pull
docker-compose up -d
docker-compose logs -f
```

### Full Update (New Code)

```bash
# LOCAL: Build and push new image
cd /Users/motioseanmbp/Documents/GitHub/CursorTest/KitTrix-Express
docker build -t motionalysis/kittrix:latest .
docker push motionalysis/kittrix:latest

# SERVER: Pull and restart
ssh sean@137.184.182.28
cd ~/KitTrix-Express
docker-compose pull
docker-compose up -d
```

---

## Rollback Procedure

```bash
# Stop current deployment
docker-compose down

# Pull previous version (if tagged)
docker pull motionalysis/kittrix:v1.0.0

# Update docker-compose.yml to use specific version
# Then restart
docker-compose up -d
```

---

## Monitoring

### Health Checks

```bash
# Container health status
docker ps --format "table {{.Names}}\t{{.Status}}"

# Application health
curl https://kits.digiglue.io/api/health

# Database connectivity
docker exec kittrix-app npx prisma db execute --stdin <<< "SELECT 1"
```

### Logs

```bash
# Follow logs
docker logs kittrix-app -f

# Last 100 lines
docker logs kittrix-app --tail 100

# Logs with timestamps
docker logs kittrix-app -t
```

### Resource Usage

```bash
# Real-time stats
docker stats kittrix-app

# Container inspect
docker inspect kittrix-app | jq '.[0].State'
```

---

## Emergency Procedures

### Complete Restart

```bash
cd ~/KitTrix-Express
docker-compose down
docker-compose up -d
```

### Nuclear Option (Full Cleanup)

```bash
# Stop and remove container
docker-compose down
docker rm -f kittrix-app

# Remove image
docker rmi motionalysis/kittrix:latest

# Pull fresh and restart
docker pull motionalysis/kittrix:latest
docker-compose up -d
```

---

## Notes

- **Memory Limit**: Container limited to 256MB RAM
- **Auto-Restart**: `restart: always` survives reboots
- **SSL**: Let's Encrypt handles HTTPS automatically
- **Database**: Connects to existing PostgreSQL (motioPGDB)
- **nginx-proxy**: Auto-discovers container via VIRTUAL_HOST

---

## Success Criteria

✅ Container running: `docker ps | grep kittrix`
✅ Health check passing: `curl http://localhost:3000/api/health`
✅ HTTPS working: `curl https://kits.digiglue.io/api/health`
✅ SSL certificate valid: `curl -I https://kits.digiglue.io`
✅ Application accessible in browser
✅ Database queries working
