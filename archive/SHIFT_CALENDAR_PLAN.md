# Shift-Based Calendar Scheduling - Planning Session
**Date:** October 26, 2025
**Status:** Planning Phase - Not Yet Implemented

## User Requirements

### Core Features Requested

1. **User-Definable Shifts:**
   - 3 default shifts: 7am-3pm, 3pm-11pm, 11pm-7am
   - Each shift has a 30-minute break in the middle
   - Shifts can be toggled on/off in real-time
   - For now, no holidays/vacations - assume continuous operation

2. **Two-Step Drag & Drop Workflow:**
   - **Step 1:** Drag job ticket from month/week view → drop on target date
   - **Step 2:** Calendar auto-opens day view for that date → user positions job at specific hour
   - Job schedules **forward from start time** (not backward from due date)

3. **Cascade Recalculation:**
   - When shift is toggled off, all jobs automatically recalculate positions
   - Jobs flow across remaining active shifts
   - Visual animation shows jobs repositioning

4. **Duration Calculation:**
   - Job duration calculated based on job's `expectedJobDuration`
   - Duration spans across shift boundaries if needed
   - Multi-day jobs spill back/forward across shifts until duration is depicted accurately

5. **Partial Execution Handling:**
   - If job is partially executed then paused/stopped (EI page closed)
   - Job ticket duration recalculates based on remaining kits
   - Completed kit count retained
   - Job can be moved and easily resumed

## Current State Analysis

### ✅ Already Implemented

**In `Dashboard.tsx` (lines 140-234):**
- Basic drag-and-drop with @dnd-kit library
- Job-to-event conversion (`kittingJobToEvents()`)
- Multi-day job spanning logic
- Backward scheduling from due date
- Visual job tickets on calendar

**In Database (Prisma schema):**
- `JobProgress` model tracks: `completedKits`, `remainingKits`, `isActive`
- `KitExecution` model tracks individual kit execution times
- Job status tracking: SCHEDULED, IN_PROGRESS, PAUSED, COMPLETED

**In Calendar Components:**
- `DailyCalendar.tsx` - 24-hour view with 30-min slots
- `WeeklyCalendar.tsx` - Week overview with event stacking
- `MonthlyCalendar.tsx` - Month overview
- Drag-and-drop zones configured with @dnd-kit

### ❌ Not Yet Implemented

- User-definable shifts (currently hardcoded 9-hour workday, 8am-5pm)
- Shift toggle functionality
- Cascade recalculation when shifts change
- Two-step drag workflow (month → day view transition)
- Forward scheduling from start time
- Break time accounting in shift durations
- Shift-aware drag validation
- Partial execution duration recalculation on calendar

## Detailed Implementation Plan

### Phase 1: Database Schema & Shift Management

#### 1.1 Shift Model
**File:** `prisma/schema.prisma`

```prisma
model Shift {
  id            String   @id @default(cuid())
  name          String   // "First Shift", "Second Shift", "Third Shift"
  startTime     String   // "07:00" (24-hour format)
  endTime       String   // "15:00" (24-hour format)
  breakStart    String?  // "11:00" (optional)
  breakDuration Int?     // 30 (minutes)
  isActive      Boolean  @default(true)  // Toggle on/off
  order         Int      // 1, 2, 3 for display order
  color         String?  // "#e3f2fd" for visual background
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@map("shifts")
}
```

**Migration SQL:**
```sql
CREATE TABLE shifts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  break_start TEXT,
  break_duration INTEGER,
  is_active BOOLEAN DEFAULT true,
  "order" INTEGER NOT NULL,
  color TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default shifts
INSERT INTO shifts VALUES
  ('shift-1', 'First Shift', '07:00', '15:00', '11:00', 30, true, 1, '#e3f2fd', NOW(), NOW()),
  ('shift-2', 'Second Shift', '15:00', '23:00', '19:00', 30, true, 2, '#f3e5f5', NOW(), NOW()),
  ('shift-3', 'Third Shift', '23:00', '07:00', '03:00', 30, true, 3, '#e8f5e9', NOW(), NOW());
```

**Calculated Shift Hours:**
- First Shift: 8 hours - 0.5 hour break = **7.5 productive hours**
- Second Shift: 8 hours - 0.5 hour break = **7.5 productive hours**
- Third Shift: 8 hours - 0.5 hour break = **7.5 productive hours**

#### 1.2 Backend API Endpoints
**File:** `server/index.cjs`

