# Y Scenario System - User & Developer Guide

**KitTrix Express - Scenario Planning & Forecasting**

This guide covers the complete Y Scenario (Ŷ) system for production schedule forecasting and what-if analysis.

> **Note**: For the statistical framework and residual analysis architecture, see `Y_YHAT_ARCHITECTURE.md`

---

## Table of Contents

1. [Conceptual Overview](#conceptual-overview)
2. [User Guide](#user-guide)
3. [Visual Design](#visual-design)
4. [Technical Architecture](#technical-architecture)
5. [Delay Injection System](#delay-injection-system)
6. [Developer Reference](#developer-reference)
7. [Troubleshooting](#troubleshooting)

---

## Conceptual Overview

### What Are Y Scenarios?

**Y Scenarios** (Ŷ, pronounced "Y-hat") are **prediction overlays** that let you test schedule alternatives without affecting production data.

**Terminology**:
- **Y (Production)** = Reality / Ground truth / What actually happens
- **Ŷ (Scenarios)** = Predictions / Forecasts / What might happen
- **Y - Ŷ** = Residuals / Prediction errors (for future analysis)

**Origin**: "What-**Y-f**" → "What-if" → **Y** Scenarios. Based on regression analysis where Ŷ represents predicted values.

### Why Use Y Scenarios?

- **Safe experimentation** - Test schedule changes without risking production data
- **Multi-scenario comparison** - View multiple predictions simultaneously (purple ghost overlays)
- **Delay modeling** - Inject delays (maintenance, meetings) to see impact
- **Data-driven improvement** - Future: Compare predictions (Ŷ) to actual outcomes (Y) for continuous improvement

---

## User Guide

### Creating a Scenario

**Method 1: From Dashboard**
1. Click **🔮 What-If** button in header
2. Enter scenario name and description
3. Click "Create Scenario"
4. Scenario is now active - drag jobs to create modifications

**Method 2: From Job Context Menu**
1. Right-click any kitting job
2. Select "🔮 Create Y Scenario for Job"
3. Scenario auto-created with that job as focus

### Viewing Y Overlays

**Enable Overlay Display**:
1. Click **🔍 Filters** button (shows purple badge if overlays active)
2. Switch to **🔮 Ŷ (Scenarios)** tab
3. Check the checkbox next to scenarios you want to see
4. Calendar now shows purple ghost overlays for those scenarios

**Multiple Overlays**:
- You can show multiple scenarios at once
- Each scenario displays as purple ghost jobs with scenario name badge
- Toggle visibility independently

### Modifying Jobs in Scenarios

**Drag-and-Drop**:
1. Activate a scenario (🔮 What-If button)
2. Drag jobs to new dates/times
3. Toast shows "🔮 Modified in scenario"
4. Changes tracked as MODIFY operations

**Edit Job Properties**:
1. Right-click job → "✏️ Edit Job" (opens in new tab)
2. Changes automatically tracked in active scenario

**Edit Allowed Shifts**:
1. Right-click job → "Edit Allowed Shifts"
2. Select/deselect shifts
3. Y scenarios can test ANY shifts (ignores global isActive status)

### Adding Delays to Jobs

**From Y Overlay Job Card** (fastest):
1. Enable Y overlay visibility (Filters → Ŷ tab → check scenario)
2. Hover over purple ghost job on calendar
3. Click **⏰** button on purple badge
4. Delay Editor opens directly for that job
5. Click "+ Add Delay After" on any route step
6. Enter delay name and duration
7. Delay injected into job schedule

**From Scenario List**:
1. Filters → 🔮 Ŷ (Scenarios) tab
2. Click **⏰ Delays** button next to scenario name
3. Select job from list
4. Add delays using "+ Add Delay After" buttons

**Delay Examples**:
- Equipment maintenance (2 hours after step 3)
- Team meeting (30 minutes after setup)
- Shift changeover (15 minutes after step 5)

### Comparing Scenarios

**Visual Comparison**:
1. Enable multiple scenarios in Ŷ tab
2. Each scenario shows with different purple ghost overlays
3. Jobs from different scenarios overlap for side-by-side comparison

**Identifying Scenarios**:
- Each job shows "🔮 Ŷ: {Scenario Name}" badge
- Purple dashed border (4px thick)
- Purple glow shadow
- 40% opacity (ghostly appearance)

### Committing a Scenario

**Apply Changes to Production**:
1. Filters → 🔮 Ŷ (Scenarios) tab
2. Click **✅ Commit** button next to scenario
3. Confirm the action
4. All MODIFY operations applied to production jobs
5. Scenario deleted automatically

**What Gets Committed**:
- Schedule changes (date/time)
- Shift assignments
- Station assignments
- **Note**: Delays are NOT committed (they're modeling tools)

### Deleting a Scenario

1. Filters → 🔮 Ŷ (Scenarios) tab
2. Click **🗑️ Delete** button
3. Confirm deletion
4. Scenario and all changes discarded
5. Production data unaffected

---

## Visual Design

### Production Jobs (Y)
```
Appearance: Solid color bars, 100% opacity
Border: Thin white/gray border
Badge: None (or optional "Y Production" label)
Interaction: Editable, draggable, right-click context menu
```

### Y Scenario Overlays (Ŷ)
```
Appearance: Purple ghost overlay
Opacity: 40% (semi-transparent)
Border: 4px dashed purple (#a855f7/80)
Shadow: Purple glow (shadow-lg shadow-purple-500/30)
Backdrop: Slight blur effect
Pattern: Gradient overlay (from-purple-300/20 to-transparent)
Badge: Full-width purple "🔮 Ŷ: {Scenario Name}"
Hover: ⏰ button appears (if job height >= 60px)
Interaction: Not draggable, not editable (click disabled)
```

### What-If Modifications (X-axis)
```
Appearance: Production job colors, 100% opacity
Border: Left border + ring (4px)
  - Green: Added jobs (border-green-500 + ➕ badge)
  - Yellow: Modified jobs (border-yellow-500 + ✏️ badge)
  - Red: Deleted jobs (border-red-500 + 🗑️ badge, opacity-60)
Badge: Emoji in top-right corner
Interaction: Editable, draggable
```

### Visual Priority
```
1. Y Scenario styling (purple ghost) OVERRIDES what-if styling
2. What-if styling (colored borders) for active scenario only
3. Production styling (solid) is base layer
```

---

## Technical Architecture

### Database Schema

**scenarios table**:
```sql
id TEXT PRIMARY KEY
name TEXT NOT NULL
description TEXT
is_active BOOLEAN DEFAULT FALSE
created_at TIMESTAMP
updated_at TIMESTAMP
```

**scenario_changes table**:
```sql
id TEXT PRIMARY KEY
scenario_id TEXT REFERENCES scenarios(id) ON DELETE CASCADE
job_id TEXT
operation TEXT ('ADD' | 'MODIFY' | 'DELETE')
change_data JSONB  -- New values
original_data JSONB  -- Original values for rollback
created_at TIMESTAMP
```

**job_delays table**:
```sql
id TEXT PRIMARY KEY
scenario_id TEXT REFERENCES scenarios(id) ON DELETE CASCADE
job_id TEXT NOT NULL
name TEXT  -- "Equipment maintenance"
duration INTEGER  -- Seconds
insert_after INTEGER  -- Route step order (0 = after setup)
created_at TIMESTAMP
updated_at TIMESTAMP
```

### State Management

**useWhatIfMode Hook** (`src/hooks/useWhatIfMode.ts`):
- Manages scenario lifecycle (create, activate, commit, delete)
- Tracks visible Y scenario IDs (for overlay rendering)
- Applies scenario changes to production jobs (ADD/MODIFY/DELETE)
- Applies delays to jobs in scenarios
- Syncs state across browser windows via BroadcastChannel

**useYScenarioFilters Hook** (`src/hooks/useYScenarioFilters.ts`):
- Manages Y overlay visibility (Set of scenario IDs)
- Persists visibility to localStorage
- Filters and groups scenarios for display

**useJobFilters Hook** (`src/hooks/useJobFilters.ts`):
- Manages production job visibility
- Uses useRef to prevent filter reset on drag operations

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Production Jobs (Y) - from database                         │
│   kitting_jobs table → kittingJobs state                     │
└─────────────────────────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ useWhatIfMode Hook                                           │
│                                                              │
│ Step 1: Load scenarios from database                        │
│   scenarios + scenario_changes + job_delays                 │
│                                                              │
│ Step 2: For each visible scenario:                          │
│   a) Clone production jobs (Y baseline)                     │
│   b) Apply ADD operations                                   │
│   c) Apply MODIFY operations                                │
│   d) Filter out DELETE operations                           │
│   e) Apply delays (extend job duration)                     │
│   f) Tag with __yScenario, __yScenarioName                  │
│                                                              │
│ Output: yOverlayJobs (Ŷ predictions)                         │
└─────────────────────────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ Dashboard Calendar Rendering                                │
│                                                              │
│ const allCalendarItems = [                                  │
│   ...events,                // Regular calendar events      │
│   ...productionEvents,      // Y (solid bars)               │
│   ...yOverlayEvents         // Ŷ (purple ghosts)            │
│ ]                                                            │
└─────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `src/hooks/useWhatIfMode.ts` | Scenario state management, Ŷ generation |
| `src/hooks/useYScenarioFilters.ts` | Y overlay visibility control |
| `src/hooks/useJobFilters.ts` | Production job filtering |
| `src/components/JobFilterPanel.tsx` | Scenario list UI, Y/Ŷ tabs |
| `src/components/DelayManager.tsx` | Unified delay management modal |
| `src/components/DelayEditor.tsx` | Delay creation/editing UI |
| `src/components/DurationBasedEvent.tsx` | Job card rendering (Y and Ŷ styling) |
| `src/utils/shiftScheduling.ts` | `applyDelaysToJob()` function |
| `server/index.cjs` | Scenario and delay API endpoints |

---

## Delay Injection System

### Delay Model

**Structure**:
```typescript
interface JobDelay {
  id: string;
  scenarioId: string;
  jobId: string;
  name: string;           // Human-readable description
  duration: number;       // Seconds
  insertAfter: number;    // Route step order (0 = after setup)
}
```

### Delay Application Algorithm

**Function**: `applyDelaysToJob(job, delays)` in `src/utils/shiftScheduling.ts`

**Process**:
1. Sort route steps by order
2. Group delays by `insertAfter` position
3. Build new route steps array:
   - Insert delays after setup (insertAfter = 0)
   - For each route step:
     - Add the step
     - Add delays that come after it (insertAfter = step.order)
4. Renumber all steps sequentially
5. Calculate total delay duration
6. Extend `expectedJobDuration += totalDelaySeconds`

**Delay Step Properties**:
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

**Result**:
```typescript
{
  ...job,
  routeSteps: newRouteSteps,          // Steps + delays intermixed
  expectedJobDuration: newEJD,         // Extended duration
  __delaysApplied: true,              // Application marker
  __totalDelaySeconds: totalSeconds   // Total delay time
}
```

### Delay UI Components

**DelayManager** (`src/components/DelayManager.tsx`):
- Scenario dropdown (defaults to clicked scenario)
- Job list with full details
- Opens DelayEditor when job selected
- Contextual opening: Skip job list if defaultJobId provided

**DelayEditor** (`src/components/DelayEditor.tsx`):
- Displays job route steps
- "Add Delay After" button on each step
- Shows existing delays as yellow indented cards
- Delete delay button (trash icon)

**AddDelayDialog** (`src/components/AddDelayDialog.tsx`):
- Form fields: Name, Hours, Minutes
- Quick presets: 15m, 30m, 1h, 2h
- Validation: Name required, duration > 0
- Creates delay via API: `POST /api/scenarios/:id/delays`

### Delay API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/scenarios/:id/delays` | Fetch all delays for scenario |
| GET | `/api/scenarios/:scenarioId/jobs/:jobId/delays` | Job-specific delays |
| POST | `/api/scenarios/:id/delays` | Create new delay |
| PUT | `/api/delays/:id` | Update existing delay |
| DELETE | `/api/delays/:id` | Remove delay |

---

## Developer Reference

### Creating a New Scenario

**API**: `POST /api/scenarios`
```json
{
  "name": "Equipment Delays",
  "description": "Model impact of 2hr maintenance window"
}
```

**Response**:
```json
{
  "id": "cm3abc123",
  "name": "Equipment Delays",
  "description": "Model impact of 2hr maintenance window",
  "isActive": false,
  "changes": [],
  "createdAt": "2025-11-06T10:30:00Z",
  "updatedAt": "2025-11-06T10:30:00Z"
}
```

### Adding a Scenario Change

**API**: `POST /api/scenarios/:scenarioId/changes`
```json
{
  "jobId": "cm3job456",
  "operation": "MODIFY",
  "changeData": {
    "scheduledDate": "2025-11-10T08:00:00Z",
    "allowedShiftIds": ["shift1", "shift2"]
  },
  "originalData": {
    "scheduledDate": "2025-11-09T08:00:00Z",
    "allowedShiftIds": ["shift1"]
  }
}
```

### Adding a Delay

**API**: `POST /api/scenarios/:scenarioId/delays`
```json
{
  "jobId": "cm3job456",
  "name": "Equipment Maintenance",
  "duration": 7200,
  "insertAfter": 3
}
```

### Computing Y Overlays

**Code Example**:
```typescript
// src/hooks/useWhatIfMode.ts
const yOverlayJobs = useMemo(() => {
  if (visibleYScenarioIds.size === 0) return [];

  const visibleScenarios = allScenarios.filter(s => visibleYScenarioIds.has(s.id));
  const overlayJobs: any[] = [];

  visibleScenarios.forEach(scenario => {
    // Step 1: Clone production jobs (Y baseline)
    let modifiedJobs = [...productionJobs];

    // Step 2: Apply scenario changes
    for (const change of scenario.changes) {
      switch (change.operation) {
        case 'ADD':
          modifiedJobs.push({
            ...change.changeData,
            __yScenario: scenario.id,
            __yScenarioName: scenario.name
          });
          break;

        case 'MODIFY':
          modifiedJobs = modifiedJobs.map(job => {
            if (job.id === change.jobId) {
              return {
                ...job,
                ...change.changeData,
                __yScenario: scenario.id,
                __yScenarioName: scenario.name
              };
            }
            return job;
          });
          break;

        case 'DELETE':
          modifiedJobs = modifiedJobs.map(job => {
            if (job.id === change.jobId) {
              return {
                ...job,
                __yScenario: scenario.id,
                __yScenarioName: scenario.name,
                __yScenarioDeleted: true
              };
            }
            return job;
          });
          break;
      }
    }

    // Step 3: Apply delays
    const scenarioDelayList = scenarioDelays.get(scenario.id) || [];
    modifiedJobs = modifiedJobs.map(job => {
      const jobDelays = scenarioDelayList.filter(d => d.jobId === job.id);
      if (jobDelays.length > 0) {
        return applyDelaysToJob(job, jobDelays);
      }
      return job;
    });

    overlayJobs.push(...modifiedJobs);
  });

  return overlayJobs;
}, [productionJobs, allScenarios, visibleYScenarioIds, scenarioDelays]);
```

### Rendering Y Overlays

**Code Example** (`src/components/DurationBasedEvent.tsx`):
```typescript
const isYScenario = !!event.__yScenario;
const yScenarioDeleted = event.__yScenarioDeleted;

// Enhanced ghost styling
const yScenarioBorder = isYScenario
  ? yScenarioDeleted
    ? 'border-4 border-dashed border-red-500/80 opacity-40'
    : 'border-4 border-dashed border-purple-500/80 shadow-lg shadow-purple-500/30'
  : '';

const yScenarioOpacity = isYScenario && !yScenarioDeleted ? 'opacity-40' : '';
const yScenarioBackdrop = isYScenario && !yScenarioDeleted ? 'backdrop-blur-sm' : '';
const yScenarioPattern = isYScenario && !yScenarioDeleted
  ? 'bg-gradient-to-br from-purple-300/20 to-transparent'
  : '';

// Prevent editing Y overlays
onClick={(e) => {
  e.stopPropagation();
  if (isYScenario) {
    console.log('🔮 Y scenario overlay clicked - editing disabled');
    return;
  }
  onEdit(event);
}}
```

### Multi-Window Synchronization

**BroadcastChannel** (`src/hooks/useWhatIfMode.ts`):
```typescript
const channel = new BroadcastChannel('kittrix-whatif-sync');

// Send messages
channel.postMessage({
  type: 'y-scenario-visibility-changed',
  data: { visibleScenarioIds: Array.from(visibleYScenarioIds) }
});

// Receive messages
channel.onmessage = (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'y-scenario-visibility-changed':
      setVisibleYScenarioIds(new Set(data.visibleScenarioIds));
      break;
    case 'scenario-committed':
    case 'scenario-discarded':
      fetchScenarios();
      break;
  }
};
```

### Shift Independence for Y Scenarios

**Problem**: Y scenarios should test ANY shifts, not just active ones.

**Solution**: `ignoreActiveStatus` parameter in scheduling functions.

**Implementation** (`src/utils/shiftScheduling.ts`):
```typescript
export function getAvailableShifts(
  shifts: Shift[],
  ignoreActiveStatus: boolean = false  // NEW parameter
): Shift[] {
  if (ignoreActiveStatus) {
    return shifts;  // Return ALL shifts for Y scenarios
  }
  return shifts.filter(s => s.isActive);  // Production: only active shifts
}
```

**Usage**:
```typescript
// Production jobs
const shifts = getAvailableShifts(allShifts, false);  // Respect isActive

// Y scenario jobs
const shifts = getAvailableShifts(allShifts, true);   // Ignore isActive
```

---

## Troubleshooting

### Y Overlays Not Appearing

**Check**:
1. Filters → 🔮 Ŷ (Scenarios) tab → Verify scenario checkbox is checked
2. Confirm scenario has changes (change count > 0)
3. Check browser console for errors
4. Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)

**Debug**:
```javascript
// In browser console
localStorage.getItem('kittrix-y-scenario-visibility')
// Should show: ["scenarioId1", "scenarioId2"]
```

### ⏰ Button Not Appearing on Y Overlay

**Requirements**:
1. Job must be a Y overlay (has `__yScenario` property)
2. Job height must be >= 60px (tall enough for button)
3. Must hover over job
4. Scenario must be visible (checked in Ŷ tab)

**Fix**: If jobs are too short, increase calendar row height or zoom in.

### Delays Not Applying

**Check**:
1. Verify delays exist: `GET /api/scenarios/:scenarioId/delays`
2. Confirm scenario is visible (checkbox checked)
3. Check `applyDelaysToJob()` function for errors
4. Verify `scenarioDelays` Map in useWhatIfMode hook
5. Look for console errors related to delay fetching

**Debug**:
```typescript
// Add console.log in useWhatIfMode.ts
console.log('Scenario delays:', scenarioDelays.get(scenarioId));
console.log('Modified job:', modifiedJob.__delaysApplied, modifiedJob.__totalDelaySeconds);
```

### Job Filters Reset After Drag

**Issue**: Fixed in November 8, 2025 update.

**Solution**: useJobFilters now uses `useRef` to track previous job IDs.

**Verify Fix**:
```typescript
// Should see in console after drag:
"🔍 useJobFilters: No new jobs detected (0 jobs)"
// NOT:
"🔍 useJobFilters: Adding 13 new jobs to visible set"
```

### Y Overlay Properties Lost During Drag

**Issue**: Fixed in November 8, 2025 update.

**Solution**: `updateKittingJobSchedule()` preserves `__yScenario` and `__yScenarioName`.

**Verify Fix**:
```typescript
// In Dashboard.tsx updateKittingJobSchedule:
if (jobToUpdate.__yScenario) {
  updatedJob.__yScenario = jobToUpdate.__yScenario;
  updatedJob.__yScenarioName = jobToUpdate.__yScenarioName;
}
```

### Monthly View Not Showing Y Overlays

**Issue**: Fixed in November 8, 2025 update.

**Solution**: MonthlyCalendar now applies purple ghost styling.

**Verify Fix**:
```typescript
// src/components/MonthlyCalendar.tsx should have:
const yScenarioBorder = job.__yScenario
  ? 'border-2 border-dashed border-purple-400/60'
  : '';
```

---

## Best Practices

### Scenario Naming

**Good**:
- "Equipment Delays - 2hr Maintenance"
- "Rush Order - Extra Shift"
- "Holiday Staffing - 30% Capacity"

**Bad**:
- "Test"
- "Scenario 1"
- "asdf"

### Delay Naming

**Good**:
- "Equipment Maintenance - Machine A"
- "Team Meeting - Daily Standup"
- "Shift Changeover"

**Bad**:
- "Delay"
- "Wait"
- "Break"

### When to Commit vs Discard

**Commit** when:
- Prediction tested and validated
- Schedule optimization confirmed
- Ready to apply changes to production

**Discard** when:
- Just exploring options
- Results didn't meet expectations
- Testing extreme edge cases

### Managing Multiple Scenarios

**Strategy**:
- Keep 3-5 active scenarios maximum
- Name scenarios clearly to distinguish purposes
- Delete old scenarios after committing or when no longer needed
- Use scenario descriptions to document assumptions

---

## Performance Considerations

### Large Number of Y Overlays

**Impact**: Each visible scenario clones and transforms all production jobs.

**Optimization**:
- Only show 2-3 scenarios at once
- Use scenario filtering/search if many scenarios exist
- Consider pagination for scenario list (future enhancement)

### Delay Calculations

**Impact**: `applyDelaysToJob()` runs for every job in every visible scenario.

**Optimization**:
- Delays cached in Map keyed by scenarioId
- Only recalculated when scenarios or delays change (useMemo)
- Delay application is O(n) where n = number of route steps

### Multi-Window Sync

**Impact**: BroadcastChannel messages sent on every state change.

**Optimization**:
- Messages debounced where possible
- Only essential state synced (not entire job arrays)
- Channel closed on component unmount

---

## Related Documentation

- **Y/Ŷ Architecture**: `Y_YHAT_ARCHITECTURE.md` - Statistical framework and residual analysis
- **Changelog**: `CHANGELOG.md` - Version history and feature releases
- **Technical Debt**: `TECHNICAL_DEBT.md` - Known limitations and future improvements
- **Deployment**: `CLAUDE.md` - Production deployment instructions

---

**Last Updated**: November 13, 2025
**Version**: 1.6 (Shift Independence)
