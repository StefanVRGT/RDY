#!/bin/bash

# RDY Keycloak Theme Setup Script

echo "🎨 Setting up RDY Keycloak theme..."

# Check if Keycloak container is running
if ! docker ps | grep -q keycloak; then
    echo "❌ Keycloak container is not running"
    echo "Please start Keycloak first with: docker-compose up -d keycloak"
    exit 1
fi

# Copy theme to Keycloak container
echo "📦 Copying theme files to Keycloak..."
docker cp keycloak/themes/rdy $(docker ps --filter "name=keycloak" --format "{{.Names}}"):/opt/keycloak/themes/

if [ $? -eq 0 ]; then
    echo "✅ Theme files copied successfully"
else
    echo "❌ Failed to copy theme files"
    exit 1
fi

# Restart Keycloak to load new theme
echo "🔄 Restarting Keycloak..."
docker restart $(docker ps --filter "name=keycloak" --format "{{.Names}}")

echo ""
echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Wait for Keycloak to restart (about 30 seconds)"
echo "2. Go to Keycloak Admin Console: http://localhost:8080/admin"
echo "3. Navigate to: Realm Settings → Themes"
echo "4. Under 'Login Theme', select 'rdy'"
echo "5. Click 'Save'"
echo "6. Clear your browser cache and test the login page"
echo ""
echo "🎉 Your login page will now match the RDY design!"
