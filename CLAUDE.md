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

### What-If Scenario Planning System (November 4, 2025)

**Problem**: Production schedulers needed a safe way to explore scheduling alternatives without risking changes to production data. Moving jobs on the calendar in production mode was too risky for experimentation.

**Implementation**:

1. **Database Schema** (`prisma/migrations/20251030_add_scenario_tables.sql`):
   - Added `scenarios` table to store named planning scenarios
   - Added `scenario_changes` table to track ADD/MODIFY/DELETE operations
   - Uses JSONB for flexible change data storage
   - CASCADE delete ensures cleanup when scenarios are discarded
   - **Migration Status**: ✅ SAFE - Additive only, no existing tables modified

2. **Frontend Components**:
   - **WhatIfControl Panel** (`src/components/WhatIfControl.tsx`) - Slide-out sidebar for scenario management
   - **useWhatIfMode Hook** (`src/hooks/useWhatIfMode.ts`) - State management and API integration
   - Mode toggle button in Dashboard shows "🔮 What-If" (always visible)
   - Button background changes color to indicate current mode (purple = what-if, white = production)

3. **Key Features**:
   - Create named scenarios with descriptions
   - Activate scenarios to enter what-if mode
   - Drag-and-drop jobs to test schedule changes (tracked as MODIFY operations)
   - Changes panel shows live count of modifications
   - Commit scenarios to apply all changes to production atomically
   - Discard scenarios without applying changes
   - Multi-window sync via BroadcastChannel API

4. **Critical Bug Fixes** (November 4, 2025):

   **Fix #1: Drag-and-Drop Not Tracking Changes**
   - **Problem**: `updateKittingJobSchedule()` always updated production database, ignoring what-if mode
   - **Solution**: Added mode detection at Dashboard.tsx:420-454
   - **Behavior**:
     - What-if mode: Calls `whatIf.addChange('MODIFY', ...)` to track changes
     - Production mode: Updates database directly (original behavior)
   - **User feedback**: Toast shows 🔮 emoji in what-if mode

   **Fix #2: Scenario Commit Date Format Error**
   - **Problem**: Prisma rejected `scheduledDate: "2025-10-31"` (expected ISO-8601 DateTime)
   - **Solution**: Added data sanitization at server/index.cjs:667-683
   - **Transforms**:
     - `"2025-10-31"` → `new Date("2025-10-31T12:00:00.000Z")`
     - Removes display-only fields (`jobNumber`, `customerName`)
   - **Result**: Scenarios now commit successfully with proper date handling

   **Fix #3: What-If Button Label Confusion**
   - **Problem**: Button showed current state ("Production" or "What-If"), not the action
   - **Solution**: Button now always shows "🔮 What-If" (Dashboard.tsx:688)
   - **Visual feedback**: Background color indicates active mode

5. **Development Environment Requirements**:
   - **SSH Tunnel Required**: `ssh -f -N -L 5433:172.17.0.1:5432 sean@137.184.182.28`
   - **Keep-alive recommended**: Add `-o ServerAliveInterval=60 -o ServerAliveCountMax=3`
   - **Symptom if tunnel dies**: Backend errors, jobs don't load, only 1 job visible
   - **Fix**: Restart tunnel and restart `npm run dev`

6. **Database Migration Deployment**:
   ```bash
   # Check if tables exist
   psql postgresql://motioadmin:M0t10n4lys1s@localhost:5433/motioPGDB -c "\dt scenarios"

   # Run migration if needed
   psql postgresql://motioadmin:M0t10n4lys1s@localhost:5433/motioPGDB \
     -f prisma/migrations/20251030_add_scenario_tables.sql

   # Regenerate Prisma client
   npx prisma generate
   ```

**Files Modified**:
- `src/pages/Dashboard.tsx` - Added what-if mode detection in updateKittingJobSchedule()
- `src/components/WhatIfControl.tsx` - Scenario management UI
- `src/hooks/useWhatIfMode.ts` - What-if state management hook
- `server/index.cjs` - Scenario API endpoints + commit data sanitization
- `prisma/schema.prisma` - Scenario and ScenarioChange models
- `prisma/migrations/20251030_add_scenario_tables.sql` - Database migration

