import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { log } from "./index";

let pool: mysql.Pool;

function getAuthPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.AUTH_MYSQL_HOST || process.env.MYSQL_HOST || "127.0.0.1",
      port: parseInt(process.env.AUTH_MYSQL_PORT || process.env.MYSQL_PORT || "3306"),
      user: process.env.AUTH_MYSQL_USER || process.env.MYSQL_USER || "runtime",
      password: process.env.AUTH_MYSQL_PASSWORD || process.env.MYSQL_PASSWORD || "",
      database: process.env.AUTH_MYSQL_DATABASE || process.env.MYSQL_DATABASE || "data",
      waitForConnections: true,
      connectionLimit: 5,
    });
  }
  return pool;
}

export async function initAuthDB() {
  const p = getAuthPool();

  await p.query(`
    CREATE TABLE IF NOT EXISTS \`session\` (
      \`sid\` VARCHAR(255) NOT NULL,
      \`sess\` JSON NOT NULL,
      \`expire\` DATETIME(6) NOT NULL,
      PRIMARY KEY (\`sid\`),
      INDEX \`IDX_session_expire\` (\`expire\`)
    ) ENGINE=InnoDB
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);

  const [rows] = await p.query("SELECT COUNT(*) as count FROM users") as any;
  if (parseInt(rows[0].count) === 0) {
    const hash = await bcrypt.hash("admin123", 10);
    await p.query(
      "INSERT INTO users (username, password) VALUES (?, ?)",
      ["admin", hash]
    );
    log("Default admin user created (username: admin, password: admin123)", "auth");
  }

  log("Auth database initialized (MySQL)", "auth");
}

export async function verifyUser(username: string, password: string): Promise<{ id: number; username: string } | null> {
  const p = getAuthPool();
  const [rows] = await p.query(
    "SELECT id, username, password FROM users WHERE username = ?",
    [username]
  ) as any;

  if (rows.length === 0) return null;

  const user = rows[0];
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return null;

  return { id: user.id, username: user.username };
}

export { getAuthPool };
