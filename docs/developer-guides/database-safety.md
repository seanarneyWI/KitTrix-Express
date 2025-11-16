# DATABASE SAFETY PROTOCOL

## CRITICAL: Shared Database Protection Rules

The `motioPGDB` database is **SHARED** across multiple ERP applications:
- KitTrix-Express (this app)
- Estimating-app (quoting system)
- Other ERP systems

**ANY destructive schema changes will break other applications!**

---

## ABSOLUTE RULES - NO EXCEPTIONS

### ❌ NEVER DO THESE (Without Explicit Written Approval):

1. **NEVER run `prisma db push`**
   - This command will try to drop existing tables
   - Will destroy data used by other applications
   - Use manual SQL migrations only

2. **NEVER drop tables**
   ```sql
   -- ❌ FORBIDDEN
   DROP TABLE companies;
   DROP TABLE any_existing_table;
   ```

3. **NEVER drop columns**
   ```sql
   -- ❌ FORBIDDEN
   ALTER TABLE kitting_jobs DROP COLUMN any_column;
   ```

4. **NEVER alter existing column types**
   ```sql
   -- ❌ FORBIDDEN
   ALTER TABLE kitting_jobs ALTER COLUMN status TYPE varchar;
   ```

5. **NEVER modify shared tables** (See list below)

6. **NEVER run migrations without review**
   - Always review SQL before executing
   - Test on local database copy first (via SSH tunnel)
   - Document expected changes
   - Have rollback plan ready

---

## ✅ SAFE OPERATIONS

### Adding New Columns (Safe)
```sql
-- ✅ SAFE - Adds column without destroying data
ALTER TABLE kitting_jobs
ADD COLUMN execution_interface TEXT DEFAULT 'STEPS';
```

### Adding New Tables (Safe if KitTrix-owned)
```sql
-- ✅ SAFE - Creates new table for KitTrix only
CREATE TABLE new_kittrix_feature (
  id TEXT PRIMARY KEY,
  ...
);
```

### Adding New Enums (Safe)
```sql
-- ✅ SAFE - Creates new enum type
CREATE TYPE "ExecutionInterface" AS ENUM ('STEPS', 'TARGET', 'BASIC');
```

### Updating Data (Safe with WHERE clause)
```sql
-- ✅ SAFE - Updates specific records
UPDATE kitting_jobs
SET execution_interface = 'TARGET'
WHERE created_at < '2025-10-25';
```

---

## Table Ownership Reference

### 🚫 SHARED TABLES (READ-ONLY for KitTrix)
**DO NOT MODIFY SCHEMA OR DELETE DATA:**
- `companies` - Used by all ERP apps for customer data
- `board_adders`, `board_grades`, `estimates`, `flute_types`
- `liner_materials`, `medium_types`, `metrics`, `migrations`
- `motioevents`, `shipping_zones`, `vendors`
- `customers_backup`
- Any other table not listed below

### ✅ KITTRIX-OWNED TABLES (Safe to manage)
**CAN ADD COLUMNS (but never drop):**
- `kitting_jobs`
- `route_steps`
- `job_progress`
- `kit_executions`
- `step_executions`
- `job_analytics`
- `users`
- `work_centers`
- `job_assignments`

---

## Schema Change Workflow

### Before Making ANY Schema Change:

1. **Document the Change**
   - What are you adding?
   - Why is it needed?
   - What tables are affected?
   - Is this a KitTrix-owned table?

2. **Write Manual SQL Migration**
   - Create file: `prisma/migrations/YYYYMMDD_description.sql`
   - Use only SAFE operations (ADD COLUMN, CREATE TABLE, CREATE TYPE)
   - Include rollback SQL in comments

3. **Review Migration**
   - Double-check: no DROP statements
   - Double-check: no ALTER COLUMN TYPE
   - Double-check: only KitTrix tables affected
   - Verify default values won't break existing data

4. **Test on Local (via SSH tunnel)**
   ```bash
   # Connect to database via tunnel
   psql postgresql://motioadmin:M0t10n4lys1s@localhost:5433/motioPGDB

   # Run migration
   \i prisma/migrations/YYYYMMDD_description.sql

   # Verify results
   \d+ kitting_jobs
   ```

5. **Update Prisma Schema**
   - Edit `prisma/schema.prisma` to match database
   - Run `npx prisma generate` (safe - only updates client)
   - Never run `npx prisma db push` or `npx prisma migrate deploy`

6. **Deploy to Production**
   - SSH to server
   - Run migration SQL manually
   - Regenerate Prisma client
   - Restart application

7. **Document in Git**
   - Commit migration file
   - Commit schema.prisma changes
   - Clear commit message explaining changes

---

## Emergency Rollback Procedures

### If You Accidentally Ran Destructive Command:

1. **STOP IMMEDIATELY** - Don't run any more commands
2. **Check what was affected**: `\dt` to list tables
3. **Contact database admin** (if data lost from shared tables)
4. **Restore from backup** (if available)
5. **Document incident** for post-mortem

### Rollback Examples:

```sql
-- If you added a column (easy rollback)
ALTER TABLE kitting_jobs DROP COLUMN execution_interface;

-- If you added a table (easy rollback)
DROP TABLE new_table_name;

-- If you dropped a column or table (hard - need backup)
-- Contact Sean immediately: sean@digiglue.io
```

---

## Prisma Command Reference

### ✅ SAFE Prisma Commands
```bash
npx prisma generate          # Regenerate client (safe)
npx prisma studio            # Open database browser (read-only)
npx prisma format            # Format schema file (safe)
npx prisma validate          # Validate schema (safe)
```

### ❌ DANGEROUS Prisma Commands
```bash
npx prisma db push           # ❌ NEVER USE - drops tables!
npx prisma migrate deploy    # ❌ NEVER USE - runs migrations!
npx prisma migrate dev       # ❌ NEVER USE - auto-generates migrations!
npx prisma migrate reset     # ❌ NEVER USE - drops all data!
```

---

## Pre-Migration Checklist

Before running ANY migration, verify:

- [ ] Migration only uses ADD COLUMN, CREATE TABLE, or CREATE TYPE
- [ ] No DROP statements present
- [ ] No ALTER COLUMN TYPE statements
- [ ] Only KitTrix-owned tables affected
- [ ] Default values specified for new columns
- [ ] Tested on local database via SSH tunnel
- [ ] Rollback SQL prepared and documented
- [ ] Team notified of upcoming change
- [ ] Backup verified (or acceptance that no backup exists)

---

## Getting Approval for Destructive Changes

If you absolutely MUST make a destructive change:

1. **Create detailed proposal** with:
   - Exact SQL to run
   - Tables/columns affected
   - Impact on other ERP apps
   - Rollback plan
   - Why it's necessary

2. **Get written approval** from Sean

3. **Coordinate with other app teams**

4. **Schedule maintenance window**

5. **Create backup before change**

6. **Test on staging/local first**

---

## Contact for Questions

**Before making risky changes, contact:**
- Sean Arney (Database Admin)
- Review this document
- When in doubt, DON'T DO IT

---

**Remember: It's better to ask permission than beg forgiveness when dealing with a shared production database.**
