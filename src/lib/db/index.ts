import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Connection pool configuration
const client = postgres(connectionString, {
  max: 10, // Maximum number of connections in the pool
  idle_timeout: 20, // Idle connection timeout in seconds
  connect_timeout: 10, // Connection timeout in seconds
});

export const db = drizzle(client, { schema });

export type Database = typeof db;
