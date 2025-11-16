# KitTrix Express - Production Reference

**KitTrix Express** - Production scheduling system with Y Scenario forecasting

**Last Updated**: November 16, 2025 | **Documentation Version**: 2.0

---

## 📚 Documentation Hub

**All detailed documentation lives in `/docs`** - This file is a quick reference index only.

### Start Here
- **Documentation Catalog**: `/docs/INDEX.md` - Complete documentation map
- **New Developer Onboarding**: Start with `/docs/user-guides/y-scenarios.md`

### Quick Navigation by Category

**🏗️ Architecture** (`/docs/architecture/`)
- **Y/Ŷ Statistical Framework**: `y-yhat-framework.md` - Production (Y) vs Scenarios (Ŷ), residual analysis, statistical model

**📘 User Guides** (`/docs/user-guides/`)
- **Y Scenario Planning**: `y-scenarios.md` - Complete user & developer guide for scenario forecasting

**🔧 Developer Guides** (`/docs/developer-guides/`)
- **Deployment**: `deployment.md` - Production deployment, Docker, SSL, database migrations
- **Troubleshooting**: `troubleshooting.md` - Common issues and emergency procedures

**📋 Project Management** (`/docs/project-management/`)
- **Changelog**: `CHANGELOG.md` - Version history and feature releases
- **Technical Debt**: `technical-debt.md` - Known limitations and future work

---

## 🚀 Production Environment (Current State)

### Live URLs
- **Production**: https://kits.digiglue.io
- **Health Check**: https://kits.digiglue.io/api/health
- **SSL**: Let's Encrypt (expires Dec 28, 2025)

### Server Details
- **Host**: DigitalOcean Droplet
- **IP**: 137.184.182.28
- **SSH**: `ssh sean@137.184.182.28`
- **Path**: `/home/sean/KitTrix-Express`
- **Database**: PostgreSQL (motioPGDB) at 172.17.0.1:5432
- **Container**: Docker with 256MB memory limit

### Architecture
- **Backend**: Express.js (Node 18 Alpine)
- **Frontend**: Vite + React
- **Database**: PostgreSQL (shared ERP database)
- **Reverse Proxy**: nginx-proxy with automatic HTTPS

### Repository
- **GitHub**: https://github.com/seanarneyWI/KitTrix-Express
- **Branch**: main

---

## ⚡ Quick Deploy

```bash
# LOCAL: Commit and push
git add . && git commit -m "..." && git push

# SERVER: Deploy
ssh sean@137.184.182.28 "cd ~/KitTrix-Express && git pull && docker-compose up -d --build"
```

**Browser Cache**: Users must hard-refresh after deployment (Cmd+Shift+R / Ctrl+Shift+R)

**Detailed deployment instructions**: `/docs/developer-guides/deployment.md`

---

## 💻 Development Environment

### SSH Tunnel (Required for Local Dev)
```bash
ssh -f -N -L 5433:172.17.0.1:5432 sean@137.184.182.28 \
  -o ServerAliveInterval=60 -o ServerAliveCountMax=3
```

### Start Dev Server
```bash
npm run dev  # Backend: 3001, Frontend: 5173
```

### Symptom if Tunnel Dies
- Backend errors
- Jobs don't load
- Only 1 job visible

**Fix**: Restart tunnel, then restart `npm run dev`

**Full development setup**: `/docs/developer-guides/deployment.md#development-environment`

---

## 🆘 Emergency Troubleshooting

### Container Won't Start
```bash
ssh sean@137.184.182.28 "docker logs kittrix-app --tail 50"
```

### Out of Memory
```bash
ssh sean@137.184.182.28 "free -h"
ssh sean@137.184.182.28 "docker stats kittrix-app"
```

### Out of Disk Space
```bash
ssh sean@137.184.182.28 "df -h"
ssh sean@137.184.182.28 "docker system prune -a -f --volumes"
```

### View Logs (Live)
```bash
ssh sean@137.184.182.28 "docker logs kittrix-app -f"
```

**Complete troubleshooting guide**: `/docs/developer-guides/troubleshooting.md`

---

## 🔐 Critical Reminders

