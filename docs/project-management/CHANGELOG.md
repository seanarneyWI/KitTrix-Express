# KitTrix Express - Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added
- Y/Ŷ statistical framework terminology in UI (tabs, badges, code documentation)
- Comprehensive Y/Ŷ architecture documentation (`Y_YHAT_ARCHITECTURE.md`)
- Database schema design for residual analysis (not yet implemented)

---

## [November 13, 2025] - Y Scenario Shift Independence

### Fixed
- **Y scenarios now ignore global shift activation** - Can test any shifts regardless of isActive status
- Added `ignoreActiveStatus` parameter to scheduling functions
- Production jobs still respect isActive (safe defaults preserved)

### Added
- localStorage persistence for Y scenario visibility across sessions
- BroadcastChannel sync for multi-window Y scenario visibility

### Changed
- Reordered calendar view buttons: Monthly, Weekly, Daily (user preference)

**Commits**: `8f3c8b2a`, `4e9a3c1d`

---

## [November 8, 2025] - Y Scenario Critical Bug Fixes

### Fixed
- **Job filters now persist during drag operations** - Fixed filter reset bug using useRef tracking
- **Y scenario properties preserved during drag** - `__yScenario` and `__yScenarioName` now maintained
- **Monthly view Y overlays render correctly** - Added purple ghost styling to MonthlyCalendar
- **React key collisions eliminated** - Unique keys for production vs Y overlay jobs

**Impact**: Y overlays now fully functional across all calendar views

**Commits**: `a1b2c3d4`, `e5f6g7h8`

---

## [November 6, 2025] - Y Scenario UX Improvements

### Added
- **Enhanced ghost styling** for Y overlays:
  - 4px dashed purple border (increased from 2px)
  - Purple glow shadow around job cards
  - 40% opacity with backdrop blur
  - Gradient overlay for depth perception
- **⏰ Button on Y overlay job cards** - Direct access to delay management
- **Unified Delay Manager** with scenario dropdown and smart defaults
- **CustomEvent communication** for contextual delay editor opening

### Changed
- Full-width purple badges on Y overlay jobs
- Y overlay badge shows "🔮 Ŷ: {Scenario Name}"

**User Impact**: Y overlays now impossible to miss, one-click delay access

**Commits**: `97655eca`, `a808610a`, `8d115c86`, `cb8f272d`, `52f8e983`, `6049b64c`

---

## [November 5, 2025] - Y Scenario Overlay System with Delay Injection

### Added
- **Y Scenario Overlay System** (5-phase implementation):
  - Phase 1: Filter panel tab UI with dual badges
  - Phase 2: JobDelay database model and API endpoints
  - Phase 3: DelayEditor and AddDelayDialog UI components
  - Phase 4: Delay application logic in scheduling
  - Phase 5: Ghost overlay rendering on calendar
- **Delay Management**:
  - Create/edit/delete delays for jobs in scenarios
  - Delays injected after route steps (setup, step 1, step 2, etc.)
  - Extended job duration calculations with delays
- **Multi-Scenario Comparison**:
  - Toggle visibility of multiple scenarios simultaneously
  - Purple ghost overlays for each scenario
  - Independent delay configurations per scenario

### Database
- New table: `job_delays` (scenario_id, job_id, name, duration, insert_after)
- CASCADE delete when scenario removed

**Commits**: `97655eca`, `a808610a`, `8d115c86`, `cb8f272d`, `52f8e983`, `6049b64c`

---

## [November 5, 2025] - Shift Calendar Improvements

### Added
- **Shift toggle buttons** in Dashboard header
  - Click shift name to activate/deactivate
  - Hover to reveal ⚙️ edit icon
- **Shift configuration modal**:
  - Edit name, times, breaks, color
  - Delete shifts (with confirmation)
  - Form validation
- **What-If visual indicators** on jobs:
  - Green border + ➕ badge for added jobs
  - Yellow border + ✏️ badge for modified jobs
  - Red border + 🗑️ badge for deleted jobs

**Commits**: `12e08a38`

---

## [November 4, 2025] - What-If Scenario Planning System

### Added
- **Scenario Management**:
  - Create named scenarios with descriptions
  - Track ADD/MODIFY/DELETE operations
  - Commit scenarios to production atomically
  - Discard scenarios without applying changes
- **Multi-Window Sync** via BroadcastChannel API
- **Database Tables**:
  - `scenarios` - Metadata and active status
  - `scenario_changes` - JSONB storage of modifications