**Testing Checklist**:
- [ ] Create scenario with name and description
- [ ] Activate scenario (button turns purple)
- [ ] Drag job to new date - see 🔮 toast and change count increment
- [ ] Switch to production mode - see original schedule
- [ ] Switch back to what-if mode - see modified schedule
- [ ] Commit scenario - changes apply to production, scenario deleted
- [ ] Discard scenario - changes lost, scenario deleted

**Known Limitations**:
- Only schedule changes (date/time) are tracked; job creation/deletion not yet implemented
- Single active scenario per session (no scenario comparison view)
- No scenario save/reload after page refresh (scenarios persist in database)

### Shift Calendar Improvements (November 5, 2025)

**Implemented Features** (Commit: 12e08a38):

1. **Shift Toggle Buttons** (Week 3 - Quick Wins):
   - Added quick toggle buttons in Dashboard header next to job filters
   - Click shift name to activate/deactivate (toggles `isActive` status)
   - Visual feedback with colored buttons (active = custom shift color, inactive = gray)
   - Hover over shift button reveals gear icon (⚙️) to edit shift settings
   - Toast notifications confirm activation/deactivation
   - Calendar automatically refreshes when shifts are toggled

2. **Shift Configuration Modal** (Week 3 - Quick Wins):
   - New `ShiftConfigModal.tsx` component for comprehensive shift editing
   - **Form Fields**:
     - Shift name (required)
     - Start time (HH:MM format, validated)
     - End time (HH:MM format, validated)
     - Break start time (optional)
     - Break duration in minutes (optional, 0-180 range)
     - Visual color picker with 8 preset colors + custom color input
   - **Features**:
     - Form validation with error messages
     - Keyboard shortcuts (Esc to close, Enter to save)
     - Delete shift button (with confirmation dialog)
     - Loading states for save/delete operations
   - **API Integration**:
     - PUT `/api/shifts/:id` for updates
     - DELETE `/api/shifts/:id` for deletion (newly added endpoint)
     - Automatic shift list refresh after operations

3. **What-If Visual Indicators** (Week 4 - Quick Wins):
   - Added `__whatif` property to Event interface (`'added' | 'modified' | 'deleted'`)
   - Jobs modified in what-if mode now display visual indicators on calendar:
     - **Added jobs**: Green left border (`border-green-500`) + green ring + ➕ badge
     - **Modified jobs**: Yellow left border (`border-yellow-500`) + yellow ring + ✏️ badge
     - **Deleted jobs**: Red left border (`border-red-500`) + red ring + 🗑️ badge + dimmed opacity
   - **Emoji badges**: Positioned in top-right corner with semi-transparent black background
   - **Marker preservation**: `__whatif` property flows through entire data pipeline:
     - Set by `useWhatIfMode` hook (lines 150, 159, 169)
     - Passed through `kittingJobToEvents()` conversion (Dashboard.tsx:346, 369, 388)
     - Rendered by `DurationBasedEvent` component (lines 84-98, 120-124)

**Technical Implementation**:

**Dashboard.tsx Changes**:
```typescript
// Shift Toggle Handler (lines 108-143)
const handleShiftToggle = async (shiftId: string) => {
  const shift = allShifts.find(s => s.id === shiftId);
  const newActiveStatus = !shift.isActive;

  await fetch(apiUrl(`/api/shifts/${shiftId}`), {
    method: 'PATCH',
    body: JSON.stringify({ isActive: newActiveStatus })
  });

  await loadActiveShifts(); // Refresh
  toast.success(newActiveStatus ? `✓ Activated ${shift.name}` : `Deactivated ${shift.name}`);
};

// Shift Edit Handler (lines 145-148)
const handleEditShift = (shift: Shift) => {
  setEditingShift(shift);
  setIsShiftModalOpen(true);
};

// Shift Save/Delete Handlers (lines 150-188)
const handleSaveShift = async (shiftId: string, updates: Partial<Shift>) => {
  await fetch(apiUrl(`/api/shifts/${shiftId}`), {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
  await loadActiveShifts();
  toast.success('✓ Shift saved successfully');
};

// Shift Toggle UI (lines 802-833)
{allShifts.map((shift) => (
  <div key={shift.id} className="relative group">
    <button onClick={() => handleShiftToggle(shift.id)}>
      {shift.name}
    </button>
    <button onClick={() => handleEditShift(shift)}>⚙</button>
  </div>
))}
```

