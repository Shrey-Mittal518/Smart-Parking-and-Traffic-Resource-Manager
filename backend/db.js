// ============================================================
// SPTRM – MySQL Connection Pool
// ============================================================
require('dotenv').config({ path: './file.env' });
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host             : process.env.DB_HOST     || 'localhost',
  user             : process.env.DB_USER     || 'root',
  password         : process.env.DB_PASSWORD || '',
  database         : process.env.DB_NAME     || 'sptrm_db',
  waitForConnections: true,
  connectionLimit  : 10,
  queueLimit       : 0,
});

// Verify connection on startup
pool.getConnection()
  .then((conn) => {
    console.log('[DB] MySQL connected to', process.env.DB_NAME);
    conn.release();
  })
  .catch((err) => {
    console.error('[DB] Connection failed:', err.message);
    console.error('     Make sure MySQL is running and file.env credentials are correct.');
  });

module.exports = pool;
