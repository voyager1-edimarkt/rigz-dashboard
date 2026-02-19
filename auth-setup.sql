-- Auth Database Setup Script
-- Run this on your MySQL/MariaDB server to set up the auth tables
-- Replace the password hash or use the app's default: admin / admin123

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR(255) PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_session_expire ON session (expire);

-- Default admin user (password: admin123)
-- To generate a new hash, use: node -e "require('bcryptjs').hash('yourpassword', 10).then(h => console.log(h))"
INSERT INTO users (username, password) VALUES ('admin', '$2a$10$PLACEHOLDER_HASH');
