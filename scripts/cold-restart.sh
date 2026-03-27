#!/bin/bash

echo "❄️  COLD RESTART - Clearing everything and rebuilding..."
echo ""

# Stop the application
echo "⏹️  Stopping application..."
if command -v pm2 &> /dev/null; then
    pm2 stop rdy 2>/dev/null || true
    pm2 delete rdy 2>/dev/null || true
    echo "✅ Stopped PM2 process"
else
    pkill -f "node.*next" 2>/dev/null || true
    echo "✅ Stopped Node processes"
fi

# Clear all caches
echo ""
echo "🧹 Clearing all caches..."

# Clear Next.js cache
rm -rf .next
echo "  ✅ Cleared .next/"

# Clear node_modules/.cache
rm -rf node_modules/.cache
echo "  ✅ Cleared node_modules/.cache/"

# Clear Turbopack cache
rm -rf .turbo
echo "  ✅ Cleared .turbo/"

# Clear build artifacts
rm -rf out
rm -rf dist
rm -rf build
echo "  ✅ Cleared build artifacts"

# Clear any temp files
rm -rf /tmp/next-*
echo "  ✅ Cleared temp files"

# Reinstall dependencies to ensure everything is fresh
echo ""
echo "📦 Reinstalling dependencies..."
npm ci
echo "✅ Dependencies reinstalled"

# Rebuild application
echo ""
echo "🔨 Building application from scratch..."
NODE_ENV=production npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed!"
    echo ""
    echo "Check for errors above. Common issues:"
    echo "  - Missing environment variables"
    echo "  - TypeScript errors"
    echo "  - Import/export errors"
    exit 1
fi

# Start the application
echo ""
echo "🚀 Starting application..."

if command -v pm2 &> /dev/null; then
    # Start with PM2
    pm2 start npm --name "rdy" -- start
    pm2 save
    echo "✅ Started with PM2"
    echo ""
    echo "📊 Process status:"
    pm2 status
    echo ""
    echo "📝 View logs with: pm2 logs rdy"
else
    # Start without PM2
    echo "Starting with npm..."
    npm start &
    echo "✅ Started in background"
    echo ""
    echo "📝 View logs with: tail -f .next/server.log"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Cold restart complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Application should be running at:"
echo "   https://rdy.neonnidavellir.com"
echo ""
echo "Wait 10-15 seconds for the app to fully start,"
echo "then test in a new incognito window."
echo ""
echo "If styles still don't load:"
echo "  1. Check browser console (F12) for errors"
echo "  2. Check: pm2 logs rdy"
echo "  3. Verify .env.local has correct values"
echo ""
