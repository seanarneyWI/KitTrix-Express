# Troubleshooting Guide
**KitTrix Express - Common Issues & Solutions**

This guide covers common issues encountered during development and deployment.

---

## Production Issues

### Container Won't Start

**Symptoms**:
- `docker ps` doesn't show kittrix-app
- Application not accessible at https://kits.digiglue.io
- Health check endpoint returns 404/502

**Diagnosis**:
```bash
# View container logs
ssh sean@137.184.182.28 "docker logs kittrix-app --tail 100"

# Inspect container configuration
ssh sean@137.184.182.28 "docker inspect kittrix-app"

# Check if container exists but is stopped
ssh sean@137.184.182.28 "docker ps -a | grep kittrix"
```

**Common Causes & Solutions**:

1. **Build failure** - Check logs for npm/Docker errors:
   ```bash
   # View full build logs
   ssh sean@137.184.182.28 "cd ~/KitTrix-Express && docker-compose up --build"
   ```

2. **Port conflict** - Another service using port 3001:
   ```bash
   # Check what's using the port
   ssh sean@137.184.182.28 "lsof -i :3001"

   # Kill the conflicting process
   ssh sean@137.184.182.28 "pkill -f 'node.*3001'"
   ```

3. **Memory limit exceeded** - Container OOM killed:
   ```bash
   # Check for OOM in logs
   ssh sean@137.184.182.28 "dmesg | grep -i oom"

   # Increase memory limit in docker-compose.yml (if needed)
   mem_limit: 512m  # Increase from 256m
   ```

4. **Database connection failure**:
   ```bash
   # Verify PostgreSQL is running
   ssh sean@137.184.182.28 "systemctl status postgresql"

   # Test database connection
   ssh sean@137.184.182.28 "psql -h 172.17.0.1 -U motioadmin -d motioPGDB -c 'SELECT 1'"
   ```

---

### SSL Certificate Issues

**Symptoms**:
- Browser shows "Your connection is not private"
- Certificate expired warning
- HTTPS not working, only HTTP

**Diagnosis**:
```bash
# Check nginx-proxy detection of virtual host
ssh sean@137.184.182.28 "docker logs reverse-proxy | grep kits.digiglue.io"

# Check Let's Encrypt certificate generation logs
ssh sean@137.184.182.28 "docker logs letsencrypt-helper --tail 50"

# Verify certificate is valid
curl -I https://kits.digiglue.io

# Check certificate expiration
echo | openssl s_client -servername kits.digiglue.io -connect kits.digiglue.io:443 2>/dev/null | openssl x509 -noout -dates
```

**Common Causes & Solutions**:

1. **Environment variables not set** in docker-compose.yml:
   ```yaml
   environment:
     - VIRTUAL_HOST=kits.digiglue.io        # REQUIRED for nginx-proxy
     - LETSENCRYPT_HOST=kits.digiglue.io     # REQUIRED for SSL
     - LETSENCRYPT_EMAIL=your@email.com      # REQUIRED for SSL
   ```

2. **Certificate not auto-renewing**:
   ```bash
   # Force renewal (90 days max, renews at ~60 days)
   ssh sean@137.184.182.28 "docker restart letsencrypt-helper"
   ```

3. **DNS not pointing to server**:
   ```bash
   # Verify DNS resolution
   dig kits.digiglue.io +short
   # Should return: 137.184.182.28
   ```

---

### Memory Issues

**Symptoms**:
- Application slow or unresponsive
- Container restarts frequently
- Server becomes unreachable

**Diagnosis**:
```bash
# Check container memory usage
ssh sean@137.184.182.28 "docker stats kittrix-app --no-stream"

# Check server memory
ssh sean@137.184.182.28 "free -h"

# Check memory usage by process
ssh sean@137.184.182.28 "top -b -n 1 | head -20"
```

**Common Causes & Solutions**:

1. **Lingering dev servers** - Kill old Node.js processes:
   ```bash
   ssh sean@137.184.182.28 "pkill -f 'npm.*dev'"
   ssh sean@137.184.182.28 "pkill -f 'next-server'"

   # Verify cleanup
   ssh sean@137.184.182.28 "ps aux | grep -E 'npm.*dev|next' | grep -v grep"
   ```

2. **Memory leak in application** - Check container restarts:
   ```bash
   ssh sean@137.184.182.28 "docker ps -a --filter 'name=kittrix-app' --format 'table {{.Names}}\t{{.Status}}'"
   ```

