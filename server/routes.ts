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
app.get("/api/odoo/orders/stats", async (req, res) => {
  try {
    const odoo = getOdooClient();
    const dateFrom = (req.query.dateFrom as string) || "";
    const dateTo = (req.query.dateTo as string) || "";

    const domain: any[] = [];
    if (dateFrom) domain.push(["date_order", ">=", dateFrom]);
    if (dateTo) domain.push(["date_order", "<=", dateTo]);

    // IMPORTANT: include invoice_status so we can populate "Invoiced"
    const orders = await odoo.searchRead(
      "sale.order",
      domain,
      ["state", "invoice_status"],
      0,
      50000
    );

    const byStatusMap: Record<string, number> = {};

    const bump = (k: string) => {
      byStatusMap[k] = (byStatusMap[k] || 0) + 1;
    };

    for (const o of orders) {
      const state = o.state || "unknown";
      const invoiceStatus = o.invoice_status || "no";

      // Cancelled overrides everything
      if (state === "cancel") {
        bump("CANCELLED");
        continue;
      }

      // Invoice stage (populate your UI's "Invoiced" box)
      // Odoo invoice_status commonly: 'no' | 'to invoice' | 'invoiced' | 'upselling'
      if (invoiceStatus === "invoiced") {
        bump("INVOICE_SENT");
        continue;
      }

      // PO Sent stage (your UI expects PO_SENT)
      // Odoo state 'sent' = quotation sent
      if (state === "sent") {
        bump("PO_SENT");
        continue;
      }

      // Received stage (draft quotation)
      if (state === "draft") {
        bump("PO_RECEIVED");
        continue;
      }

      // Fulfillment stage (confirmed sales order)
      if (state === "sale" || state === "done") {
        bump("FULFILLMENT_READY");
        continue;
      }

      // fallback
      bump("PO_RECEIVED");
    }

    res.json({
      total: orders.length,
      byStatus: Object.entries(byStatusMap).map(([status, cnt]) => ({ status, cnt })),
      recentByDay: [],
    });
  } catch (err: any) {
    log(`Error fetching Odoo order stats: ${err.message}`, "odoo");
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

  app.get("/api/odoo/orders-by-day", async (req, res) => {
  try {
    const odoo = getOdooClient();
    const dateFrom = (req.query.dateFrom as string) || "";
    const dateTo = (req.query.dateTo as string) || "";

    const domain: any[] = [];
    if (dateFrom) domain.push(["date_order", ">=", dateFrom]);
    if (dateTo) domain.push(["date_order", "<=", dateTo]);

    const orders = await odoo.searchRead(
      "sale.order",
      domain,
      ["date_order", "state"],
      0,
      50000
    );

    const byDay: Record<string, number> = {};

    for (const o of orders) {
      if (o.state === "cancel") continue; // optional: ignore cancelled
      const day = String(o.date_order || "").split(" ")[0]; // "YYYY-MM-DD"
      if (!day) continue;
      byDay[day] = (byDay[day] || 0) + 1;
    }

    const data = Object.entries(byDay)
      .map(([day, cnt]) => ({ day, cnt }))
      .sort((a, b) => a.day.localeCompare(b.day));

    res.json({ data });
  } catch (err: any) {
    log(`Error fetching orders-by-day: ${err.message}`, "odoo");
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

  app.get("/api/odoo/stale-products", async (req, res) => {
  try {
    const odoo = getOdooClient();

    let recentDays = req.query.recentDays ? Number(req.query.recentDays) : 30;
    let previousDays = req.query.previousDays ? Number(req.query.previousDays) : 60;
    if (!Number.isFinite(recentDays) || recentDays < 1) recentDays = 30;
    if (!Number.isFinite(previousDays) || previousDays < 1) previousDays = 60;
    if (previousDays <= recentDays) previousDays = recentDays * 2;

    const today = new Date();
    const fmt = (d: Date) => d.toISOString().split("T")[0];

    const recentFrom = new Date(today);
    recentFrom.setDate(recentFrom.getDate() - recentDays);

    const prevFrom = new Date(today);
    prevFrom.setDate(prevFrom.getDate() - previousDays);

    // Previous window ends where recent window starts
    const prevTo = new Date(recentFrom);

    // 1) Orders in previous window
    const prevOrders = await odoo.searchRead(
      "sale.order",
      [
        ["state", "!=", "cancel"],
        ["date_order", ">=", fmt(prevFrom)],
        ["date_order", "<", fmt(prevTo)],
      ],
      ["id", "date_order", "order_line"],
      0,
      50000
    );

    // 2) Orders in recent window
    const recentOrders = await odoo.searchRead(
      "sale.order",
      [
        ["state", "!=", "cancel"],
        ["date_order", ">=", fmt(recentFrom)],
        ["date_order", "<=", fmt(today)],
      ],
      ["order_line"],
      0,
      50000
    );

    const recentLineIds = new Set<number>();
    for (const o of recentOrders) {
      if (Array.isArray(o.order_line)) o.order_line.forEach((id: number) => recentLineIds.add(id));
    }

    // Collect previous line IDs + map line->order meta
    const prevLineIds: number[] = [];
    const lineToOrderId: Record<number, number> = {};
    const lineToOrderDay: Record<number, string> = {};

    for (const o of prevOrders) {
      const day = String(o.date_order || "").split(" ")[0];
      if (!Array.isArray(o.order_line)) continue;
      for (const id of o.order_line) {
        prevLineIds.push(id);
        lineToOrderId[id] = o.id;
        lineToOrderDay[id] = day;
      }
    }

    if (!prevLineIds.length) return res.json([]);

    // 3) Read previous lines -> aggregate by product
    const prevLines = await odoo.read("sale.order.line", prevLineIds, [
      "id",
      "product_id",
      "product_uom_qty",
      "price_unit",
    ]);

    // Build a set of productIds that appear in recent window (so we can exclude them)
    const recentProductIds = new Set<number>();
    if (recentLineIds.size) {
      const recentLines = await odoo.read("sale.order.line", Array.from(recentLineIds), ["product_id"]);
      for (const l of recentLines) {
        const pid = Array.isArray(l.product_id) ? Number(l.product_id[0]) : null;
        if (pid) recentProductIds.add(pid);
      }
    }

    type Agg = {
      productId: number;
      previousQty: number;
      orderIds: Set<number>;
      lastOrderDate: string;
      basePrice: number | null;
    };

    const agg: Record<number, Agg> = {};

    for (const l of prevLines) {
      const pid = Array.isArray(l.product_id) ? Number(l.product_id[0]) : null;
      if (!pid) continue;
      if (recentProductIds.has(pid)) continue; // 🔥 dropped logic

      const qty = Number(l.product_uom_qty || 0);
      const price = l.price_unit != null ? Number(l.price_unit) : null;
      const oid = lineToOrderId[Number(l.id)];
      const day = lineToOrderDay[Number(l.id)] || "";

      if (!agg[pid]) {
        agg[pid] = { productId: pid, previousQty: 0, orderIds: new Set(), lastOrderDate: day, basePrice: price };
      }

      agg[pid].previousQty += qty;
      if (oid) agg[pid].orderIds.add(oid);
      if (day && (!agg[pid].lastOrderDate || day > agg[pid].lastOrderDate)) {
        agg[pid].lastOrderDate = day;
        agg[pid].basePrice = price;
      }
    }

    const productIds = Object.keys(agg).map(Number);
    if (!productIds.length) return res.json([]);

    // 4) Read product details for SKU/name
    const products = await odoo.read("product.product", productIds, ["id", "default_code", "name"]);
    const pMap: Record<number, { sku: string; name: string }> = {};
    for (const p of products) {
      pMap[p.id] = { sku: p.default_code || String(p.id), name: p.name || "" };
    }

  // Build orderId -> customer name map from prevOrders
const orderIdToCustomer: Record<number, string> = {};
for (const o of prevOrders) {
  const partnerName =
    o.partner_id && Array.isArray(o.partner_id) && o.partner_id.length > 1
      ? String(o.partner_id[1])
      : "";
  if (partnerName) orderIdToCustomer[o.id] = partnerName;
}

const out = productIds.map((pid) => {
  const a = agg[pid];
  const p = pMap[pid] || { sku: String(pid), name: "" };

  // pick one customer (most recent order customer if possible)
  let customer: string | null = null;
  const orderIdsArray = Array.from(a.orderIds);

for (let i = 0; i < orderIdsArray.length; i++) {
  const oid = orderIdsArray[i];
  const name = orderIdToCustomer[oid];
  if (name) {
    customer = name;
    break;
  }
}

  return {
    sku: p.sku,
    name: p.name,
    vendor: customer, // reuse same field so frontend shows it in "Vendor" column
    customer: customer,   // debug
    previousQty: a.previousQty,
    previousOrders: a.orderIds.size,
    lastOrderDate: a.lastOrderDate || null,
    basePrice: a.basePrice,
  };
});

    res.json(out);
  } catch (err: any) {
    log(`Error fetching Odoo stale products: ${err.message}`, "odoo");
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

  app.get("/api/odoo/stale-products", async (req, res) => {
  try {
    const odoo = getOdooClient();

    let recentDays = req.query.recentDays ? Number(req.query.recentDays) : 30;
    let previousDays = req.query.previousDays ? Number(req.query.previousDays) : 60;
    if (!Number.isFinite(recentDays) || recentDays < 1) recentDays = 30;
    if (!Number.isFinite(previousDays) || previousDays < 1) previousDays = 60;
    if (previousDays <= recentDays) previousDays = recentDays * 2;

    const today = new Date();
    const fmt = (d: Date) => d.toISOString().split("T")[0];

    const recentFrom = new Date(today);
    recentFrom.setDate(recentFrom.getDate() - recentDays);

    const prevFrom = new Date(today);
    prevFrom.setDate(prevFrom.getDate() - previousDays);

    // Previous window ends where recent window starts
    const prevTo = new Date(recentFrom);

    // 1) Orders in previous window
   const prevOrders = await odoo.searchRead(
  "sale.order",
  [
    ["state", "!=", "cancel"],
    ["date_order", ">=", fmt(prevFrom)],
    ["date_order", "<", fmt(prevTo)],
  ],
  ["id", "name", "date_order", "order_line", "partner_id"],
  0,
  50000
);

    // 2) Orders in recent window
    const recentOrders = await odoo.searchRead(
      "sale.order",
      [
        ["state", "!=", "cancel"],
        ["date_order", ">=", fmt(recentFrom)],
        ["date_order", "<=", fmt(today)],
      ],
      ["order_line"],
      0,
      50000
    );

    const recentLineIds = new Set<number>();
    for (const o of recentOrders) {
      if (Array.isArray(o.order_line)) o.order_line.forEach((id: number) => recentLineIds.add(id));
    }

    // Collect previous line IDs + map line->order meta
    const prevLineIds: number[] = [];
    const lineToOrderId: Record<number, number> = {};
    const lineToOrderDay: Record<number, string> = {};

    for (const o of prevOrders) {
      const day = String(o.date_order || "").split(" ")[0];
      if (!Array.isArray(o.order_line)) continue;
      for (const id of o.order_line) {
        prevLineIds.push(id);
        lineToOrderId[id] = o.id;
        lineToOrderDay[id] = day;
      }
    }

    if (!prevLineIds.length) return res.json([]);

    // 3) Read previous lines -> aggregate by product
    const prevLines = await odoo.read("sale.order.line", prevLineIds, [
      "id",
      "product_id",
      "product_uom_qty",
      "price_unit",
    ]);

    // Build a set of productIds that appear in recent window (so we can exclude them)
    const recentProductIds = new Set<number>();
    if (recentLineIds.size) {
      const recentLines = await odoo.read("sale.order.line", Array.from(recentLineIds), ["product_id"]);
      for (const l of recentLines) {
        const pid = Array.isArray(l.product_id) ? Number(l.product_id[0]) : null;
        if (pid) recentProductIds.add(pid);
      }
    }

    type Agg = {
      productId: number;
      previousQty: number;
      orderIds: Set<number>;
      lastOrderDate: string;
      basePrice: number | null;
    };

    const agg: Record<number, Agg> = {};

    for (const l of prevLines) {
      const pid = Array.isArray(l.product_id) ? Number(l.product_id[0]) : null;
      if (!pid) continue;
      if (recentProductIds.has(pid)) continue; // 🔥 dropped logic

      const qty = Number(l.product_uom_qty || 0);
      const price = l.price_unit != null ? Number(l.price_unit) : null;
      const oid = lineToOrderId[Number(l.id)];
      const day = lineToOrderDay[Number(l.id)] || "";

      if (!agg[pid]) {
        agg[pid] = { productId: pid, previousQty: 0, orderIds: new Set(), lastOrderDate: day, basePrice: price };
      }

      agg[pid].previousQty += qty;
      if (oid) agg[pid].orderIds.add(oid);
      if (day && (!agg[pid].lastOrderDate || day > agg[pid].lastOrderDate)) {
        agg[pid].lastOrderDate = day;
        agg[pid].basePrice = price;
      }
    }

    const productIds = Object.keys(agg).map(Number);
    if (!productIds.length) return res.json([]);

    // 4) Read product details for SKU/name
    const products = await odoo.read("product.product", productIds, ["id", "default_code", "name"]);
    const pMap: Record<number, { sku: string; name: string }> = {};
    for (const p of products) {
      pMap[p.id] = { sku: p.default_code || String(p.id), name: p.name || "" };
    }

    const out = productIds.map((pid) => {
      const a = agg[pid];
      const p = pMap[pid] || { sku: String(pid), name: "" };
      return {
        sku: p.sku,
        name: p.name,
        vendor: null,
        previousQty: a.previousQty,
        previousOrders: a.orderIds.size,
        lastOrderDate: a.lastOrderDate || null,
        basePrice: a.basePrice,
      };
    });

    res.json(out);
  } catch (err: any) {
    log(`Error fetching Odoo stale products: ${err.message}`, "odoo");
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
        "note", "client_order_ref", "commitment_date",
        "delivery_status", "invoice_status",
      ]);

      if (!orders || orders.length === 0) {
        return res.status(404).json({ message: "Sale order not found" });
      }

      const order = orders[0];

      let orderLines: any[] = [];
      if (order.order_line && order.order_line.length > 0) {
        try {
          orderLines = await odoo.read("sale.order.line", order.order_line, [
            "name", "product_id", "product_uom_qty", "qty_delivered",
            "qty_invoiced", "price_unit", "price_subtotal", "price_total",
            "discount", "product_uom", "state",
          ]);
        } catch (e: any) {
          log(`Warning: could not fetch order lines: ${e.message}`, "odoo");
        }
      }

      let invoices: any[] = [];
      if (order.invoice_ids && order.invoice_ids.length > 0) {
        invoices = await odoo.read("account.move", order.invoice_ids, [
          "name", "partner_id", "invoice_date", "invoice_date_due",
          "state", "payment_state", "amount_total", "amount_residual",
          "amount_untaxed", "amount_tax", "currency_id",
          "invoice_origin", "ref", "create_date", "write_date",
        ]);
      }

      let partner: any = null;
      if (order.partner_id && Array.isArray(order.partner_id)) {
        try {
          const partners = await odoo.read("res.partner", [order.partner_id[0]], [
            "name", "email", "phone", "mobile", "street", "street2",
            "city", "state_id", "zip", "country_id", "vat",
          ]);
          if (partners.length > 0) partner = partners[0];
        } catch (e: any) {
          log(`Warning: could not fetch partner: ${e.message}`, "odoo");
        }
      }

      res.json({ order, orderLines, invoices, partner });
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

  app.get("/api/odoo/purchase-orders/:id", async (req, res) => {
    try {
      const odoo = getOdooClient();
      const poId = parseInt(req.params.id);
      if (isNaN(poId)) {
        return res.status(400).json({ message: "Invalid PO ID" });
      }

      const orders = await odoo.read("purchase.order", [poId], [
        "name", "partner_id", "partner_ref",
        "date_order", "date_planned", "date_approve",
        "state", "amount_total", "amount_untaxed",
        "amount_tax", "order_line", "invoice_ids",
        "currency_id", "create_date", "write_date",
        "notes", "origin", "receipt_status", "invoice_status",
      ]);

      if (!orders || orders.length === 0) {
        return res.status(404).json({ message: "Purchase order not found" });
      }

      const order = orders[0];

      let orderLines: any[] = [];
      if (order.order_line && order.order_line.length > 0) {
        try {
          orderLines = await odoo.read("purchase.order.line", order.order_line, [
            "name", "product_id", "product_qty", "qty_received",
            "qty_invoiced", "price_unit", "price_subtotal", "price_total",
            "product_uom", "state", "date_planned",
          ]);
        } catch (e: any) {
          log(`Warning: could not fetch PO lines: ${e.message}`, "odoo");
        }
      }

      let invoices: any[] = [];
      if (order.invoice_ids && order.invoice_ids.length > 0) {
        try {
          invoices = await odoo.read("account.move", order.invoice_ids, [
            "name", "partner_id", "invoice_date", "invoice_date_due",
            "state", "payment_state", "amount_total", "amount_residual",
            "amount_untaxed", "amount_tax", "currency_id",
            "invoice_origin", "ref", "create_date", "write_date",
          ]);
        } catch (e: any) {
          log(`Warning: could not fetch PO invoices via invoice_ids: ${e.message}`, "odoo");
        }
      }
      if (invoices.length === 0 && order.name) {
        try {
          invoices = await odoo.searchRead(
            "account.move",
            [["invoice_origin", "=", order.name], ["move_type", "=", "in_invoice"]],
            ["name", "partner_id", "invoice_date", "invoice_date_due",
              "state", "payment_state", "amount_total", "amount_residual",
              "amount_untaxed", "amount_tax", "currency_id",
              "invoice_origin", "ref", "create_date", "write_date"],
            0, 50
          );
        } catch (e: any) {
          log(`Warning: could not fetch PO bills by origin: ${e.message}`, "odoo");
        }
      }

      let partner: any = null;
      if (order.partner_id && Array.isArray(order.partner_id)) {
        try {
          const partners = await odoo.read("res.partner", [order.partner_id[0]], [
            "name", "email", "phone", "mobile", "street", "street2",
            "city", "state_id", "zip", "country_id", "vat",
          ]);
          if (partners.length > 0) partner = partners[0];
        } catch (e: any) {
          log(`Warning: could not fetch PO partner: ${e.message}`, "odoo");
        }
      }

      res.json({ order, orderLines, invoices, partner });
    } catch (err: any) {
      log(`Error fetching Odoo PO detail: ${err.message}`, "odoo");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/odoo/bills/:id", async (req, res) => {
    try {
      const odoo = getOdooClient();
      const billId = parseInt(req.params.id);
      if (isNaN(billId)) {
        return res.status(400).json({ message: "Invalid bill ID" });
      }

      const bills = await odoo.read("account.move", [billId], [
        "name", "partner_id", "invoice_date", "invoice_date_due",
        "state", "payment_state", "amount_total", "amount_residual",
        "amount_untaxed", "amount_tax", "currency_id",
        "invoice_origin", "ref", "create_date", "write_date",
        "invoice_line_ids", "narration",
      ]);

      if (!bills || bills.length === 0) {
        return res.status(404).json({ message: "Bill not found" });
      }

      const bill = bills[0];

      let lines: any[] = [];
      if (bill.invoice_line_ids && bill.invoice_line_ids.length > 0) {
        try {
          lines = await odoo.read("account.move.line", bill.invoice_line_ids, [
            "name", "product_id", "quantity", "price_unit",
            "price_subtotal", "price_total", "discount",
            "account_id", "tax_ids",
          ]);
        } catch (e: any) {
          log(`Warning: could not fetch bill lines: ${e.message}`, "odoo");
        }
      }

      let partner: any = null;
      if (bill.partner_id && Array.isArray(bill.partner_id)) {
        try {
          const partners = await odoo.read("res.partner", [bill.partner_id[0]], [
            "name", "email", "phone", "mobile", "street", "street2",
            "city", "state_id", "zip", "country_id", "vat",
          ]);
          if (partners.length > 0) partner = partners[0];
        } catch (e: any) {
          log(`Warning: could not fetch bill partner: ${e.message}`, "odoo");
        }
      }

      let sourcePO: any = null;
      if (bill.invoice_origin) {
        try {
          const poIds = await odoo.searchRead("purchase.order", [["name", "=", bill.invoice_origin]], ["id", "name"], 0, 1);
          if (poIds && poIds.length > 0) {
            sourcePO = { id: poIds[0].id, name: poIds[0].name };
          }
        } catch (e: any) {
          log(`Warning: could not look up source PO: ${e.message}`, "odoo");
        }
      }

      res.json({ bill, lines, partner, sourcePO });
    } catch (err: any) {
      log(`Error fetching Odoo bill detail: ${err.message}`, "odoo");
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

  app.get("/api/odoo/customer-sales", async (req, res) => {
  const { dateFrom, dateTo, limit } = req.query;
  const odoo = getOdooClient();

  const data = await odoo.getCustomerSalesTotals({
    dateFrom: dateFrom as string | undefined,
    dateTo: dateTo as string | undefined,
    limit: limit ? Number(limit) : 50,
  });

  res.json({ data });
});
const US_STATE_NAME_TO_ABBR: Record<string, string> = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
};

const CA_PROVINCE_NAME_TO_ABBR: Record<string, string> = {
  Alberta: "AB",
  "British Columbia": "BC",
  Manitoba: "MB",
  "New Brunswick": "NB",
  "Newfoundland and Labrador": "NL",
  "Northwest Territories": "NT",
  "Nova Scotia": "NS",
  Nunavut: "NU",
  Ontario: "ON",
  "Prince Edward Island": "PE",
  Quebec: "QC",
  Saskatchewan: "SK",
  Yukon: "YT",
};
app.get("/api/odoo/customers/stats", async (_req, res) => {
  try {
    const odoo = getOdooClient();

    const partners = await odoo.searchRead(
      "res.partner",
      [
        ["customer_rank", ">", 0],
        ["active", "=", true]
      ],
      ["country_id", "state_id", "parent_id"],
      0,
      10000
    );

    const byCountry: Record<string, number> = {};
    const byState: Record<string, number> = {};
    const byProvince: Record<string, number> = {};
    let parentAccounts = 0;

    for (const p of partners) {
      // Parent accounts
      if (!p.parent_id) parentAccounts++;

      // Country
      if (p.country_id) {
        const countryName = p.country_id[1];
        const countryCode =
          countryName === "United States" ? "US" :
          countryName === "Canada" ? "CA" :
          countryName;

        byCountry[countryCode] = (byCountry[countryCode] || 0) + 1;
      }

      // State / Province
      if (p.state_id && p.country_id) {
  const countryName = p.country_id[1];
  const rawState = p.state_id[1]; // e.g. "Texas (US)"
  const cleanState = rawState.split(" (")[0]; // "Texas"

  // 🇺🇸 United States
  if (countryName === "United States") {
    const stateCode = US_STATE_NAME_TO_ABBR[cleanState];
    if (stateCode) {
      byState[stateCode] = (byState[stateCode] || 0) + 1;
    }
  }

  // 🇨🇦 Canada
  if (countryName === "Canada") {
   const provinceCode = CA_PROVINCE_NAME_TO_ABBR[cleanState];

if (provinceCode) {
  byProvince[provinceCode] = (byProvince[provinceCode] || 0) + 1;
}
  }
}
      }
    

    res.json({
      total: partners.length,
      parentAccounts,
      byCountry: Object.entries(byCountry).map(([country, cnt]) => ({ country, cnt })),
      byState: Object.entries(byState).map(([state, cnt]) => ({ state, cnt })),
      byProvince: Object.entries(byProvince).map(([province, cnt]) => ({ province, cnt })),
    });

  } catch (err: any) {
    log(`Error fetching Odoo customer stats: ${err.message}`, "odoo");
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/odoo/revenue-this-month", async (req, res) => {
  const odoo = getOdooClient();
  const revenue = await odoo.getRevenueThisMonth();
  res.json({ revenue });
});

app.get("/api/odoo/kpis", async (req, res) => {
  try {
    const odoo = getOdooClient();
    const dateFrom = (req.query.dateFrom as string) || "";
    const dateTo = (req.query.dateTo as string) || "";

    // domain for sale orders
    const domain: any[] = [];
    if (dateFrom) domain.push(["date_order", ">=", dateFrom]);
    if (dateTo) domain.push(["date_order", "<=", dateTo]);

    // Pull minimal fields
    const orders = await odoo.searchRead(
      "sale.order",
      domain,
      ["amount_total", "order_line", "state"],
      0,
      50000
    );

    // Revenue + orders with sales (ignore cancelled)
    let totalRevenue = 0;
    let totalOrders = 0;
    const orderLineIds: number[] = [];

    for (const o of orders) {
      if (o.state === "cancel") continue;
      totalOrders++;
      totalRevenue += Number(o.amount_total || 0);
      if (Array.isArray(o.order_line)) orderLineIds.push(...o.order_line);
    }

    // Units sold + unique SKUs
    let totalUnits = 0;
    const skuSet = new Set<string>();

    if (orderLineIds.length) {
      const lines = await odoo.read("sale.order.line", orderLineIds, [
        "product_uom_qty",
        "product_id",
      ]);

      for (const l of lines) {
        totalUnits += Number(l.product_uom_qty || 0);
        // product_id is [id, name] in Odoo
        const pid = Array.isArray(l.product_id) ? String(l.product_id[0]) : "";
        if (pid) skuSet.add(pid);
      }
    }

    res.json({
      totalRevenue,
      totalOrders,
      totalUnits,
      uniqueSkus: skuSet.size,
    });
  } catch (err: any) {
    log(`Error fetching Odoo KPIs: ${err.message}`, "odoo");
    res.status(500).json({ message: err.message });
  }
});


app.get("/api/odoo/top-customers", async (req, res) => {
  try {
    const odoo = getOdooClient();
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const dateFrom = (req.query.dateFrom as string) || "";
    const dateTo = (req.query.dateTo as string) || "";
    const data = await odoo.getCustomerSalesTotals({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, limit });
    res.json(data);
  } catch (err: any) {
    log(`Error fetching top customers: ${err.message}`, "odoo");
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/odoo/invoice-aging", async (req, res) => {
  try {
    const odoo = getOdooClient();
    const invoices = await odoo.searchRead(
      "account.move",
      [["move_type", "=", "out_invoice"], ["state", "=", "posted"], ["payment_state", "!=", "paid"]],
      ["name", "partner_id", "invoice_date", "invoice_date_due", "amount_total", "amount_residual", "payment_state"],
      0, 5000, "invoice_date_due asc"
    );
    const now = new Date();
    let current = 0, overdue30 = 0, overdue60 = 0, overdue90 = 0;
    let currentCount = 0, overdue30Count = 0, overdue60Count = 0, overdue90Count = 0;
    for (const inv of invoices) {
      const due = inv.invoice_date_due ? new Date(inv.invoice_date_due) : new Date(inv.invoice_date || now);
      const daysOverdue = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
      const amt = Number(inv.amount_residual || 0);
      if (daysOverdue <= 0) { current += amt; currentCount++; }
      else if (daysOverdue <= 30) { overdue30 += amt; overdue30Count++; }
      else if (daysOverdue <= 60) { overdue60 += amt; overdue60Count++; }
      else { overdue90 += amt; overdue90Count++; }
    }
    const totalOutstanding = current + overdue30 + overdue60 + overdue90;
    res.json({
      totalOutstanding,
      totalInvoices: invoices.length,
      buckets: [
        { label: "Current", amount: current, count: currentCount },
        { label: "1-30 days", amount: overdue30, count: overdue30Count },
        { label: "31-60 days", amount: overdue60, count: overdue60Count },
        { label: "60+ days", amount: overdue90, count: overdue90Count },
      ],
    });
  } catch (err: any) {
    log(`Error fetching invoice aging: ${err.message}`, "odoo");
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/odoo/top-products", async (req, res) => {
  try {
    const odoo = getOdooClient();
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const dateFrom = (req.query.dateFrom as string) || "";
    const dateTo = (req.query.dateTo as string) || "";
    const domain: any[] = [["state", "in", ["sale", "done"]]];
    if (dateFrom) domain.push(["order_id.date_order", ">=", dateFrom]);
    if (dateTo) domain.push(["order_id.date_order", "<=", dateTo]);
    const rows = await odoo.readGroup(
      "sale.order.line",
      domain,
      ["product_id", "product_uom_qty", "price_subtotal"],
      ["product_id"],
      { lazy: false, orderby: "price_subtotal desc", limit }
    );
    const products = rows.map((r: any) => ({
      productId: r.product_id?.[0],
      productName: r.product_id?.[1] || "Unknown",
      totalQty: r.product_uom_qty || 0,
      totalRevenue: r.price_subtotal || 0,
      orderCount: r.__count || 0,
    }));
    res.json(products);
  } catch (err: any) {
    log(`Error fetching top products: ${err.message}`, "odoo");
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/odoo/revenue-by-month", async (req, res) => {
  try {
    const odoo = getOdooClient();
    const months = Math.min(parseInt(req.query.months as string) || 12, 24);
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    const rows = await odoo.readGroup(
      "sale.order",
      [["state", "in", ["sale", "done"]], ["date_order", ">=", cutoffStr]],
      ["date_order", "amount_total"],
      ["date_order:month"],
      { lazy: false, orderby: "date_order asc" }
    );
    const data = rows.map((r: any) => ({
      month: r["date_order:month"] || r.date_order || "Unknown",
      revenue: r.amount_total || 0,
      orderCount: r.__count || 0,
    }));
    res.json(data);
  } catch (err: any) {
    log(`Error fetching revenue by month: ${err.message}`, "odoo");
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/odoo/new-customers", async (req, res) => {
  try {
    const odoo = getOdooClient();
    const days = Math.min(parseInt(req.query.days as string) || 30, 90);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    const filters: any[] = [
      ["customer_rank", ">", 0],
      ["create_date", ">=", cutoffStr],
      ["parent_id", "=", false],
    ];
    const total = await odoo.searchCount("res.partner", filters);
    const records = await odoo.searchRead(
      "res.partner", filters,
      ["name", "email", "city", "state_id", "country_id", "create_date", "child_ids"],
      0, 10, "create_date desc"
    );
    res.json({ total, records });
  } catch (err: any) {
    log(`Error fetching new customers: ${err.message}`, "odoo");
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/odoo/aov-trend", async (req, res) => {
  try {
    const odoo = getOdooClient();
    const months = Math.min(parseInt(req.query.months as string) || 12, 24);
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    const rows = await odoo.readGroup(
      "sale.order",
      [["state", "in", ["sale", "done"]], ["date_order", ">=", cutoffStr]],
      ["date_order", "amount_total"],
      ["date_order:month"],
      { lazy: false, orderby: "date_order asc" }
    );
    const data = rows.map((r: any) => ({
      month: r["date_order:month"] || r.date_order || "Unknown",
      avgOrderValue: r.__count > 0 ? (r.amount_total || 0) / r.__count : 0,
      totalRevenue: r.amount_total || 0,
      orderCount: r.__count || 0,
    }));
    res.json(data);
  } catch (err: any) {
    log(`Error fetching AOV trend: ${err.message}`, "odoo");
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
      const parentOnly = req.query.parentOnly === "true";
      const parentId = req.query.parentId ? parseInt(req.query.parentId as string) : null;

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

      if (parentOnly) {
        filters.push(["parent_id", "=", false]);
      }
      if (parentId !== null) {
        filters.push(["parent_id", "=", parentId]);
      }

      const result = await odoo.getPartners(filters, offset, limit);
      res.json(result);
    } catch (err: any) {
      log(`Error fetching Odoo partners: ${err.message}`, "odoo");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/odoo/partners/:id", async (req, res) => {
    try {
      const odoo = getOdooClient();
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid partner ID" });
      const partner = await odoo.getPartnerById(id);
      if (!partner) return res.status(404).json({ message: "Partner not found" });
      res.json(partner);
    } catch (err: any) {
      log(`Error fetching Odoo partner ${req.params.id}: ${err.message}`, "odoo");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/odoo/partners/:id/dashboard", async (req, res) => {
    try {
      const odoo = getOdooClient();
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid partner ID" });

      const partner = await odoo.getPartnerById(id);
      if (!partner) return res.status(404).json({ message: "Partner not found" });

      const childIds: number[] = Array.isArray(partner.child_ids) ? partner.child_ids : [];
      const allPartnerIds = [id, ...childIds];

      const orderDomain: any[] = [["partner_id", "in", allPartnerIds]];
      const orders = await odoo.searchRead(
        "sale.order",
        orderDomain,
        ["name", "partner_id", "date_order", "state", "amount_total", "amount_untaxed", "order_line", "invoice_ids"],
        0,
        10000,
        "date_order desc"
      );

      let totalRevenue = 0;
      let totalOrders = 0;
      const allOrderLineIds: number[] = [];

      for (const o of orders) {
        if (o.state === "cancel") continue;
        totalOrders++;
        totalRevenue += Number(o.amount_total || 0);
        if (Array.isArray(o.order_line)) allOrderLineIds.push(...o.order_line);
      }

      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      const recentOrders = orders.slice(0, 15).map((o: any) => ({
        id: o.id,
        name: o.name,
        partner_name: Array.isArray(o.partner_id) ? o.partner_id[1] : "",
        date_order: o.date_order,
        state: o.state,
        amount_total: o.amount_total,
        has_invoice: Array.isArray(o.invoice_ids) && o.invoice_ids.length > 0,
      }));

      const invoiceDomain: any[] = [
        ["partner_id", "in", allPartnerIds],
        ["move_type", "=", "out_invoice"],
        ["state", "!=", "cancel"],
      ];
      const invoices = await odoo.searchRead(
        "account.move",
        invoiceDomain,
        ["name", "state", "payment_state", "amount_total", "amount_residual", "invoice_date"],
        0,
        10000
      );

      let paidAmount = 0;
      let unpaidAmount = 0;
      let overdueAmount = 0;
      let openInvoiceCount = 0;
      let openInvoiceTotal = 0;

      for (const inv of invoices) {
        const amt = Number(inv.amount_total || 0);
        const residual = Number(inv.amount_residual || 0);
        if (inv.payment_state === "paid" || inv.payment_state === "in_payment") {
          paidAmount += amt;
        } else if (inv.payment_state === "not_paid" || inv.payment_state === "partial") {
          unpaidAmount += residual;
          openInvoiceCount++;
          openInvoiceTotal += residual;
        }
      }

      let topProducts: { id: number; name: string; totalQty: number; totalRevenue: number }[] = [];
      if (allOrderLineIds.length > 0) {
        const batchSize = 500;
        const allLines: any[] = [];
        for (let i = 0; i < allOrderLineIds.length; i += batchSize) {
          const batch = allOrderLineIds.slice(i, i + batchSize);
          const lines = await odoo.read("sale.order.line", batch, [
            "product_id", "product_uom_qty", "price_subtotal",
          ]);
          allLines.push(...lines);
        }

        const productMap = new Map<number, { name: string; totalQty: number; totalRevenue: number }>();
        for (const l of allLines) {
          if (!Array.isArray(l.product_id)) continue;
          const pid = l.product_id[0];
          const pname = l.product_id[1];
          const existing = productMap.get(pid) || { name: pname, totalQty: 0, totalRevenue: 0 };
          existing.totalQty += Number(l.product_uom_qty || 0);
          existing.totalRevenue += Number(l.price_subtotal || 0);
          productMap.set(pid, existing);
        }

        topProducts = Array.from(productMap.entries())
          .map(([id, data]) => ({ id, ...data }))
          .sort((a, b) => b.totalQty - a.totalQty)
          .slice(0, 10);
      }

      res.json({
        kpis: {
          totalRevenue,
          totalOrders,
          avgOrderValue,
          openInvoiceCount,
          openInvoiceTotal,
        },
        invoiceBreakdown: {
          paid: paidAmount,
          unpaid: unpaidAmount,
          overdue: overdueAmount,
          totalInvoices: invoices.length,
        },
        recentOrders,
        topProducts,
        childCount: childIds.length,
      });
    } catch (err: any) {
      log(`Error fetching dashboard for partner ${req.params.id}: ${err.message}`, "odoo");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/odoo/partners/:id/children", async (req, res) => {
    try {
      const odoo = getOdooClient();
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid partner ID" });
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 100, 1), 500);
      const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
      const result = await odoo.getPartnerChildren(id, offset, limit);
      res.json(result);
    } catch (err: any) {
      log(`Error fetching children for partner ${req.params.id}: ${err.message}`, "odoo");
      res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
