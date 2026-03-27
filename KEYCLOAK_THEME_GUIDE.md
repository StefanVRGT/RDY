# Keycloak Theme Customization Guide - RDY Design

## Overview

This guide explains how to customize the Keycloak login page to match the RDY minimalist design with white background, orange accents, and clean typography.

---

## Option 1: Quick CSS Customization (Easiest)

### Step 1: Access Keycloak Admin Console
1. Navigate to your Keycloak admin console (usually `http://localhost:8080/admin`)
2. Log in with admin credentials
3. Select your realm (e.g., "rdy-realm")

### Step 2: Add Custom CSS via Realm Settings
1. Go to **Realm Settings** → **Themes**
2. Under **Login Theme**, select "keycloak" (base theme)
3. Create a custom theme (see Option 2) or use browser dev tools to inject CSS temporarily

### Quick CSS Override (for testing)

Add this CSS to customize the Keycloak login page:

```css
/* RDY Keycloak Theme - Minimal Design */

/* Overall page styling */
body {
  background-color: #FFFFFF !important;
  font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
}

/* Login container */
#kc-container {
  background-color: transparent !important;
}

#kc-container-wrapper {
  background-color: transparent !important;
}

/* Login box */
#kc-content {
  background: transparent !important;
  box-shadow: none !important;
  border: none !important;
  padding: 0 !important;
}

#kc-content-wrapper {
  max-width: 400px;
  margin: 0 auto;
  padding: 32px;
}

/* Header styling */
#kc-header {
  text-align: center;
  margin-bottom: 64px;
}

#kc-header-wrapper {
  font-size: 60px;
  font-weight: bold;
  color: #1A1A1A;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Form styling */
#kc-form {
  background: transparent;
}

#kc-form-login {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Input fields */
.form-group {
  margin-bottom: 24px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #1A1A1A;
  margin-bottom: 8px;
}

.form-control,
input[type="text"],
input[type="password"],
input[type="email"] {
  width: 100%;
  padding: 16px;
  font-size: 16px;
  color: #1A1A1A;
  background-color: #F5F5F5 !important;
  border: none !important;
  border-radius: 8px;
  outline: none;
}

.form-control:focus,
input:focus {
  background-color: #E0E0E0 !important;
  border: 2px solid #FF8C42 !important;
}

/* Submit button - RDY Orange */
#kc-login,
.btn-primary,
input[type="submit"],
button[type="submit"] {
  width: 100%;
  padding: 20px !important;
  font-size: 18px !important;
  font-weight: bold !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
  color: #FFFFFF !important;
  background-color: #FF8C42 !important;
  border: none !important;
  border-radius: 8px !important;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

#kc-login:hover,
.btn-primary:hover,
input[type="submit"]:hover,
button[type="submit"]:hover {
  opacity: 0.9 !important;
  background-color: #E67A35 !important;
}

#kc-login:active,
.btn-primary:active,
input[type="submit"]:active,
button[type="submit"]:active {
  opacity: 0.6 !important;
}

/* Links */
a {
  color: #FF8C42 !important;
  text-decoration: none !important;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

a:hover {
  color: #E67A35 !important;
}

/* Error messages */
.alert-error,
.pf-c-alert.pf-m-danger {
  background-color: #F44336 !important;
  color: #FFFFFF !important;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 24px;
}

/* Success messages */
.alert-success,
.pf-c-alert.pf-m-success {
  background-color: #4CAF50 !important;
  color: #FFFFFF !important;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 24px;
}

/* Remove shadows and borders */
.card-pf,
.login-pf-page {
  box-shadow: none !important;
  border: none !important;
}

/* Footer */
#kc-info {
  text-align: center;
  margin-top: 48px;
}

#kc-info-wrapper {
  font-size: 12px;
  color: #999999;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Remove Keycloak branding */
#kc-logo-wrapper {
  display: none;
}

/* Social providers (if used) */
#kc-social-providers {
  margin-top: 32px;
}

#kc-social-providers ul {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

#kc-social-providers li {
  margin: 0;
}

#kc-social-providers button,
#kc-social-providers a {
  width: 100%;
  padding: 16px !important;
  background-color: #F5F5F5 !important;
  color: #1A1A1A !important;
  border: none !important;
  border-radius: 8px;
  text-transform: uppercase;
  font-size: 14px;
  font-weight: 500;
}

#kc-social-providers button:hover,
#kc-social-providers a:hover {
  background-color: #E0E0E0 !important;
}
```

