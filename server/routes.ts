import type { Express } from "express";
import { createServer, type Server } from "http";
import { query, queryNoDb, testConnection } from "./mysql";
import { queryRequestSchema } from "@shared/schema";
import { log } from "./index";

function sanitizeIdentifier(name: string): string | null {
  if (!name || !/^[a-zA-Z0-9_]+$/.test(name)) {
    return null;
  }
  return name;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/connection/status", async (_req, res) => {
    try {
      const status = await testConnection();
      res.json(status);
    } catch (err: any) {
      res.json({ connected: false, error: err.message });
    }
  });

  app.get("/api/databases", async (_req, res) => {
    try {
      const rows = await queryNoDb("SHOW DATABASES");
      const databases = (rows as any[])
        .map((r: any) => ({ name: r.Database }))
        .filter((db: any) => !["information_schema", "performance_schema", "sys"].includes(db.name));
      res.json(databases);
    } catch (err: any) {
      log(`Error listing databases: ${err.message}`, "mysql");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/databases/:database/tables", async (req, res) => {
    const { database } = req.params;
    try {
      const rows = await queryNoDb(
        `SELECT TABLE_NAME as name, TABLE_TYPE as type, TABLE_ROWS as \`rows\`, ENGINE as engine
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = ?
         ORDER BY TABLE_NAME`,
        [database]
      );
      const tables = (rows as any[]).map((r: any) => ({
        name: r.name,
        type: r.type === "BASE TABLE" ? "TABLE" : "VIEW",
        rows: r.rows ?? 0,
        engine: r.engine || "",
      }));
      res.json(tables);
    } catch (err: any) {
      log(`Error listing tables: ${err.message}`, "mysql");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/databases/:database/tables/:table/columns", async (req, res) => {
    const { database, table } = req.params;
    try {
      const rows = await queryNoDb(
        `SELECT COLUMN_NAME as name, COLUMN_TYPE as type, IS_NULLABLE as nullable,
                COLUMN_KEY as \`key\`, COLUMN_DEFAULT as defaultValue, EXTRA as extra
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
         ORDER BY ORDINAL_POSITION`,
        [database, table]
      );
      const columns = (rows as any[]).map((r: any) => ({
        name: r.name,
        type: r.type,
        nullable: r.nullable === "YES",
        key: r.key || "",
        defaultValue: r.defaultValue,
        extra: r.extra || "",
      }));
      res.json(columns);
    } catch (err: any) {
      log(`Error listing columns: ${err.message}`, "mysql");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/databases/:database/tables/:table/data", async (req, res) => {
    const { database, table } = req.params;

    const safeDb = sanitizeIdentifier(database);
    const safeTable = sanitizeIdentifier(table);
    if (!safeDb || !safeTable) {
      return res.status(400).json({ message: "Invalid database or table name" });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 500);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

    try {
      const countResult = await queryNoDb(
        `SELECT COUNT(*) as total FROM \`${safeDb}\`.\`${safeTable}\``
      );
      const totalRows = Number((countResult as any[])[0]?.total ?? 0);

      const rows = await queryNoDb(
        `SELECT * FROM \`${safeDb}\`.\`${safeTable}\` LIMIT ${limit} OFFSET ${offset}`
      );

      const dataRows = rows as any[];
      const columns = dataRows.length > 0 ? Object.keys(dataRows[0]) : [];

      res.json({
        columns,
        rows: dataRows,
        rowCount: totalRows,
        executionTime: 0,
      });
    } catch (err: any) {
      log(`Error fetching table data: ${err.message}`, "mysql");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/customers", async (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 500);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
    const search = (req.query.search as string) || "";
    const status = (req.query.status as string) || "";
    const state = (req.query.state as string) || "";

    try {
      let where = "WHERE 1=1";
      const params: any[] = [];

      if (search) {
        where += " AND (c.name LIKE ? OR c.companyName LIKE ? OR c.city LIKE ? OR c.email LIKE ?)";
        const s = `%${search}%`;
        params.push(s, s, s, s);
      }
      if (status) {
        where += " AND c.status = ?";
        params.push(status);
      }
      if (state) {
        where += " AND c.state = ?";
        params.push(state);
      }

      const countResult = await queryNoDb(
        `SELECT COUNT(*) as total FROM runtime.customers c ${where}`,
        params
      );
      const total = Number((countResult as any[])[0]?.total ?? 0);

      const rows = await queryNoDb(
        `SELECT c.name, c.companyName, c.address, c.city, c.state, c.zip, c.country, c.email, c.secondaryEmail, c.phone, c.officePhone, c.status, c.deleted, c.crmId, c.parent, c.priceLevel, c.createdAt, c.updatedAt
         FROM runtime.customers c ${where}
         ORDER BY c.companyName ASC
         LIMIT ${limit} OFFSET ${offset}`,
        params
      );

      res.json({ rows, total });
    } catch (err: any) {
      log(`Error fetching customers: ${err.message}`, "mysql");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/customers/stats", async (_req, res) => {
    try {
      const [totalResult, statusResult, stateResult, countryResult, recentResult, parentResult, caProvinceResult] = await Promise.all([
        queryNoDb("SELECT COUNT(*) as total FROM runtime.customers"),
        queryNoDb("SELECT status, COUNT(*) as cnt FROM runtime.customers GROUP BY status"),
        queryNoDb("SELECT state, COUNT(*) as cnt FROM runtime.customers WHERE state IS NOT NULL AND state != '' AND country = 'US' GROUP BY state ORDER BY cnt DESC LIMIT 10"),
        queryNoDb("SELECT country, COUNT(*) as cnt FROM runtime.customers WHERE country IS NOT NULL GROUP BY country ORDER BY cnt DESC"),
        queryNoDb("SELECT name, companyName, city, state, country, createdAt FROM runtime.customers ORDER BY createdAt DESC LIMIT 5"),
        queryNoDb("SELECT COUNT(DISTINCT parent) as cnt FROM runtime.customers WHERE parent IS NOT NULL"),
        queryNoDb("SELECT state as province, COUNT(*) as cnt FROM runtime.customers WHERE country = 'CA' AND state IS NOT NULL AND state != '' GROUP BY state ORDER BY cnt DESC"),
      ]);

      res.json({
        total: Number((totalResult as any[])[0]?.total ?? 0),
        byStatus: statusResult,
        byState: stateResult,
        byCountry: countryResult,
        byProvince: caProvinceResult,
        recent: recentResult,
        parentAccounts: Number((parentResult as any[])[0]?.cnt ?? 0),
      });
    } catch (err: any) {
      log(`Error fetching customer stats: ${err.message}`, "mysql");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/orders", async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 25, 100);
      const offset = Number(req.query.offset) || 0;
      const search = (req.query.search as string) || "";
      const status = (req.query.status as string) || "";

      let where = "WHERE 1=1";
      const params: any[] = [];
      if (search) {
        where += " AND (o.orderNumber LIKE ? OR o.crmId LIKE ?)";
        params.push(`%${search}%`, `%${search}%`);
      }
      if (status) {
        where += " AND o.status = ?";
        params.push(status);
      }

      const countResult = await queryNoDb(
        `SELECT COUNT(*) as total FROM runtime.orders o ${where}`,
        params
      );
      const total = Number((countResult as any[])[0]?.total ?? 0);

      const rows = await queryNoDb(
        `SELECT o.id, o.\`index\`, o.orderNumber, o.vendor, o.country, o.orderDate, o.crmId, o.status, o.statusMessage, o.channel, o.test, o.createdAt, o.updatedAt, o.purchaseOrderNumber
         FROM runtime.orders o ${where}
         ORDER BY o.createdAt DESC
         LIMIT ${limit} OFFSET ${offset}`,
        params
      );

      res.json({ rows, total });
    } catch (err: any) {
      log(`Error fetching orders: ${err.message}`, "mysql");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/orders/stats", async (_req, res) => {
    try {
      const [totalResult, statusResult, recentByDay] = await Promise.all([
        queryNoDb("SELECT COUNT(*) as total FROM runtime.orders"),
        queryNoDb("SELECT status, COUNT(*) as cnt FROM runtime.orders GROUP BY status ORDER BY cnt DESC"),
        queryNoDb("SELECT DATE(orderDate) as day, COUNT(*) as cnt FROM runtime.orders WHERE orderDate >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY DATE(orderDate) ORDER BY day DESC LIMIT 30"),
      ]);

      res.json({
        total: Number((totalResult as any[])[0]?.total ?? 0),
        byStatus: statusResult,
        recentByDay: recentByDay,
      });
    } catch (err: any) {
      log(`Error fetching order stats: ${err.message}`, "mysql");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const rows = await queryNoDb(
        `SELECT * FROM runtime.orders WHERE id = ?`,
        [req.params.id]
      );
      const order = (rows as any[])[0];
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (err: any) {
      log(`Error fetching order detail: ${err.message}`, "mysql");
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/query", async (req, res) => {
    try {
      const parsed = queryRequestSchema.parse(req.body);
      const startTime = Date.now();

      const rows = await query(parsed.sql, undefined, parsed.database);
      const executionTime = Date.now() - startTime;

      if (Array.isArray(rows)) {
        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
        res.json({
          columns,
          rows,
          rowCount: rows.length,
          executionTime,
        });
      } else {
        res.json({
          columns: ["affectedRows", "insertId", "info"],
          rows: [
            {
              affectedRows: (rows as any).affectedRows ?? 0,
              insertId: (rows as any).insertId ?? 0,
              info: (rows as any).info ?? "",
            },
          ],
          rowCount: 1,
          executionTime,
        });
      }
    } catch (err: any) {
      res.status(400).json({
        columns: [],
        rows: [],
        rowCount: 0,
        executionTime: 0,
        error: err.message,
      });
    }
  });

  return httpServer;
}
