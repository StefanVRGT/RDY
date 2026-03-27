#!/bin/bash

# Keycloak User Creation Script for RDY
# Creates test users in Keycloak with default password: Test1234!

set -e

# Configuration
KEYCLOAK_URL="https://auth.neonnidavellir.com"
REALM="rdy"
DEFAULT_PASSWORD="Test1234!"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}RDY Keycloak User Creation Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Prompt for Keycloak admin credentials
echo -e "${YELLOW}Enter Keycloak admin credentials:${NC}"
read -p "Admin username [admin]: " ADMIN_USER
ADMIN_USER=${ADMIN_USER:-admin}

read -sp "Admin password: " ADMIN_PASSWORD
echo ""
echo ""

# Get admin access token
echo -e "${BLUE}→ Obtaining admin access token...${NC}"
TOKEN_RESPONSE=$(curl -s -X POST "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$ADMIN_USER" \
  -d "password=$ADMIN_PASSWORD" \
  -d "grant_type=password" \
  -d "client_id=admin-cli")

ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo -e "${RED}✗ Failed to obtain access token. Check your credentials.${NC}"
  echo "Response: $TOKEN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Access token obtained${NC}"
echo ""

# Function to create a user
create_user() {
  local EMAIL=$1
  local FIRST_NAME=$2
  local LAST_NAME=$3
  local ROLE=$4

  echo -e "${BLUE}→ Creating user: $EMAIL${NC}"

  # Create user
  USER_DATA=$(cat <<EOF
{
  "username": "$EMAIL",
  "email": "$EMAIL",
  "firstName": "$FIRST_NAME",
  "lastName": "$LAST_NAME",
  "enabled": true,
  "emailVerified": true,
  "attributes": {
    "role": ["$ROLE"]
  }
}
EOF
)

  CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$KEYCLOAK_URL/admin/realms/$REALM/users" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$USER_DATA")

  HTTP_CODE=$(echo "$CREATE_RESPONSE" | tail -n1)
  RESPONSE_BODY=$(echo "$CREATE_RESPONSE" | head -n-1)

  if [ "$HTTP_CODE" = "201" ]; then
    echo -e "${GREEN}  ✓ User created${NC}"

    # Get user ID from location header - need to extract it differently
    USER_ID=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$REALM/users?email=$EMAIL" \
      -H "Authorization: Bearer $ACCESS_TOKEN" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

    if [ -n "$USER_ID" ]; then
      # Set password
      PASSWORD_DATA=$(cat <<EOF
{
  "type": "password",
  "value": "$DEFAULT_PASSWORD",
  "temporary": false
}
EOF
)

      curl -s -X PUT "$KEYCLOAK_URL/admin/realms/$REALM/users/$USER_ID/reset-password" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$PASSWORD_DATA" > /dev/null

      echo -e "${GREEN}  ✓ Password set to: $DEFAULT_PASSWORD${NC}"

      # Assign realm role
      ROLE_ID=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$REALM/roles/$ROLE" \
        -H "Authorization: Bearer $ACCESS_TOKEN" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

      if [ -n "$ROLE_ID" ]; then
        ROLE_MAPPING=$(cat <<EOF
[{
  "id": "$ROLE_ID",
  "name": "$ROLE"
}]
EOF
)
        curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM/users/$USER_ID/role-mappings/realm" \
          -H "Authorization: Bearer $ACCESS_TOKEN" \
          -H "Content-Type: application/json" \
          -d "$ROLE_MAPPING" > /dev/null

        echo -e "${GREEN}  ✓ Role '$ROLE' assigned${NC}"
      fi
    fi
  elif [ "$HTTP_CODE" = "409" ]; then
    echo -e "${YELLOW}  ! User already exists${NC}"
  else
    echo -e "${RED}  ✗ Failed to create user (HTTP $HTTP_CODE)${NC}"
    echo "  Response: $RESPONSE_BODY"
  fi

  echo ""
}

# Create users
echo -e "${BLUE}Creating users in realm: $REALM${NC}"
echo ""

create_user "admin@test.com" "Admin" "User" "admin"
create_user "mentor@test.com" "Maria" "Schneider" "mentor"
create_user "mentee1@test.com" "Franz" "Josef" "mentee"
create_user "mentee2@test.com" "Anna" "Mueller" "mentee"
create_user "mentee3@test.com" "Thomas" "Weber" "mentee"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ User creation complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Test Credentials:${NC}"
echo "  admin@test.com     / $DEFAULT_PASSWORD"
echo "  mentor@test.com    / $DEFAULT_PASSWORD"
echo "  mentee1@test.com   / $DEFAULT_PASSWORD"
echo "  mentee2@test.com   / $DEFAULT_PASSWORD"
echo "  mentee3@test.com   / $DEFAULT_PASSWORD"
echo ""
echo -e "${YELLOW}Note: Make sure realm roles exist in Keycloak:${NC}"
echo "  - admin"
echo "  - mentor"
echo "  - mentee"
echo ""
