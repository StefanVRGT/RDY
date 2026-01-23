#!/bin/bash
set -e

# RDY Keycloak Bootstrap Script
# Creates the 'rdy' realm in the shared Keycloak instance

KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8180}"
ADMIN_USER="${KC_ADMIN_USER:-admin}"
ADMIN_PASS="${KC_ADMIN_PASSWORD:-CerebroAdmin2026!}"

REALM="rdy"
CLIENT_ID="rdy-app"
CLIENT_SECRET=$(openssl rand -hex 16)

APP_URL="${APP_URL:-http://localhost:3001}"
PROD_URL="${PROD_URL:-https://rdy.neonnidavellir.com}"

echo "RDY Keycloak Bootstrap"
echo "======================"
echo ""
echo "Keycloak URL: $KEYCLOAK_URL"
echo "Dev App URL: $APP_URL"
echo "Prod App URL: $PROD_URL"
echo ""

wait_for_keycloak() {
    echo "Waiting for Keycloak to be ready..."
    local max_attempts=60
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -sf "$KEYCLOAK_URL/realms/master" > /dev/null 2>&1; then
            echo "Keycloak is ready!"
            return 0
        fi
        attempt=$((attempt + 1))
        echo "  Attempt $attempt/$max_attempts - waiting..."
        sleep 5
    done
    
    echo "ERROR: Keycloak did not become ready in time"
    exit 1
}

get_admin_token() {
    echo "Getting admin access token..."
    
    local response=$(curl -sf -X POST "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "username=$ADMIN_USER" \
        -d "password=$ADMIN_PASS" \
        -d "grant_type=password" \
        -d "client_id=admin-cli")
    
    ACCESS_TOKEN=$(echo "$response" | jq -r '.access_token')
    
    if [ "$ACCESS_TOKEN" = "null" ] || [ -z "$ACCESS_TOKEN" ]; then
        echo "ERROR: Failed to get admin token"
        echo "Response: $response"
        exit 1
    fi
    
    echo "Got admin token"
}

create_realm() {
    echo "Creating realm: $REALM"
    
    local exists=$(curl -sf -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        "$KEYCLOAK_URL/admin/realms/$REALM")
    
    if [ "$exists" = "200" ]; then
        echo "  Realm already exists, skipping"
        return 0
    fi
    
    curl -sf -X POST "$KEYCLOAK_URL/admin/realms" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "realm": "'$REALM'",
            "enabled": true,
            "displayName": "RDY",
            "displayNameHtml": "<strong>RDY</strong> - Mentorship Platform",
            "loginWithEmailAllowed": true,
            "duplicateEmailsAllowed": false,
            "resetPasswordAllowed": true,
            "editUsernameAllowed": false,
            "bruteForceProtected": true,
            "permanentLockout": false,
            "maxFailureWaitSeconds": 900,
            "minimumQuickLoginWaitSeconds": 60,
            "waitIncrementSeconds": 60,
            "quickLoginCheckMilliSeconds": 1000,
            "maxDeltaTimeSeconds": 43200,
            "failureFactor": 5,
            "defaultSignatureAlgorithm": "RS256",
            "accessTokenLifespan": 300,
            "accessTokenLifespanForImplicitFlow": 900,
            "ssoSessionIdleTimeout": 1800,
            "ssoSessionMaxLifespan": 36000,
            "offlineSessionIdleTimeout": 2592000,
            "accessCodeLifespan": 60,
            "accessCodeLifespanUserAction": 300,
            "accessCodeLifespanLogin": 1800,
            "actionTokenGeneratedByAdminLifespan": 43200,
            "actionTokenGeneratedByUserLifespan": 300
        }'
    
    echo "  Realm created"
}

