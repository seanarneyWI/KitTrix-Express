# Project Context
Last Updated: October 4, 2025

## Current Focus
- KitTrix-Express successfully deployed at https://kits.digiglue.io
- Application running on ports 5173 (Vite frontend) + 3001 (Express API)
- Recent work: Customer autocomplete, job creation fixes, calendar improvements
- Progress: PRODUCTION READY - Active deployment complete

## Recent Changes

### Latest Session (October 4, 2025)
- **Customer Autocomplete**: Integrated Company table for customer selection
  - Added CustomerAutocomplete component with debounced search
  - Connected to shared Company table in motioPGDB
  - Saves company ID on job creation/editing
- **Job Creation Fixes**: Fixed route steps handling in create/edit flows
  - Added instruction fields to route step format
  - Fixed duration calculation and display
- **Calendar Improvements**: Removed hardcoded demo events
  - Calendar now shows only real job data
  - Duration fields made read-only/calculated
- **Database Connectivity**: Fixed environment variable override issue
  - Discovered DATABASE_URL shell variable was overriding .env file
  - Solution: unset DATABASE_URL before running npm run dev
- **Production Deployment**: Successfully deployed to kits.digiglue.io
  - Nginx reverse proxy configured
  - Application accessible via HTTPS
  - Running on ports 5173 (frontend) + 3001 (backend)

### Previous Work
- **Repository Structure**: Discovered and resolved critical repository confusion
  - Local repo was pointing to non-existent `motionalysis/KitTrix-Express`
  - Actual repo is `seanarneyWI/KitTrix-Express` (created Oct 4, 2025)
  - Force pushed correct Express version to proper repository
- **Server Deployment**: Cleaned and re-cloned correct codebase on Digital Ocean server
  - Removed old Next.js files that had wrong .dockerignore
  - Fresh clone from `seanarneyWI/KitTrix-Express` now on server

## Next Steps
1. Monitor production application performance and stability
2. Potential enhancements:
   - Additional job management features
   - Enhanced reporting and analytics
   - Integration with other ERP systems in motioPGDB
3. Database schema evolution (coordinate with other apps using motioPGDB)

## Open Issues
- None currently blocking production operation
- Future consideration: Docker containerization for easier deployment (currently running via npm/nvm)

## Architecture Notes
- **KitTrix-Express Structure**: Express backend + Vite frontend (NOT Next.js)
  - Backend: Express server with API endpoints
  - Frontend: Vite-based React application
  - Build: Separate client and server build processes
- **Repository History**: Two separate KitTrix implementations exist
  - `Motionalysis/KitTrix`: Next.js version (created Sep 29, 2025)
  - `seanarneyWI/KitTrix-Express`: Express + Vite version (created Oct 4, 2025)
- **Server Environment**: Digital Ocean droplet at 137.184.182.28
  - Memory: 1.9GB RAM with existing production services
  - Nginx-proxy for SSL termination and reverse proxy
  - Shared PostgreSQL database with ERP data

## 🚨 CRITICAL DATABASE SAFETY PROTOCOL

### SHARED ERP DATABASE WARNING
The motioPGDB database is a **SHARED PRODUCTION DATABASE** used by multiple applications:
- **KitTrix-Express**: Kitting job management (this app)
- **Estimating-app**: Quoting and estimation system
- **Other ERP systems**: Using tables like board_adders, estimates, motioevents, shipping_zones, vendors, flute_types, liner_materials, medium_types, metrics, migrations, customers_backup

### 🚨 ABSOLUTE RULES - NEVER VIOLATE THESE:
1. **NEVER use `prisma db push`** - It will drop/recreate tables and destroy data
2. **NEVER drop existing database tables** - Other apps depend on them
3. **NEVER alter tables not owned by KitTrix** - Coordinate schema changes
4. **ALWAYS use Prisma migrations or manual SQL** for schema changes
5. **ALWAYS check what tables exist** before making schema changes

### Database Schema Management Strategy
**KitTrix-Owned Tables** (safe to manage):
- kitting_jobs
- route_steps
- job_progress
- (any future KitTrix-specific tables)

**Shared Tables** (READ ONLY - do not manage):
- companies (shared customer database)
- board_adders, estimates, motioevents, shipping_zones
- vendors, flute_types, liner_materials, medium_types
- metrics, migrations, customers_backup

**Prisma Configuration**:
- KitTrix models only manage tables it owns
- Shared tables like Company should be read-only in practice
- Never include other app tables in Prisma schema unless coordinating

### Safe Schema Change Workflow
1. **Check existing tables**: `psql -U motioadmin -d motioPGDB -c "\dt"`
2. **Create Prisma migration**: `npx prisma migrate dev --name description`
3. **Review SQL before applying**: Check migration file content
4. **Apply to production**: `npx prisma migrate deploy`
5. **NEVER use `db push`**: It bypasses migration safety checks

