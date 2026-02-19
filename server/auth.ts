import pg from "pg";
import bcrypt from "bcryptjs";
import { log } from "./index";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function initAuthDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "session" (
      "sid" varchar NOT NULL COLLATE "default",
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL,
      PRIMARY KEY ("sid")
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire")`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  const result = await pool.query("SELECT COUNT(*) FROM users");
  if (parseInt(result.rows[0].count) === 0) {
    const hash = await bcrypt.hash("admin123", 10);
    await pool.query(
      "INSERT INTO users (username, password) VALUES ($1, $2)",
      ["admin", hash]
    );
    log("Default admin user created (username: admin, password: admin123)", "auth");
  }

  log("Auth database initialized", "auth");
}

export async function verifyUser(username: string, password: string): Promise<{ id: number; username: string } | null> {
  const result = await pool.query(
    "SELECT id, username, password FROM users WHERE username = $1",
    [username]
  );

  if (result.rows.length === 0) return null;

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return null;

  return { id: user.id, username: user.username };
}
