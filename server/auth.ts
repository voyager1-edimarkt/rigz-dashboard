import pg from "pg";
import bcrypt from "bcryptjs";
import { log } from "./index";

const { Pool } = pg;

let pool: pg.Pool;

function getAuthPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return pool;
}

export async function initAuthDB() {
  const p = getAuthPool();

  await p.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const result = await p.query("SELECT COUNT(*) as count FROM users");
  if (parseInt(result.rows[0].count) === 0) {
    const hash = await bcrypt.hash("admin123", 10);
    await p.query(
      "INSERT INTO users (username, password) VALUES ($1, $2)",
      ["admin", hash]
    );
    log("Default admin user created (username: admin, password: admin123)", "auth");
  }

  log("Auth database initialized (PostgreSQL)", "auth");
}

export async function verifyUser(username: string, password: string): Promise<{ id: number; username: string } | null> {
  const p = getAuthPool();
  const result = await p.query(
    "SELECT id, username, password FROM users WHERE username = $1",
    [username]
  );

  if (result.rows.length === 0) return null;

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return null;

  return { id: user.id, username: user.username };
}

export { getAuthPool };