create_client() {
    echo "Creating client: $CLIENT_ID"
    
    local existing=$(curl -sf \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        "$KEYCLOAK_URL/admin/realms/$REALM/clients?clientId=$CLIENT_ID")
    
    local client_uuid=$(echo "$existing" | jq -r '.[0].id // empty')
    
    local client_config='{
        "clientId": "'$CLIENT_ID'",
        "name": "RDY Application",
        "description": "Mentorship Program Course Tracking Platform",
        "enabled": true,
        "clientAuthenticatorType": "client-secret",
        "secret": "'$CLIENT_SECRET'",
        "redirectUris": [
            "'$APP_URL'/*",
            "'$APP_URL'/api/auth/callback/keycloak",
            "'$PROD_URL'/*",
            "'$PROD_URL'/api/auth/callback/keycloak",
            "http://localhost:3001/*",
            "http://localhost:3001/api/auth/callback/keycloak",
            "https://rdy.neonnidavellir.com/*",
            "https://rdy.neonnidavellir.com/api/auth/callback/keycloak"
        ],
        "webOrigins": [
            "'$APP_URL'",
            "'$PROD_URL'",
            "http://localhost:3001",
            "https://rdy.neonnidavellir.com"
        ],
        "publicClient": false,
        "protocol": "openid-connect",
        "standardFlowEnabled": true,
        "implicitFlowEnabled": false,
        "directAccessGrantsEnabled": true,
        "serviceAccountsEnabled": false,
        "authorizationServicesEnabled": false,
        "fullScopeAllowed": true,
        "attributes": {
            "pkce.code.challenge.method": "S256",
            "post.logout.redirect.uris": "'$APP_URL'##'$PROD_URL'##http://localhost:3001##https://rdy.neonnidavellir.com",
            "backchannel.logout.session.required": "true",
            "backchannel.logout.revoke.offline.tokens": "false"
        },
        "defaultClientScopes": ["web-origins", "acr", "profile", "roles", "email"],
        "optionalClientScopes": ["address", "phone", "offline_access", "microprofile-jwt"]
    }'
    
    if [ -n "$client_uuid" ]; then
        echo "  Client exists (ID: $client_uuid), updating..."
        curl -sf -X PUT "$KEYCLOAK_URL/admin/realms/$REALM/clients/$client_uuid" \
            -H "Authorization: Bearer $ACCESS_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$client_config"
    else
        echo "  Creating new client..."
        curl -sf -X POST "$KEYCLOAK_URL/admin/realms/$REALM/clients" \
            -H "Authorization: Bearer $ACCESS_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$client_config"
    fi
    
    echo "  Client configured"
}

create_roles() {
    echo "Creating realm roles..."
    
    for role in "superadmin" "admin" "mentor" "mentee"; do
        echo "  Creating role: $role"
        curl -sf -X POST "$KEYCLOAK_URL/admin/realms/$REALM/roles" \
            -H "Authorization: Bearer $ACCESS_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{
                "name": "'$role'",
                "description": "RDY '$role' role",
                "composite": false
            }' 2>/dev/null || echo "    (already exists)"
    done
    
    echo "  Roles created"
}

create_test_user() {
    local username="$1"
    local email="$2"
    local password="$3"
    local firstname="$4"
    local lastname="$5"
    local role="$6"
    
    echo "Creating user: $username ($role)"
    
    local existing=$(curl -sf \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        "$KEYCLOAK_URL/admin/realms/$REALM/users?username=$username&exact=true")
    
    local user_id=$(echo "$existing" | jq -r '.[0].id // empty')
    
    if [ -n "$user_id" ]; then
        echo "  User exists (ID: $user_id), updating..."
    else
        echo "  Creating new user..."
        curl -sf -X POST "$KEYCLOAK_URL/admin/realms/$REALM/users" \
            -H "Authorization: Bearer $ACCESS_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{
                "username": "'$username'",
                "email": "'$email'",
                "firstName": "'$firstname'",
                "lastName": "'$lastname'",
                "enabled": true,
                "emailVerified": true,
                "credentials": [{
                    "type": "password",
                    "value": "'$password'",
                    "temporary": false
                }]
            }'
        
        user_id=$(curl -sf \
            -H "Authorization: Bearer $ACCESS_TOKEN" \
            "$KEYCLOAK_URL/admin/realms/$REALM/users?username=$username&exact=true" | jq -r '.[0].id')
    fi
    
    # Set password
    curl -sf -X PUT "$KEYCLOAK_URL/admin/realms/$REALM/users/$user_id/reset-password" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "type": "password",
            "value": "'$password'",
            "temporary": false
        }' 2>/dev/null || true
    
    # Assign role
    echo "  Assigning role: $role"
    local role_data=$(curl -sf \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        "$KEYCLOAK_URL/admin/realms/$REALM/roles/$role")
    
    curl -sf -X POST "$KEYCLOAK_URL/admin/realms/$REALM/users/$user_id/role-mappings/realm" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d "[$role_data]"
    
    echo "  User configured"
}

