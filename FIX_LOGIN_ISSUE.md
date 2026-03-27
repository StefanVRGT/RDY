# Fix Login Issue on rdy.neonnidavellir.com

## Problem Identified ❌

Your `.env.local` file has:
```bash
AUTH_URL=http://localhost:3001  # ← Wrong for production!
NEXTAUTH_URL=http://localhost:3001  # ← Wrong for production!
```

This causes the OAuth callback to fail because Keycloak is trying to redirect to `localhost` instead of `rdy.neonnidavellir.com`.

---

## Solution 1: Use Production Environment Variables (Recommended)

### Option A: Use .env.production file

When deploying to production, ensure your application uses the `.env.production` file which has the correct URLs:

```bash
# Build with production env
NODE_ENV=production npm run build

# Run with production env
NODE_ENV=production npm start
```

### Option B: Update .env.local for production

If you're running from the server directly, update `.env.local`:

```bash
# Update these lines in .env.local
AUTH_URL=https://rdy.neonnidavellir.com
NEXTAUTH_URL=https://rdy.neonnidavellir.com
```

---

## Solution 2: Check Keycloak Configuration

### 1. Verify Valid Redirect URIs in Keycloak

1. Go to Keycloak Admin: `https://auth.neonnidavellir.com/admin`
2. Login with admin credentials
3. Select realm: **rdy**
4. Go to: **Clients** → **rdy-app**
5. Under **Access settings**, check:

**Valid redirect URIs** should include:
```
https://rdy.neonnidavellir.com/*
https://rdy.neonnidavellir.com/api/auth/callback/keycloak
http://localhost:3001/*  (for local development)
```

**Valid post logout redirect URIs**:
```
https://rdy.neonnidavellir.com/*
http://localhost:3001/*
```

**Web origins**:
```
https://rdy.neonnidavellir.com
http://localhost:3001
```

### 2. Check Client Settings

Ensure these are enabled:
- ✅ **Client authentication**: ON
- ✅ **Standard flow**: ENABLED (for OAuth)
- ✅ **Direct access grants**: ENABLED

---

## Solution 3: Quick Fix Script

Run this script to update your environment for production:

```bash
#!/bin/bash

# Update .env.local for production
cat > .env.local << 'EOF'
# Keycloak Configuration for RDY - PRODUCTION
# Updated: $(date)

# Database
DATABASE_URL=postgresql://rdy:rdy_dev_password@localhost:5435/rdy

# Keycloak Settings
KEYCLOAK_URL="https://auth.neonnidavellir.com"
KEYCLOAK_REALM=rdy
KEYCLOAK_CLIENT_ID=rdy-app
KEYCLOAK_CLIENT_SECRET=54e7d731ba5f10a9937184d326ffc23f

# NextAuth Configuration - PRODUCTION
NEXTAUTH_URL=https://rdy.neonnidavellir.com
NEXTAUTH_SECRET=PnUG3qtOU9aBvsV44/4D6ak1+svCXc9NG7T6/sUMfV4=

# NextAuth v5 format - PRODUCTION
AUTH_KEYCLOAK_ID=rdy-app
AUTH_KEYCLOAK_SECRET=54e7d731ba5f10a9937184d326ffc23f
AUTH_KEYCLOAK_ISSUER=https://auth.neonnidavellir.com/realms/rdy
AUTH_URL=https://rdy.neonnidavellir.com
AUTH_SECRET=lfC+HePQ4cjKWu6nf2aOU/j6NdNcnPgi8Nir4lSSKAk=

# Application Port
PORT=3001
EOF

echo "✅ Updated .env.local for production"
echo "🔄 Now restart your application:"
echo "   pm2 restart rdy"
echo "   # or"
echo "   npm run build && npm start"
```

---

## Solution 4: Check Application Logs

Look for these specific errors:

```bash
# Check PM2 logs
pm2 logs rdy

# Or check Next.js logs
tail -f .next/server.log

# Look for:
# - "invalid_redirect_uri"
# - "redirect_uri mismatch"
# - "ECONNREFUSED"
# - Any Keycloak-related errors
```

---

## Solution 5: Clear Session Storage

The stuck login might be due to cached session data:

### On the Server:
```bash
# If using file-based sessions
rm -rf /tmp/next-auth-*

# Restart the app
pm2 restart rdy
```

### In Browser:
1. Open DevTools (F12)
2. Go to **Application** → **Storage**
3. Clear:
   - ✅ Cookies (especially for rdy.neonnidavellir.com)
   - ✅ Local Storage
   - ✅ Session Storage
   - ✅ IndexedDB
4. Close all browser tabs for the site
5. Try again in new incognito window

---

## Debugging Steps

### Step 1: Check Current Environment

```bash
# SSH to your server
ssh your-server

# Check which env vars are loaded
cd /path/to/rdy
cat .env.local | grep AUTH_URL
cat .env.local | grep NEXTAUTH_URL

# Should show:
# AUTH_URL=https://rdy.neonnidavellir.com
# NEXTAUTH_URL=https://rdy.neonnidavellir.com
```

### Step 2: Test Keycloak Connection

```bash
# Test if Keycloak is accessible
curl -I https://auth.neonnidavellir.com/realms/rdy

# Should return: HTTP/2 200
```

### Step 3: Check Redirect Flow