### Server Infrastructure Safety
- ⚠️ **DO NOT modify** existing motiostack containers (Node-RED, Grafana, pgAdmin)
- ⚠️ **ALWAYS check** memory usage before deploying: `free -h`
- ⚠️ **Server has limited RAM** (1.9GB total) - keep deployments lean
- ⚠️ **VERIFY** all existing services still working after deployment

### Database Safety
- ⚠️ **Shared ERP Database** - Other applications use this database
- ⚠️ **DO NOT** run destructive migrations without:
  1. Database backup
  2. Team approval
  3. Testing on staging first
- ✅ **ALWAYS** use additive migrations when possible

**Database Connection**:
```
postgresql://motioadmin:M0t10n4lys1s@172.17.0.1:5432/motioPGDB
```

---

## 🏗️ System Architecture Overview

### Core Concept: Y/Ŷ Statistical Framework

KitTrix Express uses a **regression/forecasting model**:

- **Y (Production)** = Reality / Ground truth / Actual outcomes
- **Ŷ (Scenarios)** = Predictions / Forecasts / What might happen
- **Y - Ŷ** = Residuals / Prediction errors (for future analysis)

**Why "Y" terminology?**: "What-**Y-f**" → "What-if" → **Y** Scenarios

This framework treats scheduling as a **forecasting problem** where:
- Multiple scenarios = Multiple prediction models to evaluate
- As data accumulates, predictions improve (data-driven continuous improvement)
- Future: Compare predictions (Ŷ) to actuals (Y) for statistical analysis

**Complete framework documentation**: `/docs/architecture/y-yhat-framework.md`

---

## 📊 Key Features

### Y Scenario Planning
- Create multiple "what-if" predictions (Ŷ) to test schedule alternatives
- View purple ghost overlays to compare scenarios side-by-side
- Inject delays (maintenance, meetings) to model disruptions
- Commit preferred scenario to production (Ŷ → Y)

**User guide**: `/docs/user-guides/y-scenarios.md`

### Multi-Station Execution
- Multiple workers execute same job simultaneously from different tablets
- Atomic station assignment (1, 2, 3, etc.)
- Independent kit tracking per station
- Real-time sync across stations

### Shift Management
- Toggle shifts active/inactive
- Configure shift times, breaks, colors
- Y scenarios can test ANY shifts (ignores global isActive)

---

## 📖 Documentation Quick Reference

### By Task

| I want to... | Read this |
|--------------|-----------|
| **Understand the system philosophy** | `/docs/architecture/y-yhat-framework.md` |
| **Learn to use Y scenarios** | `/docs/user-guides/y-scenarios.md` |
| **Deploy to production** | `/docs/developer-guides/deployment.md` |
| **Fix a broken deployment** | `/docs/developer-guides/troubleshooting.md` |
| **See what changed recently** | `/docs/project-management/CHANGELOG.md` |
| **Know system limitations** | `/docs/project-management/technical-debt.md` |
| **Find all documentation** | `/docs/INDEX.md` |

### By Role

| Role | Start Here | Then Read |
|------|------------|-----------|
| **Production Scheduler** | `/docs/user-guides/y-scenarios.md` | - |
| **Backend Developer** | `/docs/architecture/y-yhat-framework.md` | `/docs/user-guides/y-scenarios.md#technical-architecture` |
| **Frontend Developer** | `/docs/user-guides/y-scenarios.md#visual-design` | `/docs/user-guides/y-scenarios.md#technical-architecture` |
| **DevOps Engineer** | `/docs/developer-guides/deployment.md` | `/docs/developer-guides/troubleshooting.md` |
| **Product Manager** | `/docs/architecture/y-yhat-framework.md` | `/docs/project-management/` |

---

## 📜 Recent Changes

**November 16, 2025** - Documentation restructure
- Reorganized into `/docs` folder structure
- Created comprehensive INDEX.md catalog
- Split deployment and troubleshooting into focused guides
- **Token savings**: 74% reduction (2,677 lines → ~250 lines for context)

**November 13, 2025** - Y Scenario shift independence
- Y scenarios now ignore global shift activation (can test any shifts)
- Production jobs still respect isActive (safe defaults)
- localStorage persistence for Y scenario visibility

