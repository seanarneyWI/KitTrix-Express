# Project Context
Last Updated: October 4, 2025 - Evening Session (Docker Deployment Complete)

## Current Focus
- KitTrix-Express successfully deployed at https://kits.digiglue.io via Docker
- Application running as Docker container on port 3000 (single Express server)
- Docker nginx-proxy handles HTTPS/SSL and routing
- Customer autocomplete feature fully operational in production
- Progress: PRODUCTION READY - Docker-based deployment complete and stable

## Recent Changes

### Latest Session (October 4, 2025) - Docker Deployment & Customer Autocomplete Fix

#### Customer Autocomplete Deployment Issue - RESOLVED
**Problem**: Customer autocomplete worked locally but returned HTML instead of JSON on production
- API endpoint `/api/companies` serving HTML instead of JSON data
- Frontend unable to fetch customer names from database

**Complex Root Cause Discovery Process**:
1. **Initial hypothesis**: Nginx pointing to wrong port (5173 vs 3001)
   - Updated nginx config to proxy /api → port 3001
   - Result: Didn't fix the issue
2. **Second discovery**: TWO nginx instances running simultaneously
   - System nginx on port 8080 (using /etc/nginx/sites-available configs)
   - Docker nginx-proxy container on ports 80/443 (auto-configured via docker-gen)
3. **ACTUAL ROOT CAUSE**: Old Docker container `kittrix-app` still running
   - Docker nginx-proxy was routing https://kits.digiglue.io → old container on port 3000
   - System nginx config changes were irrelevant (traffic never reached it)
   - Old container served outdated code without customer autocomplete feature
   - Container was from previous failed deployment attempt

**Final Solution**: Proper Docker deployment with nginx-proxy integration
- Build KitTrix-Express as Docker container with multi-stage Dockerfile
- Use VIRTUAL_HOST environment variable for automatic nginx-proxy routing
- Express server serves both static Vite files AND API endpoints on port 3000
- Docker nginx-proxy automatically handles HTTPS/SSL via Let's Encrypt
- Single container, single port, clean architecture

#### Docker Deployment Implementation
- **Dockerfile**: Multi-stage build process
  - Stage 1: Build Vite frontend with `npm run build`
  - Stage 2: Production runtime with only production dependencies
  - Copies built dist/ folder and server code
  - Runs as non-root user (expressjs:nodejs)
  - Exposes port 3000
- **docker-compose.yml**: Production configuration
  - Environment: NODE_ENV=production, PORT=3000
  - Database: DATABASE_URL pointing to host PostgreSQL via 172.17.0.1
  - Nginx-proxy integration: VIRTUAL_HOST=kits.digiglue.io, LETSENCRYPT_HOST=kits.digiglue.io
  - Network: motiostack_net (shared with other services)
  - Resource limits: 256M max, 128M reserved (for 1.9GB RAM server)
  - Healthcheck: /api/health endpoint every 30s

#### Previous Work This Session
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

### Previous Work
- **Repository Structure**: Discovered and resolved critical repository confusion
  - Local repo was pointing to non-existent `motionalysis/KitTrix-Express`
  - Actual repo is `seanarneyWI/KitTrix-Express` (created Oct 4, 2025)
  - Force pushed correct Express version to proper repository
- **Server Deployment**: Cleaned and re-cloned correct codebase on Digital Ocean server
  - Removed old Next.js files that had wrong .dockerignore
  - Fresh clone from `seanarneyWI/KitTrix-Express` now on server

## Next Steps
1. Monitor Docker container performance and stability at https://kits.digiglue.io
2. Verify resource usage stays within limits (256M max memory)
3. Potential enhancements:
   - Additional job management features
   - Enhanced reporting and analytics
   - Integration with other ERP systems in motioPGDB
4. Database schema evolution (coordinate with other apps using motioPGDB)

## Open Issues
- None currently blocking production operation
- Docker deployment successfully implemented and running

## Architecture Notes

### Production Architecture (Docker-based)
- **Deployment Method**: Docker container with nginx-proxy integration
- **Single Server Architecture**: Express serves both static files and API on port 3000
  - Express serves built Vite static files from `/dist` directory
  - Same Express instance handles API endpoints at `/api/*`
  - No separate frontend/backend ports in production