3. **Too many containers running**:
   ```bash
   ssh sean@137.184.182.28 "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Size}}'"

   # Stop unnecessary containers
   ssh sean@137.184.182.28 "docker stop <container-name>"
   ```

---

### Disk Space Issues

**Symptoms**:
- Deployment fails with "No space left on device"
- Docker build fails
- Application can't write logs

**Diagnosis**:
```bash
# Check disk usage
ssh sean@137.184.182.28 "df -h"

# Check Docker disk usage
ssh sean@137.184.182.28 "docker system df"

# Find large files
ssh sean@137.184.182.28 "du -sh /* 2>/dev/null | sort -h | tail -10"
```

**Solutions**:

1. **Clean up Docker resources** (SAFEST):
   ```bash
   # Remove unused images, containers, volumes
   ssh sean@137.184.182.28 "docker system prune -a -f --volumes"
   ```

2. **Clean up old logs**:
   ```bash
   # Clear journal logs (keep last 3 days)
   ssh sean@137.184.182.28 "journalctl --vacuum-time=3d"
   ```

3. **Remove old backups** (if applicable):
   ```bash
   # List old backups
   ssh sean@137.184.182.28 "ls -lht ~/backups/"

   # Remove old backups (keep last 5)
   ssh sean@137.184.182.28 "cd ~/backups && ls -t | tail -n +6 | xargs rm -f"
   ```

**Historical Note**: On Oct 13, 2025, disk was 98% full. Running `docker system prune -a -f --volumes` freed 7.53GB.

---

## Development Issues

### SSH Tunnel Failure

**Symptoms**:
- Local dev server can't connect to database
- Backend shows PostgreSQL connection errors
- Only 1 job loads in UI (default state)

**Diagnosis**:
```bash
# Check if tunnel is running
ps aux | grep "ssh.*5433"

# Test database connection through tunnel
psql postgresql://motioadmin:M0t10n4lys1s@localhost:5433/motioPGDB -c 'SELECT 1'
```

**Solution**:
```bash
# Kill old tunnel
pkill -f "ssh.*5433"

# Start new tunnel with keep-alive
ssh -f -N -L 5433:172.17.0.1:5432 sean@137.184.182.28 \
  -o ServerAliveInterval=60 -o ServerAliveCountMax=3

# Restart dev server
npm run dev
```

---

### API URL Configuration Issues

**Symptoms**:
- Production app makes API calls to `http://localhost:3001`
- "Failed to fetch" errors when creating jobs
- Customer autocomplete doesn't work in production

**Root Cause**: Vite's `import.meta.env.PROD` unreliable during builds

**Solution** (Implemented Oct 13, 2025):

Created `src/config/api.ts` with hostname-based detection:
```typescript
export function apiUrl(path: string): string {
  const hostname = window.location.hostname;

  // If NOT localhost/127.0.0.1 → Production
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `${window.location.origin}${path}`;
  }

  // Localhost → Dev
  return `http://localhost:3001${path}`;
}
```

**Diagnosis**:
```javascript
// In browser console (production)
window.location.hostname  // Should be "kits.digiglue.io"
window.location.origin    // Should be "https://kits.digiglue.io"

// Test API URL generation
import { apiUrl } from './config/api';
apiUrl('/api/kitting-jobs');  // Should be "https://kits.digiglue.io/api/kitting-jobs"
```

---

### Browser Caching Issues

**Symptoms**:
- After deployment, new code not loading
- Console shows old JavaScript file names
- Features not working that should be deployed

**Solution**:
```
Hard refresh browser:
- Mac: Cmd + Shift + R
- Windows/Linux: Ctrl + Shift + R
- Or: Clear browser cache manually
```

**Prevention**: Add cache-busting headers (future enhancement):
```javascript
// server/index.cjs
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  next();
});
```

---

## Y Scenario Issues

See `/docs/user-guides/y-scenarios.md#troubleshooting` for Y Scenario specific troubleshooting:
- Y overlays not appearing
- ⏰ button not showing
- Delays not applying
- Job filters reset after drag
- Y overlay properties lost

---

## Database Issues

### Migration Failures

**Symptoms**:
- Prisma migration fails
- Foreign key constraint violations
- Data type mismatches

**Diagnosis**:
```bash
# Check current schema
ssh sean@137.184.182.28 "psql -h 172.17.0.1 -U motioadmin -d motioPGDB -c '\dt'"

# View table structure
ssh sean@137.184.182.28 "psql -h 172.17.0.1 -U motioadmin -d motioPGDB -c '\d kitting_jobs'"
```