```javascript
// Get all shifts
app.get('/api/shifts', async (req, res) => {
  const shifts = await prisma.shift.findMany({
    orderBy: { order: 'asc' }
  });
  res.json(shifts);
});

// Toggle shift active status
app.patch('/api/shifts/:id', async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  const shift = await prisma.shift.update({
    where: { id },
    data: { isActive }
  });

  res.json(shift);
});

// Create new shift
app.post('/api/shifts', async (req, res) => {
  const shift = await prisma.shift.create({
    data: req.body
  });
  res.json(shift);
});

// Delete shift
app.delete('/api/shifts/:id', async (req, res) => {
  await prisma.shift.delete({
    where: { id: req.params.id }
  });
  res.json({ success: true });
});
```

#### 1.3 Shift Control UI Component
**File:** `src/components/ShiftControl.tsx`

Compact panel displayed on Dashboard showing:
- List of all shifts with toggle switches
- Visual indicator of shift times and productive hours
- Real-time toggle triggers cascade recalculation

**UI Mockup:**
```
┌─────────────────────────────────────────┐
│ Shift Schedule                          │
│ ┌─────────────────────────────────────┐ │
│ │ [✓] First Shift   7am-3pm  (7.5hrs) │ │
│ │ [✓] Second Shift  3pm-11pm (7.5hrs) │ │
│ │ [ ] Third Shift   11pm-7am (7.5hrs) │ │ ← Toggled off
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Phase 2: Shift Scheduling Utility Functions

#### 2.1 Core Scheduling Logic
**File:** `src/utils/shiftScheduling.ts` (NEW)

```typescript
export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakDuration?: number;
  isActive: boolean;
  order: number;
  color?: string;
}

export interface ScheduledSlot {
  date: string;
  startTime: string;
  endTime: string;
  shiftId: string;
  shiftName: string;
}

// Calculate productive hours in a shift (accounting for breaks)
export const calculateShiftProductiveHours = (shift: Shift): number => {
  const start = parseTime(shift.startTime);
  const end = parseTime(shift.endTime);

  // Handle overnight shifts (23:00 to 07:00)
  let totalMinutes = end > start
    ? (end - start)
    : (24 * 60 - start + end);

  // Subtract break
  if (shift.breakDuration) {
    totalMinutes -= shift.breakDuration;
  }

  return totalMinutes / 60; // Return hours
}

// Get only active shifts sorted by order
export const getActiveShifts = (shifts: Shift[]): Shift[] => {
  return shifts
    .filter(s => s.isActive)
    .sort((a, b) => a.order - b.order);
}

// Find which shift contains a specific time
export const getShiftForTime = (time: string, shifts: Shift[]): Shift | null => {
  const targetMinutes = parseTime(time);

  return shifts.find(shift => {
    const start = parseTime(shift.startTime);
    const end = parseTime(shift.endTime);

    if (end > start) {
      // Normal shift (e.g., 7:00 to 15:00)
      return targetMinutes >= start && targetMinutes < end;
    } else {
      // Overnight shift (e.g., 23:00 to 07:00)
      return targetMinutes >= start || targetMinutes < end;
    }
  }) || null;
}

// Schedule job forward from start date/time across active shifts
export const scheduleJobForward = (
  job: KittingJob,
  startDate: Date,
  startTime: string,
  shifts: Shift[]
): ScheduledSlot[] => {
  const activeShifts = getActiveShifts(shifts);
  if (activeShifts.length === 0) {
    throw new Error('No active shifts available');
  }

  let remainingSeconds = job.expectedJobDuration;
  const slots: ScheduledSlot[] = [];

  let currentDate = new Date(startDate);
  let currentTime = startTime;
  let currentShift = getShiftForTime(currentTime, activeShifts);

  let safetyCounter = 0;
  const MAX_ITERATIONS = 100; // Prevent infinite loops

  while (remainingSeconds > 0 && safetyCounter < MAX_ITERATIONS) {
    safetyCounter++;

    if (!currentShift) {
      // Find next active shift
      currentShift = getNextActiveShift(currentTime, activeShifts);
      if (!currentShift) break; // No shifts available

      currentTime = currentShift.startTime;
    }

    // Calculate available time in current shift
    const shiftProductiveHours = calculateShiftProductiveHours(currentShift);
    const shiftProductiveSeconds = shiftProductiveHours * 3600;

    // Calculate how much of shift is remaining from currentTime
    const timeIntoShift = calculateSecondsSinceShiftStart(currentTime, currentShift);
    const remainingInShift = shiftProductiveSeconds - timeIntoShift;

    // Determine how much job time fits in this shift
    const secondsToSchedule = Math.min(remainingSeconds, remainingInShift);

    // Calculate end time for this slot
    const slotEndTime = addSecondsToTime(currentTime, secondsToSchedule, currentShift);

    slots.push({
      date: currentDate.toISOString().split('T')[0],
      startTime: currentTime,
      endTime: slotEndTime,
      shiftId: currentShift.id,
      shiftName: currentShift.name
    });

    remainingSeconds -= secondsToSchedule;

    // Move to next shift
    if (remainingSeconds > 0) {
      const nextShiftInfo = getNextShift(currentShift, activeShifts);
      currentShift = nextShiftInfo.shift;
      currentDate = nextShiftInfo.date;
      currentTime = currentShift.startTime;
    }
  }

  return slots;
}

