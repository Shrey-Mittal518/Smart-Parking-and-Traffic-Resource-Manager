const mysql = require('mysql2/promise');

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host:     process.env.DB_HOST     || 'localhost',
      port:     Number(process.env.DB_PORT) || 3306,
      user:     process.env.DB_USER     || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME     || 'sptrm',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return pool;
}

/**
 * Run once at startup: create the users table if it doesn't exist.
 * Schema matches the existing sptrm database (user_id, full_name).
 */
async function initDb() {
  const db = getPool();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      user_id       INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
      full_name     VARCHAR(120) NOT NULL,
      email         VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role          VARCHAR(20)  NOT NULL DEFAULT 'user',
      created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('[DB] users table ready');
}

module.exports = { getPool, initDb };