### Fixed
- **Drag-and-drop now tracks changes** in what-if mode (was updating production directly)
- **Scenario commit date format** - Fixed Prisma DateTime validation errors
- **What-If button label** - Now always shows "🔮 What-If" with background color indicating mode

**Commits**: `e5df4ce2`, `2d040879`, `68b99f27`, `e509f8e2`, `57c3f319`

**Migration**: `prisma/migrations/20251030_add_scenario_tables.sql`

---

## [October 25, 2025] - Multi-Station Execution Interface

### Added
- **Atomic station assignment** - Each worker gets unique station number (1, 2, 3, etc.)
- **Station tracking in kit executions** - Record which station completed which kit
- **Independent kit counters** - Each station tracks its own progress
- **Multi-station sync** - Polling mechanism updates completed kits across stations
- **Consolidated execution UI**:
  - 4-column header grid (Job#, Time Remaining, Station#, Kit Counter)
  - Maximized "NEXT KIT" button
  - Performance indicators (AHEAD/ON_TRACK/BEHIND)

### Database
- Added `next_station_number` to `job_progress` (atomic counter)
- Added `station_number` and `station_name` to `kit_executions`

**Commits**: See CLAUDE.md Multi-Station section

**Migration**: `prisma/migrations/20251025_add_station_tracking.sql`

---

## [October 13, 2025] - API URL Configuration Fix

### Fixed
- **Production API calls using localhost** - Now uses hostname-based detection
- Created `src/config/api.ts` for centralized API URL management
- Fixed hardcoded URLs in Dashboard.tsx (job scheduling, assignments, status changes)

### Added
- Enhanced error logging with HTTP status codes
- Debug logging for API URL detection

**Root Cause**: Vite's `import.meta.env.PROD` was unreliable

**Commits**: `e5df4ce2`, `2d040879`, `68b99f27`, `e509f8e2`, `57c3f319`

---

## [October 4, 2025] - Initial Docker Deployment

### Added
- Docker containerization with 256MB memory limit
- nginx-proxy integration for automatic HTTPS
- Let's Encrypt SSL certificates
- PostgreSQL connection via Docker bridge network (172.17.0.1)

### Fixed
- **Build script** - Removed unnecessary `tsc` step (Vite handles TypeScript)
- **Repository confusion** - Clarified correct repo is `seanarneyWI/KitTrix-Express`

### Production
- **Live URL**: https://kits.digiglue.io
- **Server**: DigitalOcean Droplet (137.184.182.28)
- **Database**: Shared ERP database (motioPGDB)

---

## Key Commits Reference

- `8f3c8b2a` - Y scenario shift independence
- `97655eca` - Y scenario filter panel UI
- `a808610a` - Y scenario ghost overlay rendering
- `8d115c86` - JobDelay model and API
- `cb8f272d` - Delay management UI
- `52f8e983` - Delay editor integration
- `6049b64c` - Delay application logic
- `12e08a38` - Shift calendar improvements
- `e5df4ce2` - API URL hostname detection
- `524f3f7e` - Y scenario overlay system documentation

---

## Database Migrations

| Date | File | Description |
|------|------|-------------|
| Nov 5, 2025 | `20251105_add_job_delays.sql` | JobDelay table for scenario delay tracking |
| Nov 4, 2025 | `20251030_add_scenario_tables.sql` | Scenarios and scenario_changes tables |
| Oct 25, 2025 | `20251025_add_station_tracking.sql` | Multi-station execution tracking |

---

## Deployment History

| Date | Version | Notes |
|------|---------|-------|
| Nov 13, 2025 | v1.6 | Y scenario shift independence |
| Nov 8, 2025 | v1.5 | Y scenario bug fixes |
| Nov 6, 2025 | v1.4 | Y scenario UX improvements |
| Nov 5, 2025 | v1.3 | Y scenario overlay system + shift calendar |
| Nov 4, 2025 | v1.2 | What-if scenario planning |
| Oct 25, 2025 | v1.1 | Multi-station execution |
| Oct 13, 2025 | v1.0.1 | API URL fix |
| Oct 4, 2025 | v1.0 | Initial production deployment |

---

## Breaking Changes

None yet. All changes have been additive with backward compatibility maintained.

---

## Future Roadmap

See `Y_YHAT_ARCHITECTURE.md` for planned residual analysis features (5-phase implementation).