- **Reverse Proxy**: Docker nginx-proxy container
  - Automatically detects containers via VIRTUAL_HOST environment variable
  - Handles HTTPS/SSL via Let's Encrypt companion container
  - Routes https://kits.digiglue.io → kittrix-express container port 3000
- **Multi-stage Dockerfile**:
  - Stage 1: Build Vite frontend (`npm run build`)
  - Stage 2: Production runtime with minimal dependencies
  - Final image runs as non-root user (expressjs:nodejs)

### Development Architecture (Local)
- **Separate Servers**: Vite dev server (5173) + Express API (3001)
- **Vite Proxy**: Routes `/api/*` requests to Express backend
- **Hot Reload**: Enabled for both frontend and backend
- **Database Access**: SSH tunnel to production PostgreSQL on port 5433

### KitTrix-Express Structure
- **Stack**: Express backend + Vite frontend (NOT Next.js)
- **Backend**: Express server with API endpoints
- **Frontend**: Vite-based React application with TypeScript
- **Database**: Prisma ORM with PostgreSQL

### Repository History
Two separate KitTrix implementations exist:
  - `Motionalysis/KitTrix`: Next.js version (created Sep 29, 2025)
  - `seanarneyWI/KitTrix-Express`: Express + Vite version (created Oct 4, 2025)

### Server Environment
- **Digital Ocean Droplet**: 137.184.182.28
- **Memory**: 1.9GB RAM with existing production services
- **Docker Network**: motiostack_net (shared with Node-RED, Grafana, pgAdmin)
- **Database**: Shared PostgreSQL database with ERP data
- **SSL**: Let's Encrypt via letsencrypt-nginx-proxy-companion

### Docker nginx-proxy Architecture
- **nginx-proxy container**: Auto-generates nginx configuration using docker-gen
- **Monitors Docker events**: Detects containers with VIRTUAL_HOST environment variable
- **System nginx NOT used**: Configs in /etc/nginx/sites-available are ignored by nginx-proxy
- **SSL Management**: Automatic via letsencrypt-nginx-proxy-companion container
- **Shared Network**: All containers must be on motiostack_net Docker network

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
**Status**: LIVE and operational via Docker
**Architecture**:
- Single Docker container running Express server on port 3000
- Express serves both built Vite static files AND API endpoints
- Docker nginx-proxy routes https://kits.digiglue.io → container
- Database: PostgreSQL via 172.17.0.1:5432 (Docker host network)

### Deployment Command (FINAL - ONE COMMAND)
```bash
ssh sean@137.184.182.28 "cd ~/KitTrix-Express && git pull && docker-compose up -d --build"
```

This single command:
1. SSHs to Digital Ocean server
2. Navigates to project directory
3. Pulls latest code from GitHub
4. Builds Docker image from Dockerfile
5. Starts/restarts container with docker-compose
6. nginx-proxy automatically detects and routes traffic

### docker-compose.yml Configuration
```yaml
services:
  kittrix-express:
    build: .
    container_name: kittrix-express
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=postgresql://motioadmin:M0t10n4lys1s@172.17.0.1:5432/motioPGDB
      - VIRTUAL_HOST=kits.digiglue.io
      - LETSENCRYPT_HOST=kits.digiglue.io
      - LETSENCRYPT_EMAIL=your@email.com
    networks:
      - motiostack_net
    deploy:
      resources:
        limits:
          memory: 256M
        reservations:
          memory: 128M
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  motiostack_net:
    external: true
```

### Dockerfile (Multi-stage Build)
```dockerfile
# Stage 1: Build frontend
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production runtime
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY server ./server
USER node
EXPOSE 3000
CMD ["node", "server/index.js"]
```

### CRITICAL Deployment Rules
1. **ALWAYS use Docker deployment**: `docker-compose up -d --build`
2. **NEVER run `prisma db push` on server**: Risk of dropping shared tables
3. **Database connection**: Uses 172.17.0.1 (Docker host) to reach PostgreSQL
4. **VIRTUAL_HOST required**: nginx-proxy uses this to route traffic
5. **Check old containers**: `docker ps -a` to find orphaned containers