generate_env_file() {
    local env_file="${1:-.env.local}"
    local nextauth_secret=$(openssl rand -base64 32)
    local auth_secret=$(openssl rand -base64 32)

    cat > "$env_file" << EOF
# Keycloak Configuration for RDY
# Generated by bootstrap-keycloak.sh on $(date -Iseconds)

# Database
DATABASE_URL=postgresql://rdy:rdy_secret_2026@localhost:5434/rdy

# Keycloak Settings
KEYCLOAK_URL=$KEYCLOAK_URL
KEYCLOAK_REALM=$REALM
KEYCLOAK_CLIENT_ID=$CLIENT_ID
KEYCLOAK_CLIENT_SECRET=$CLIENT_SECRET

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=$nextauth_secret

# NextAuth v4/v5 format
AUTH_KEYCLOAK_ID=$CLIENT_ID
AUTH_KEYCLOAK_SECRET=$CLIENT_SECRET
AUTH_KEYCLOAK_ISSUER=$KEYCLOAK_URL/realms/$REALM
AUTH_URL=http://localhost:3001
AUTH_SECRET=$auth_secret

# Application Port (RDY runs on 3001)
PORT=3001
EOF

    echo ""
    echo "Environment file generated: $env_file"
}

# Main execution
wait_for_keycloak
get_admin_token
create_realm

echo "Configuring realm to allow HTTP..."
curl -sf -X PUT "$KEYCLOAK_URL/admin/realms/$REALM" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"sslRequired": "none"}' && echo "  SSL requirement disabled"

create_client
create_roles

echo ""
echo "Creating test users..."
create_test_user "testsuperadmin" "testsuperadmin@rdy.local" "Super1234!" "Test" "Superadmin" "superadmin"
create_test_user "testadmin" "testadmin@rdy.local" "Admin1234!" "Test" "Admin" "admin"
create_test_user "testmentor" "testmentor@rdy.local" "Mentor1234!" "Test" "Mentor" "mentor"
create_test_user "testmentee" "testmentee@rdy.local" "Mentee1234!" "Test" "Mentee" "mentee"

generate_env_file ".env.local"

echo ""
echo "========================================"
echo "RDY Keycloak Bootstrap Complete!"
echo "========================================"
echo ""
echo "Keycloak Admin Console:"
echo "  URL:      $KEYCLOAK_URL/admin"
echo "  Username: $ADMIN_USER"
echo "  Password: $ADMIN_PASS"
echo ""
echo "RDY Client:"
echo "  Realm:    $REALM"
echo "  Client:   $CLIENT_ID"
echo "  Secret:   $CLIENT_SECRET"
echo ""
echo "Test Users:"
echo "  testsuperadmin / Super1234!  (role: superadmin)"
echo "  testadmin      / Admin1234!  (role: admin)"
echo "  testmentor     / Mentor1234! (role: mentor)"
echo "  testmentee     / Mentee1234! (role: mentee)"
echo ""
echo "Configuration saved to .env.local"
echo ""
