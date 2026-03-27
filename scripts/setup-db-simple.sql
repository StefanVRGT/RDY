-- RDY Database Setup SQL
-- Run with: PGPASSWORD=your_postgres_password psql -h localhost -p 5434 -U postgres -f scripts/setup-db-simple.sql

-- Create user (ignore error if exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'rdy') THEN
    CREATE USER rdy WITH PASSWORD 'rdy_dev_password';
    RAISE NOTICE 'User rdy created';
  ELSE
    RAISE NOTICE 'User rdy already exists';
  END IF;
END
$$;

-- Create database (ignore error if exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'rdy') THEN
    PERFORM dblink_exec('dbname=' || current_database(), 'CREATE DATABASE rdy OWNER rdy');
    RAISE NOTICE 'Database rdy created';
  ELSE
    RAISE NOTICE 'Database rdy already exists';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- dblink might not be available, try direct command
    CREATE DATABASE rdy OWNER rdy;
END
$$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE rdy TO rdy;