1. Open browser DevTools → **Network** tab
2. Try to login
3. Look for redirect chains:
   ```
   rdy.neonnidavellir.com/auth/signin
   → auth.neonnidavellir.com/realms/rdy/protocol/openid-connect/auth
   → (after login) auth.neonnidavellir.com/realms/rdy/protocol/openid-connect/auth?session_code=...
   → rdy.neonnidavellir.com/api/auth/callback/keycloak
   → rdy.neonnidavellir.com/dashboard (or appropriate page)
   ```

4. If it fails at callback, the redirect URI is wrong

### Step 4: Check for CORS Issues

```bash
# Check if CORS headers are set correctly
curl -I https://rdy.neonnidavellir.com/api/auth/callback/keycloak

# Should include:
# Access-Control-Allow-Origin: https://auth.neonnidavellir.com
```

---

## Common Errors & Solutions

### Error: "redirect_uri_mismatch"
**Solution**: Update Keycloak valid redirect URIs (see Solution 2)

### Error: "invalid_client"
**Solution**: Check client secret matches in both .env and Keycloak

### Error: "Session required"
**Solution**: Clear all browser storage and try again

### Error: Infinite redirect loop
**Solution**:
1. Check AUTH_URL matches your actual domain
2. Ensure HTTPS is used in production
3. Clear browser cookies

### Stuck on white page after login
**Solution**:
1. Check browser console for JavaScript errors
2. Verify middleware.ts is not blocking the route
3. Check if user has valid roles assigned in Keycloak

---

## Quick Fix Command

Create and run this script:

```bash
cat > fix-production-login.sh << 'SCRIPT'
#!/bin/bash

echo "🔧 Fixing production login issue..."

# Update .env.local
sed -i 's|AUTH_URL=http://localhost:3001|AUTH_URL=https://rdy.neonnidavellir.com|g' .env.local
sed -i 's|NEXTAUTH_URL=http://localhost:3001|NEXTAUTH_URL=https://rdy.neonnidavellir.com|g' .env.local

echo "✅ Updated environment variables"

# Clear Next.js cache
rm -rf .next

echo "✅ Cleared Next.js cache"

# Rebuild
npm run build

echo "✅ Rebuilt application"

# Restart (choose one based on your setup)
if command -v pm2 &> /dev/null; then
    pm2 restart rdy
    echo "✅ Restarted PM2 process"
else
    echo "⚠️  Please restart your application manually"
fi

echo ""
echo "🎉 Fix complete! Try logging in now."
echo ""
echo "If still stuck, check Keycloak redirect URIs:"
echo "1. Go to: https://auth.neonnidavellir.com/admin"
echo "2. Clients → rdy-app → Valid redirect URIs"
echo "3. Add: https://rdy.neonnidavellir.com/*"
SCRIPT

chmod +x fix-production-login.sh
./fix-production-login.sh
```

---

## Verification Checklist

After applying fixes:

- [ ] `.env.local` has `AUTH_URL=https://rdy.neonnidavellir.com`
- [ ] `.env.local` has `NEXTAUTH_URL=https://rdy.neonnidavellir.com`
- [ ] Keycloak has `https://rdy.neonnidavellir.com/*` in redirect URIs
- [ ] Application is rebuilt and restarted
- [ ] Browser cache/cookies cleared
- [ ] Can access login page at `https://rdy.neonnidavellir.com`
- [ ] Clicking "Sign In" redirects to Keycloak
- [ ] After Keycloak login, redirects back to app
- [ ] Successfully logged in and can see dashboard

---

## Still Not Working?

### Check these:

1. **SSL/HTTPS Issues**
   ```bash
   # Ensure HTTPS is working
   curl -I https://rdy.neonnidavellir.com
   # Should return 200, not redirect to HTTP
   ```

2. **Firewall/Port Issues**
   ```bash
   # Check if port 3001 is accessible
   netstat -tlnp | grep 3001
   ```

3. **Proxy/Nginx Configuration**
   - If using Nginx, ensure it's proxying `/api/auth/*` correctly
   - Check for any auth-related redirects

4. **Database Connection**
   ```bash
   # Test DB connection
   psql postgresql://rdy:rdy_dev_password@localhost:5435/rdy -c "SELECT 1;"
   ```

5. **Keycloak Realm Settings**
   - Go to Keycloak → Realm Settings → Login
   - Ensure "User registration" is enabled if needed
   - Check "Require SSL" is set appropriately

---

## Contact Information

If you continue to have issues, collect this information:

```bash
# Collect debug info
echo "=== Environment ===" > debug.txt
grep -E "AUTH_|NEXTAUTH_" .env.local >> debug.txt

echo -e "\n=== Application Status ===" >> debug.txt
pm2 status >> debug.txt 2>&1 || echo "Not using PM2" >> debug.txt

echo -e "\n=== Recent Logs ===" >> debug.txt
pm2 logs rdy --lines 50 >> debug.txt 2>&1 || tail -50 .next/server.log >> debug.txt

echo -e "\n=== Network Test ===" >> debug.txt
curl -I https://rdy.neonnidavellir.com >> debug.txt 2>&1
curl -I https://auth.neonnidavellir.com/realms/rdy >> debug.txt 2>&1

cat debug.txt
```

Share the output for further assistance.

---

## Summary

**Most Common Issue**: Wrong callback URL in environment variables

**Quick Fix**:
```bash
# Update .env.local
AUTH_URL=https://rdy.neonnidavellir.com
NEXTAUTH_URL=https://rdy.neonnidavellir.com

# Rebuild & Restart
npm run build && pm2 restart rdy
```

**Then verify** Keycloak has the correct redirect URIs configured.
