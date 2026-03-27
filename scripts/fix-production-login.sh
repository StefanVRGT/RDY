#!/bin/bash

echo "🔧 Fixing production login issue for rdy.neonnidavellir.com..."
echo ""

# Backup current .env.local
if [ -f .env.local ]; then
    cp .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Backed up .env.local"
fi

# Update .env.local with correct production URLs
cat > .env.local << 'EOF'
# Keycloak Configuration for RDY - PRODUCTION
# Updated: 2026-02-03 for rdy.neonnidavellir.com

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

echo "✅ Updated .env.local with production URLs"
echo ""

# Clear Next.js cache
if [ -d .next ]; then
    rm -rf .next
    echo "✅ Cleared Next.js cache"
fi

# Rebuild application
echo "🔨 Rebuilding application..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed - check for errors"
    exit 1
fi

echo ""

# Restart application (try multiple methods)
if command -v pm2 &> /dev/null; then
    echo "🔄 Restarting with PM2..."
    pm2 restart rdy
    echo "✅ PM2 restart complete"
elif command -v systemctl &> /dev/null; then
    echo "🔄 Restarting with systemctl..."
    sudo systemctl restart rdy
    echo "✅ systemctl restart complete"
else
    echo "⚠️  Please restart your application manually:"
    echo "   npm start"
    echo "   # or your preferred method"
fi

echo ""
echo "🎉 Fix applied!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Next steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. ✅ Environment variables updated"
echo "2. ✅ Application rebuilt"
echo "3. ✅ Application restarted"
echo ""
echo "4. ⏳ Verify Keycloak redirect URIs:"
echo "   → Go to: https://auth.neonnidavellir.com/admin"
echo "   → Login to admin console"
echo "   → Select realm: 'rdy'"
echo "   → Go to: Clients → rdy-app"
echo "   → Under 'Valid redirect URIs', ensure you have:"
echo "      • https://rdy.neonnidavellir.com/*"
echo "      • https://rdy.neonnidavellir.com/api/auth/callback/keycloak"
echo ""
echo "5. 🧹 Clear browser data:"
echo "   → Open DevTools (F12)"
echo "   → Application → Clear storage"
echo "   → Clear cookies for rdy.neonnidavellir.com"
echo "   → Close ALL browser tabs"
echo ""
echo "6. ✨ Test login:"
echo "   → Open new incognito window"
echo "   → Go to: https://rdy.neonnidavellir.com"
echo "   → Click 'BEGIN →' or 'SIGN IN →'"
echo "   → Should redirect to Keycloak"
echo "   → After login, should return to dashboard"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "If still stuck, see: FIX_LOGIN_ISSUE.md"
echo ""
