import session from "express-session";
import mysql from "mysql2/promise";

export class MySQLSessionStore extends session.Store {
  private pool: mysql.Pool;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(pool: mysql.Pool) {
    super();
    this.pool = pool;
    this.cleanupInterval = setInterval(() => this.cleanup(), 15 * 60 * 1000);
  }

  async get(sid: string, callback: (err?: any, session?: session.SessionData | null) => void) {
    try {
      const [rows] = await this.pool.query(
        "SELECT sess FROM `session` WHERE sid = ? AND expire > NOW()",
        [sid]
      ) as any;
      if (rows.length === 0) return callback(null, null);
      const sess = typeof rows[0].sess === "string" ? JSON.parse(rows[0].sess) : rows[0].sess;
      callback(null, sess);
    } catch (err) {
      callback(err);
    }
  }

  async set(sid: string, sessionData: session.SessionData, callback?: (err?: any) => void) {
    try {
      const maxAge = sessionData.cookie?.maxAge || 86400000;
      const expire = new Date(Date.now() + maxAge);
      const sess = JSON.stringify(sessionData);
      await this.pool.query(
        "REPLACE INTO `session` (sid, sess, expire) VALUES (?, ?, ?)",
        [sid, sess, expire]
      );
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  async destroy(sid: string, callback?: (err?: any) => void) {
    try {
      await this.pool.query("DELETE FROM `session` WHERE sid = ?", [sid]);
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  async cleanup() {
    try {
      await this.pool.query("DELETE FROM `session` WHERE expire < NOW()");
    } catch {}
  }

  close() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}
