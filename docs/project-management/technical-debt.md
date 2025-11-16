# Technical Debt & Known Issues

## Database Schema Naming Inconsistency

**Issue**: Inconsistent naming convention between Prisma models and database columns

**Details**:
- **Older tables** use snake_case column names (e.g., `job_progress.next_station_number`)
- **Newer Shift table** also uses snake_case (e.g., `shifts.start_time`)
- **Prisma models** use camelCase field names (e.g., `nextStationNumber`, `startTime`)
- Currently using `@map()` directives to bridge the gap

**Current Workaround**:
```prisma
model Shift {
  startTime String @map("start_time")  // camelCase in code, snake_case in DB
  endTime   String @map("end_time")
  // ... etc
}
```

**Recommended Fix** (Future):
Option 1: Standardize on snake_case everywhere
- Update all Prisma models to use snake_case field names
- Remove @map directives
- Pros: Matches database convention, simpler schema
- Cons: Less idiomatic JavaScript/TypeScript

Option 2: Migrate database to camelCase
- Rename all columns to camelCase
- Remove @map directives
- Pros: More idiomatic JS/TS, cleaner code
- Cons: Risky migration on shared database, requires coordination with other apps

**Priority**: Low (current workaround is functional)

**Created**: October 27, 2025
**Component**: Database Schema / Prisma
