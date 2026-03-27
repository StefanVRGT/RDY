#!/bin/bash
# Interactive Database Setup

set -e

echo "========================================  "
echo "RDY Database Setup (Interactive)"
echo "========================================"
echo ""
echo "This will create:"
echo "  - Database: rdy"
echo "  - User: rdy (password: rdy_dev_password)"
echo ""

# Prompt for postgres password
echo "Enter PostgreSQL 'postgres' user password:"
read -s PGPASS
echo ""

export PGPASSWORD="$PGPASS"

echo "Creating database and user..."

psql -h localhost -p 5434 -U postgres << 'EOF'
-- Create user
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'rdy') THEN
    CREATE USER rdy WITH PASSWORD 'rdy_dev_password';
  END IF;
END
$$;

-- Create database
SELECT 'CREATE DATABASE rdy OWNER rdy'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'rdy')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE rdy TO rdy;
EOF

if [ $? -eq 0 ]; then
    echo "✓ Database and user created"
    echo ""

    # Push schema
    echo "Pushing database schema..."
    export DATABASE_URL="postgresql://rdy:rdy_dev_password@localhost:5434/rdy"
    npm run db:push

    echo ""
    echo "Seeding test data..."
    npm run db:seed

    echo ""
    echo "========================================"
    echo "✓ Setup complete!"
    echo "========================================"
    echo ""
    echo "You can now login with:"
    echo "  mentee1@test.com / Test1234!"
    echo ""
else
    echo "✗ Failed to create database"
    exit 1
fi
