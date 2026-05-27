'use strict';

const { Pool } = require('pg');
console.log('[DB URL]', process.env.DATABASE_URL);
if (!process.env.DATABASE_URL) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL must be set in production.');
  }
  console.warn('[DB] WARNING: DATABASE_URL not set — DB features will fail.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Required for Supabase (uses self-signed cert on connection pooler)
  ssl: process.env.DATABASE_URL?.includes('supabase.co')
    ? { rejectUnauthorized: false }
    : undefined,
  max: 10,                // max connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

// Health check helper
async function checkConnection() {
  const { rows } = await pool.query('SELECT NOW()');
  return rows[0].now;
}

module.exports = pool;
module.exports.checkConnection = checkConnection;
