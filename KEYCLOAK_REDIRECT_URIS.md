# Keycloak Redirect URIs Configuration

## Problem

Login gets stuck because Keycloak doesn't recognize the redirect URL from your production domain.

## Solution: Add Valid Redirect URIs

### Step-by-Step Instructions

#### 1. Access Keycloak Admin Console
```
https://auth.neonnidavellir.com/admin
```

#### 2. Login with Admin Credentials
- Use your Keycloak admin username/password

#### 3. Select Your Realm
- Click on the dropdown (top-left, shows "master" by default)
- Select: **rdy**

#### 4. Go to Clients
- In the left sidebar, click **Clients**
- Find and click: **rdy-app**

#### 5. Configure Valid Redirect URIs

Scroll down to **Access settings** section and add these URIs:

**Valid redirect URIs:**
```
https://rdy.neonnidavellir.com/*
https://rdy.neonnidavellir.com/api/auth/callback/keycloak
http://localhost:3001/*
http://localhost:3001/api/auth/callback/keycloak
```

**Valid post logout redirect URIs:**
```
https://rdy.neonnidavellir.com/*
http://localhost:3001/*
```

**Web origins:**
```
https://rdy.neonnidavellir.com
http://localhost:3001
+
```
(The `+` means "allow origins from redirect URIs")

#### 6. Save Changes
- Scroll down
- Click **Save** button (bottom of page)

#### 7. Verify Client Settings

While you're here, ensure these are correct:

**General Settings:**
- Client ID: `rdy-app`
- Name: `RDY Application` (or your preferred name)
- Enabled: **ON**

**Access Settings:**
- Root URL: `https://rdy.neonnidavellir.com`
- Home URL: `https://rdy.neonnidavellir.com`
- Valid redirect URIs: (as above)
- Valid post logout redirect URIs: (as above)
- Web origins: (as above)

**Capability Config:**
- Client authentication: **ON**
- Authorization: **OFF** (unless you need it)
- Standard flow: **ON** ✅
- Direct access grants: **ON** ✅
- Implicit flow: **OFF** (deprecated)
- Service accounts roles: **OFF** (unless you need it)

**Login Settings:**
- Login theme: `rdy` (if you applied the custom theme)

---

## Visual Reference

```
┌─────────────────────────────────────────────────┐
│ Keycloak Admin Console                          │
├─────────────────────────────────────────────────┤
│                                                 │
│ Realm: rdy ▼                                    │
│                                                 │
│ Sidebar:                                        │
│   → Clients                                     │
│                                                 │
│ Client List:                                    │
│   [rdy-app] ← Click here                        │
│                                                 │
│ Client Details:                                 │
│                                                 │
│ Settings Tab:                                   │
│                                                 │
│   General settings                              │
│   ┌─────────────────────────────────┐           │
│   │ Client ID: rdy-app              │           │
│   │ Name: RDY Application           │           │
│   │ Enabled: [✓]                    │           │
│   └─────────────────────────────────┘           │
│                                                 │
│   Access settings                               │
│   ┌─────────────────────────────────┐           │
│   │ Root URL:                       │           │
│   │ https://rdy.neonnidavellir.com  │           │
│   │                                 │           │
│   │ Valid redirect URIs:            │           │
│   │ https://rdy.neonnidavellir.com/*│ [×]       │
│   │ https://rdy.neonnidavellir...   │ [×]       │
│   │ http://localhost:3001/*         │ [×]       │
│   │ http://localhost:3001/api...    │ [×]       │
│   │ [+ Add valid redirect URIs]     │           │
│   │                                 │           │
│   │ Web origins:                    │           │
│   │ https://rdy.neonnidavellir.com  │ [×]       │
│   │ http://localhost:3001           │ [×]       │
│   │ +                               │ [×]       │
│   └─────────────────────────────────┘           │
│                                                 │
│   Capability config                             │
│   ┌─────────────────────────────────┐           │
│   │ Client authentication: [✓] ON   │           │
│   │ Standard flow: [✓] ON           │           │
│   │ Direct access grants: [✓] ON    │           │
│   └─────────────────────────────────┘           │
│                                                 │
│                                  [Save]         │
└─────────────────────────────────────────────────┘
```

---

## Why This Matters

When you click "Sign In" on your app:

