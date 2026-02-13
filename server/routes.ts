import type { Express } from "express";
import type { Server } from "http";
import type { IStorage } from "./storage";
import { queryRequestSchema } from "@shared/schema";
import { log } from "./index";

export async function registerRoutes(
  httpServer: Server,
  app: Express,
  storage: IStorage
): Promise<Server> {

  app.get("/api/connection/status", async (_req, res) => {
    try {
      const status = await storage.testConnection();
      res.json(status);
    } catch (err: any) {
      res.json({ connected: false, error: err.message });
    }
  });

  app.get("/api/databases", async (_req, res) => {
    try {
      const databases = await storage.getDatabases();
      res.json(databases);
    } catch (err: any) {
      log(`Error listing databases: ${err.message}`, "mysql");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/databases/:database/tables", async (req, res) => {
    try {
      const tables = await storage.getTables(req.params.database);
      res.json(tables);
    } catch (err: any) {
      log(`Error listing tables: ${err.message}`, "mysql");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/databases/:database/tables/:table/columns", async (req, res) => {
    try {
      const columns = await storage.getColumns(req.params.database, req.params.table);
      res.json(columns);
    } catch (err: any) {
      log(`Error listing columns: ${err.message}`, "mysql");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/databases/:database/tables/:table/data", async (req, res) => {
    const { database, table } = req.params;
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 500);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

    try {
      const result = await storage.getTableData(database, table, limit, offset);
      res.json(result);
    } catch (err: any) {
      if (err.message === "Invalid database or table name") {
        return res.status(400).json({ message: err.message });
      }
      log(`Error fetching table data: ${err.message}`, "mysql");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/customers", async (req, res) => {
    try {
      const result = await storage.getCustomers({
        limit: Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 500),
        offset: Math.max(parseInt(req.query.offset as string) || 0, 0),
        search: (req.query.search as string) || undefined,
        status: (req.query.status as string) || undefined,
        state: (req.query.state as string) || undefined,
      });
      res.json(result);
    } catch (err: any) {
      log(`Error fetching customers: ${err.message}`, "mysql");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/customers/stats", async (_req, res) => {
    try {
      const stats = await storage.getCustomerStats();
      res.json(stats);
    } catch (err: any) {
      log(`Error fetching customer stats: ${err.message}`, "mysql");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/orders", async (req, res) => {
    try {
      const result = await storage.getOrders({
        limit: Math.min(Number(req.query.limit) || 25, 100),
        offset: Number(req.query.offset) || 0,
        search: (req.query.search as string) || undefined,
        status: (req.query.status as string) || undefined,
      });
      res.json(result);
    } catch (err: any) {
      log(`Error fetching orders: ${err.message}`, "mysql");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/orders/stats", async (_req, res) => {
    try {
      const stats = await storage.getOrderStats();
      res.json(stats);
    } catch (err: any) {
      log(`Error fetching order stats: ${err.message}`, "mysql");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const order = await storage.getOrderById(Number(req.params.id));
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (err: any) {
      log(`Error fetching order detail: ${err.message}`, "mysql");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/orders/:id/history", async (req, res) => {
    try {
      const history = await storage.getOrderHistory(Number(req.params.id));
      res.json(history);
    } catch (err: any) {
      log(`Error fetching order history: ${err.message}`, "mysql");
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/query", async (req, res) => {
    try {
      const parsed = queryRequestSchema.parse(req.body);
      const result = await storage.executeQuery(parsed.sql, parsed.database);
      res.json(result);
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