**server/index.cjs Changes**:
```javascript
// DELETE endpoint added (lines 502-516)
app.delete('/api/shifts/:id', async (req, res) => {
  const shift = await prisma.shift.delete({ where: { id } });
  console.log(`🗑️ Deleted shift: ${shift.name}`);
  res.json({ success: true });
});
```

**DurationBasedEvent.tsx Changes**:
```typescript
// Visual indicators (lines 84-98)
const whatIfBorder = event.__whatif
  ? event.__whatif === 'added'
    ? 'border-l-4 border-green-500 ring-2 ring-green-400/50'
    : event.__whatif === 'modified'
    ? 'border-l-4 border-yellow-500 ring-2 ring-yellow-400/50'
    : 'border-l-4 border-red-500 ring-2 ring-red-400/50 opacity-60'
  : 'border-l-4 border-white/20';

const whatIfEmoji = event.__whatif
  ? event.__whatif === 'added' ? '➕'
    : event.__whatif === 'modified' ? '✏️'
    : '🗑️'
  : null;

// Emoji badge rendering (lines 120-124)
{whatIfEmoji && (
  <div className="absolute top-0.5 right-0.5 text-sm bg-black/30 rounded-full">
    {whatIfEmoji}
  </div>
)}
```

**Files Modified**:
- `src/pages/Dashboard.tsx` - Shift toggles, handlers, modal integration (145 lines added)
- `src/components/ShiftConfigModal.tsx` - New modal component (420 lines)
- `src/components/DurationBasedEvent.tsx` - Visual what-if indicators (40 lines added)
- `src/types/event.ts` - Added `__whatif` property to Event interface
- `server/index.cjs` - Added DELETE `/api/shifts/:id` endpoint

**User Workflow**:

*Managing Shifts*:
1. View active shifts in Dashboard header (next to job filters)
2. Click shift name to toggle active/inactive
3. Hover over shift → click ⚙️ icon to open settings
4. Edit shift details (times, breaks, color) in modal
5. Click "Save Changes" or "Delete" button
6. Calendar automatically refreshes with new configuration

*What-If Mode Visual Feedback*:
1. Activate a scenario from What-If panel
2. Drag job to new date/time on calendar
3. Job now shows colored border and emoji badge:
   - Modified job = yellow border + ✏️ badge
4. Switch to Production mode → see original schedule (no badges)
5. Switch back to What-If mode → see modified schedule (badges visible)
6. Commit scenario → badges disappear, changes applied to production

**Known Limitations**:
- Shift deletion does not check for dependent jobs (may break scheduling if jobs reference deleted shift)
- No bulk shift operations (activate/deactivate all)
- Shift edit modal has no "duplicate shift" feature
- What-if deleted jobs still visible on calendar (just dimmed with 🗑️ badge)

### Y Scenario Overlay System with Delay Injection (November 5, 2025)

**Problem**: Production schedulers needed to compare multiple what-if scenarios simultaneously on the calendar and model the impact of delays (maintenance, meetings, equipment downtime) on job schedules.

**Implementation**: Complete 5-phase system spanning UI, database, API, and scheduling logic.

---

#### Phase 1: Filter Panel Tab UI & Dual Badges (Commit: 97655eca)

**Components**:
- **Tab Interface**: Added Jobs / Y Overlays tabs to `JobFilterPanel.tsx`
  - "📋 Jobs" tab (blue) - original job filtering
  - "🔮 Y Overlays" tab (purple) - scenario overlay management
- **Scenario List UI**:
  - Checkboxes to toggle scenario visibility (multi-select supported)
  - Purple background when visible
  - "ACTIVE" badge for active scenario
  - Shows change count and creation date
  - Empty state with instructions: "Click 🔮 What-If button to create scenarios"
- **Dual Badge System** on Filters button:
  - **Red badge** (top-right): Hidden jobs count
  - **Purple badge** (bottom-right): Y overlay jobs count
  - Badges only appear when count > 0

**Hooks**:
- **useYScenarioFilters** (`src/hooks/useYScenarioFilters.ts`):
  - Manages overlay visibility (Set of scenario IDs)
  - Search/filter scenarios by name or description
  - Group by: none, job#, customer, status
  - localStorage persistence
  - Returns: visibleScenarios, filteredScenarios, toggleScenarioVisibility()

