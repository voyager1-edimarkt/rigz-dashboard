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

  app.get("/api/products", async (req, res) => {
    try {
      const result = await storage.getProducts({
        limit: Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 500),
        offset: Math.max(parseInt(req.query.offset as string) || 0, 0),
        search: (req.query.search as string) || undefined,
        status: (req.query.status as string) || undefined,
        vendor: (req.query.vendor as string) || undefined,
        location: (req.query.location as string) || undefined,
        active: (req.query.active as string) || undefined,
      });
      res.json(result);
    } catch (err: any) {
      log(`Error fetching products: ${err.message}`, "mysql");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/products/stats", async (_req, res) => {
    try {
      const stats = await storage.getProductStats();
      res.json(stats);
    } catch (err: any) {
      log(`Error fetching product stats: ${err.message}`, "mysql");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/purchase-orders", async (req, res) => {
    try {
      const result = await storage.getPurchaseOrders({
        limit: Math.min(Number(req.query.limit) || 25, 100),
        offset: Number(req.query.offset) || 0,
        search: (req.query.search as string) || undefined,
        status: (req.query.status as string) || undefined,
        vendor: (req.query.vendor as string) || undefined,
      });
      res.json(result);
    } catch (err: any) {
      log(`Error fetching purchase orders: ${err.message}`, "mysql");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/purchase-orders/stats", async (_req, res) => {
    try {
      const stats = await storage.getPurchaseOrderStats();
      res.json(stats);
    } catch (err: any) {
      log(`Error fetching purchase order stats: ${err.message}`, "mysql");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/purchase-orders/:id", async (req, res) => {
    try {
      const po = await storage.getPurchaseOrderById(Number(req.params.id));
      if (!po) {
        return res.status(404).json({ message: "Purchase order not found" });
      }
      res.json(po);
    } catch (err: any) {
      log(`Error fetching purchase order detail: ${err.message}`, "mysql");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/purchase-orders/:id/history", async (req, res) => {
    try {
      const history = await storage.getPurchaseOrderHistory(Number(req.params.id));
      res.json(history);
    } catch (err: any) {
      log(`Error fetching purchase order history: ${err.message}`, "mysql");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/suppliers", async (req, res) => {
    try {
      const result = await storage.getSuppliers({
        limit: Math.min(Number(req.query.limit) || 25, 100),
        offset: Number(req.query.offset) || 0,
        search: (req.query.search as string) || undefined,
      });
      res.json(result);
    } catch (err: any) {
      log(`Error fetching suppliers: ${err.message}`, "mysql");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/suppliers/stats", async (_req, res) => {
    try {
      const stats = await storage.getSupplierStats();
      res.json(stats);
    } catch (err: any) {
      log(`Error fetching supplier stats: ${err.message}`, "mysql");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/suppliers/:name", async (req, res) => {
    try {
      const supplier = await storage.getSupplierByName(req.params.name);
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      res.json(supplier);
    } catch (err: any) {
      log(`Error fetching supplier detail: ${err.message}`, "mysql");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/vendors", async (req, res) => {
    try {
      const result = await storage.getVendors({
        limit: Math.min(Number(req.query.limit) || 25, 100),
        offset: Number(req.query.offset) || 0,
        search: (req.query.search as string) || undefined,
        status: (req.query.status as string) || undefined,
        state: (req.query.state as string) || undefined,
      });
      res.json(result);
    } catch (err: any) {
      log(`Error fetching vendors: ${err.message}`, "mysql");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/vendors/stats", async (_req, res) => {
    try {
      const stats = await storage.getVendorStats();
      res.json(stats);
    } catch (err: any) {
      log(`Error fetching vendor stats: ${err.message}`, "mysql");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/vendors/:name", async (req, res) => {
    try {
      const vendor = await storage.getVendorByName(req.params.name);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      res.json(vendor);
    } catch (err: any) {
      log(`Error fetching vendor detail: ${err.message}`, "mysql");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/sales/insights", async (_req, res) => {
    try {
      const insights = await storage.getSalesInsights();
      res.json(insights);
    } catch (err: any) {
      log(`Error fetching sales insights: ${err.message}`, "mysql");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/errors/stats", async (_req, res) => {
    try {
      const stats = await storage.getErrorStats();
      res.json(stats);
    } catch (err: any) {
      log(`Error fetching error stats: ${err.message}`, "mysql");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/errors/:id", async (req, res) => {
    try {
      const error = await storage.getErrorById(Number(req.params.id));
      if (!error) {
        return res.status(404).json({ message: "Error not found" });
      }
      res.json(error);
    } catch (err: any) {
      log(`Error fetching error detail: ${err.message}`, "mysql");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/errors", async (req, res) => {
    try {
      const result = await storage.getErrors({
        limit: Math.min(Number(req.query.limit) || 25, 100),
        offset: Number(req.query.offset) || 0,
        search: (req.query.search as string) || undefined,
        type: (req.query.type as string) || undefined,
        channelName: (req.query.channelName as string) || undefined,
      });
      res.json(result);
    } catch (err: any) {
      log(`Error fetching errors: ${err.message}`, "mysql");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/warehouses", async (_req, res) => {
    try {
      const result = await storage.getWarehouses();
      res.json(result);
    } catch (err: any) {
      log(`Error fetching warehouses: ${err.message}`, "mysql");
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
