# RDY + Sentinel Complete Health Report
**Generated**: 2026-02-12 05:52 UTC
**Scope**: RDY App + Sentinel Infrastructure

---

## 🎯 EXECUTIVE SUMMARY

### Status: 🔴 CRITICAL - Multiple Systems Down

**RDY Application**:
- ❌ PM2 Status: ERRORED (15 failed restarts)
- ❌ Port Conflict: Cannot start (port 3000 already in use)
- ❌ Environment: Wrong configuration (localhost URLs instead of production)
- ❌ Authentication: Will fail even if app starts (wrong redirect URIs)

**Sentinel Dashboard**:
- ❌ PM2 Status: ERRORED (261+ failed restarts)
- ❌ Port Conflict: Cannot start (port 3002 already in use)

**Impact**:
- Users cannot access https://rdy.neonnidavellir.com (site may show cached/error page)
- No monitoring/testing of RDY possible via Sentinel
- Login functionality broken even if app starts

---

## 🔴 CRITICAL ISSUES

### Issue #1: Widespread Port Conflicts

| Port | Status | Current Occupant | Intended Use |
|------|--------|------------------|--------------|
| 3000 | ⚠️ IN USE | Unknown | RDY (default) |
| 3001 | ⚠️ IN USE | cloudcli (PID: 2434842) | RDY (configured) |
| 3002 | ⚠️ IN USE | Unknown | Sentinel Dashboard |

**Root Cause**: No port allocation strategy; multiple services competing for same ports

**Impact**: Both RDY and Sentinel Dashboard cannot start

---

### Issue #2: RDY App - Wrong Environment Configuration

**Problem**: `.env.local` configured for local development, but app runs in production

**Current (.env.local)**:
```bash
AUTH_URL=http://localhost:3001                    # ❌ WRONG
NEXTAUTH_URL=http://localhost:3001                # ❌ WRONG
DATABASE_URL=postgresql://...@localhost:5435/rdy  # ❌ WRONG PORT
```

**Should Be**:
```bash
AUTH_URL=https://rdy.neonnidavellir.com           # ✅ Production URL
NEXTAUTH_URL=https://rdy.neonnidavellir.com       # ✅ Production URL
DATABASE_URL=postgresql://...@localhost:5434/rdy  # ✅ Correct port
```

**Files in Conflict**:
- `.env.local`: Port 5435, localhost URLs (loaded first)
- `.env.production`: Port 5434, production URLs (correct)
- `ecosystem.config.js`: Port 5434, production URLs (correct)

**Result**: Next.js loads `.env.local` first, overriding production settings

---

### Issue #3: PM2 Process Failures

**RDY Process**:
```
Name: rdy
Status: errored
PID: 0
Restarts: 15
Error: listen EADDRINUSE: address already in use :::3000
```

**Sentinel Dashboard Process**:
```
Name: sentinel-dashboard
Status: errored (but shown as online)
PID: 912718
Restarts: 261+
Error: listen EADDRINUSE: address already in use :::3002
```

**Analysis**: Both processes restart infinitely, fail immediately, PM2 keeps trying

---

### Issue #4: Database Port Inconsistency

**Ports in Use**:
- PostgreSQL listening on: 5434 ✅
- PostgreSQL listening on: 5435 ✅

**Configuration Mismatch**:
- `.env.local`: Uses 5435
- `.env.production`: Uses 5434
- `ecosystem.config.js`: Uses 5434

**Risk**: App may connect to wrong database or fail to connect

---

## ✅ WORKING COMPONENTS

### External Services (Healthy)

| Service | URL | Status | Response |
|---------|-----|--------|----------|
| RDY Domain | https://rdy.neonnidavellir.com | ✅ HTTP 200 | Serving cached/error page |
| Keycloak | https://auth.neonnidavellir.com | ✅ HTTP 405 | Running correctly |
| Database (5434) | localhost:5434 | ✅ Listening | PostgreSQL ready |
| Database (5435) | localhost:5435 | ✅ Listening | PostgreSQL ready |

### PM2 Processes (Running)

| Process | Status | PID | Uptime | Memory |
|---------|--------|-----|--------|--------|
| cloudcli | ✅ online | 2434842 | 2 days | 326.2 MB |
| helio | ✅ online | 912741 | 0s (restarting) | 60.9 MB |

---

## 📊 SENTINEL INFRASTRUCTURE ANALYSIS

### What is Sentinel?

Sentinel is an **AI-powered autonomous testing platform** that:
- Monitors multiple projects (Cerebro, Helio, RDY)
- Runs automated E2E tests with Playwright
- Performs visual AI testing with Gemini
- Detects flaky tests automatically
- Provides self-healing test capabilities
- Dashboard: https://sentinel.neonnidavellir.com

### Sentinel Features for RDY

**Discovered for RDY**:
- 831 testable elements
- Ready for autonomous testing
- Needs test user credentials