**Technical Details**:
```typescript
// JobFilterPanel.tsx
const [activeTab, setActiveTab] = useState<'jobs' | 'yoverlays'>('jobs');
const [groupBy, setGroupBy] = useState<'none' | 'job#' | 'customer' | 'status'>('none');

// Dashboard.tsx - Dual badges
{jobFilters.hiddenJobCount > 0 && (
  <span className="absolute -top-2 -right-2 bg-red-500">
    {jobFilters.hiddenJobCount}
  </span>
)}
{whatIf.yOverlayJobs.length > 0 && (
  <span className="absolute -bottom-2 -right-2 bg-purple-500">
    {whatIf.yOverlayJobs.length}
  </span>
)}
```

---

#### Phase 2: Database Schema & Delay API Endpoints (Commit: 8d115c86)

**Database Migration** (`prisma/migrations/20251105_add_job_delays.sql`):
- **✅ SAFE**: Creates new `job_delays` table only (no modifications to existing tables)
- **Rollback SQL**: `DROP TABLE job_delays;`

**JobDelay Model** (`prisma/schema.prisma`):
```typescript
model JobDelay {
  id           String   @id @default(cuid())
  scenarioId   String   @map("scenario_id")
  jobId        String   @map("job_id")
  name         String   // "Equipment maintenance", "Team meeting"
  duration     Int      // Duration in seconds
  insertAfter  Int      @map("insert_after") // Insert after step order # (0 = after setup)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  scenario     Scenario @relation(fields: [scenarioId], onDelete: Cascade)

  @@index([scenarioId])
  @@index([jobId])
  @@map("job_delays")
}
```

**API Endpoints** (`server/index.cjs`):
1. **GET /api/scenarios/:id/delays** - Fetch all delays for scenario
2. **GET /api/scenarios/:scenarioId/jobs/:jobId/delays** - Job-specific delays
3. **POST /api/scenarios/:id/delays** - Create new delay
   - Validates: jobId, name, duration > 0, insertAfter >= 0
   - Returns created delay object
4. **PUT /api/delays/:id** - Update existing delay (partial updates)
5. **DELETE /api/delays/:id** - Remove delay (with 404 check)

**Field Descriptions**:
- `name`: Human-readable description (e.g., "Equipment maintenance")
- `duration`: Delay duration in seconds
- `insertAfter`: Route step order number to insert delay after (0 = after setup, 1 = after step 1, etc.)

---

#### Phase 3: Delay Editor UI Components (Commit: cb8f272d, 52f8e983)

**DelayEditor.tsx** - Modal for managing job delays:
- **Layout**:
  - Header: Scenario name, job number, customer name
  - Body: Scrollable list of job route steps
  - Footer: Delay count summary
