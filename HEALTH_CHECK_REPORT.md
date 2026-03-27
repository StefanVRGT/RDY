# RDY App Health Check Report
**Generated**: 2026-02-12 05:52 UTC
**Domain**: https://rdy.neonnidavellir.com

---

## 🔴 CRITICAL ISSUES FOUND

### Issue #1: PM2 Process is ERRORED
**Status**: ❌ CRITICAL
**Details**:
- PM2 shows `rdy` process with status: **errored**
- Process has restarted **15 times** and failed each time
- Current PID: 0 (process not running)

**Error Message**:
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Root Cause**: Next.js is trying to start on default port 3000, but something else is already using it.

---

### Issue #2: Port 3001 Already in Use
**Status**: ❌ CRITICAL
**Details**:
- Port 3001 is occupied by: `cloudcli` (Claude Code UI)
- PID: 2434842
- Command: `/home/stefan/.npm-global/bin/claude-code-ui`

**Impact**: Even if we configure PORT=3001, it's already taken.

---

### Issue #3: Wrong Environment Variables in .env.local
**Status**: ❌ CRITICAL
**Details**:

`.env.local` has:
```bash
AUTH_URL=http://localhost:3001        # ❌ WRONG for production
NEXTAUTH_URL=http://localhost:3001    # ❌ WRONG for production
DATABASE_URL=postgresql://rdy:rdy_dev_password@localhost:5435/rdy  # ❌ WRONG port
```

Should be:
```bash
AUTH_URL=https://rdy.neonnidavellir.com      # ✅ Production URL
NEXTAUTH_URL=https://rdy.neonnidavellir.com   # ✅ Production URL
DATABASE_URL=postgresql://rdy:rdy_dev_password@localhost:5434/rdy  # ✅ Correct port
```

**Impact**: Even if the app starts, authentication will fail because Keycloak redirects won't match.

---

### Issue #4: Database Port Mismatch
**Status**: ⚠️ HIGH
**Details**:
- `.env.local`: Uses port **5435**
- `.env.production`: Uses port **5434**
- `ecosystem.config.js`: Uses port **5434**
- Both ports are listening, but inconsistent configuration

**Impact**: May connect to wrong database or fail to connect.

---

## ✅ WORKING Components

### 1. Domain is Accessible
```bash
$ curl -I https://rdy.neonnidavellir.com
HTTP/2 200
server: Caddy
```
✅ Domain responds (but serving old cached content or error page)

### 2. Keycloak is Running
```bash
$ curl -I https://auth.neonnidavellir.com/realms/rdy
HTTP/2 405
```
✅ Keycloak realm is accessible (405 is expected for HEAD request)

### 3. Database is Running
- PostgreSQL listening on port **5434** ✅
- PostgreSQL listening on port **5435** ✅

### 4. Sentinel Infrastructure
- Found at: `/home/stefan/infrastructure/sentinel`
- Contains comprehensive test suite and documentation

---

## 📊 Current State

### PM2 Status
| Process | Status | PID | Restarts | Memory |
|---------|--------|-----|----------|--------|
| rdy | ❌ errored | 0 | 15 | 0b |
| cloudcli | ✅ online | 2434842 | 3 | 326.2mb |
| sentinel-dashboard | ✅ online | 912718 | 261+ | 61.0mb |
| helio | ✅ online | 912741 | 602+ | 60.9mb |

### Network Ports
| Port | Status | Process |
|------|--------|---------|
| 3000 | ⚠️ IN USE | Unknown (causing RDY to fail) |
| 3001 | ⚠️ IN USE | cloudcli (blocking RDY) |
| 5434 | ✅ LISTENING | PostgreSQL (correct) |
| 5435 | ✅ LISTENING | PostgreSQL (legacy?) |

---

## 🔧 RECOMMENDED FIXES

### Fix #1: Stop Port Conflicts
**Priority**: CRITICAL
**Action**:
```bash
# Option A: Stop cloudcli to free port 3001
pm2 stop cloudcli

# Option B: Change RDY to use different port (e.g., 3002)
# Update ecosystem.config.js to use PORT=3002
```