**Capabilities**:
1. **Multi-Agent AI Analysis**: 6 AI agents analyze codebase
2. **Flakiness Detection**: Auto-quarantine flaky tests
3. **Visual Testing**: Screenshot-based UI validation (99% cheaper than Applitools)
4. **Self-Healing**: Adapts to UI changes automatically
5. **Dashboard**: Web UI for test management

### Current Sentinel Status

**Dashboard**: ❌ ERRORED (port 3002 conflict)
**CLI**: ✅ Available (can run tests via command line)
**Database**: ✅ Healthy (SQLite at `/home/stefan/infrastructure/sentinel/dashboard/sentinel.db`)

**Projects Monitored**:
1. **Cerebro** - 180 components, 35 pages, 244 elements
2. **Helio** - Configured
3. **RDY** - 831 elements discovered, tests pending

---

## 🔧 ROOT CAUSE ANALYSIS

### Why This Happened

1. **Environment File Priority**:
   - Next.js loads `.env.local` BEFORE `.env.production`
   - `.env.local` was set for local development
   - Production environment overridden by local config

2. **Port Management**:
   - No centralized port allocation
   - PM2 ecosystem.config.js says port 3001
   - But RDY defaults to 3000 (Next.js default)
   - cloudcli already using 3001
   - Something else using 3000 and 3002

3. **Database Confusion**:
   - Two PostgreSQL instances running (5434 and 5435)
   - Different config files use different ports
   - Unclear which is production

4. **PM2 Restart Loop**:
   - Processes fail due to port conflicts
   - PM2 automatically restarts
   - Fail again immediately
   - Infinite loop of failures

---

## 🛠️ RECOMMENDED SOLUTION

### Quick Fix (30 minutes)

**Step 1**: Stop port conflicts
```bash
# Free up port 3001 for RDY
pm2 stop cloudcli

# Or use alternate port for RDY (3003)
# Update ecosystem.config.js
```

**Step 2**: Fix environment variables
```bash
cd /home/stefan/projects/rdy

# Backup current config
cp .env.local .env.local.backup

# Use production config
cp .env.production .env.local

# Verify database port is 5434
grep DATABASE_URL .env.local
```

**Step 3**: Rebuild and restart
```bash
# Clear build cache
rm -rf .next

# Rebuild with production settings
NODE_ENV=production npm run build

# Restart with PM2
pm2 delete rdy
pm2 start ecosystem.config.js
pm2 save
```

**Step 4**: Verify
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs rdy --lines 30

# Test locally
curl http://localhost:3001

# Test production
curl https://rdy.neonnidavellir.com
```

---

## 🚀 AUTOMATED FIX SCRIPT

**Location**: `/home/stefan/projects/rdy/scripts/fix-rdy-now.sh`

**What it does**:
1. Prompts to stop cloudcli or use port 3002
2. Updates .env.local with production URLs
3. Fixes database port to 5434
4. Clears build cache
5. Rebuilds app
6. Restarts PM2 process
7. Runs health checks

**Usage**:
```bash
cd /home/stefan/projects/rdy
./scripts/fix-rdy-now.sh
```

---

## 🧪 TESTING CHECKLIST

### After Fix Applied

**Infrastructure**:
- [ ] PM2 shows RDY status as **online** (not errored)
- [ ] RDY process has stable PID (not 0)
- [ ] No restarts in PM2 (stable uptime)
- [ ] Port 3001 (or 3002) shows RDY process in `netstat`

**Application**:
- [ ] `curl http://localhost:3001` returns HTML (not error)
- [ ] `curl https://rdy.neonnidavellir.com` returns HTTP 200
- [ ] Page source shows Next.js app (not Caddy error page)
- [ ] No JavaScript errors in browser console

**Authentication**:
- [ ] Click "Sign In" redirects to Keycloak
- [ ] Keycloak URL is https://auth.neonnidavellir.com/realms/rdy
- [ ] After login, redirects back to https://rdy.neonnidavellir.com
- [ ] Dashboard loads successfully
- [ ] User session persists

**Database**:
- [ ] App connects to PostgreSQL on port 5434
- [ ] No connection errors in logs
- [ ] Database queries work (check user table)

---

## 🎯 SENTINEL INTEGRATION PLAN

### Once RDY is Running

**Step 1**: Add RDY Project to Sentinel
```bash
cd /home/stefan/infrastructure/sentinel
npx tsx cli/sentinel.ts projects add rdy \
  --path /home/stefan/projects/rdy \
  --url https://rdy.neonnidavellir.com \
  --framework nextjs
```

**Step 2**: Add Test Credentials
```bash
# Via Dashboard (once Sentinel Dashboard is fixed)
https://sentinel.neonnidavellir.com/dashboard

# Or via CLI
npx tsx cli/sentinel.ts credentials add rdy \
  --name testmentee \
  --username testmentee \
  --password Mentee1234! \
  --keycloak https://auth.neonnidavellir.com/realms/rdy
```

**Step 3**: Run First Test
```bash
npx tsx cli/sentinel.ts test rdy \
  --url https://rdy.neonnidavellir.com \
  --username testmentee \
  --password Mentee1234! \
  --keycloak https://auth.neonnidavellir.com/realms/rdy
```