**November 8, 2025** - Y Scenario critical bug fixes
- Fixed filter reset on drag operations
- Y scenario properties preserved during drag
- Monthly view Y overlays now render correctly

**November 6, 2025** - Y Scenario UX improvements
- Enhanced ghost styling (4px purple border, glow, 40% opacity)
- ⏰ button on Y overlay jobs for direct delay access
- Unified Delay Manager with scenario switching

**Full changelog**: `/docs/project-management/CHANGELOG.md`

---

## 🔧 Performance Metrics (Current)

- **Container Memory**: 73MB / 256MB (29% usage)
- **Server Total Memory**: 1.9GB
- **Server Memory Usage**: ~722MB (38%) after cleanup
- **Process Count**: 12 PIDs in container

---

## 📞 Getting Help

### Troubleshooting Workflow
1. Check `/docs/developer-guides/troubleshooting.md` for common issues
2. Check Docker logs: `ssh sean@137.184.182.28 "docker logs kittrix-app --tail 100"`
3. Check system resources: `free -h`, `df -h`
4. Check git history: `git log --oneline -20`
5. If Y Scenario issue: `/docs/user-guides/y-scenarios.md#troubleshooting`

### Documentation Search
1. Start with `/docs/INDEX.md` for catalog
2. Search keyword in relevant doc (Cmd+F / Ctrl+F)
3. Check cross-references at bottom of each doc

### Still Stuck?
- Create GitHub issue: https://github.com/seanarneyWI/KitTrix-Express/issues
- Ask in team chat
- Review git commits: `git log --all --grep="keyword"`

---

## 🚦 Status Indicators

### System Health
- ✅ **Production**: https://kits.digiglue.io (Up)
- ✅ **SSL**: Valid until Dec 28, 2025
- ✅ **Database**: Shared ERP database (stable)
- ✅ **Memory**: 29% container usage (healthy)
- ✅ **Disk**: ~60% usage (healthy)

### Documentation Status
- ✅ **Architecture**: Complete
- ✅ **User Guides**: Y Scenarios complete
- ✅ **Developer Guides**: Deployment & troubleshooting complete
- ⏳ **API Reference**: Planned (not yet created)
- ⏳ **Database Schema Guide**: Planned (not yet created)

---

## 📐 Project Structure

```
/
├── CLAUDE.md (this file)          # Minimal production reference
├── README.md                       # Project README (GitHub)
├── docs/                           # Complete documentation
│   ├── INDEX.md                   # Documentation catalog
│   ├── architecture/              # System design
│   ├── user-guides/               # Feature docs
│   ├── developer-guides/          # Deployment & troubleshooting
│   └── project-management/        # Changelog & technical debt
├── src/                            # Frontend source code
├── server/                         # Backend source code
├── prisma/                         # Database schema & migrations
├── docker-compose.yml              # Docker configuration
└── package.json                    # Node.js dependencies
```

---

## 🎯 Key Principles for Future Development

### Statistical Framework
- Always think: **Y (reality) vs Ŷ (prediction)**
- Future: Track residuals (Y - Ŷ) for continuous improvement
- System should get smarter over time as data accumulates

### Documentation
- **Keep CLAUDE.md minimal** - Link to `/docs` for details
- **Update `/docs/INDEX.md`** when adding new docs
- **Cross-reference** related docs at bottom of each file
- **Use consistent structure** across all documentation

### Deployment
- **Test locally first** (SSH tunnel required)
- **Check resources** before deploying (`free -h`, `df -h`)
- **Browser cache** requires hard-refresh after deployment
- **Monitor logs** immediately after deployment

### Database
- **Backup first** before migrations
- **Prefer additive** migrations (CREATE, ADD COLUMN)
- **Test on local** before production
- **Shared database** - coordinate with team

---

**For comprehensive documentation, see `/docs/INDEX.md`**

---

**Last Updated**: November 16, 2025
**Documentation Version**: 2.0 (Restructured for efficiency)
**System Version**: 1.6 (Y Scenario Shift Independence)