### Fix #2: Update Environment Variables
**Priority**: CRITICAL
**Action**:
```bash
cd /home/stefan/projects/rdy

# Update .env.local for production
cat > .env.local << 'EOF'
# Database (use port 5434)
DATABASE_URL=postgresql://rdy:rdy_dev_password@localhost:5434/rdy

# Keycloak
KEYCLOAK_URL="https://auth.neonnidavellir.com"
KEYCLOAK_REALM=rdy
KEYCLOAK_CLIENT_ID=rdy-app
KEYCLOAK_CLIENT_SECRET=54e7d731ba5f10a9937184d326ffc23f

# NextAuth - PRODUCTION URLS
NEXTAUTH_URL=https://rdy.neonnidavellir.com
NEXTAUTH_SECRET=PnUG3qtOU9aBvsV44/4D6ak1+svCXc9NG7T6/sUMfV4=

# NextAuth v5 - PRODUCTION URLS
AUTH_KEYCLOAK_ID=rdy-app
AUTH_KEYCLOAK_SECRET=54e7d731ba5f10a9937184d326ffc23f
AUTH_KEYCLOAK_ISSUER=https://auth.neonnidavellir.com/realms/rdy
AUTH_URL=https://rdy.neonnidavellir.com
AUTH_SECRET=lfC+HePQ4cjKWu6nf2aOU/j6NdNcnPgi8Nir4lSSKAk=

# Port
PORT=3001
EOF
```

### Fix #3: Rebuild and Restart
**Priority**: CRITICAL
**Action**:
```bash
# Clear build cache
rm -rf .next

# Rebuild with production settings
npm run build

# Stop cloudcli first
pm2 stop cloudcli

# Restart RDY
pm2 restart rdy

# Check logs
pm2 logs rdy --lines 50
```

---

## 🧪 TESTING CHECKLIST

After applying fixes:

- [ ] PM2 shows RDY status as **online** (not errored)
- [ ] Port 3001 shows RDY process (not cloudcli)
- [ ] Can access https://rdy.neonnidavellir.com
- [ ] Login redirects to Keycloak correctly
- [ ] After login, redirects back to RDY dashboard
- [ ] No authentication errors in browser console

---

## 📁 Sentinel Infrastructure Status

**Location**: `/home/stefan/infrastructure/sentinel`

**Key Components Found**:
- ✅ Sentinel dashboard (online on PM2)
- ✅ Comprehensive test suites (Playwright, E2E)
- ✅ Authentication testing scripts
- ✅ Monitoring and logging systems
- ✅ Documentation and guides

**Sentinel Features**:
- Multi-project monitoring dashboard
- Automated testing infrastructure
- Visual AI testing capabilities
- Session management
- Credential storage system

---

## 🎯 NEXT STEPS

### Immediate (Required):
1. **Stop port conflict**: Stop cloudcli OR change RDY port
2. **Fix environment variables**: Update .env.local with production URLs
3. **Rebuild and restart**: Clear cache, rebuild, restart PM2
4. **Verify login**: Test complete authentication flow

### Short Term (Recommended):
1. **Database consolidation**: Decide if both port 5434 and 5435 are needed
2. **Keycloak redirect URIs**: Verify they include production domain
3. **Monitoring setup**: Ensure Sentinel is tracking RDY health
4. **Documentation update**: Update deployment docs with lessons learned

### Long Term (Nice to Have):
1. **Automated health checks**: Script to verify all services
2. **Port management**: Document which ports are used by what
3. **Environment validation**: Script to check .env files match deployment
4. **Backup strategy**: Regular database and config backups

---

## 🔍 ROOT CAUSE ANALYSIS

**Why did this happen?**

1. **Development vs Production confusion**: `.env.local` was set for local development but app is running in production mode
2. **Port management**: No clear port allocation strategy; cloudcli took 3001 which RDY expected
3. **PM2 configuration**: `ecosystem.config.js` has correct settings but `.env.local` overrides them
4. **Environment loading priority**: Next.js loads `.env.local` BEFORE `.env.production`, causing wrong config to be used

**Prevention**:
- Use `.env.production.local` for production overrides (higher priority)
- OR remove `.env.local` completely in production
- OR use PM2's env config exclusively (don't rely on .env files)
- Document port allocation clearly

---

## 📞 SUPPORT RESOURCES

### Quick Fix Script
See: `/home/stefan/projects/rdy/scripts/fix-production-login.sh` (if exists)

### Documentation
- `FIX_LOGIN_ISSUE.md` - Comprehensive login troubleshooting
- `PHASE1_IMPLEMENTATION_SUMMARY.md` - Implementation status
- `KEYCLOAK_REDIRECT_URIS.md` - Keycloak configuration
- `/home/stefan/infrastructure/sentinel/README.md` - Sentinel docs

### Testing
- Sentinel Dashboard: Check PM2 process `sentinel-dashboard`
- E2E tests: `/home/stefan/infrastructure/sentinel/e2e-tests/`
- Auth tests: `/home/stefan/infrastructure/sentinel/test-auth-and-errors.ts`

---

**Report End**
Generated by Claude Code Health Check System