**Step 4**: Enable Continuous Monitoring
- Sentinel will run tests automatically
- Detects flaky tests
- Screenshots for debugging
- Element health tracking
- Self-healing selectors

---

## 📁 IMPORTANT FILES

### RDY Configuration
```
/home/stefan/projects/rdy/
├── .env.local (❌ WRONG - needs fix)
├── .env.production (✅ CORRECT)
├── ecosystem.config.js (✅ CORRECT)
├── drizzle.config.ts (database config)
├── src/auth.ts (NextAuth configuration)
└── middleware.ts (route protection)
```

### Sentinel Infrastructure
```
/home/stefan/infrastructure/sentinel/
├── cli/sentinel.ts (test runner CLI)
├── dashboard/ (Next.js dashboard - currently errored)
│   ├── sentinel.db (SQLite database)
│   └── app/ (dashboard pages)
├── lib/ (testing libraries)
│   ├── agents/ (AI testing agents)
│   ├── browser/ (Playwright wrapper)
│   ├── learning/ (flakiness detection, self-healing)
│   └── visual/ (visual AI testing)
├── projects/rdy/ (RDY configuration - to be created)
└── results/ (test results and screenshots)
```

### PM2 Logs
```
~/.pm2/logs/
├── rdy-out.log (stdout - application logs)
├── rdy-error.log (stderr - error logs)
├── sentinel-dashboard-out.log
└── sentinel-dashboard-error.log
```

---

## 🔮 PREVENTION MEASURES

### Environment Management
1. **Use .env.production.local** for production overrides (higher priority than .env.local)
2. **Remove .env.local** completely in production
3. **Use PM2 env** exclusively (don't rely on .env files)
4. **Add .env validation** at app startup

### Port Allocation
1. **Document port usage**:
   - 3000: Reserved
   - 3001: RDY production
   - 3002: Sentinel Dashboard
   - 3003: Available
2. **Add port conflict check** before PM2 start
3. **Use environment variable** for port (already done: PORT=3001)

### Database Management
1. **Consolidate to single PostgreSQL instance** (port 5434)
2. **Stop unused instance** on port 5435
3. **Document which port is production**

### Monitoring
1. **Sentinel health checks** for RDY
2. **PM2 monitoring** with alerts
3. **Uptime tracking** via Sentinel Dashboard

---

## 📞 QUICK REFERENCE

### Start/Stop Services

```bash
# RDY
pm2 restart rdy
pm2 stop rdy
pm2 logs rdy

# Sentinel Dashboard
pm2 restart sentinel-dashboard
pm2 stop sentinel-dashboard
pm2 logs sentinel-dashboard

# All services
pm2 restart all
pm2 stop all
pm2 status
```

### Check Ports

```bash
# See what's using ports
netstat -tlnp | grep -E ":(3000|3001|3002|5434|5435)"

# Kill process on specific port
lsof -ti:3001 | xargs kill -9
```

### Database

```bash
# Connect to RDY database (production)
psql -h localhost -p 5434 -U rdy -d rdy

# Check tables
psql -h localhost -p 5434 -U rdy -d rdy -c "\dt"
```

### Test Connectivity

```bash
# Local
curl -I http://localhost:3001

# Production
curl -I https://rdy.neonnidavellir.com

# Keycloak
curl -I https://auth.neonnidavellir.com/realms/rdy
```

---

## 🎓 NEXT STEPS

### Immediate (Required)
1. Run `/home/stefan/projects/rdy/scripts/fix-rdy-now.sh`
2. Verify RDY is online and accessible
3. Test login flow end-to-end
4. Check PM2 logs for any errors

### Short Term (1-2 days)
1. Fix Sentinel Dashboard port conflict
2. Add RDY to Sentinel monitoring
3. Set up test credentials
4. Run first Sentinel test on RDY

### Long Term (1 week)
1. Consolidate database instances (remove port 5435)
2. Set up automated health checks
3. Enable continuous testing via Sentinel
4. Document production architecture
5. Create runbook for common issues

---

## 📋 SUMMARY

**What's Wrong**:
- RDY app can't start (port conflict)
- Environment configured for local dev (should be production)
- Database port mismatch
- Sentinel Dashboard also has port conflict

**What's Working**:
- External services (domain, Keycloak, database)
- Sentinel CLI (can run tests)
- PM2 infrastructure

**How to Fix**:
1. Stop cloudcli to free port 3001
2. Update .env.local with production URLs
3. Fix database port to 5434
4. Rebuild and restart with PM2
5. Verify with health checks

**After Fix**:
- RDY will be accessible at https://rdy.neonnidavellir.com
- Login will work correctly via Keycloak
- Sentinel can monitor and test RDY
- All services running stably

---

**Generated by**: Claude Code Health Check System
**Documentation**: See `HEALTH_CHECK_REPORT.md` and `FIX_LOGIN_ISSUE.md`
**Automated Fix**: Run `./scripts/fix-rdy-now.sh`
