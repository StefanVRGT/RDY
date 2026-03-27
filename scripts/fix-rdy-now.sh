#!/bin/bash

# RDY Health Recovery Script
# Fixes critical issues preventing RDY from starting
# Generated: 2026-02-12

set -e

echo "🔧 RDY Health Recovery Script"
echo "=============================="
echo ""

# Change to RDY directory
cd /home/stefan/projects/rdy

echo "📍 Current directory: $(pwd)"
echo ""

# Step 1: Stop port conflict
echo "Step 1: Resolving port conflicts..."
echo "-----------------------------------"
if pm2 describe cloudcli > /dev/null 2>&1; then
    echo "⚠️  cloudcli is using port 3001"
    echo "Options:"
    echo "  a) Stop cloudcli temporarily (recommended for testing)"
    echo "  b) Change RDY to use port 3002"
    echo ""
    read -p "Choose option (a/b): " port_choice

    if [ "$port_choice" = "a" ]; then
        echo "Stopping cloudcli..."
        pm2 stop cloudcli
        echo "✅ cloudcli stopped"
        USE_PORT=3001
    else
        echo "Will configure RDY to use port 3002..."
        USE_PORT=3002
    fi
else
    echo "✅ No port conflict detected"
    USE_PORT=3001
fi
echo ""

# Step 2: Update environment variables
echo "Step 2: Updating environment variables..."
echo "-----------------------------------"

# Backup current .env.local
if [ -f .env.local ]; then
    cp .env.local .env.local.backup-$(date +%Y%m%d-%H%M%S)
    echo "✅ Backed up .env.local"
fi

# Create new .env.local with production settings
cat > .env.local << EOF
# RDY Production Configuration
# Updated: $(date)
# Port: $USE_PORT

# Database (corrected to port 5434)
DATABASE_URL=postgresql://rdy:rdy_dev_password@localhost:5434/rdy

# Keycloak Configuration
KEYCLOAK_URL=https://auth.neonnidavellir.com
KEYCLOAK_REALM=rdy
KEYCLOAK_CLIENT_ID=rdy-app
KEYCLOAK_CLIENT_SECRET=54e7d731ba5f10a9937184d326ffc23f

# NextAuth Configuration - PRODUCTION URLs
NEXTAUTH_URL=https://rdy.neonnidavellir.com
NEXTAUTH_SECRET=PnUG3qtOU9aBvsV44/4D6ak1+svCXc9NG7T6/sUMfV4=

# NextAuth v5 format - PRODUCTION URLs
AUTH_KEYCLOAK_ID=rdy-app
AUTH_KEYCLOAK_SECRET=54e7d731ba5f10a9937184d326ffc23f
AUTH_KEYCLOAK_ISSUER=https://auth.neonnidavellir.com/realms/rdy
AUTH_URL=https://rdy.neonnidavellir.com
AUTH_SECRET=lfC+HePQ4cjKWu6nf2aOU/j6NdNcnPgi8Nir4lSSKAk=

# Application Port
PORT=$USE_PORT
EOF

echo "✅ Updated .env.local with production URLs and port $USE_PORT"
echo ""

# Step 3: Update PM2 ecosystem config if using port 3002
if [ "$USE_PORT" = "3002" ]; then
    echo "Step 3: Updating PM2 configuration for port 3002..."
    echo "---------------------------------------------------"
    # Backup ecosystem config
    cp ecosystem.config.js ecosystem.config.js.backup-$(date +%Y%m%d-%H%M%S)

    # Update port in ecosystem config
    sed -i "s/PORT: 3001/PORT: 3002/" ecosystem.config.js
    echo "✅ Updated ecosystem.config.js to use port 3002"
    echo ""
fi

# Step 4: Clean build cache
echo "Step 4: Cleaning build cache..."
echo "--------------------------------"
if [ -d .next ]; then
    rm -rf .next
    echo "✅ Removed .next directory"
else
    echo "ℹ️  No .next directory found"
fi
echo ""

# Step 5: Rebuild application
echo "Step 5: Building application..."
echo "--------------------------------"
echo "This may take a few minutes..."
NODE_ENV=production npm run build
echo "✅ Build complete"
echo ""

# Step 6: Stop current RDY process
echo "Step 6: Stopping current RDY process..."
echo "---------------------------------------"
pm2 delete rdy 2>/dev/null || echo "ℹ️  No existing RDY process to delete"
echo ""

# Step 7: Start RDY with PM2
echo "Step 7: Starting RDY..."
echo "-----------------------"
pm2 start ecosystem.config.js
pm2 save
echo "✅ RDY started"
echo ""

# Step 8: Wait for startup
echo "Step 8: Waiting for application to start..."
echo "-------------------------------------------"
sleep 5
echo ""

# Step 9: Check status
echo "Step 9: Checking status..."
echo "--------------------------"
pm2 status rdy
echo ""

# Step 10: Test connectivity
echo "Step 10: Testing connectivity..."
echo "--------------------------------"

# Test local port
if command -v curl > /dev/null; then
    echo "Testing local port $USE_PORT..."
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:$USE_PORT | grep -q "200\|301\|302"; then
        echo "✅ Local server responding"
    else
        echo "⚠️  Local server not responding yet (may need more time)"
    fi

    echo ""
    echo "Testing production domain..."
    if curl -s -o /dev/null -w "%{http_code}" https://rdy.neonnidavellir.com | grep -q "200\|301\|302"; then
        echo "✅ Production domain responding"
    else
        echo "⚠️  Production domain not responding (check Caddy/reverse proxy)"
    fi
else
    echo "ℹ️  curl not available, skipping connectivity tests"
fi
echo ""

# Final status
echo "=========================================="
echo "🎉 Recovery Script Complete!"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "1. Check PM2 logs: pm2 logs rdy --lines 50"
echo "2. Visit: https://rdy.neonnidavellir.com"
echo "3. Try to login with test credentials"
echo ""
echo "If issues persist:"
echo "1. Check logs: pm2 logs rdy"
echo "2. Verify Keycloak redirect URIs include: https://rdy.neonnidavellir.com/*"
echo "3. Check Caddy reverse proxy configuration"
echo ""
echo "Configuration:"
echo "- App running on port: $USE_PORT"
echo "- Production URL: https://rdy.neonnidavellir.com"
echo "- Database: localhost:5434"
echo "- Keycloak: https://auth.neonnidavellir.com"
echo ""
echo "View full health report: /home/stefan/projects/rdy/HEALTH_CHECK_REPORT.md"
echo ""