// Recalculate all jobs when shifts toggle
export const cascadeRecalculateJobs = (
  jobs: KittingJob[],
  shifts: Shift[]
): KittingJob[] => {
  return jobs.map(job => {
    // Only recalculate jobs that have been scheduled
    if (job.scheduledDate && job.scheduledStartTime) {
      try {
        const newSlots = scheduleJobForward(
          job,
          new Date(job.scheduledDate),
          job.scheduledStartTime,
          shifts
        );

        return {
          ...job,
          scheduledSlots: newSlots
        };
      } catch (error) {
        console.error(`Failed to recalculate job ${job.jobNumber}:`, error);
        return job; // Keep original if recalculation fails
      }
    }
    return job;
  });
}

// Helper functions
const parseTime = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

const getNextActiveShift = (currentTime: string, shifts: Shift[]): Shift | null => {
  // Find next shift in order after current time
  // Handle wrap-around to start of day
}

const calculateSecondsSinceShiftStart = (currentTime: string, shift: Shift): number => {
  // Calculate elapsed seconds from shift start to currentTime
}

const addSecondsToTime = (time: string, seconds: number, shift: Shift): string => {
  // Add seconds to time, accounting for break periods
}

const getNextShift = (currentShift: Shift, shifts: Shift[]): { shift: Shift, date: Date } => {
  // Get next shift in sequence, increment date if wrapping around
}
```

### Phase 3: Two-Step Drag & Drop Implementation

#### 3.1 Dashboard State Management
**File:** `src/pages/Dashboard.tsx`

```typescript
// Add to Dashboard component state
const [dragState, setDragState] = useState<{
  phase: 'idle' | 'selecting-date' | 'selecting-time';
  jobId: string | null;
  tempDate: string | null;
  finalTime: string | null;
}>({
  phase: 'idle',
  jobId: null,
  tempDate: null,
  finalTime: null
});

const [shifts, setShifts] = useState<Shift[]>([]);

// Fetch shifts on mount
useEffect(() => {
  fetchShifts();
}, []);

