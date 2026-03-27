#!/bin/bash

echo "🔍 Diagnosing styling issues..."
echo ""

# Check if CSS files were built
echo "1️⃣ Checking build output..."
if [ -d ".next" ]; then
    echo "  ✅ .next directory exists"

    # Check for CSS files
    css_count=$(find .next -name "*.css" 2>/dev/null | wc -l)
    if [ $css_count -gt 0 ]; then
        echo "  ✅ Found $css_count CSS files"
    else
        echo "  ❌ No CSS files found in .next/"
        echo "     → Build may have failed"
    fi
else
    echo "  ❌ .next directory doesn't exist"
    echo "     → App hasn't been built yet"
fi

echo ""
echo "2️⃣ Checking Tailwind configuration..."
if [ -f "tailwind.config.ts" ]; then
    echo "  ✅ tailwind.config.ts exists"
else
    echo "  ❌ tailwind.config.ts missing"
fi

if [ -f "src/app/globals.css" ]; then
    echo "  ✅ globals.css exists"

    # Check if Tailwind directives are present
    if grep -q "@tailwind" src/app/globals.css; then
        echo "  ✅ Tailwind directives found in globals.css"
    else
        echo "  ❌ Tailwind directives missing from globals.css"
    fi
else
    echo "  ❌ globals.css missing"
fi

echo ""
echo "3️⃣ Checking environment variables..."
if [ -f ".env.local" ]; then
    echo "  ✅ .env.local exists"

    # Check for critical vars
    if grep -q "AUTH_URL=https://rdy.neonnidavellir.com" .env.local; then
        echo "  ✅ AUTH_URL is set correctly"
    else
        echo "  ❌ AUTH_URL not set to production URL"
        echo "     → Current value:"
        grep "AUTH_URL=" .env.local | head -1
    fi
else
    echo "  ❌ .env.local missing"
fi

echo ""
echo "4️⃣ Checking Next.js configuration..."
if [ -f "next.config.ts" ] || [ -f "next.config.js" ] || [ -f "next.config.mjs" ]; then
    echo "  ✅ Next.js config exists"
else
    echo "  ⚠️  No Next.js config found (using defaults)"
fi

echo ""
echo "5️⃣ Checking running processes..."
if command -v pm2 &> /dev/null; then
    echo "  PM2 processes:"
    pm2 list | grep rdy || echo "    ⚠️  No 'rdy' process found"
else
    echo "  Checking for Node processes..."
    if pgrep -f "node.*next" > /dev/null; then
        echo "  ✅ Next.js process is running"
    else
        echo "  ❌ No Next.js process found"
    fi
fi

echo ""
echo "6️⃣ Checking recent logs for errors..."
if command -v pm2 &> /dev/null; then
    echo "  Last 10 lines from PM2 logs:"
    pm2 logs rdy --lines 10 --nostream 2>/dev/null || echo "    ⚠️  Can't read PM2 logs"
else
    if [ -f ".next/server.log" ]; then
        echo "  Last 10 lines from server log:"
        tail -10 .next/server.log
    else
        echo "    ⚠️  No server log found"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Provide recommendations based on checks
if [ ! -d ".next" ]; then
    echo "❌ ISSUE: App not built"
    echo "   FIX: Run ./scripts/cold-restart.sh"
elif [ $css_count -eq 0 ]; then
    echo "❌ ISSUE: CSS files not generated"
    echo "   FIX: Run ./scripts/cold-restart.sh"
else
    echo "✅ Build looks OK"
    echo ""
    echo "If styling still doesn't work:"
    echo "  1. Clear browser cache (Ctrl+Shift+Delete)"
    echo "  2. Test in incognito mode"
    echo "  3. Check browser console (F12) for errors"
    echo "  4. Check if CSS is loading:"
    echo "     → DevTools → Network tab → Filter: CSS"
    echo "     → Should see _app-*.css loading"
fi

echo ""