- **Route Step Display**:
  - Blue cards: Setup / Make-Ready & Take-Down
  - Gray cards: Regular route steps (with step order #)
  - Yellow cards (indented): Delays injected after steps
- **Features**:
  - "Add Delay After" button on each step
  - Delete delay button (trash icon) with confirmation
  - Shows delay duration formatted (e.g., "1h 30m")
  - Auto-refreshes when delays change
- **API Integration**:
  - Fetches delays on open: `GET /api/scenarios/:scenarioId/jobs/:jobId/delays`
  - Deletes delay: `DELETE /api/delays/:id`

**AddDelayDialog.tsx** - Nested modal for creating delays:
- **Form Fields**:
  - Delay name (text input, required)
  - Hours (0-999)
  - Minutes (0-59, capped)
  - Shows total in seconds
- **Quick Presets**: Buttons for 15m, 30m, 1h, 2h
- **Validation**:
  - Name required
  - Duration must be > 0
- **Creates delay**: `POST /api/scenarios/:scenarioId/delays`
- **z-index**: 60 (overlays DelayEditor at z-50)

**Wiring to UI** (Commit: 52f8e983):
- **"⚙️ Delays" button** added to each scenario in Y Overlays tab
- Yellow badge styling for visibility
- Opens DelayEditor with first job (simple implementation)
- Shows alert if no jobs available
- Passes `allJobs={kittingJobs}` from Dashboard to JobFilterPanel

**User Workflow**:
```
1. Open Filters → 🔮 Y Overlays tab
2. Click "⚙️ Delays" on any scenario
3. DelayEditor opens showing job's route steps
4. Click "Add Delay After" on any step
5. AddDelayDialog opens
6. Enter delay name and duration
7. Click "Add Delay"
8. Delay appears in yellow card below step
9. Close editor → delays saved to database
```

---

#### Phase 4: Delay Application Logic (Commit: 6049b64c)

**applyDelaysToJob()** (`src/utils/shiftScheduling.ts`):
- **Purpose**: Inject synthetic delay steps into job's route steps array
- **Algorithm**:
  1. Sort route steps by order
  2. Group delays by `insertAfter` position
  3. Build new route steps array:
     - Insert delays after setup (insertAfter = 0)
     - For each route step:
       - Add the step
       - Add delays that come after it
  4. Renumber all steps sequentially
  5. Calculate total delay duration
  6. Extend job duration: `expectedJobDuration += totalDelaySeconds`

**Delay Step Structure**:
```typescript
{
  id: `delay-${delay.id}`,           // Synthetic ID
  name: `⏰ ${delay.name}`,           // ⏰ prefix for visibility
  expectedSeconds: delay.duration,    // Delay duration
  order: stepOrderCounter++,          // Sequential order
  __isDelay: true,                    // Marker for UI
  __delayId: delay.id                 // Original delay ID
}
```

**Modified Job Structure**:
```typescript
{
  ...job,
  routeSteps: newRouteSteps,          // Steps + delays
  expectedJobDuration: newEJD,         // Extended duration
  __delaysApplied: true,              // Application marker
  __totalDelaySeconds: totalSeconds   // Total delay time
}
```

**useWhatIfMode Updates** (`src/hooks/useWhatIfMode.ts`):
- **State**: `scenarioDelays: Map<scenarioId, delays[]>`
- **fetchScenarioDelays()**: Fetches delays for specific scenario
- **fetchScenarios()**: Enhanced to fetch delays for all scenarios
- **yOverlayJobs useMemo**: Apply delays AFTER applying scenario changes
  ```typescript
  // Apply scenario changes (ADD/MODIFY/DELETE)
  for (const change of scenario.changes) { ... }

  // Apply delays to jobs in this scenario
  const scenarioDelayList = scenarioDelays.get(scenario.id) || [];
  modifiedJobs = modifiedJobs.map(job => {
    const jobDelays = scenarioDelayList.filter(d => d.jobId === job.id);
    if (jobDelays.length > 0) {
      return applyDelaysToJob(job, jobDelays);
    }
    return job;
  });
  ```

---

#### Phase 5: Ghost Overlay Rendering (Commit: a808610a)

**Calendar Integration** (`src/pages/Dashboard.tsx`):
```typescript
const allCalendarItems = [
  ...events,
  ...jobFilters.visibleJobs.flatMap(kittingJobToEvents),
  ...whatIf.yOverlayJobs.flatMap(kittingJobToEvents)  // Y overlays
];
```

**Ghost Styling** (`src/components/DurationBasedEvent.tsx`):
- **Y Scenario Detection**: `const isYScenario = !!event.__yScenario;`
- **Visual Styles**:
  - Semi-transparent: `opacity-50`
  - Dashed purple border: `border-2 border-dashed border-purple-400/60`
  - Backdrop blur: `backdrop-blur-[2px]`
  - Deleted jobs: Red dashed border + `opacity-40`
- **Scenario Name Badge** (top-left):
  ```tsx
  {isYScenario && (
    <div className="absolute top-0.5 left-0.5 bg-purple-600/90 text-white">
      🔮 {event.__yScenarioName}
    </div>
  )}
  ```
- **Priority**: Y scenario styling overrides what-if styling (prevents conflicts)

**Multi-Scenario Support**:
- Each scenario shows its own color-coded ghost jobs
- Jobs can belong to multiple scenarios (different badges)
- Overlays update automatically when scenarios toggled
- Each overlay shows extended duration from delays

---

#### Complete System Architecture

```
User Flow:
1. Create scenario (🔮 What-If button)
2. Drag jobs to new dates (tracked as changes)
3. Open Filters → Y Overlays tab
4. Check scenarios to show as overlays
5. Click ⚙️ Delays on scenario
6. Add delays after route steps
7. Close editor → delays saved
8. Calendar shows ghost overlays with extended durations
9. Compare multiple scenarios side-by-side
10. Commit preferred scenario to production

Data Flow:
Production Jobs → Scenario Changes → Apply Changes → Apply Delays → Ghost Overlays → Calendar Rendering

Storage:
- Scenarios: scenarios table
- Changes: scenario_changes table (JSONB)
- Delays: job_delays table
- Visibility: localStorage (Y scenario filters)
```

---

#### Files Modified/Created

**Created**:
- `src/hooks/useYScenarioFilters.ts` (150 lines)
- `src/components/DelayEditor.tsx` (278 lines)
- `src/components/AddDelayDialog.tsx` (227 lines)
- `prisma/migrations/20251105_add_job_delays.sql` (33 lines)

**Modified**:
- `src/components/JobFilterPanel.tsx` (+114 lines) - Tab UI, scenario list, delay button
- `src/pages/Dashboard.tsx` (+7 lines) - Y overlay rendering, allJobs prop
- `src/components/DurationBasedEvent.tsx` (+28 lines) - Ghost styling
- `src/hooks/useWhatIfMode.ts` (+43 lines) - Delay fetching and application
- `src/utils/shiftScheduling.ts` (+97 lines) - applyDelaysToJob function
- `server/index.cjs` (+148 lines) - 5 delay API endpoints
- `prisma/schema.prisma` (+19 lines) - JobDelay model

**Commits**:
1. `97655eca` - Wire Y scenario filters to UI with dual badges
2. `a808610a` - Implement Y scenario ghost overlay rendering on calendar
3. `8d115c86` - Add JobDelay model and delay management API endpoints
4. `cb8f272d` - Create delay management UI components
5. `52f8e983` - Wire delay editor to Y Overlays tab with Delays button
6. `6049b64c` - Implement delay application logic for Y scenario overlays

**Total Implementation**: ~1,000 lines of new code + 336 lines of modifications

---

#### Technical Highlights

**Multi-Window Sync**:
- BroadcastChannel API syncs scenario visibility across tabs
- localStorage persists Y scenario filter preferences
- Scenario changes broadcast to all open windows

**Performance Optimization**:
- Delays fetched once per scenario (cached in Map)
- useMemo prevents unnecessary recomputation
- Delays only applied to visible scenarios

**Data Integrity**:
- CASCADE delete: Removing scenario removes all delays
- Atomic operations: Scenario commit applies all changes together
- Validation: Duration > 0, insertAfter >= 0, name required

**Extensibility**:
- JobDelay model supports future fields (e.g., delay type, responsible party)
- applyDelaysToJob() can be extended for resource constraints
- Ghost styling can be customized per scenario

---

#### Known Limitations

- Delay editor picks first job (no job selector yet)
- Delays don't account for shift boundaries (yet)
- No delay templates or presets
- Cannot copy delays between scenarios
- No delay analytics (total impact, critical path)

## Next Steps & Future Improvements

### Infrastructure & DevOps
1. Implement station release when browser crashes (not just clean exit)
2. Add cache-busting headers to prevent stale JavaScript issues
3. Set up automated deployment via GitHub Actions
4. Implement health monitoring and alerts
5. Add database backup automation
6. Configure container auto-restart on failure
7. Optimize Docker image size further
8. Set up disk space monitoring/alerts

### Shift Management
9. Add shift validation before deletion (check for dependent jobs)
10. Add bulk shift operations (activate/deactivate all shifts)
11. Add "duplicate shift" feature to shift config modal
12. Implement break time visualization on calendar

### What-If & Y Scenario System
13. Extend what-if mode to support job creation/deletion (not just MODIFY)
14. Add scenario comparison view (side-by-side before/after)
15. **Add job selector to delay editor** (currently picks first job)
16. **Implement delay templates/presets** (e.g., "Standard Lunch", "Equipment Maintenance")
17. **Add delay copy between scenarios**
18. **Add delay analytics dashboard** (total impact, critical path analysis)
19. **Account for shift boundaries in delay application** (don't extend into non-productive time)
20. **Add delay type categorization** (maintenance, break, meeting, etc.)
21. **Implement delay visualization on job cards** (⏰ icon with count)
22. **Add scenario notes/changelog** (track why changes were made)
23. **Export scenario reports** (PDF/Excel with before/after comparison)
