// src/lib/db/index.ts
// This file sets up our PostgreSQL connections using the "pg" package.
// Make sure you have installed the pg package: npm install pg

import { Pool } from "pg";

// Create a connection pool for the main database (Flatiron/Williamsburg)
const mainPool = new Pool({
  connectionString: process.env.DATABASE_URL, // e.g., postgres://user:password@host:port/database
});

// Create a connection pool for the Othership database
const othershipPool = new Pool({
  connectionString: process.env.OTHERSHIP_DATABASE_URL, // Separate connection string for Othership
});

// Export both pools so they can be used throughout your application
export { mainPool as default, othershipPool };
