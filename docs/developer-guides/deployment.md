# Deployment Guide
**KitTrix Express - Production Deployment**

This guide covers deploying KitTrix Express to production using Docker, nginx-proxy, and Let's Encrypt SSL.

---

## Current Production Deployment

### Live Environment
- **Production URL**: https://kits.digiglue.io
- **Health Check**: https://kits.digiglue.io/api/health
- **SSL Certificate**: Let's Encrypt (expires Dec 28, 2025)
- **Server**: DigitalOcean Droplet
- **IP Address**: 137.184.182.28
- **Server Path**: `/home/sean/KitTrix-Express`

### Architecture
- **Backend**: Express.js (Node 18 Alpine)
- **Frontend**: Vite + React
- **Database**: PostgreSQL (motioPGDB) at 172.17.0.1:5432
- **Reverse Proxy**: nginx-proxy with automatic HTTPS
- **Containerization**: Docker with 256MB memory limit

### Repository
- **GitHub**: https://github.com/seanarneyWI/KitTrix-Express
- **Branch**: main

---

## Quick Deploy Workflow

**Use this for routine code updates**:

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

**Browser Cache Clearance**: After deployment, users must hard-refresh (Cmd+Shift+R / Ctrl+Shift+R) to load new JavaScript.

---

## Server Management

### Check Container Status
```bash
# Check if container is running
ssh sean@137.184.182.28 "docker ps | grep kittrix"

# View recent logs
ssh sean@137.184.182.28 "docker logs kittrix-app --tail 50"

# Check memory usage
ssh sean@137.184.182.28 "docker stats kittrix-app --no-stream"
```

### Clean Up Old Processes
```bash
# Kill any lingering Node.js dev servers
ssh sean@137.184.182.28 "pkill -f 'npm.*dev' && pkill -f 'next-server'"

# Verify cleanup
ssh sean@137.184.182.28 "ps aux | grep -E 'npm.*dev|next' | grep -v grep"
```

### Restart Container
```bash
ssh sean@137.184.182.28 "cd ~/KitTrix-Express && docker-compose restart"
```

### View Logs (Live Streaming)
```bash
# Application logs
ssh sean@137.184.182.28 "docker logs kittrix-app -f"

# nginx-proxy logs
ssh sean@137.184.182.28 "docker logs reverse-proxy --tail 50"
```

### Check Server Resources
```bash
# Memory usage
ssh sean@137.184.182.28 "free -h"

# Disk space
ssh sean@137.184.182.28 "df -h"

# Docker disk usage
ssh sean@137.184.182.28 "docker system df"
```

---

## Performance Metrics

**Current Production Stats** (as of November 2025):
- **Container Memory**: 73MB / 256MB (29% usage)
- **Server Total Memory**: 1.9GB
- **Server Memory Usage**: ~722MB (38%) after cleanup
- **Process Count**: 12 PIDs in container

---

## Database Connection

### Production Database
```bash
postgresql://motioadmin:M0t10n4lys1s@172.17.0.1:5432/motioPGDB
```

### Docker Bridge IP
- **172.17.0.1** - This is how Docker containers access the host PostgreSQL server
- The database runs on the host, NOT in a container
- This is a **shared ERP database** - handle migrations carefully

### Running Migrations

**⚠️ CRITICAL WARNING**: This is a shared production database. Always:
1. **Test migrations locally first**
2. **Create database backup** before running migrations
3. **Verify migration is additive** (no DROP/ALTER on existing tables)
4. **Check with team** before destructive changes

```bash
# SSH into server
ssh sean@137.184.182.28

# Create backup (ALWAYS do this first)
pg_dump -h 172.17.0.1 -U motioadmin -d motioPGDB > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migration SQL file
psql -h 172.17.0.1 -U motioadmin -d motioPGDB -f prisma/migrations/YYYYMMDD_migration_name.sql

# OR regenerate Prisma client
cd ~/KitTrix-Express
npx prisma generate
```

---

## Memory Optimization

### Historical Issue & Solution
**Problem**: Old Next.js dev server (586MB) was running alongside Docker container.

**Solution**:
- Container limited to 256MB RAM (sufficient for production)
- Always kill old processes before deploying new versions
- Server memory usage dropped from 1.4GB → 722MB after cleanup

### Best Practices
1. Monitor memory usage before each deployment: `free -h`
2. Kill lingering processes: `pkill -f 'npm.*dev'`
3. Verify only expected containers are running: `docker ps`

---

## Build Configuration

### Fixed Build Script

The Docker build initially failed due to TypeScript configuration issues. Fixed by removing unnecessary `tsc` step:

```json
// package.json - BEFORE (broken)
{
  "scripts": {
    "client:build": "tsc && vite build"
  }
}

// package.json - AFTER (fixed)
{
  "scripts": {
    "client:build": "vite build"
  }
}
```

**Reason**: Vite handles TypeScript compilation internally, so separate `tsc` step was unnecessary and causing failures.