---

## Option 2: Create Custom Keycloak Theme (Recommended)

### Step 1: Create Theme Directory Structure

```bash
# In your project or Keycloak themes directory
mkdir -p keycloak/themes/rdy/login/resources/css
mkdir -p keycloak/themes/rdy/login/resources/img
```

### Step 2: Create theme.properties

Create `keycloak/themes/rdy/theme.properties`:

```properties
parent=keycloak
import=common/keycloak

styles=css/login.css css/rdy.css
```

### Step 3: Create Custom CSS

Create `keycloak/themes/rdy/login/resources/css/rdy.css` with the CSS from Option 1.

### Step 4: Create Custom Login Template (Optional)

Create `keycloak/themes/rdy/login/login.ftl`:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${msg("loginTitle",(realm.displayName!''))}</title>
    <link rel="icon" href="${url.resourcesPath}/img/favicon.ico" />
    <#if properties.styles?has_content>
        <#list properties.styles?split(' ') as style>
            <link href="${url.resourcesPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
</head>

<body>
    <div id="kc-container">
        <div id="kc-container-wrapper">
            <div id="kc-content">
                <div id="kc-content-wrapper">

                    <!-- Header -->
                    <div id="kc-header">
                        <div id="kc-header-wrapper">RDY</div>
                        <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #999999; margin-top: 16px;">
                            ${msg("loginTitleHtml",(realm.displayNameHtml!''))?no_esc}
                        </div>
                    </div>

                    <!-- Messages -->
                    <#if message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
                        <div class="alert alert-${message.type}">
                            <span>${kcSanitize(message.summary)?no_esc}</span>
                        </div>
                    </#if>

                    <!-- Form -->
                    <div id="kc-form">
                        <div id="kc-form-wrapper">
                            <#nested "form">
                        </div>
                    </div>

                    <!-- Info -->
                    <#if displayInfo>
                        <div id="kc-info">
                            <div id="kc-info-wrapper">
                                <#nested "info">
                            </div>
                        </div>
                    </#if>

                </div>
            </div>
        </div>
    </div>
</body>
</html>
```

### Step 5: Deploy Theme

#### For Local Development (Docker)

Add to your `docker-compose.yml`:

```yaml
services:
  keycloak:
    image: quay.io/keycloak/keycloak:latest
    volumes:
      - ./keycloak/themes/rdy:/opt/keycloak/themes/rdy
    environment:
      - KC_THEME_DEFAULT=rdy
```

#### For Production

1. Copy theme to Keycloak themes directory:
   ```bash
   cp -r keycloak/themes/rdy /opt/keycloak/themes/
   ```

2. Restart Keycloak

3. In Keycloak Admin Console:
   - Go to **Realm Settings** → **Themes**
   - Select "rdy" for **Login Theme**
   - Click **Save**

---

## Option 3: Use Keycloak.js with Custom UI (Advanced)

Instead of using Keycloak's login page, create a custom login page in your Next.js app that uses Keycloak.js for authentication.

### Step 1: Install Keycloak JS

```bash
npm install keycloak-js
```

### Step 2: Create Custom Login Page

Create `src/app/auth/custom-signin/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Keycloak from 'keycloak-js';
import { useRouter } from 'next/navigation';
import { RdyHeader } from '@/components/ui/rdy-header';