const fetchShifts = async () => {
  const response = await fetch(apiUrl('/api/shifts'));
  const data = await response.json();
  setShifts(data);
}
```

#### 3.2 Month/Week View Drop Handler
**Files:** `src/components/MonthlyCalendar.tsx`, `src/components/WeeklyCalendar.tsx`

```typescript
const handleJobDrop = (jobId: string, targetDate: string) => {
  console.log(`Step 1: Job ${jobId} dropped on date ${targetDate}`);

  // Update drag state
  setDragState({
    phase: 'selecting-time',
    jobId,
    tempDate: targetDate,
    finalTime: null
  });

  // Transition to day view for that date
  setCalendarView('daily');
  setSelectedDate(targetDate);

  // Job remains "in hand" - will be positioned in day view
}
```

#### 3.3 Day View Drop Handler
**File:** `src/components/DailyCalendar.tsx`

```typescript
const handleFinalDrop = async (targetTime: string) => {
  if (dragState.phase !== 'selecting-time' || !dragState.jobId) {
    return; // Not in correct state
  }

  const job = kittingJobs.find(j => j.id === dragState.jobId);
  const targetDate = dragState.tempDate || selectedDate;

  console.log(`Step 2: Job ${job.jobNumber} placed at ${targetDate} ${targetTime}`);

  // Calculate scheduled slots across shifts
  const scheduledSlots = scheduleJobForward(
    job,
    new Date(targetDate),
    targetTime,
    getActiveShifts(shifts)
  );

  // Update job in database
  await fetch(apiUrl(`/api/kitting-jobs/${job.id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scheduledDate: targetDate,
      scheduledStartTime: targetTime,
      scheduledSlots: JSON.stringify(scheduledSlots)
    })
  });

  // Reset drag state
  setDragState({ phase: 'idle', jobId: null, tempDate: null, finalTime: null });

  // Refresh jobs
  fetchKittingJobs();
}
```

### Phase 4: Cascade Recalculation

#### 4.1 Shift Toggle Handler
**File:** `src/components/ShiftControl.tsx`

```typescript
const handleShiftToggle = async (shiftId: string, newActiveState: boolean) => {
  // Show loading indicator
  setIsRecalculating(true);

  try {
    // Update shift in database
    await fetch(apiUrl(`/api/shifts/${shiftId}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: newActiveState })
    });

    // Refetch updated shifts
    const updatedShifts = await fetchShifts();

    // Cascade recalculate all scheduled jobs
    const recalculatedJobs = cascadeRecalculateJobs(
      kittingJobs.filter(j => j.scheduledDate), // Only scheduled jobs
      updatedShifts
    );

    // Batch update all affected jobs (could be optimized with bulk API)
    for (const job of recalculatedJobs) {
      await fetch(apiUrl(`/api/kitting-jobs/${job.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledSlots: JSON.stringify(job.scheduledSlots)
        })
      });
    }

    // Refresh calendar
    fetchKittingJobs();

    // Animate jobs repositioning (CSS transition)
    setJobsAnimating(true);
    setTimeout(() => setJobsAnimating(false), 1000);

  } catch (error) {
    console.error('Failed to recalculate jobs:', error);
    alert('Failed to recalculate job schedules. Please refresh.');
  } finally {
    setIsRecalculating(false);
  }
}
```

### Phase 5: Visual Enhancements

#### 5.1 Shift Background Visualization
**File:** `src/components/DailyCalendar.tsx`

```typescript
const renderShiftBackgrounds = () => {
  const activeShifts = getActiveShifts(shifts);

  return activeShifts.map(shift => {
    const startPixels = timeToPixels(shift.startTime);
    const durationHours = calculateShiftProductiveHours(shift);
    const heightPixels = durationHours * 64; // 64px per hour

    return (
      <div
        key={shift.id}
        className="absolute inset-x-0 pointer-events-none transition-all duration-500"
        style={{
          top: `${startPixels}px`,
          height: `${heightPixels}px`,
          backgroundColor: shift.color || '#e3f2fd',
          opacity: 0.15,
          borderTop: '2px dashed rgba(0,0,0,0.1)',
          borderBottom: '2px dashed rgba(0,0,0,0.1)'
        }}
      >
        <div className="text-xs text-gray-600 p-2 font-medium">
          {shift.name} ({shift.startTime}-{shift.endTime})
        </div>
      </div>
    );
  });
}
```

#### 5.2 Enhanced Job Tickets
**File:** `src/components/DurationBasedEvent.tsx`

```typescript
// Show shift span info
{job.scheduledSlots && job.scheduledSlots.length > 1 && (
  <div className="text-xs opacity-75 mt-1">
    Spans: {job.scheduledSlots.map(s => s.shiftName).join(', ')}
  </div>
)}

// Show partial execution progress
{job.completedKits > 0 && (
  <div className="mt-2">
    <div className="flex justify-between text-xs mb-1">
      <span>{job.completedKits} / {job.orderedQuantity} kits</span>
      <span>{Math.round((job.completedKits / job.orderedQuantity) * 100)}%</span>
    </div>
    <div className="h-1.5 bg-black/20 rounded-full overflow-hidden">
      <div
        className="h-full bg-white/60 transition-all duration-300"
        style={{ width: `${(job.completedKits / job.orderedQuantity) * 100}%` }}
      />
    </div>
  </div>
)}
```

### Phase 6: Partial Execution Integration

#### 6.1 Update Duration on Pause
**File:** `src/pages/JobExecute.tsx`

```typescript
// When job is paused or EI is closed
useEffect(() => {
  const handleBeforeUnload = async () => {
    if (jobProgress && jobProgress.completedKits > 0) {
      await recalculateJobDuration(selectedJob, jobProgress.completedKits);
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [selectedJob, jobProgress]);

const recalculateJobDuration = async (job: KittingJob, completedKits: number) => {
  const remainingKits = job.orderedQuantity - completedKits;
  const newExpectedDuration = (job.expectedKitDuration * remainingKits) + job.takeDown;

  // Fetch current shifts
  const shiftsResponse = await fetch(apiUrl('/api/shifts'));
  const shifts = await shiftsResponse.json();

  // Recalculate scheduled slots with new duration
  if (job.scheduledDate && job.scheduledStartTime) {
    const newSlots = scheduleJobForward(
      { ...job, expectedJobDuration: newExpectedDuration },
      new Date(job.scheduledDate),
      job.scheduledStartTime,
      shifts
    );

    // Update job
    await fetch(apiUrl(`/api/kitting-jobs/${job.id}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expectedJobDuration: newExpectedDuration,
        scheduledSlots: JSON.stringify(newSlots)
      })
    });
  }
}
```

## Implementation Priority Order

### Sprint 1 (Foundation) - ~2 weeks
1. Create Shift model in database schema
2. Write and run migration
3. Seed default 3 shifts
4. Create shift CRUD API endpoints
5. Build ShiftControl component
6. Test shift toggle functionality

### Sprint 2 (Scheduling Logic) - ~1.5 weeks
1. Create `shiftScheduling.ts` utility file
2. Implement `calculateShiftProductiveHours()`
3. Implement `scheduleJobForward()`
4. Implement `cascadeRecalculateJobs()`
5. Write unit tests for scheduling functions
6. Handle edge cases (overnight shifts, breaks)

### Sprint 3 (Two-Step Drag & Drop) - ~2 weeks
1. Add drag state management to Dashboard
2. Implement month/week drop handler
3. Implement automatic view transition
4. Implement day view final drop handler
5. Add visual feedback during drag
6. Test cross-view drag workflow

### Sprint 4 (Cascade Recalculation) - ~1 week
1. Wire up shift toggle to recalculation
2. Implement batch job updates
3. Add loading indicators
4. Add error handling
5. Test with multiple jobs

### Sprint 5 (Visual Polish) - ~1 week
1. Add shift background visualization
2. Enhance job ticket displays
3. Add progress bars for partial execution
4. Implement smooth animations
5. Add snap-to-shift behavior

### Sprint 6 (Partial Execution) - ~1 week
1. Hook into JobExecute pause/close events
2. Implement duration recalculation
3. Update calendar display
4. Test resume functionality

### Sprint 7 (Testing & Refinement) - ~1 week
1. Integration testing
2. Edge case handling
3. Performance optimization
4. Bug fixes
5. User acceptance testing

**Total Estimated Time:** 9-10 weeks

## Key Technical Decisions

1. **Forward vs Backward Scheduling:**
   - User requested: Forward from start time ✅
   - Previous implementation: Backward from due date ❌
   - **Decision:** Implement forward scheduling as primary method

2. **Shift Toggle Impact:**
   - **Decision:** Cascade recalculation affects ALL scheduled jobs
   - Alternative considered: Only affect future jobs (rejected)
   - Reason: Maintains calendar consistency

3. **Break Handling:**
   - **Decision:** Breaks reduce productive hours but job doesn't pause mid-break
   - Alternative: Explicitly schedule breaks (too complex)
   - Reason: Simplified scheduling logic

4. **Overnight Shifts:**
   - **Decision:** Support shifts that span midnight (23:00-07:00)
   - Handle date increment when crossing midnight

5. **Drag State Management:**
   - **Decision:** Use controlled state pattern for two-step drag
   - Phase 1: Date selection (month/week view)
   - Phase 2: Time selection (day view)
   - Clear state only after successful placement

## Files to Create

- `src/utils/shiftScheduling.ts` - NEW
- `src/components/ShiftControl.tsx` - NEW
- `src/components/ShiftConfigModal.tsx` - NEW (for admin CRUD)
- `prisma/migrations/YYYYMMDD_add_shifts.sql` - NEW

## Files to Modify

- `prisma/schema.prisma` - Add Shift model
- `server/index.cjs` - Add shift endpoints
- `src/pages/Dashboard.tsx` - Update job-to-event conversion, add drag state
- `src/components/DailyCalendar.tsx` - Shift backgrounds, final drop handler
- `src/components/WeeklyCalendar.tsx` - Initial drop handler
- `src/components/MonthlyCalendar.tsx` - Initial drop handler
- `src/components/DurationBasedEvent.tsx` - Enhanced job tickets
- `src/pages/JobExecute.tsx` - Partial execution recalculation
- `src/types/kitting.ts` - Add Shift and ScheduledSlot types

## Success Criteria

✅ User can define shifts with start/end times and breaks
✅ User can toggle shifts on/off in real-time
✅ Drag job from month view → drop on date → auto-opens day view
✅ Position job at specific hour in day view
✅ Jobs schedule forward from start time across shifts
✅ Jobs automatically recalculate when shift toggled
✅ Job tickets span multiple shifts/days visually
✅ Partial execution updates duration and calendar display
✅ Smooth animations during all interactions
✅ No job conflicts or overlaps

## Next Session Action Items

1. Review and approve this plan
2. Decide which sprint to start with
3. Create Shift model and migration
4. Begin implementation

---

**Planning session captured by:** Claude Code
**Ready to implement:** Awaiting user approval