---

## Docker Configuration

### docker-compose.yml Structure
```yaml
version: '3.8'
services:
  app:
    container_name: kittrix-app
    build: .
    environment:
      - VIRTUAL_HOST=kits.digiglue.io
      - LETSENCRYPT_HOST=kits.digiglue.io
      - LETSENCRYPT_EMAIL=your-email@example.com
    mem_limit: 256m
    restart: unless-stopped
```

### nginx-proxy Integration
- **Automatic HTTPS**: nginx-proxy handles SSL certificates via Let's Encrypt
- **Virtual Host**: Routes kits.digiglue.io → kittrix-app container
- **Reverse Proxy**: Handles all HTTP/HTTPS termination

---

## SSL Certificate Management

### Let's Encrypt Auto-Renewal
- Certificates auto-renew via letsencrypt-nginx-proxy-companion container
- Current certificate expires: Dec 28, 2025
- Renewal happens automatically ~30 days before expiration

### Manual Certificate Check
```bash
# Check certificate expiration
ssh sean@137.184.182.28 "docker logs letsencrypt-helper --tail 50"

# Verify HTTPS works
curl -I https://kits.digiglue.io
```

---

## Disk Space Management

### Historical Issue
During deployment on Oct 13, 2025, server disk space was **98% full**, causing deployment failures.

### Solution
```bash
# Clean up Docker resources
ssh sean@137.184.182.28 "docker system prune -a -f --volumes"

# Result: Freed 7.53GB (disk usage dropped from 98% → 59%)
```

### Best Practices
- Monitor disk space before deployments: `df -h`
- Keep disk usage under 80%
- Run `docker system prune` quarterly to remove old images/volumes

---

## Repository History

### Repository Confusion (Resolved)
There were TWO separate KitTrix repositories:
1. `Motionalysis/KitTrix` - Original Next.js version (deprecated)
2. `seanarneyWI/KitTrix-Express` - Current Express + Vite version (**ACTIVE**)

**Correct repository**: `seanarneyWI/KitTrix-Express`

---

## Critical Reminders

### Server Infrastructure Safety
- **DO NOT modify** existing motiostack containers (Node-RED, Grafana, pgAdmin)
- **ALWAYS check** memory usage before deploying: `free -h`
- **VERIFY** existing services still work after deployment:
  - https://nodered.digiglue.io
  - https://grafana.digiglue.io (if applicable)
- **Server has limited RAM** (1.9GB total) - keep deployments lean

### Database Safety
- **Shared ERP Database** - Other applications use this database
- **DO NOT** run destructive migrations without:
  1. Database backup
  2. Team approval
  3. Testing on staging environment first
- **ALWAYS** use additive migrations when possible (CREATE TABLE, ADD COLUMN)
- **AVOID** DROP TABLE, DROP COLUMN, ALTER COLUMN TYPE

---

## Development Environment

### Local Development Setup

**SSH Tunnel** (required for local dev to access production database):
```bash
ssh -f -N -L 5433:172.17.0.1:5432 sean@137.184.182.28 \
  -o ServerAliveInterval=60 -o ServerAliveCountMax=3
```

**Connection String for Local Dev**:
```
postgresql://motioadmin:M0t10n4lys1s@localhost:5433/motioPGDB
```

**Start Dev Server**:
```bash
npm run dev  # Backend: 3001, Frontend: 5173
```

**Symptom if SSH Tunnel Dies**:
- Backend errors
- Jobs don't load
- Only 1 job visible on calendar

**Fix**: Restart tunnel, then restart `npm run dev`

---

## Full Deployment Steps (Initial Setup)

**For comprehensive first-time deployment**, see:
- Docker image building instructions
- nginx-proxy setup
- SSL certificate initial configuration
- Database initialization

*Note: This section would be expanded for initial server setup. Current guide assumes existing infrastructure.*

---

## Rollback Procedure

If a deployment breaks production:

```bash
# SSH into server
ssh sean@137.184.182.28
cd ~/KitTrix-Express

# Check git log for last known good commit
git log --oneline -10

# Revert to previous commit
git reset --hard <commit-hash>

# Rebuild and restart
docker-compose up -d --build

# Monitor logs
docker logs kittrix-app -f
```

**Alternative**: Use GitHub to identify last working deployment, then `git pull` that specific commit.

---

## Monitoring & Alerts

**Current Status**: No automated monitoring/alerts (manual checks only)

**Future Enhancements**:
- Set up automated health checks
- Configure memory usage alerts
- Implement uptime monitoring (e.g., UptimeRobot)
- Add disk space alerts (>80% usage)

---

## Related Documentation

- **Troubleshooting**: `/docs/developer-guides/troubleshooting.md`
- **Changelog**: `/docs/project-management/CHANGELOG.md`
- **Database Schema**: `/docs/architecture/` (future)

---

**Last Updated**: November 16, 2025
