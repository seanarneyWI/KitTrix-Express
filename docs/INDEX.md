# KitTrix Express - Documentation Index

**Comprehensive documentation catalog for KitTrix Express production scheduling system.**

> **Quick Start**: New to KitTrix? Start with `/docs/user-guides/y-scenarios.md` to understand the core Y Scenario planning system.

---

## 📁 Documentation Structure

```
/docs
  ├── INDEX.md (you are here)          # This catalog
  │
  ├── architecture/                     # System design & philosophy
  │   └── y-yhat-framework.md          # Statistical model (Y vs Ŷ)
  │
  ├── user-guides/                      # Feature documentation
  │   └── y-scenarios.md               # Y Scenario planning guide
  │
  ├── developer-guides/                 # Development & deployment
  │   ├── deployment.md                # Production deployment guide
  │   └── troubleshooting.md           # Common issues & solutions
  │
  └── project-management/               # Project tracking
      ├── CHANGELOG.md                 # Version history
      └── technical-debt.md            # Known issues & future work
```

---

## 🏗️ Architecture

### Y/Ŷ Statistical Framework
**File**: `architecture/y-yhat-framework.md` (27KB)

**What it covers**:
- **Core Philosophy**: Production reality (Y) vs scenario predictions (Ŷ)
- **Statistical Model**: Regression/forecasting framework
- **Residual Analysis**: Y - Ŷ methodology for continuous improvement
- **Database Schema**: Tables for tracking prediction accuracy
- **API Design**: Endpoints for residual analysis (future)
- **Statistical Formulas**: MAE, RMSE, R², confidence intervals
- **5-Phase Roadmap**: Data collection → Analytics UI → ML integration

**When to read**:
- Understanding the "why" behind the system design
- Planning future analytics features
- Implementing residual tracking
- Starting a new development session (get context on system philosophy)

**Key sections**:
- Core Concept (regression model explanation)
- Residual Analysis Framework (what to track and why)
- Database Schema Design (future tables for Y vs Ŷ comparison)
- Statistical Analysis Methods (MAE, RMSE, R²)
- Data-Driven Evolution Strategy (how system improves over time)

---

## 📘 User Guides

### Y Scenario Planning & Forecasting
**File**: `user-guides/y-scenarios.md` (23KB)

**What it covers**:
- **Conceptual Overview**: What are Y scenarios and why use them?
- **User Workflows**: Creating, viewing, modifying, committing scenarios
- **Visual Design**: Production vs Y overlay vs What-If styling
- **Delay Injection**: Adding disruptions (maintenance, meetings) to jobs
- **Technical Architecture**: Database schema, state management, data flow
- **Developer Reference**: API endpoints, code examples
- **Troubleshooting**: Common Y scenario issues

**When to read**:
- Learning how to use Y scenarios
- Debugging Y overlay rendering issues
- Understanding delay injection system
- Working on Y scenario features

**Key sections**:
- Creating a Scenario (step-by-step user workflow)
- Viewing Y Overlays (enabling multi-scenario comparison)
- Adding Delays to Jobs (delay management UI)
- Technical Architecture (database schema, state flow)
- Delay Injection System (applyDelaysToJob algorithm)
- Troubleshooting (Y overlays not appearing, delays not applying)

---

## 🔧 Developer Guides

### Production Deployment
**File**: `developer-guides/deployment.md` (11KB)

**What it covers**:
- **Current Production**: Live URLs, server details, architecture
- **Quick Deploy**: Routine code update workflow
- **Server Management**: Container status, logs, resource checks
- **Database Connection**: PostgreSQL access, migration safety
- **Memory Optimization**: Historical issues and solutions
- **Docker Configuration**: docker-compose setup, nginx-proxy
- **SSL Certificates**: Let's Encrypt auto-renewal
- **Disk Space**: Cleanup procedures
- **Development Environment**: SSH tunnel setup, local dev server
- **Rollback Procedures**: Emergency recovery

