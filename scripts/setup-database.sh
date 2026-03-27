#!/bin/bash

# Database Setup Script for RDY
# Sets up PostgreSQL database and user

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}RDY Database Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Database configuration
DB_NAME="rdy"
DB_USER="rdy"
DB_PASSWORD="rdy_dev_password"
DB_PORT="5434"

echo -e "${YELLOW}This script will:${NC}"
echo "1. Create PostgreSQL database: $DB_NAME"
echo "2. Create PostgreSQL user: $DB_USER"
echo "3. Grant privileges"
echo "4. Push database schema"
echo "5. Seed test data"
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo -e "${BLUE}→ Step 1: Creating database and user...${NC}"

# Check if we can connect as postgres superuser
if psql -h localhost -p $DB_PORT -U postgres -c "SELECT 1" > /dev/null 2>&1; then
    POSTGRES_USER="postgres"
elif psql -h localhost -p $DB_PORT -U $USER -c "SELECT 1" > /dev/null 2>&1; then
    POSTGRES_USER="$USER"
else
    echo -e "${RED}✗ Cannot connect to PostgreSQL. Please ensure PostgreSQL is running on port $DB_PORT${NC}"
    exit 1
fi

echo -e "${GREEN}  ✓ Connected to PostgreSQL as $POSTGRES_USER${NC}"

# Create user if doesn't exist
psql -h localhost -p $DB_PORT -U $POSTGRES_USER -tc "SELECT 1 FROM pg_user WHERE usename = '$DB_USER'" | grep -q 1 || \
psql -h localhost -p $DB_PORT -U $POSTGRES_USER -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"

echo -e "${GREEN}  ✓ User '$DB_USER' ready${NC}"

# Create database if doesn't exist
psql -h localhost -p $DB_PORT -U $POSTGRES_USER -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
psql -h localhost -p $DB_PORT -U $POSTGRES_USER -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

echo -e "${GREEN}  ✓ Database '$DB_NAME' ready${NC}"

# Grant privileges
psql -h localhost -p $DB_PORT -U $POSTGRES_USER -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" > /dev/null

echo -e "${GREEN}  ✓ Privileges granted${NC}"
echo ""

echo -e "${BLUE}→ Step 2: Pushing database schema...${NC}"
export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:$DB_PORT/$DB_NAME"
npm run db:push

echo ""
echo -e "${BLUE}→ Step 3: Seeding test data...${NC}"
npm run db:seed

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Database setup complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Connection string:${NC}"
echo "DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:$DB_PORT/$DB_NAME"
echo ""
echo -e "${BLUE}Test users created:${NC}"
echo "  admin@test.com"
echo "  mentor@test.com"
echo "  mentee1@test.com (Franz Josef)"
echo "  mentee2@test.com (Anna Mueller)"
echo "  mentee3@test.com (Thomas Weber)"
echo ""
echo -e "${YELLOW}Next step: Create these users in Keycloak${NC}"
echo "Run: ./scripts/create-keycloak-users.sh"
echo ""
