import dotenv from "dotenv";
dotenv.config();
import pg from "pg";
import bcrypt from "bcryptjs";

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log("Usage: npx tsx script/add-user.ts <username> <password>");
  process.exit(1);
}

const [username, password] = args;

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const existing = await pool.query("SELECT id FROM users WHERE username = $1", [username]);
  if (existing.rows.length > 0) {
    console.log(`User "${username}" already exists.`);
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);
  await pool.query("INSERT INTO users (username, password) VALUES ($1, $2)", [username, hash]);
  console.log(`User "${username}" created successfully.`);
  await pool.end();
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
