/**
 * ============================================================================
 *  event_db.js — MySQL connection layer for the Charity Events API (A3)
 * ============================================================================
 *  Updated in Assessment 3:
 *    * The pool configuration is unchanged, but this module now also exports a
 *      `withTransaction` helper so multi-step writes (for example a delete that
 *      must first count registrations) can run atomically.
 *    * Credentials still come from the git-ignored `.env` file, never from the
 *      source code.
 * ============================================================================
 */

// Load DB credentials from api/.env (DB_HOST, DB_USER, DB_PASSWORD, ...).
require('dotenv').config();

// mysql2/promise gives us async/await, which keeps the route handlers readable.
const mysql = require('mysql2/promise');

/**
 * The shared connection pool. A pool is reused across requests, which is far
 * more efficient than opening a fresh connection for every API call.
 */
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'charityevents_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true,          // return DATETIME as "YYYY-MM-DD HH:MM:SS"
    charset: 'utf8mb4'
});

/**
 * Run a SELECT/INSERT/UPDATE/DELETE and return only the rows.
 * Uses prepared statements (`?` placeholders) so user input can never be
 * concatenated into the SQL — the main defence against SQL injection.
 *
 * @param {string} sql
 * @param {Array}  params
 * @returns {Promise<Array>}
 */
async function query(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows;
}

/**
 * Run an INSERT and return the generated id plus affected-row count.
 * @param {string} sql
 * @param {Array}  params
 */
async function insert(sql, params = []) {
    const [result] = await pool.execute(sql, params);
    return { insertId: result.insertId, affectedRows: result.affectedRows };
}

/**
 * Run an UPDATE/DELETE and return how many rows were affected.
 * @param {string} sql
 * @param {Array}  params
 */
async function execute(sql, params = []) {
    const [result] = await pool.execute(sql, params);
    return { affectedRows: result.affectedRows };
}

/**
 * Execute a set of statements inside a single transaction. If the callback
 * throws, every change is rolled back, which protects data integrity for the
 * multi-step operations introduced in Assessment 3.
 *
 * @param {(conn: import('mysql2/promise').Connection) => Promise<any>} work
 */
async function withTransaction(work) {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const result = await work(conn);
        await conn.commit();
        return result;
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

/** Startup health check used by server.js. */
async function testConnection() {
    const [row] = await pool.query('SELECT 1 AS ok');
    return row[0].ok === 1;
}

module.exports = { pool, query, insert, execute, withTransaction, testConnection };