## Database Configuration

### Customer/Company Database
- **Server**: Digital Ocean PostgreSQL at 137.184.182.28:5432
- **Database**: `motioPGDB`
- **Credentials**: `motioadmin:M0t10n4lys1s`
- **Table**: `companies` (175 records)
  - Originally named `customers`, still uses `customers_id_seq` sequence
  - Key field: `company_name` (varchar 255)

### Local Development Database Access
- **SSH Tunnel Required**: `ssh -f -N -L 5433:localhost:5432 sean@137.184.182.28`
- **Local Connection String**: `postgresql://motioadmin:M0t10n4lys1s@localhost:5433/motioPGDB`
- **.env Location**: `/Users/motioseanmbp/Documents/GitHub/CursorTest/KitTrix-Express/.env`
- **CRITICAL**: Must unset shell `DATABASE_URL` environment variable before running dev server
  - Shell env var overrides .env file settings
  - Command: `unset DATABASE_URL` before `npm run dev`

### Prisma Schema Structure
```prisma
model Company {
  id                         Int       @id @default(autoincrement())
  companyName                String    @map("company_name")
  kittingJobs                KittingJob[]
  @@map("companies")
}

model KittingJob {
  companyId       Int?
  company         Company? @relation(fields: [companyId], references: [id], onDelete: SetNull, onUpdate: Cascade)
}
```

### Customer API Implementation
- **Endpoint**: `GET /api/companies?search={term}`
- **Returns**: `[{id: number, companyName: string}]`
- **Search**: Case-insensitive using Prisma `contains` filter
- **Limit**: 50 results
- **Component**: `src/components/CustomerAutocomplete.tsx`
  - Features: Debounced search (300ms), dropdown with hover
  - Saves company ID on selection
  - Integrated in EditJob page (src/pages/EditJob.tsx:236-246)

### Common Database Issues & Solutions

1. **Empty customer list troubleshooting**:
   - Check if `DATABASE_URL` env var is overriding .env
   - Solution: `unset DATABASE_URL` before running `npm run dev`

2. **0 companies returned**:
   - Verify SSH tunnel is running on port 5433
   - Check: `lsof -i :5433`
   - Create tunnel: `ssh -f -N -L 5433:localhost:5432 sean@137.184.182.28`

3. **Prisma connection issues**:
   - Regenerate client after .env changes: `npx prisma generate`

4. **Wrong Prisma model name**:
   - Use singular model names: `prisma.company` NOT `prisma.companies`

### Development Workflow with Database
1. Start SSH tunnel to DO server (port 5433)
2. Ensure `DATABASE_URL` env var is unset
3. Run `npm run dev` (uses .env file with port 5433)
4. Access at http://localhost:5173

## Production Deployment Process

### Current Deployment at kits.digiglue.io
**Status**: LIVE and operational
**Architecture**:
- Frontend (Vite): Running on port 5173
- Backend (Express): Running on port 3001
- Reverse Proxy: Nginx at kits.digiglue.io pointing to port 5173
- Database: Direct connection to localhost:5432 (motioPGDB)

### Deployment Command Sequence
```bash
# 1. SSH to server
ssh sean@137.184.182.28

# 2. Navigate to project
cd ~/KitTrix-Express

# 3. Pull latest changes
git pull origin main

# 4. Install dependencies (if package.json changed)
source ~/.nvm/nvm.sh
npm install

# 5. Kill existing processes
pkill -f "vite"
pkill -f "node.*server"

# 6. Start backend in background
nohup npm run server > logs/server.log 2>&1 &

# 7. Start frontend in background
nohup npm run client > logs/client.log 2>&1 &

# 8. Verify processes are running
ps aux | grep -E "vite|node.*server"

# 9. Test application
curl -I https://kits.digiglue.io
```

### CRITICAL Deployment Rules
1. **ALWAYS source nvm before npm commands**: `source ~/.nvm/nvm.sh`
2. **NEVER run `prisma db push` on server**: Risk of dropping shared tables
3. **Database URL on server**: `postgresql://motioadmin:M0t10n4lys1s@localhost:5432/motioPGDB`
4. **Check logs if issues**: `tail -f ~/KitTrix-Express/logs/*.log`
5. **Nginx config**: Located at `/etc/nginx/sites-enabled/kits.digiglue.io`

### Environment Configuration
**Server .env file** (`/home/sean/KitTrix-Express/.env`):
```
DATABASE_URL="postgresql://motioadmin:M0t10n4lys1s@localhost:5432/motioPGDB"
PORT=3001
NODE_ENV=production
```

### Nginx Reverse Proxy Configuration
Points `kits.digiglue.io` to `http://localhost:5173` (Vite frontend)
Frontend proxies API requests to backend on port 3001

