#!/bin/bash
# Quick Database Setup - Run this with: sudo ./scripts/quick-db-setup.sh

set -e

echo "Setting up RDY database..."

# Run as postgres user to avoid password prompts
sudo -u postgres psql -h localhost -p 5434 << 'EOF'
-- Create user (ignore error if exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'rdy') THEN
    CREATE USER rdy WITH PASSWORD 'rdy_dev_password';
  END IF;
END
$$;

-- Create database (ignore error if exists)
SELECT 'CREATE DATABASE rdy OWNER rdy'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'rdy')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE rdy TO rdy;

\c rdy

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO rdy;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO rdy;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO rdy;

\q
EOF

echo "✓ Database and user created"

# Now push schema and seed data
echo "Pushing database schema..."
cd /home/stefan/projects/rdy
export DATABASE_URL="postgresql://rdy:rdy_dev_password@localhost:5434/rdy"
npm run db:push

echo "Seeding test data..."
npm run db:seed

echo ""
echo "========================================  "
echo "✓ Setup complete!"
echo "========================================"
echo ""
echo "Test users created in database:"
echo "  - admin@test.com"
echo "  - mentor@test.com"
echo "  - mentee1@test.com (Franz Josef)"
echo "  - mentee2@test.com"
echo "  - mentee3@test.com"
echo ""
echo "Next: Create these users in Keycloak with:"
echo "  ./scripts/create-keycloak-users.sh"
echo ""