1. User goes to: `https://rdy.neonnidavellir.com/auth/signin`
2. App redirects to: `https://auth.neonnidavellir.com/realms/rdy/protocol/openid-connect/auth`
3. User logs in on Keycloak
4. **Keycloak needs to redirect back to:** `https://rdy.neonnidavellir.com/api/auth/callback/keycloak`

If `https://rdy.neonnidavellir.com/*` is **not** in the Valid Redirect URIs list, Keycloak will **reject** the redirect and show an error:

```
❌ Invalid redirect_uri
```

---

## Testing the Fix

After adding the redirect URIs:

### 1. Clear Everything
```bash
# On server
pm2 restart rdy

# In browser
- Clear all cookies for rdy.neonnidavellir.com
- Clear all cookies for auth.neonnidavellir.com
- Close ALL browser tabs
```

### 2. Test in Incognito
```
1. Open new incognito window
2. Go to: https://rdy.neonnidavellir.com
3. Click "BEGIN →"
4. Should redirect to Keycloak login
5. Enter credentials
6. Should redirect back to app
7. Should see dashboard/calendar
```

### 3. Check Network Tab
```
Open DevTools (F12) → Network tab

Expected flow:
1. rdy.neonnidavellir.com/auth/signin (302)
2. auth.neonnidavellir.com/.../auth (200)
3. [User logs in]
4. auth.neonnidavellir.com/.../auth?session_code=... (302)
5. rdy.neonnidavellir.com/api/auth/callback/keycloak (302)
6. rdy.neonnidavellir.com/dashboard (200) ✅
```

If it fails at step 5, the redirect URI is still not configured correctly.

---

## Common Mistakes

### ❌ Missing Trailing Slash/Wildcard
```
Wrong: https://rdy.neonnidavellir.com
Right: https://rdy.neonnidavellir.com/*
```

### ❌ Wrong Protocol
```
Wrong: http://rdy.neonnidavellir.com/*
Right: https://rdy.neonnidavellir.com/*
```

### ❌ Missing Callback Path
```
# Should have BOTH:
https://rdy.neonnidavellir.com/*
https://rdy.neonnidavellir.com/api/auth/callback/keycloak
```

### ❌ Not Saving Changes
After adding URIs, scroll down and click **Save**!

### ❌ Wrong Realm
Make sure you're editing the **rdy** realm, not **master**!

---

## Additional Settings to Check

### Session Settings (Optional)

In Keycloak → Realm Settings → Sessions:

```
SSO Session Idle: 30 minutes
SSO Session Max: 10 hours
```

### Token Settings (Optional)

In Keycloak → Realm Settings → Tokens:

```
Access Token Lifespan: 5 minutes
Access Token Lifespan For Implicit Flow: 15 minutes
```

---

## Still Having Issues?

### Check Keycloak Logs
```bash
# If Keycloak is in Docker
docker logs keycloak -f

# Look for:
# - "Invalid redirect_uri"
# - Client configuration errors
```

### Enable Debug Mode
In your `.env.local`:
```bash
# Add this temporarily
DEBUG=true
NODE_ENV=development
```

Then check application logs for more details.

### Verify DNS
```bash
# Make sure domain resolves correctly
nslookup rdy.neonnidavellir.com
nslookup auth.neonnidavellir.com
```

### Check SSL Certificates
```bash
# Verify HTTPS is working
curl -I https://rdy.neonnidavellir.com
curl -I https://auth.neonnidavellir.com

# Should return HTTP/2 200 or similar
# Should NOT have certificate errors
```

---

## Quick Reference

**Keycloak Admin Console:**
```
https://auth.neonnidavellir.com/admin
```

**Redirect URIs to Add:**
```
https://rdy.neonnidavellir.com/*
https://rdy.neonnidavellir.com/api/auth/callback/keycloak
```

**Web Origins:**
```
https://rdy.neonnidavellir.com
+
```

**Save Location:**
```
Clients → rdy-app → Settings tab → Access settings → [Save button at bottom]
```

---

## Need Help?

If you're still stuck after:
1. ✅ Adding redirect URIs in Keycloak
2. ✅ Running the fix script (`./scripts/fix-production-login.sh`)
3. ✅ Clearing browser cache/cookies
4. ✅ Testing in incognito mode

Then check:
- `FIX_LOGIN_ISSUE.md` for more troubleshooting
- Application logs: `pm2 logs rdy`
- Keycloak logs: `docker logs keycloak`
- Browser console: F12 → Console tab