### Rollback Procedure
If deployment fails:
```bash
# 1. Kill new processes
pkill -f "vite"
pkill -f "node.*server"

# 2. Check git log for last working commit
git log --oneline -10

# 3. Revert to last working version
git checkout <last-working-commit>

# 4. Restart application
npm run server &
npm run client &
```

## Gotchas & Learnings

### Database Management Lessons
- **Shared Database Discovery**: motioPGDB is used by multiple ERP applications
  - KitTrix, Estimating-app, and other systems all share this database
  - Contains 30+ tables for various business functions
  - **NEVER use `prisma db push`** - discovered this would drop all shared tables
  - **ALWAYS coordinate schema changes** with other application owners
- **Environment Variable Override**: Shell DATABASE_URL overrides .env file
  - Symptom: Empty customer list despite correct .env configuration
  - Solution: `unset DATABASE_URL` before running dev server
  - Affects Prisma client initialization silently
- **Prisma Model Naming**: Use singular names for models
  - Correct: `prisma.company.findMany()`
  - Wrong: `prisma.companies.findMany()` (will error)
  - Even though table name is plural, model name should be singular

### Deployment Lessons
- **NVM Requirement on Server**: Node is installed via nvm, not system package
  - Must run `source ~/.nvm/nvm.sh` before any npm commands
  - Otherwise commands fail with "npm: command not found"
- **Process Management**: Using nohup for background processes
  - Backend: `nohup npm run server > logs/server.log 2>&1 &`
  - Frontend: `nohup npm run client > logs/client.log 2>&1 &`
  - Kill with: `pkill -f "vite"` and `pkill -f "node.*server"`
- **Nginx Configuration**: Reverse proxy points to frontend, frontend proxies API
  - Nginx → :5173 (Vite) → API requests → :3001 (Express)
  - SSL termination handled by nginx
  - Vite dev server configured to proxy /api/* to backend

### Application Architecture Lessons
- **Route Steps Format**: Job creation requires specific route step structure
  - Must include: stepNumber, areaId, instruction fields
  - Duration calculated from start/end times (not user input)
  - Fixed by updating route step handling in job creation flow
- **Customer Autocomplete**: Debounced search pattern
  - 300ms debounce prevents excessive API calls
  - Dropdown with hover highlights improves UX
  - Company ID saved on selection, not just name
- **Calendar Integration**: Real data vs demo data conflict
  - Removed hardcoded demo events to show only actual jobs
  - Duration fields made read-only to prevent user confusion
  - Events pulled from job_progress table with date filtering

### Repository Confusion
- **CRITICAL**: There are TWO separate KitTrix repos
  - `Motionalysis/KitTrix`: Next.js version (Sep 29, 2025)
  - `seanarneyWI/KitTrix-Express`: Express + Vite version (Oct 4, 2025)
  - Always verify which version you're working with
  - Check remote URL: `git remote -v` to confirm correct repository

### Technical Debt Identified
- **No Production Process Manager**: Currently using nohup instead of PM2 or systemd
  - Risk: Processes may die without automatic restart
  - Future: Consider implementing PM2 for process management
- **No Docker Containerization**: Running directly via npm/nvm
  - Makes deployment less portable
  - Future: Consider Dockerizing for consistency
- **Hardcoded Credentials**: Database password in .env files
  - Should use environment-specific secrets management
  - Future: Implement proper secrets handling

## Failed Approaches

### Deployment Attempts
- **Docker Containerization**: Attempted but abandoned in favor of direct npm deployment
  - Issue: Build script mismatches and configuration complexity
  - Current approach (nohup + npm) works reliably
  - Docker may be revisited when stability proven with current approach
- **Initial Docker Build**: Failed because wrong codebase (Next.js) was on server
  - The .dockerignore excluded package-lock.json causing npm ci to fail
  - Resolution: Cleaned directory and cloned correct Express repository
- **First Build Attempt**: Failed at frontend build due to missing tsconfig.json
  - The build script `tsc && vite build` expects TypeScript configuration
  - But Express version doesn't have tsconfig.json
  - Resolution: Switched to development mode deployment

### Database Connection Issues
- **Using `prisma db push` in development**: Nearly catastrophic
  - Would have dropped all shared ERP tables
  - Caught before execution on production
  - Now strictly forbidden - only migrations allowed
- **Environment variable conflicts**: DATABASE_URL shell variable
  - Overrode .env file settings causing connection to wrong database
  - Resulted in empty customer lists and confusion
  - Resolution: Always unset shell env vars before development

### Future Considerations
- **Multi-database ERP Architecture**: Database is being extended for more ERP purposes
  - Multiple applications will continue sharing motioPGDB
  - Schema changes must be coordinated across all applications
  - Consider implementing database change management process
  - Potential future: Separate databases per application with shared data API
