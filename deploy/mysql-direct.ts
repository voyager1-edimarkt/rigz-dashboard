import mysql from "mysql2/promise";
import { log } from "./index";

let pool: mysql.Pool | null = null;

function getConfig() {
  return {
    mysqlHost: process.env.MYSQL_HOST || "127.0.0.1",
    mysqlPort: parseInt(process.env.MYSQL_PORT || "3306"),
    mysqlUser: process.env.MYSQL_USER || "runtime",
    mysqlPassword: process.env.MYSQL_PASSWORD || "",
    mysqlDatabase: process.env.MYSQL_DATABASE || "data",
  };
}

function getPool(): mysql.Pool {
  if (!pool) {
    const config = getConfig();
    pool = mysql.createPool({
      host: config.mysqlHost,
      port: config.mysqlPort,
      user: config.mysqlUser,
      password: config.mysqlPassword,
      database: config.mysqlDatabase,
      waitForConnections: true,
      connectionLimit: 10,
      connectTimeout: 30000,
    });
    log(`MySQL pool created (${config.mysqlHost}:${config.mysqlPort})`, "mysql");
  }
  return pool;
}

export async function query(sql: string, params?: any[], database?: string): Promise<any> {
  const p = getPool();

  if (database) {
    const conn = await p.getConnection();
    try {
      await conn.query(`USE \`${database}\``);
      const [rows] = await conn.execute(sql, params);
      return rows;
    } finally {
      conn.release();
    }
  }

  const [rows] = await p.execute(sql, params);
  return rows;
}

export async function queryNoDb(sql: string, params?: any[]): Promise<any> {
  return query(sql, params, undefined);
}

export async function testConnection(): Promise<{ connected: boolean; host: string; database: string; error?: string }> {
  const config = getConfig();
  try {
    await queryNoDb("SELECT 1");
    return {
      connected: true,
      host: config.mysqlHost,
      database: config.mysqlDatabase,
    };
  } catch (err: any) {
    return {
      connected: false,
      host: config.mysqlHost,
      database: config.mysqlDatabase,
      error: err.message,
    };
  }
}

export async function cleanup() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