**When to read**:
- Deploying code to production
- Server acting slow or unresponsive
- Setting up local development environment
- Troubleshooting deployment failures
- Managing production database migrations

**Key sections**:
- Quick Deploy Workflow (copy-paste commands)
- Server Management (docker commands for logs, stats, restart)
- Database Connection (migration safety, backup procedures)
- Critical Reminders (server infrastructure safety rules)

---

### Troubleshooting
**File**: `developer-guides/troubleshooting.md` (15KB)

**What it covers**:
- **Production Issues**: Container won't start, SSL problems, memory/disk issues
- **Development Issues**: SSH tunnel failure, API URL problems, browser caching
- **Y Scenario Issues**: Cross-reference to Y scenario guide
- **Database Issues**: Migration failures, connection pool exhaustion
- **Build Failures**: TypeScript errors, npm install problems
- **Networking Issues**: nginx-proxy routing problems
- **Emergency Procedures**: Complete system reset, rollback

**When to read**:
- Something broke and you need a fix NOW
- Error messages you don't understand
- Deployment or build failing
- Application not loading or behaving strangely

**Key sections**:
- Container Won't Start (diagnosis and common causes)
- SSL Certificate Issues (Let's Encrypt troubleshooting)
- SSH Tunnel Failure (local dev database connection)
- API URL Configuration Issues (production fetch errors)
- Emergency Procedures (last resort fixes)

---

### Database Safety
**File**: `developer-guides/database-safety.md` (6KB)

**What it covers**:
- **⚠️ CRITICAL**: Shared database protection rules
- **Never Commands**: `prisma db push`, DROP TABLE, destructive operations
- **Safe Practices**: Additive migrations only, backup procedures
- **Migration Workflow**: Step-by-step safe migration process
- **Emergency Recovery**: Rollback procedures if something goes wrong

**When to read**:
- **BEFORE running ANY database migration** (mandatory)
- Planning schema changes
- Working with Prisma schema
- Database errors or issues

**Key warnings**:
- ❌ **NEVER run `prisma db push`** - Will destroy shared database
- ❌ **NEVER DROP existing tables** - Other applications depend on them
- ✅ **ALWAYS use additive migrations** - CREATE TABLE, ADD COLUMN only
- ✅ **ALWAYS backup before migrations** - No exceptions

**Critical context**: The `motioPGDB` database is shared across multiple ERP applications (KitTrix, Estimating, etc.). Destructive changes will break other systems.

---

## 📋 Project Management

### Changelog
**File**: `project-management/CHANGELOG.md` (8KB)

**What it covers**:
- **Version History**: Chronological list of features and fixes
- **Database Migrations**: Migration file references
- **Deployment History**: Production release timeline
- **Breaking Changes**: Backward compatibility notes
- **Future Roadmap**: Planned enhancements

**Format**: [Keep a Changelog](https://keepachangelog.com/) format

**Key entries**:
- November 13, 2025 - Y Scenario Shift Independence
- November 8, 2025 - Y Scenario Critical Bug Fixes
- November 6, 2025 - Y Scenario UX Improvements
- November 5, 2025 - Y Scenario Overlay System + Delay Injection
- November 4, 2025 - What-If Scenario Planning System
- October 25, 2025 - Multi-Station Execution Interface
- October 13, 2025 - API URL Configuration Fix
- October 4, 2025 - Initial Docker Deployment

---

### Technical Debt
**File**: `project-management/technical-debt.md` (1KB)

**What it covers**:
- **Known limitations**: Features that work but need improvement
- **Future enhancements**: Planned but not yet implemented
- **Performance optimizations**: Areas for speed/memory improvements
- **Code refactoring**: Areas needing cleanup

**When to read**:
- Planning sprint priorities
- Understanding system limitations
- Deciding what to work on next

---

## 🗺️ Documentation Quick Reference

### By Task

**I want to...**

- **Understand the system philosophy** → `architecture/y-yhat-framework.md`
- **Use Y scenarios** → `user-guides/y-scenarios.md`
- **Deploy to production** → `developer-guides/deployment.md`
- **Fix a broken deployment** → `developer-guides/troubleshooting.md`
- **See what changed recently** → `project-management/CHANGELOG.md`
- **Know system limitations** → `project-management/technical-debt.md`

---

### By Role

**Production Scheduler (User)**:
- Start with: `user-guides/y-scenarios.md`
- If issues: `user-guides/y-scenarios.md#troubleshooting`

**Backend Developer**:
- Start with: `architecture/y-yhat-framework.md` (understand philosophy)
- Reference: `user-guides/y-scenarios.md#technical-architecture`
- Deploy: `developer-guides/deployment.md`

**Frontend Developer**:
- Start with: `user-guides/y-scenarios.md#visual-design`
- Reference: `user-guides/y-scenarios.md#technical-architecture` (state management)

**DevOps Engineer**:
- Start with: `developer-guides/deployment.md`
- Troubleshoot: `developer-guides/troubleshooting.md`

**Product Manager**:
- Start with: `architecture/y-yhat-framework.md#core-concept`
- Roadmap: `project-management/CHANGELOG.md` + `technical-debt.md`

---

## 🔗 Cross-References

### Y Scenario System (Complete Picture)

To fully understand Y scenarios, read in order:
1. **Philosophy**: `architecture/y-yhat-framework.md` - Why Y vs Ŷ?
2. **User Guide**: `user-guides/y-scenarios.md` - How to use it
3. **Deployment**: `developer-guides/deployment.md` - How to deploy changes
4. **Troubleshooting**: `user-guides/y-scenarios.md#troubleshooting` - When it breaks

### Production Deployment (Complete Picture)

To deploy confidently, read in order:
1. **Deployment Guide**: `developer-guides/deployment.md`
2. **Troubleshooting**: `developer-guides/troubleshooting.md`
3. **Changelog**: `project-management/CHANGELOG.md` (know what changed)

---

## 📊 Documentation Stats

| Category | Files | Total Size | Purpose |
|----------|-------|------------|---------|
| Architecture | 1 | 27KB | System design & philosophy |
| User Guides | 1 | 23KB | Feature documentation |
| Developer Guides | 2 | 26KB | Development & deployment |
| Project Management | 2 | 9KB | Tracking & planning |
| **Total** | **6** | **85KB** | **Complete documentation** |

**Previous CLAUDE.md**: 2,677 lines (~100KB+ with verbosity)

**Token Savings**: ~74% reduction when loading docs for context

---

## 🚀 Contributing to Documentation

### Adding New Documentation

**Create new user guide**:
```bash
# Create file
touch docs/user-guides/feature-name.md

# Update this index (add to "User Guides" section)
nano docs/INDEX.md

# Update CLAUDE.md to reference it
nano CLAUDE.md
```

**Create new architecture doc**:
```bash
# Create file
touch docs/architecture/feature-architecture.md

# Update this index
nano docs/INDEX.md
```

### Documentation Standards

**File naming**:
- Lowercase with hyphens: `y-scenarios.md` ✅
- NOT CamelCase: `YScenarios.md` ❌
- NOT underscores: `y_scenarios.md` ❌

**Structure**:
- Start with title and one-line description
- Include table of contents for files >5KB
- Use clear section headings (##, ###)
- Include code examples where appropriate
- Cross-reference related docs

**Markdown**:
- Use GitHub-flavored Markdown
- Code blocks with language tags: ```typescript
- Include line breaks between sections
- Use tables for structured data
- Use bullet lists for steps/features

---

## 📞 Getting Help

**Can't find what you're looking for?**

1. Search this INDEX.md for keywords
2. Check `user-guides/y-scenarios.md#troubleshooting`
3. Check `developer-guides/troubleshooting.md`
4. Check git history: `git log --all --grep="keyword"`
5. Ask in team chat or create GitHub issue

---

**Last Updated**: November 16, 2025
**Documentation Version**: 2.0 (restructured from monolithic CLAUDE.md)