export default function CustomSignInPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      const keycloak = new Keycloak({
        url: process.env.NEXT_PUBLIC_KEYCLOAK_URL,
        realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'rdy-realm',
        clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'rdy-app',
      });

      const authenticated = await keycloak.init({
        onLoad: 'login-required',
        checkLoginIframe: false,
      });

      if (authenticated) {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('Failed to sign in. Please try again.');
      console.error('Authentication error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-rdy-white">
      <div className="rdy-content-width px-rdy-lg pt-16 pb-20">
        <div className="mb-rdy-2xl">
          <RdyHeader title="SIGN IN" subtitle="START YOUR JOURNEY" />
        </div>

        {error && (
          <div className="mb-rdy-lg bg-rdy-error/10 rounded-lg p-rdy-md">
            <p className="text-rdy-sm text-rdy-error text-center">{error}</p>
          </div>
        )}

        <div className="flex justify-center">
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="rdy-btn-primary text-rdy-orange-500 disabled:opacity-50"
          >
            {loading ? 'SIGNING IN...' : 'SIGN IN →'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## Testing Your Theme

1. **Clear Browser Cache**: Keycloak themes are heavily cached
2. **Use Incognito Mode**: Test in private browsing
3. **Check Console**: Look for CSS loading errors
4. **Test Different Flows**: Login, registration, password reset, etc.

---

## Customization Checklist

- [ ] White background (#FFFFFF)
- [ ] Black text (#1A1A1A)
- [ ] Orange button (#FF8C42)
- [ ] Uppercase text for headers
- [ ] Clean, minimal input fields
- [ ] No shadows or borders
- [ ] Generous spacing (24-48px)
- [ ] RDY branding/logo
- [ ] Mobile responsive
- [ ] Error messages styled

---

## Example Screenshots

### Before (Default Keycloak)
- Dark theme with blue accents
- Complex layout with shadows
- Keycloak branding

### After (RDY Theme)
- White background
- "RDY" large header
- Simple orange button
- Clean input fields
- Minimal design

---

## Troubleshooting

### Theme Not Showing
1. Check theme is in correct directory
2. Verify `theme.properties` exists
3. Restart Keycloak
4. Clear browser cache
5. Check Keycloak logs for errors

### CSS Not Loading
1. Verify CSS file path in `theme.properties`
2. Check file permissions
3. Use browser dev tools to see if CSS is loaded
4. Try hard refresh (Ctrl+Shift+R)

### Login Still Looks Wrong
1. Parent theme might be overriding styles
2. Use `!important` in CSS
3. Check for JavaScript errors in console
4. Verify realm settings point to correct theme

---

## Additional Resources

- [Keycloak Themes Documentation](https://www.keycloak.org/docs/latest/server_development/#_themes)
- [Keycloak Theme Examples](https://github.com/keycloak/keycloak/tree/main/themes/src/main/resources/theme)
- [FreeMarker Template Guide](https://freemarker.apache.org/docs/dgui.html)

---

## Quick Setup Script

Create `scripts/setup-keycloak-theme.sh`:

```bash
#!/bin/bash

# Create theme directory structure
mkdir -p keycloak/themes/rdy/login/resources/css
mkdir -p keycloak/themes/rdy/login/resources/img

# Create theme.properties
cat > keycloak/themes/rdy/theme.properties << 'EOF'
parent=keycloak
import=common/keycloak
styles=css/rdy.css
EOF

# Create RDY CSS (you'll need to paste the CSS content here)
echo "Theme structure created!"
echo "Next steps:"
echo "1. Add CSS to keycloak/themes/rdy/login/resources/css/rdy.css"
echo "2. Copy theme to Keycloak: docker cp keycloak/themes/rdy keycloak:/opt/keycloak/themes/"
echo "3. Restart Keycloak"
echo "4. Select 'rdy' theme in Realm Settings"
```

Make it executable:
```bash
chmod +x scripts/setup-keycloak-theme.sh
./scripts/setup-keycloak-theme.sh
```

---

## Conclusion

The RDY Keycloak theme matches the main app design with:
- ✅ White background
- ✅ Orange accent color
- ✅ Clean typography
- ✅ Minimal design
- ✅ Generous spacing

Choose the option that best fits your deployment:
- **Option 1**: Quick CSS for testing
- **Option 2**: Full custom theme (recommended)
- **Option 3**: Custom UI with Keycloak.js (most flexible)
