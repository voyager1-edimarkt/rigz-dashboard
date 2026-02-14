import type { Express } from "express";
import type { Server } from "http";
import type { IStorage } from "./storage";
import { queryRequestSchema } from "@shared/schema";
import { log } from "./index";
import { getOdooClient } from "./odoo";

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
        dateFrom: (req.query.dateFrom as string) || undefined,
        dateTo: (req.query.dateTo as string) || undefined,
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
        dateFrom: (req.query.dateFrom as string) || undefined,
        dateTo: (req.query.dateTo as string) || undefined,
      });
      res.json(result);
    } catch (err: any) {
      log(`Error fetching orders: ${err.message}`, "mysql");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/orders/stats", async (req, res) => {
    try {
      const dateFrom = req.query.dateFrom as string | undefined;
      const dateTo = req.query.dateTo as string | undefined;
      const stats = await storage.getOrderStats(dateFrom, dateTo);
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
        dateFrom: (req.query.dateFrom as string) || undefined,
        dateTo: (req.query.dateTo as string) || undefined,
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
        dateFrom: (req.query.dateFrom as string) || undefined,
        dateTo: (req.query.dateTo as string) || undefined,
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
        dateFrom: (req.query.dateFrom as string) || undefined,
        dateTo: (req.query.dateTo as string) || undefined,
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
        dateFrom: (req.query.dateFrom as string) || undefined,
        dateTo: (req.query.dateTo as string) || undefined,
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

  app.get("/api/errors/stats", async (req, res) => {
    try {
      const dateFrom = req.query.dateFrom as string | undefined;
      const dateTo = req.query.dateTo as string | undefined;
      const stats = await storage.getErrorStats(dateFrom, dateTo);
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
        dateFrom: (req.query.dateFrom as string) || undefined,
        dateTo: (req.query.dateTo as string) || undefined,
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

  app.get("/api/inventory", async (req, res) => {
    try {
      const result = await storage.getInventory({
        limit: parseInt(req.query.limit as string) || 50,
        offset: parseInt(req.query.offset as string) || 0,
        search: (req.query.search as string) || undefined,
        warehouse: (req.query.warehouse as string) || undefined,
        stockLevel: (req.query.stockLevel as string) || undefined,
      });
      res.json(result);
    } catch (err: any) {
      log(`Error fetching inventory: ${err.message}`, "mysql");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/inventory/stats", async (_req, res) => {
    try {
      const result = await storage.getInventoryStats();
      res.json(result);
    } catch (err: any) {
      log(`Error fetching inventory stats: ${err.message}`, "mysql");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/stale-products", async (req, res) => {
    try {
      let recentDays = req.query.recentDays ? Number(req.query.recentDays) : 30;
      let previousDays = req.query.previousDays ? Number(req.query.previousDays) : 60;
      if (isNaN(recentDays) || recentDays < 1) recentDays = 30;
      if (isNaN(previousDays) || previousDays < 1) previousDays = 60;
      if (recentDays > 365) recentDays = 365;
      if (previousDays > 365) previousDays = 365;
      const result = await storage.getStaleProducts(recentDays, previousDays);
      res.json(result);
    } catch (err: any) {
      log(`Error fetching stale products: ${err.message}`, "mysql");
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

  // ---- Odoo API Routes ----

  app.get("/api/odoo/status", async (_req, res) => {
    try {
      const odoo = getOdooClient();
      const status = await odoo.testConnection();
      res.json(status);
    } catch (err: any) {
      res.json({ connected: false, error: err.message });
    }
  });

  app.get("/api/odoo/products", async (req, res) => {
    try {
      const odoo = getOdooClient();
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 25, 1), 100);
      const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
      const search = (req.query.search as string) || "";
      const active = req.query.active as string;

      const filters: any[] = [];
      if (search) {
        filters.push("|", "|",
          ["name", "ilike", search],
          ["default_code", "ilike", search],
          ["description", "ilike", search]
        );
      }
      if (active === "true") filters.push(["active", "=", true]);
      else if (active === "false") filters.push(["active", "=", false]);

      const result = await odoo.getProducts(filters, offset, limit);
      res.json(result);
    } catch (err: any) {
      log(`Error fetching Odoo products: ${err.message}`, "odoo");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/odoo/sale-orders", async (req, res) => {
    try {
      const odoo = getOdooClient();
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 25, 1), 100);
      const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
      const search = (req.query.search as string) || "";
      const state = (req.query.state as string) || "";
      const dateFrom = (req.query.dateFrom as string) || "";
      const dateTo = (req.query.dateTo as string) || "";

      const filters: any[] = [];
      if (search) {
        filters.push("|", ["name", "ilike", search], ["partner_id", "ilike", search]);
      }
      if (state) filters.push(["state", "=", state]);
      if (dateFrom) filters.push(["date_order", ">=", dateFrom]);
      if (dateTo) filters.push(["date_order", "<=", dateTo]);

      const result = await odoo.getSaleOrders(filters, offset, limit);

      const allInvoiceIds: number[] = [];
      for (const order of result.records) {
        if (order.invoice_ids && order.invoice_ids.length > 0) {
          allInvoiceIds.push(...order.invoice_ids);
        }
      }

      let invoiceMap: Record<number, { id: number; name: string; state: string; payment_state: string; amount_total: number; amount_residual: number }> = {};
      if (allInvoiceIds.length > 0) {
        try {
          const invoices = await odoo.read("account.move", allInvoiceIds, [
            "name", "state", "payment_state", "amount_total", "amount_residual",
          ]);
          for (const inv of invoices) {
            invoiceMap[inv.id] = inv;
          }
        } catch (e: any) {
          log(`Warning: could not fetch invoice details: ${e.message}`, "odoo");
        }
      }

      const enrichedRecords = result.records.map((order: any) => ({
        ...order,
        invoices_summary: (order.invoice_ids || []).map((invId: number) => invoiceMap[invId]).filter(Boolean),
      }));

      res.json({ records: enrichedRecords, total: result.total });
    } catch (err: any) {
      log(`Error fetching Odoo sale orders: ${err.message}`, "odoo");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/odoo/sale-orders/:id/timeline", async (req, res) => {
    try {
      const odoo = getOdooClient();
      const orderId = parseInt(req.params.id);
      if (isNaN(orderId)) {
        return res.status(400).json({ message: "Invalid order ID" });
      }

      const orders = await odoo.read("sale.order", [orderId], [
        "name", "partner_id", "partner_invoice_id", "partner_shipping_id",
        "date_order", "state", "amount_total", "amount_untaxed",
        "amount_tax", "order_line", "invoice_ids",
        "currency_id", "create_date", "write_date",
      ]);

      if (!orders || orders.length === 0) {
        return res.status(404).json({ message: "Sale order not found" });
      }

      const order = orders[0];

      let invoices: any[] = [];
      if (order.invoice_ids && order.invoice_ids.length > 0) {
        invoices = await odoo.read("account.move", order.invoice_ids, [
          "name", "partner_id", "invoice_date", "invoice_date_due",
          "state", "payment_state", "amount_total", "amount_residual",
          "amount_untaxed", "amount_tax", "currency_id",
          "invoice_origin", "ref", "create_date", "write_date",
        ]);
      }

      res.json({ order, invoices });
    } catch (err: any) {
      log(`Error fetching sale order timeline: ${err.message}`, "odoo");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/odoo/purchase-orders", async (req, res) => {
    try {
      const odoo = getOdooClient();
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 25, 1), 100);
      const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
      const search = (req.query.search as string) || "";
      const state = (req.query.state as string) || "";
      const dateFrom = (req.query.dateFrom as string) || "";
      const dateTo = (req.query.dateTo as string) || "";

      const filters: any[] = [];
      if (search) {
        filters.push("|", ["name", "ilike", search], ["partner_id", "ilike", search]);
      }
      if (state) filters.push(["state", "=", state]);
      if (dateFrom) filters.push(["date_order", ">=", dateFrom]);
      if (dateTo) filters.push(["date_order", "<=", dateTo]);

      const result = await odoo.getPurchaseOrders(filters, offset, limit);
      res.json(result);
    } catch (err: any) {
      log(`Error fetching Odoo purchase orders: ${err.message}`, "odoo");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/odoo/invoices", async (req, res) => {
    try {
      const odoo = getOdooClient();
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 25, 1), 100);
      const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
      const search = (req.query.search as string) || "";
      const state = (req.query.state as string) || "";
      const paymentState = (req.query.paymentState as string) || "";
      const dateFrom = (req.query.dateFrom as string) || "";
      const dateTo = (req.query.dateTo as string) || "";

      const filters: any[] = [];
      if (search) {
        filters.push("|", "|", ["name", "ilike", search], ["partner_id.name", "ilike", search], ["invoice_origin", "ilike", search]);
      }
      if (state) filters.push(["state", "=", state]);
      if (paymentState) filters.push(["payment_state", "=", paymentState]);
      if (dateFrom) filters.push(["invoice_date", ">=", dateFrom]);
      if (dateTo) filters.push(["invoice_date", "<=", dateTo]);

      const result = await odoo.getInvoices(filters, offset, limit);
      res.json(result);
    } catch (err: any) {
      log(`Error fetching Odoo invoices: ${err.message}`, "odoo");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/odoo/bills", async (req, res) => {
    try {
      const odoo = getOdooClient();
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 25, 1), 100);
      const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
      const search = (req.query.search as string) || "";
      const state = (req.query.state as string) || "";
      const paymentState = (req.query.paymentState as string) || "";
      const dateFrom = (req.query.dateFrom as string) || "";
      const dateTo = (req.query.dateTo as string) || "";

      const filters: any[] = [];
      if (search) {
        filters.push("|", "|", ["name", "ilike", search], ["partner_id.name", "ilike", search], ["invoice_origin", "ilike", search]);
      }
      if (state) filters.push(["state", "=", state]);
      if (paymentState) filters.push(["payment_state", "=", paymentState]);
      if (dateFrom) filters.push(["invoice_date", ">=", dateFrom]);
      if (dateTo) filters.push(["invoice_date", "<=", dateTo]);

      const result = await odoo.getBills(filters, offset, limit);
      res.json(result);
    } catch (err: any) {
      log(`Error fetching Odoo bills: ${err.message}`, "odoo");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/odoo/partners", async (req, res) => {
    try {
      const odoo = getOdooClient();
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 25, 1), 100);
      const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
      const search = (req.query.search as string) || "";
      const type = (req.query.type as string) || "";

      const filters: any[] = [];
      if (search) {
        filters.push("|", "|",
          ["name", "ilike", search],
          ["email", "ilike", search],
          ["phone", "ilike", search]
        );
      }
      if (type === "customer") filters.push(["customer_rank", ">", 0]);
      else if (type === "supplier") filters.push(["supplier_rank", ">", 0]);
      else if (type === "company") filters.push(["is_company", "=", true]);

      const result = await odoo.getPartners(filters, offset, limit);
      res.json(result);
    } catch (err: any) {
      log(`Error fetching Odoo partners: ${err.message}`, "odoo");
      res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
