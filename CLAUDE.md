# KitTrix Express - Docker Deployment Documentation

## Current Production Deployment (October 4, 2025)

### Live URLs
- **Production**: https://kits.digiglue.io
- **Health Check**: https://kits.digiglue.io/api/health
- **SSL**: Let's Encrypt (valid until Dec 28, 2025)

### Architecture
- **Backend**: Express.js (Node 18 Alpine)
- **Frontend**: Vite + React
- **Database**: PostgreSQL (motioPGDB) at 172.17.0.1:5432
- **Reverse Proxy**: nginx-proxy with automatic HTTPS
- **Containerization**: Docker with 256MB memory limit

### Repository Information
- **GitHub**: https://github.com/seanarneyWI/KitTrix-Express
- **Branch**: main
- **Server Path**: `/home/sean/KitTrix-Express`

## Performance Metrics
- **Container Memory**: 73MB / 256MB (29%)
- **Server Total Memory**: 1.9GB
- **Server Memory Usage**: ~722MB (38%) after cleanup
- **Process Count**: 12 PIDs in container

## Deployment Workflow

### Quick Deploy (After Code Changes)
```bash
# LOCAL: Commit and push changes
cd /Users/motioseanmbp/Documents/GitHub/CursorTest/KitTrix-Express
git add .
git commit -m "Your commit message"
git push

# SERVER: Pull and rebuild
ssh sean@137.184.182.28
cd ~/KitTrix-Express
git pull
docker-compose up -d --build
```

### Full Deployment Steps
See `DEPLOYMENT.md` for comprehensive deployment guide including:
- Docker image building
- nginx-proxy integration
- SSL certificate management
- Troubleshooting procedures

## Important Notes

### Repository Confusion Resolved
There were TWO separate KitTrix repositories causing confusion:
1. `Motionalysis/KitTrix` - Original Next.js version (deprecated)
2. `seanarneyWI/KitTrix-Express` - Current Express + Vite version (ACTIVE)

The correct repository is `seanarneyWI/KitTrix-Express`.

### Build Script Fix
The Docker build initially failed due to missing TypeScript configuration. Fixed by removing `tsc` from the build script:
- **Before**: `"client:build": "tsc && vite build"`
- **After**: `"client:build": "vite build"`

Vite handles TypeScript compilation internally, so separate `tsc` step was unnecessary.

### Memory Optimization
- Container limited to 256MB RAM (sufficient for production)
- Old Next.js dev server (586MB) was running alongside Docker container
- After cleanup, server memory usage dropped from 1.4GB to 722MB
- Always kill old processes before deploying new versions

## Server Management

### Check Container Status
```bash
ssh sean@137.184.182.28 "docker ps | grep kittrix"
ssh sean@137.184.182.28 "docker logs kittrix-app --tail 50"
ssh sean@137.184.182.28 "docker stats kittrix-app --no-stream"
```

### Clean Up Old Processes
```bash
# Kill any lingering Next.js processes
ssh sean@137.184.182.28 "pkill -f 'npm.*dev' && pkill -f 'next-server'"

# Verify cleanup
ssh sean@137.184.182.28 "ps aux | grep -E 'npm.*dev|next' | grep -v grep"
```

### Restart Container
```bash
ssh sean@137.184.182.28 "cd ~/KitTrix-Express && docker-compose restart"
```

### View Logs
```bash
# Application logs
ssh sean@137.184.182.28 "docker logs kittrix-app -f"

# nginx-proxy logs
ssh sean@137.184.182.28 "docker logs reverse-proxy --tail 50"
```

## Critical Reminders

### Server Infrastructure Safety
- **DO NOT modify** existing motiostack containers (Node-RED, Grafana, pgAdmin)
- **ALWAYS check** memory usage before deploying: `free -h`
- **VERIFY** all existing services working: https://nodered.digiglue.io, etc.
- **Server has limited RAM** (1.9GB total) - keep deployments lean

### Database Connection
- **Production DB**: `postgresql://motioadmin:M0t10n4lys1s@172.17.0.1:5432/motioPGDB`
- **Docker Bridge IP**: 172.17.0.1 (for host PostgreSQL access from containers)
- **Shared ERP Database**: DO NOT run destructive migrations without backups

## Troubleshooting

### Container Won't Start
```bash
docker logs kittrix-app
docker inspect kittrix-app
```

### SSL Certificate Issues
```bash
# Check nginx-proxy detection
docker logs reverse-proxy | grep kits.digiglue.io

# Check Let's Encrypt logs
docker logs letsencrypt-helper --tail 50

# Verify certificate
curl -I https://kits.digiglue.io
```

### Memory Issues
```bash
# Check container memory
docker stats kittrix-app

# Check server memory
free -h

# Kill memory-hogging processes
pkill -f 'npm.*dev'
```

## Next Steps & Future Improvements
1. Set up automated deployment via GitHub Actions
2. Implement health monitoring and alerts
3. Add database backup automation
4. Configure container auto-restart on failure
5. Optimize Docker image size further