**Solutions**:

1. **Test migration locally first**:
   ```bash
   # Local (using SSH tunnel)
   psql postgresql://motioadmin:M0t10n4lys1s@localhost:5433/motioPGDB \
     -f prisma/migrations/test_migration.sql
   ```

2. **Rollback failed migration**:
   ```bash
   # Restore from backup
   psql -h 172.17.0.1 -U motioadmin -d motioPGDB < backup_20251116_120000.sql
   ```

3. **Fix constraint violations** - Check existing data matches new constraints

---

### Connection Pool Exhaustion

**Symptoms**:
- "Too many clients" error
- Application hangs on database queries
- Slow response times

**Diagnosis**:
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity WHERE datname = 'motioPGDB';

-- View connection details
SELECT * FROM pg_stat_activity WHERE datname = 'motioPGDB';
```

**Solutions**:

1. **Kill idle connections**:
   ```sql
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE datname = 'motioPGDB'
     AND state = 'idle'
     AND state_change < now() - interval '10 minutes';
   ```

2. **Increase max connections** (if needed):
   ```bash
   # Edit PostgreSQL config
   sudo nano /etc/postgresql/*/main/postgresql.conf
   # Set: max_connections = 200 (from 100)

   # Restart PostgreSQL
   sudo systemctl restart postgresql
   ```

---

## Build Failures

### TypeScript Build Errors

**Historical Issue** (Resolved Oct 4, 2025):

**Problem**: Docker build failed with TypeScript configuration errors

**Solution**: Removed `tsc` from build script (Vite handles TS internally):
```json
// BEFORE (broken)
"client:build": "tsc && vite build"

// AFTER (fixed)
"client:build": "vite build"
```

---

### npm Install Failures

**Symptoms**:
- `npm install` fails during Docker build
- Package conflicts
- Peer dependency warnings

**Solutions**:

1. **Clear npm cache**:
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Use legacy peer deps** (if peer dependency conflicts):
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Check Node version compatibility**:
   ```bash
   node --version  # Should be v18.x (matches Docker)
   ```

---

## Networking Issues

### nginx-proxy Not Routing Traffic

**Symptoms**:
- Application accessible via IP:port but not via domain
- 502 Bad Gateway on domain
- nginx logs show no requests

**Diagnosis**:
```bash
# Check nginx-proxy logs
ssh sean@137.184.182.28 "docker logs reverse-proxy --tail 100 | grep kits.digiglue.io"

# Verify container network
ssh sean@137.184.182.28 "docker network inspect bridge"
```

**Solutions**:

1. **Verify environment variables** in docker-compose.yml:
   ```yaml
   environment:
     - VIRTUAL_HOST=kits.digiglue.io
   ```

2. **Restart nginx-proxy**:
   ```bash
   ssh sean@137.184.182.28 "docker restart reverse-proxy"
   ```

3. **Check container is on same network**:
   ```bash
   # Both containers should be on "bridge" network
   ssh sean@137.184.182.28 "docker network inspect bridge | grep Name"
   ```

---

## Emergency Procedures

### Complete System Reset

**⚠️ ONLY USE AS LAST RESORT** - This will cause downtime.

```bash
# SSH into server
ssh sean@137.184.182.28

# Stop all containers
cd ~/KitTrix-Express
docker-compose down

# Clean up Docker resources
docker system prune -a -f --volumes

# Rebuild from scratch
git pull
docker-compose up -d --build

# Monitor logs
docker logs kittrix-app -f
```

---

### Rollback to Previous Version

See `/docs/developer-guides/deployment.md#rollback-procedure`

---

## Getting Help

### Check Logs First
```bash
# Application logs
ssh sean@137.184.182.28 "docker logs kittrix-app --tail 100"

# System logs
ssh sean@137.184.182.28 "journalctl -xe --no-pager | tail -50"

# nginx logs
ssh sean@137.184.182.28 "docker logs reverse-proxy --tail 50"
```

### Debug Information to Collect
When reporting issues, include:
1. Error message (exact text)
2. Docker logs (`docker logs kittrix-app`)
3. System resources (`free -h`, `df -h`)
4. Recent changes (git log)
5. Browser console errors (if frontend issue)

---

## Related Documentation

- **Deployment**: `/docs/developer-guides/deployment.md`
- **Y Scenarios**: `/docs/user-guides/y-scenarios.md`
- **Changelog**: `/docs/project-management/CHANGELOG.md`

---

**Last Updated**: November 16, 2025