### Verification Steps
```bash
# Check container is running
ssh sean@137.184.182.28 "docker ps | grep kittrix-express"

# Check nginx-proxy routing
ssh sean@137.184.182.28 "docker exec reverse-proxy cat /etc/nginx/conf.d/default.conf | grep kits.digiglue.io"

# View container logs
ssh sean@137.184.182.28 "docker logs kittrix-express --tail 50"

# Test application
curl -I https://kits.digiglue.io
curl https://kits.digiglue.io/api/companies?search=test
```

### Troubleshooting Commands
```bash
# Check for old/conflicting containers
docker ps -a | grep kittrix

# Remove old container if found
docker rm -f <container-id>

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Check resource usage
docker stats kittrix-express

# View nginx-proxy logs
docker logs reverse-proxy --tail 100
```

### Rollback Procedure
If deployment fails:
```bash
# 1. SSH to server
ssh sean@137.184.182.28

# 2. Navigate to project
cd ~/KitTrix-Express

# 3. Check git log for last working commit
git log --oneline -10

# 4. Revert to last working version
git checkout <last-working-commit>

# 5. Rebuild and restart container
docker-compose down
docker-compose up -d --build
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

### Docker Deployment Lessons (CRITICAL)

#### nginx-proxy Architecture Understanding
- **Docker nginx-proxy auto-configuration**: nginx-proxy uses docker-gen to automatically generate nginx configs
  - Monitors Docker events to detect containers with VIRTUAL_HOST environment variable
  - Generates routing rules dynamically based on running containers
  - System nginx configs in `/etc/nginx/sites-available` are IGNORED by nginx-proxy
  - SSL certificates managed automatically via letsencrypt-nginx-proxy-companion
  - All containers MUST be on same Docker network (motiostack_net)

#### Why Multiple Deployment Attempts Failed
1. **First attempt**: Tried running without Docker (npm run dev)
   - nginx-proxy couldn't route to non-containerized app
   - No VIRTUAL_HOST environment variable to detect
2. **Second attempt**: Updated system nginx config to point to port 3001
   - System nginx config irrelevant - nginx-proxy ignores it
   - nginx-proxy only reads from docker-gen templates
3. **Third attempt**: Started Express on port 3001
   - nginx-proxy still routing to OLD container `kittrix-app` on port 3000
   - Old container from previous failed deployment was still running
   - Customer autocomplete API returned HTML because old code didn't have the feature
4. **Final solution**: Proper Docker deployment with VIRTUAL_HOST environment variable
   - nginx-proxy detected new container and updated routing
   - Single Express server serves both static files and API
   - Clean architecture with one container, one port

#### Critical Discovery Process
- **Always check `docker ps -a`** to see ALL containers (including stopped)
  - Old/orphaned containers can hijack domain routing if they have VIRTUAL_HOST set
  - Use `docker rm -f <container-id>` to remove conflicting containers
- **Verify nginx-proxy routing**: `docker exec reverse-proxy cat /etc/nginx/conf.d/default.conf`
  - Shows actual routing configuration nginx-proxy is using
  - Reveals which container is receiving traffic for each domain
- **Two nginx instances running simultaneously**:
  - System nginx on port 8080 (uses /etc/nginx/sites-available configs)
  - Docker nginx-proxy on ports 80/443 (uses docker-gen auto-configuration)
  - Only nginx-proxy matters for Docker-based deployments

### Old Deployment Method Lessons (DEPRECATED)
The following lessons are from the old npm-based deployment method. Now using Docker exclusively.

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
- **Docker Deployment Implemented**: ✅ RESOLVED
  - Previously: Running directly via npm/nvm without process management
  - Now: Full Docker containerization with docker-compose
  - Benefits: Automatic restarts, resource limits, healthchecks
- **Hardcoded Credentials**: Database password in docker-compose.yml
  - Should use Docker secrets or environment-specific secrets management
  - Future: Implement proper secrets handling with Docker secrets

## Failed Approaches

### Customer Autocomplete Deployment Debugging (Multiple Failed Attempts)

**Problem Statement**: Customer autocomplete API returning HTML instead of JSON on production

**Failed Attempt #1: Port Configuration**
- **Hypothesis**: Nginx pointing to wrong port (Vite 5173 instead of Express 3001)
- **Action**: Updated /etc/nginx/sites-available/kits.digiglue.io to proxy /api to port 3001
- **Result**: FAILED - Still receiving HTML responses
- **Why it failed**: System nginx config was irrelevant; nginx-proxy was handling routing

**Failed Attempt #2: Direct Express Deployment**
- **Hypothesis**: Need to run Express directly on server without Vite
- **Action**: Started Express server on port 3001 via SSH
- **Result**: FAILED - Same HTML response from API
- **Why it failed**: nginx-proxy was still routing to old Docker container, not the new Express process

**Failed Attempt #3: System Nginx Configuration**
- **Hypothesis**: Need to configure system nginx to route properly
- **Action**: Modified nginx configs, reloaded nginx service
- **Result**: FAILED - No change in behavior
- **Why it failed**: nginx-proxy (Docker) handles all routing on ports 80/443; system nginx is on port 8080 and not in the routing path

**Root Cause Discovered**: Old Docker container `kittrix-app` still running
- Container was from previous failed deployment attempt
- Had VIRTUAL_HOST=kits.digiglue.io set
- nginx-proxy was routing all traffic to this old container
- Old container didn't have customer autocomplete feature, served outdated HTML

**Final Solution**: Remove old container and deploy properly with Docker
- `docker rm -f kittrix-app` to remove conflicting container
- `docker-compose up -d --build` to deploy new container with correct code
- nginx-proxy automatically detected new container and updated routing
- Customer autocomplete API now returns JSON correctly

### Early Deployment Attempts
- **Initial Docker Build**: Failed because wrong codebase (Next.js) was on server
  - The .dockerignore excluded package-lock.json causing npm ci to fail
  - Resolution: Cleaned directory and cloned correct Express repository
- **First Build Attempt**: Failed at frontend build due to missing tsconfig.json
  - The build script `tsc && vite build` expects TypeScript configuration
  - But Express version doesn't have tsconfig.json
  - Resolution: Updated build script to use `vite build` only

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

## Session Summary - Key Achievements

### Major Milestone: Production Docker Deployment
Successfully transitioned from npm-based deployment to Docker containerization:
- **Single-command deployment**: `ssh sean@137.184.182.28 "cd ~/KitTrix-Express && git pull && docker-compose up -d --build"`
- **Automatic routing**: nginx-proxy detects container via VIRTUAL_HOST environment variable
- **Automatic SSL**: Let's Encrypt certificates managed by letsencrypt-nginx-proxy-companion
- **Resource management**: Memory limits (256M max) and healthchecks configured
- **Clean architecture**: Single Express server serves both static files and API on port 3000

### Critical Problem Solved: Customer Autocomplete
Root cause analysis revealed complex infrastructure issue:
- **Symptom**: API returning HTML instead of JSON on production
- **Root cause**: Old Docker container from previous deployment still running
- **Impact**: nginx-proxy routing to outdated container without customer autocomplete feature
- **Solution**: Removed old container, deployed proper Docker setup
- **Learning**: Always check `docker ps -a` for orphaned containers when debugging routing issues

### Infrastructure Understanding Achieved
Comprehensive understanding of Digital Ocean server architecture:
- **nginx-proxy uses docker-gen**: Auto-generates configs from Docker events
- **System nginx irrelevant for Docker apps**: Only nginx-proxy matters for containerized services
- **VIRTUAL_HOST is key**: This environment variable tells nginx-proxy where to route traffic
- **Shared Docker network**: All services must be on motiostack_net network
- **Two nginx instances**: System nginx (port 8080) and Docker nginx-proxy (ports 80/443) coexist

### Next Session Recommendations
1. Monitor Docker container health and resource usage
2. Consider implementing Docker secrets for database credentials
3. Watch for any SSL certificate renewal issues
4. Verify application performance under load
5. All future deployments use: `ssh sean@137.184.182.28 "cd ~/KitTrix-Express && git pull && docker-compose up -d --build"`
