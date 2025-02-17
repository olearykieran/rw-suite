// src/lib/db/index.ts
// This file sets up our PostgreSQL connection using the "pg" package.
// Make sure you have installed the pg package: npm install pg

import { Pool } from "pg";

// Create a new connection pool using your DATABASE_URL from environment variables.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // e.g., postgres://user:password@host:port/database
});

// Export the pool so it can be used throughout your application.
export default pool;
