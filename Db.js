/**
 * db.js
 * Creates and exports a MySQL2 connection pool.
 * All other modules import this — never create their own connections.
 */

const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || "localhost",
  port:               parseInt(process.env.DB_PORT || "3306"),
  user:               process.env.DB_USER     || "root",
  password:           process.env.DB_PASSWORD || "08Dec02*",
  database:           process.env.DB_NAME     || "medical_ai_demo",
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
});

module.exports = pool;
