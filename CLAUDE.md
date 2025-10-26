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

## Recent Fixes & Updates

### API URL Configuration Fix (October 13, 2025)

**Problem**: Production application was making API calls to `http://localhost:3001` instead of the production URL, causing "Failed to fetch" errors when creating jobs and using customer autocomplete.

**Root Causes Identified**:
1. Vite's `import.meta.env.PROD` was not being set to `true` during production builds
2. Multiple fetch calls in `Dashboard.tsx` were using hardcoded relative URLs instead of the `apiUrl()` helper
3. Browser caching was preventing the new code from loading

**Solutions Implemented**:

1. **Created API Configuration Module** (`src/config/api.ts`):
   - Centralized API URL management
   - Uses hostname-based detection instead of unreliable `import.meta.env.PROD`
   - Logic: If hostname is NOT localhost/127.0.0.1 → Production (use `window.location.origin`)
   - Includes comprehensive debug logging for troubleshooting

2. **Fixed Hardcoded API Calls in Dashboard.tsx**:
   - `updateKittingJobSchedule()` - Job scheduling updates
   - `handleAssignJob()` - Job assignments
   - `handleUnassignJob()` - Removing assignments
   - `handleChangeStatus()` - Changing job status
   - All now use `apiUrl()` helper for proper URL construction

3. **Added Enhanced Error Logging**:
   - `EditJob.tsx` - Detailed error messages with HTTP status codes
   - `CustomerAutocomplete.tsx` - Request/response logging
   - Console logs show exact URLs being called for debugging

**Commits**:
- `e5df4ce2` - Fix API URL detection using hostname check
- `2d040879` - Add comprehensive logging to API config
- `68b99f27` - Fix hardcoded API URLs in Dashboard
- `e509f8e2` - Add detailed error logging
- `57c3f319` - Initial production API URL configuration

**Testing**:
- Browser cache clearing required after deployment (Ctrl+Shift+R / Cmd+Shift+R)
- Verified with console logs showing correct production URL detection
- Confirmed job creation and customer autocomplete working in production

**Deployment Notes**:
- Server disk space was 98% full during deployment
- Cleaned up Docker resources with `docker system prune -a -f --volumes`
- Freed 7.53GB of space (now at 59% usage)
- Recommend monitoring disk space and keeping it under 80%

### Multi-Station Execution Interface (October 25, 2025)

**Problem**: Multiple workers needed to execute the same kitting job simultaneously from different stations/tablets without interfering with each other's progress.

**Implementation**:

1. **Database Schema Changes** (`prisma/migrations/20251025_add_station_tracking.sql`):
   - Added `next_station_number` to `job_progress` table (atomic counter for station assignment)
   - Added `station_number` and `station_name` to `kit_executions` table (track which station completed which kit)
   - Migration ensures existing data compatibility

2. **Backend API Endpoints** (`server/index.cjs`):
   - `POST /api/job-progress/:id/assign-station` - Atomically assigns unique station numbers (1, 2, 3, etc.)
   - `POST /api/job-progress/:id/release-station` - Decrements counter when execution interface closed
   - `POST /api/job-progress/reset-all-stations` - Admin endpoint to reset all counters
   - Station assignment uses Prisma's atomic `increment`/`decrement` for race-condition safety

3. **Frontend Implementation** (`src/pages/JobExecute.tsx`):
   - Automatic station assignment on page load using `useRef` to prevent duplicate requests
   - Station info stored in both React state and kit execution records
   - Changed `currentKitExecutionId` from `useState` to `useRef` for synchronous updates (fixes timing bugs)
   - Added `hasAutoStarted` ref to prevent infinite render loops
   - Independent kit tracking per station (Station 1 works on kit #1, Station 2 on kit #2, etc.)
   - Polling mechanism syncs completed kits count across all stations every 2 seconds
   - Station cleanup on window close/navigation using `beforeunload` event

4. **UI Updates** (`src/components/BasicExecutionView.tsx`):
   - Consolidated header card layout with 4-column grid:
     - Job # / Customer Name
     - Time Remaining (with overdue indicator)
     - Station # (with icon)
     - Kit Counter (total + station-specific)
   - Removed separate "Time Remaining" card as requested
   - Maximized "NEXT KIT" button to fill remaining vertical space
   - Performance status indicators (AHEAD/ON_TRACK/BEHIND)

**Key Technical Details**:
- Station assignment happens BEFORE kit starts (two separate useEffect hooks)
- Kit execution IDs use refs instead of state for immediate availability
- Multi-station sync uses optimistic local state + server polling
- Each station maintains independent kit counter (`stationKitsCompleted`)
- Global job progress updates atomically to prevent race conditions

**Known Issues**:
- Station number doesn't display immediately on loading screen (only after kit starts)
- Need to implement better station visibility on initial page load

**Files Modified**:
- `prisma/schema.prisma` - Added station tracking fields
- `server/index.cjs` - Station assignment API endpoints
- `src/pages/JobExecute.tsx` - Multi-station orchestration logic
- `src/components/BasicExecutionView.tsx` - Consolidated UI layout

**Database Migration**:
```sql
-- Run on production database
ALTER TABLE job_progress ADD COLUMN next_station_number INTEGER DEFAULT 0;
ALTER TABLE kit_executions ADD COLUMN station_number INTEGER;
ALTER TABLE kit_executions ADD COLUMN station_name TEXT;
```

## Next Steps & Future Improvements
1. Fix station number display on loading screen (show immediately, not after kit starts)
2. Add cache-busting headers to prevent stale JavaScript issues
3. Set up automated deployment via GitHub Actions
4. Implement health monitoring and alerts
5. Add database backup automation
6. Configure container auto-restart on failure
7. Optimize Docker image size further
8. Set up disk space monitoring/alerts
9. Implement station release when browser crashes (not just clean exit)
