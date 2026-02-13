import type { IStorage } from "./storage";
import type {
  ConnectionStatus,
  DatabaseInfo,
  TableInfo,
  ColumnInfo,
  CustomerListResult,
  CustomerStats,
  CustomerFilters,
  OrderListResult,
  OrderStats,
  OrderDetail,
  OrderFilters,
  ProductListResult,
  ProductStats,
  ProductFilters,
  PurchaseOrderListResult,
  PurchaseOrderStats,
  PurchaseOrderDetail,
  PurchaseOrderDataRow,
  PurchaseOrderFilters,
  SupplierRow,
  SupplierListResult,
  SupplierStats,
  SupplierFilters,
  VendorRow,
  VendorListResult,
  VendorStats,
  VendorFilters,
  WarehouseRow,
  WarehouseListResult,
  ErrorRow,
  ErrorListResult,
  ErrorStats,
  ErrorFilters,
  SalesInsights,
  TableDataResult,
} from "@shared/schema";
import { query, queryNoDb, testConnection as testMysqlConnection } from "./mysql";
import { log } from "./index";

function sanitizeIdentifier(name: string): string | null {
  if (!name || !/^[a-zA-Z0-9_]+$/.test(name)) {
    return null;
  }
  return name;
}

export class MySQLStorage implements IStorage {
  async testConnection(): Promise<ConnectionStatus> {
    return testMysqlConnection();
  }

  async getDatabases(): Promise<DatabaseInfo[]> {
    const rows = await queryNoDb("SHOW DATABASES");
    return (rows as any[])
      .map((r: any) => ({ name: r.Database }))
      .filter((db) => !["information_schema", "performance_schema", "sys"].includes(db.name));
  }

  async getTables(database: string): Promise<TableInfo[]> {
    const rows = await queryNoDb(
      `SELECT TABLE_NAME as name, TABLE_TYPE as type, TABLE_ROWS as \`rows\`, ENGINE as engine
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ?
       ORDER BY TABLE_NAME`,
      [database]
    );
    return (rows as any[]).map((r: any) => ({
      name: r.name,
      type: r.type === "BASE TABLE" ? "TABLE" as const : "VIEW" as const,
      rows: r.rows ?? 0,
      engine: r.engine || "",
    }));
  }

  async getColumns(database: string, table: string): Promise<ColumnInfo[]> {
    const rows = await queryNoDb(
      `SELECT COLUMN_NAME as name, COLUMN_TYPE as type, IS_NULLABLE as nullable,
              COLUMN_KEY as \`key\`, COLUMN_DEFAULT as defaultValue, EXTRA as extra
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION`,
      [database, table]
    );
    return (rows as any[]).map((r: any) => ({
      name: r.name,
      type: r.type,
      nullable: r.nullable === "YES",
      key: r.key || "",
      defaultValue: r.defaultValue,
      extra: r.extra || "",
    }));
  }

  async getTableData(database: string, table: string, limit: number, offset: number): Promise<TableDataResult> {
    const safeDb = sanitizeIdentifier(database);
    const safeTable = sanitizeIdentifier(table);
    if (!safeDb || !safeTable) {
      throw new Error("Invalid database or table name");
    }

    const countResult = await queryNoDb(
      `SELECT COUNT(*) as total FROM \`${safeDb}\`.\`${safeTable}\``
    );
    const totalRows = Number((countResult as any[])[0]?.total ?? 0);

    const rows = await queryNoDb(
      `SELECT * FROM \`${safeDb}\`.\`${safeTable}\` LIMIT ${limit} OFFSET ${offset}`
    );

    const dataRows = rows as any[];
    const columns = dataRows.length > 0 ? Object.keys(dataRows[0]) : [];

    return { columns, rows: dataRows, rowCount: totalRows, executionTime: 0 };
  }

  async getCustomers(filters: CustomerFilters): Promise<CustomerListResult> {
    let where = "WHERE 1=1";
    const params: any[] = [];

    if (filters.search) {
      where += " AND (c.name LIKE ? OR c.companyName LIKE ? OR c.city LIKE ? OR c.email LIKE ?)";
      const s = `%${filters.search}%`;
      params.push(s, s, s, s);
    }
    if (filters.status) {
      where += " AND c.status = ?";
      params.push(filters.status);
    }
    if (filters.state) {
      where += " AND c.state = ?";
      params.push(filters.state);
    }
    if (filters.dateFrom) {
      where += " AND c.createdAt >= ?";
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      where += " AND c.createdAt <= ?";
      params.push(filters.dateTo + " 23:59:59");
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
       LIMIT ${filters.limit} OFFSET ${filters.offset}`,
      params
    );

    return { rows: rows as any[], total };
  }

  async getCustomerStats(): Promise<CustomerStats> {
    const [totalResult, statusResult, stateResult, countryResult, recentResult, parentResult, caProvinceResult] = await Promise.all([
      queryNoDb("SELECT COUNT(*) as total FROM runtime.customers"),
      queryNoDb("SELECT status, COUNT(*) as cnt FROM runtime.customers GROUP BY status"),
      queryNoDb("SELECT state, COUNT(*) as cnt FROM runtime.customers WHERE state IS NOT NULL AND state != '' AND country = 'US' GROUP BY state ORDER BY cnt DESC LIMIT 10"),
      queryNoDb("SELECT country, COUNT(*) as cnt FROM runtime.customers WHERE country IS NOT NULL GROUP BY country ORDER BY cnt DESC"),
      queryNoDb("SELECT name, companyName, city, state, country, createdAt FROM runtime.customers ORDER BY createdAt DESC LIMIT 5"),
      queryNoDb("SELECT COUNT(DISTINCT parent) as cnt FROM runtime.customers WHERE parent IS NOT NULL"),
      queryNoDb("SELECT state as province, COUNT(*) as cnt FROM runtime.customers WHERE country = 'CA' AND state IS NOT NULL AND state != '' GROUP BY state ORDER BY cnt DESC"),
    ]);

    return {
      total: Number((totalResult as any[])[0]?.total ?? 0),
      parentAccounts: Number((parentResult as any[])[0]?.cnt ?? 0),
      byStatus: statusResult as any[],
      byState: stateResult as any[],
      byCountry: countryResult as any[],
      byProvince: caProvinceResult as any[],
      recent: recentResult as any[],
    };
  }

  async getOrders(filters: OrderFilters): Promise<OrderListResult> {
    let where = "WHERE 1=1";
    const params: any[] = [];

    if (filters.search) {
      where += " AND (o.orderNumber LIKE ? OR o.crmId LIKE ?)";
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    if (filters.status) {
      where += " AND o.status = ?";
      params.push(filters.status);
    }
    if (filters.dateFrom) {
      where += " AND o.orderDate >= ?";
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      where += " AND o.orderDate <= ?";
      params.push(filters.dateTo + " 23:59:59");
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
       LIMIT ${filters.limit} OFFSET ${filters.offset}`,
      params
    );

    return { rows: rows as any[], total };
  }

  async getOrderStats(): Promise<OrderStats> {
    const [totalResult, statusResult, recentByDay] = await Promise.all([
      queryNoDb("SELECT COUNT(*) as total FROM runtime.orders"),
      queryNoDb("SELECT status, COUNT(*) as cnt FROM runtime.orders GROUP BY status ORDER BY cnt DESC"),
      queryNoDb("SELECT DATE(orderDate) as day, COUNT(*) as cnt FROM runtime.orders WHERE orderDate >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY DATE(orderDate) ORDER BY day DESC LIMIT 30"),
    ]);

    return {
      total: Number((totalResult as any[])[0]?.total ?? 0),
      byStatus: statusResult as any[],
      recentByDay: recentByDay as any[],
    };
  }

  async getOrderById(id: number): Promise<OrderDetail | null> {
    const rows = await queryNoDb(
      `SELECT * FROM runtime.orders WHERE id = ?`,
      [id]
    );
    const order = (rows as any[])[0];
    return order || null;
  }

  async getOrderHistory(orderId: number): Promise<any[]> {
    const rows = await queryNoDb(
      `SELECT * FROM runtime.order_data WHERE orderId = ? ORDER BY date ASC`,
      [orderId]
    );
    return rows as any[];
  }

  async getProducts(filters: ProductFilters): Promise<ProductListResult> {
    let where = "WHERE 1=1";
    const params: any[] = [];

    if (filters.search) {
      where += " AND (p.sku LIKE ? OR p.description LIKE ? OR p.upc LIKE ? OR p.vendorCode LIKE ?)";
      const s = `%${filters.search}%`;
      params.push(s, s, s, s);
    }
    if (filters.status) {
      where += " AND p.status = ?";
      params.push(filters.status);
    }
    if (filters.vendor) {
      where += " AND p.vendor = ?";
      params.push(filters.vendor);
    }
    if (filters.location) {
      where += " AND p.location = ?";
      params.push(filters.location);
    }
    if (filters.active === "1") {
      where += " AND p.active = 1";
    } else if (filters.active === "0") {
      where += " AND p.active = 0";
    }
    if (filters.dateFrom) {
      where += " AND p.createdAt >= ?";
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      where += " AND p.createdAt <= ?";
      params.push(filters.dateTo + " 23:59:59");
    }

    const countResult = await queryNoDb(
      `SELECT COUNT(*) as total FROM runtime.products p ${where}`,
      params
    );
    const total = Number((countResult as any[])[0]?.total ?? 0);

    const rows = await queryNoDb(
      `SELECT p.sku, p.status, p.name, p.description, p.upc, p.basePrice, p.location, p.vendor, p.vendorCode, p.crmId, p.active, p.srp, p.createdAt, p.updatedAt, p.deleted, p.purchasePrice
       FROM runtime.products p ${where}
       ORDER BY p.updatedAt DESC
       LIMIT ${filters.limit} OFFSET ${filters.offset}`,
      params
    );

    return { rows: rows as any[], total };
  }

  async getProductStats(): Promise<ProductStats> {
    const [totalResult, vendorResult, locationResult] = await Promise.all([
      queryNoDb(`SELECT COUNT(*) as total,
        SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) as activeCount,
        SUM(CASE WHEN deleted = 1 THEN 1 ELSE 0 END) as deletedCount,
        SUM(CASE WHEN status = 'SYNCED' THEN 1 ELSE 0 END) as syncedCount,
        AVG(basePrice) as avgPrice
        FROM runtime.products`),
      queryNoDb("SELECT vendor, COUNT(*) as cnt FROM runtime.products GROUP BY vendor ORDER BY cnt DESC LIMIT 10"),
      queryNoDb("SELECT location, COUNT(*) as cnt FROM runtime.products GROUP BY location ORDER BY cnt DESC"),
    ]);

    const row = (totalResult as any[])[0] || {};
    return {
      total: Number(row.total ?? 0),
      activeCount: Number(row.activeCount ?? 0),
      deletedCount: Number(row.deletedCount ?? 0),
      syncedCount: Number(row.syncedCount ?? 0),
      avgPrice: Number(row.avgPrice ?? 0),
      byVendor: vendorResult as any[],
      byLocation: locationResult as any[],
    };
  }

  async getPurchaseOrders(filters: PurchaseOrderFilters): Promise<PurchaseOrderListResult> {
    let where = "WHERE 1=1";
    const params: any[] = [];

    if (filters.search) {
      where += " AND (po.poNumber LIKE ? OR po.vendor LIKE ? OR po.crmId LIKE ?)";
      const s = `%${filters.search}%`;
      params.push(s, s, s);
    }
    if (filters.status) {
      where += " AND po.status = ?";
      params.push(filters.status);
    }
    if (filters.vendor) {
      where += " AND po.vendor = ?";
      params.push(filters.vendor);
    }
    if (filters.dateFrom) {
      where += " AND po.orderDate >= ?";
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      where += " AND po.orderDate <= ?";
      params.push(filters.dateTo + " 23:59:59");
    }

    const countResult = await queryNoDb(
      `SELECT COUNT(*) as total FROM runtime.purchase_orders po ${where}`,
      params
    );
    const total = Number((countResult as any[])[0]?.total ?? 0);

    const rows = await queryNoDb(
      `SELECT po.id, po.vendor, po.\`index\`, po.poNumber, po.orderDate, po.crmId, po.status, po.statusMessage, po.createdAt, po.updatedAt
       FROM runtime.purchase_orders po ${where}
       ORDER BY po.createdAt DESC
       LIMIT ${filters.limit} OFFSET ${filters.offset}`,
      params
    );

    return { rows: rows as any[], total };
  }

  async getPurchaseOrderStats(): Promise<PurchaseOrderStats> {
    const [totalResult, statusResult, vendorResult, recentByDay] = await Promise.all([
      queryNoDb("SELECT COUNT(*) as total FROM runtime.purchase_orders"),
      queryNoDb("SELECT status, COUNT(*) as cnt FROM runtime.purchase_orders GROUP BY status ORDER BY cnt DESC"),
      queryNoDb("SELECT vendor, COUNT(*) as cnt FROM runtime.purchase_orders GROUP BY vendor ORDER BY cnt DESC LIMIT 10"),
      queryNoDb("SELECT DATE(orderDate) as day, COUNT(*) as cnt FROM runtime.purchase_orders WHERE orderDate IS NOT NULL GROUP BY DATE(orderDate) ORDER BY day DESC LIMIT 30"),
    ]);

    return {
      total: Number((totalResult as any[])[0]?.total ?? 0),
      byStatus: statusResult as any[],
      byVendor: vendorResult as any[],
      recentByDay: recentByDay as any[],
    };
  }

  async getPurchaseOrderById(id: number): Promise<PurchaseOrderDetail | null> {
    const rows = await queryNoDb(
      `SELECT * FROM runtime.purchase_orders WHERE id = ?`,
      [id]
    );
    const po = (rows as any[])[0];
    return po || null;
  }

  async getPurchaseOrderHistory(poId: number): Promise<PurchaseOrderDataRow[]> {
    const rows = await queryNoDb(
      `SELECT * FROM runtime.purchase_order_data WHERE purchaseOrderId = ? ORDER BY date ASC`,
      [poId]
    );
    return rows as any[];
  }

  async getSuppliers(filters: SupplierFilters): Promise<SupplierListResult> {
    let where = "WHERE 1=1";
    const params: any[] = [];

    if (filters.search) {
      where += " AND (name LIKE ? OR favouriteCarrier LIKE ?)";
      const s = `%${filters.search}%`;
      params.push(s, s);
    }
    if (filters.dateFrom) {
      where += " AND createdAt >= ?";
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      where += " AND createdAt <= ?";
      params.push(filters.dateTo + " 23:59:59");
    }

    const countResult = await queryNoDb(
      `SELECT COUNT(*) as total FROM runtime.suppliers ${where}`,
      params
    );
    const total = Number((countResult as any[])[0]?.total ?? 0);

    const rows = await queryNoDb(
      `SELECT * FROM runtime.suppliers ${where} ORDER BY name ASC LIMIT ${filters.limit} OFFSET ${filters.offset}`,
      params
    );

    return { rows: rows as any[], total };
  }

  async getSupplierStats(): Promise<SupplierStats> {
    const [totalResult, carrierResult, addressResult, avgResult] = await Promise.all([
      queryNoDb("SELECT COUNT(*) as total FROM runtime.suppliers"),
      queryNoDb("SELECT COUNT(*) as cnt FROM runtime.suppliers WHERE useCarrierDetermination = 1"),
      queryNoDb("SELECT COUNT(*) as cnt FROM runtime.suppliers WHERE validateAddresses = 1"),
      queryNoDb("SELECT AVG(currentIndex) as avg_idx FROM runtime.suppliers"),
    ]);

    return {
      total: Number((totalResult as any[])[0]?.total ?? 0),
      withCarrierDetermination: Number((carrierResult as any[])[0]?.cnt ?? 0),
      withAddressValidation: Number((addressResult as any[])[0]?.cnt ?? 0),
      avgIndex: Number((avgResult as any[])[0]?.avg_idx ?? 0),
    };
  }

  async getSupplierByName(name: string): Promise<SupplierRow | null> {
    const rows = await queryNoDb(
      `SELECT * FROM runtime.suppliers WHERE name = ?`,
      [name]
    );
    return (rows as any[])[0] || null;
  }

  async getVendors(filters: VendorFilters): Promise<VendorListResult> {
    let where = "WHERE 1=1";
    const params: any[] = [];

    if (filters.search) {
      where += " AND (name LIKE ? OR companyName LIKE ? OR crmId LIKE ? OR email LIKE ?)";
      const s = `%${filters.search}%`;
      params.push(s, s, s, s);
    }
    if (filters.status) {
      where += " AND status = ?";
      params.push(filters.status);
    }
    if (filters.state) {
      where += " AND state = ?";
      params.push(filters.state);
    }
    if (filters.dateFrom) {
      where += " AND createdAt >= ?";
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      where += " AND createdAt <= ?";
      params.push(filters.dateTo + " 23:59:59");
    }

    const countResult = await queryNoDb(
      `SELECT COUNT(*) as total FROM runtime.vendors ${where}`,
      params
    );
    const total = Number((countResult as any[])[0]?.total ?? 0);

    const rows = await queryNoDb(
      `SELECT * FROM runtime.vendors ${where} ORDER BY name ASC LIMIT ${filters.limit} OFFSET ${filters.offset}`,
      params
    );

    return { rows: rows as any[], total };
  }

  async getVendorStats(): Promise<VendorStats> {
    const [totalResult, syncedResult, toSyncResult, deletedResult, addressResult, emailResult, phoneResult, stateResult] = await Promise.all([
      queryNoDb("SELECT COUNT(*) as cnt FROM runtime.vendors"),
      queryNoDb("SELECT COUNT(*) as cnt FROM runtime.vendors WHERE status = 'SYNCED'"),
      queryNoDb("SELECT COUNT(*) as cnt FROM runtime.vendors WHERE status = 'TOSYNC'"),
      queryNoDb("SELECT COUNT(*) as cnt FROM runtime.vendors WHERE deleted = 1"),
      queryNoDb("SELECT COUNT(*) as cnt FROM runtime.vendors WHERE address IS NOT NULL AND address != ''"),
      queryNoDb("SELECT COUNT(*) as cnt FROM runtime.vendors WHERE email IS NOT NULL AND email != ''"),
      queryNoDb("SELECT COUNT(*) as cnt FROM runtime.vendors WHERE phone IS NOT NULL AND phone != ''"),
      queryNoDb("SELECT state, COUNT(*) as cnt FROM runtime.vendors WHERE state IS NOT NULL AND state != '' GROUP BY state ORDER BY cnt DESC LIMIT 15"),
    ]);

    return {
      total: Number((totalResult as any[])[0]?.cnt ?? 0),
      syncedCount: Number((syncedResult as any[])[0]?.cnt ?? 0),
      toSyncCount: Number((toSyncResult as any[])[0]?.cnt ?? 0),
      deletedCount: Number((deletedResult as any[])[0]?.cnt ?? 0),
      withAddress: Number((addressResult as any[])[0]?.cnt ?? 0),
      withEmail: Number((emailResult as any[])[0]?.cnt ?? 0),
      withPhone: Number((phoneResult as any[])[0]?.cnt ?? 0),
      byState: stateResult as any[],
    };
  }

  async getVendorByName(name: string): Promise<VendorRow | null> {
    const rows = await queryNoDb(
      `SELECT * FROM runtime.vendors WHERE name = ?`,
      [name]
    );
    return (rows as any[])[0] || null;
  }

  async getWarehouses(): Promise<WarehouseListResult> {
    const rows = await queryNoDb(
      `SELECT * FROM runtime.warehouses ORDER BY name ASC`
    );
    return { rows: rows as any[], total: (rows as any[]).length };
  }

  async getErrors(filters: ErrorFilters): Promise<ErrorListResult> {
    let where = "WHERE 1=1";
    const params: any[] = [];

    if (filters.search) {
      where += " AND (id LIKE ? OR guide LIKE ? OR statusMessage LIKE ? OR channelName LIKE ? OR destination LIKE ?)";
      const s = `%${filters.search}%`;
      params.push(s, s, s, s, s);
    }
    if (filters.type) {
      where += " AND type = ?";
      params.push(filters.type);
    }
    if (filters.channelName) {
      where += " AND channelName = ?";
      params.push(filters.channelName);
    }
    if (filters.dateFrom) {
      where += " AND date >= ?";
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      where += " AND date <= ?";
      params.push(filters.dateTo + " 23:59:59");
    }

    const countResult = await queryNoDb(
      `SELECT COUNT(*) as total FROM runtime.errors ${where}`,
      params
    );
    const total = Number((countResult as any[])[0]?.total ?? 0);

    const rows = await queryNoDb(
      `SELECT * FROM runtime.errors ${where} ORDER BY date DESC LIMIT ${filters.limit} OFFSET ${filters.offset}`,
      params
    );

    return { rows: rows as any[], total };
  }

  async getErrorStats(): Promise<ErrorStats> {
    const [totalResult, typeResult, channelResult, vendorResult, recentResult] = await Promise.all([
      queryNoDb("SELECT COUNT(*) as total FROM runtime.errors"),
      queryNoDb("SELECT type, COUNT(*) as cnt FROM runtime.errors WHERE type IS NOT NULL GROUP BY type ORDER BY cnt DESC"),
      queryNoDb("SELECT channelName, COUNT(*) as cnt FROM runtime.errors WHERE channelName IS NOT NULL GROUP BY channelName ORDER BY cnt DESC"),
      queryNoDb("SELECT vendor, COUNT(*) as cnt FROM runtime.errors WHERE vendor IS NOT NULL GROUP BY vendor ORDER BY cnt DESC"),
      queryNoDb("SELECT DATE(date) as day, COUNT(*) as cnt FROM runtime.errors GROUP BY DATE(date) ORDER BY day DESC LIMIT 30"),
    ]);

    return {
      total: Number((totalResult as any[])[0]?.total ?? 0),
      byType: typeResult as any[],
      byChannel: channelResult as any[],
      byVendor: vendorResult as any[],
      recentByDay: recentResult as any[],
    };
  }

  async getErrorById(id: number): Promise<ErrorRow | null> {
    const rows = await queryNoDb(
      `SELECT * FROM runtime.errors WHERE _id = ?`,
      [id]
    );
    return (rows as any[])[0] || null;
  }

  private salesCache: { data: SalesInsights; timestamp: number } | null = null;
  private salesCachePromise: Promise<SalesInsights> | null = null;

  async getSalesInsights(): Promise<SalesInsights> {
    const CACHE_TTL = 5 * 60 * 1000;
    if (this.salesCache && Date.now() - this.salesCache.timestamp < CACHE_TTL) {
      return this.salesCache.data;
    }
    if (this.salesCachePromise) return this.salesCachePromise;

    this.salesCachePromise = this._computeSalesInsights().then((data) => {
      this.salesCache = { data, timestamp: Date.now() };
      this.salesCachePromise = null;
      return data;
    }).catch((err) => {
      this.salesCachePromise = null;
      throw err;
    });
    return this.salesCachePromise;
  }

  private async _computeSalesInsights(): Promise<SalesInsights> {
    const [totalsRows, topSkuRows, dailyRows, vendorRows] = await Promise.all([
      queryNoDb(
        `SELECT SUM(jt.qty) as totalUnits, SUM(jt.qty * jt.price) as totalRevenue,
                COUNT(DISTINCT jt.sku) as uniqueSkus, COUNT(DISTINCT o.id) as totalOrders
         FROM runtime.orders o,
         JSON_TABLE(o.content, '$.items[*]' COLUMNS(
           sku VARCHAR(100) PATH '$.sku',
           qty DECIMAL(12,2) PATH '$.acceptedQuantity',
           price DECIMAL(12,2) PATH '$.price'
         )) jt
         WHERE jt.qty > 0 AND jt.sku IS NOT NULL
           AND jt.sku NOT LIKE '%-%' AND jt.sku NOT LIKE '%Frt%'`
      ) as any[],
      queryNoDb(
        `SELECT jt.sku, SUM(jt.qty) as totalQty, SUM(jt.qty * jt.price) as totalRevenue,
                COUNT(DISTINCT o.id) as orderCount
         FROM runtime.orders o,
         JSON_TABLE(o.content, '$.items[*]' COLUMNS(
           sku VARCHAR(100) PATH '$.sku',
           qty DECIMAL(12,2) PATH '$.acceptedQuantity',
           price DECIMAL(12,2) PATH '$.price'
         )) jt
         WHERE jt.qty > 0 AND jt.sku IS NOT NULL
           AND jt.sku NOT LIKE '%-%' AND jt.sku NOT LIKE '%Frt%'
         GROUP BY jt.sku ORDER BY totalQty DESC LIMIT 20`
      ) as any[],
      queryNoDb(
        `SELECT DATE(o.orderDate) as day, SUM(jt.qty) as units, COUNT(DISTINCT o.id) as orders
         FROM runtime.orders o,
         JSON_TABLE(o.content, '$.items[*]' COLUMNS(
           sku VARCHAR(100) PATH '$.sku',
           qty DECIMAL(12,2) PATH '$.acceptedQuantity'
         )) jt
         WHERE jt.qty > 0 AND jt.sku IS NOT NULL
           AND jt.sku NOT LIKE '%-%' AND jt.sku NOT LIKE '%Frt%'
         GROUP BY DATE(o.orderDate) ORDER BY day DESC LIMIT 30`
      ) as any[],
      queryNoDb(
        `SELECT o.vendor, SUM(jt.qty * jt.price) as revenue, SUM(jt.qty) as units
         FROM runtime.orders o,
         JSON_TABLE(o.content, '$.items[*]' COLUMNS(
           sku VARCHAR(100) PATH '$.sku',
           qty DECIMAL(12,2) PATH '$.acceptedQuantity',
           price DECIMAL(12,2) PATH '$.price'
         )) jt
         WHERE jt.qty > 0 AND jt.sku IS NOT NULL AND o.vendor IS NOT NULL
           AND jt.sku NOT LIKE '%-%' AND jt.sku NOT LIKE '%Frt%'
         GROUP BY o.vendor ORDER BY revenue DESC LIMIT 10`
      ) as any[],
    ]);

    const totals = totalsRows[0] || {};

    const topSkus = topSkuRows.map((r: any) => r.sku);
    let productDetails: any[] = [];
    if (topSkus.length > 0) {
      const placeholders = topSkus.map(() => "?").join(",");
      productDetails = await queryNoDb(
        `SELECT sku, name, vendor, basePrice FROM runtime.products WHERE sku IN (${placeholders})`,
        topSkus
      ) as any[];
    }
    const productMap: Record<string, any> = {};
    productDetails.forEach((p) => { productMap[p.sku] = p; });

    const topProducts = topSkuRows.map((r: any) => {
      const prod = productMap[r.sku];
      return {
        sku: r.sku,
        name: prod?.name || null,
        vendor: prod?.vendor || null,
        totalQty: Number(r.totalQty),
        totalRevenue: Number(r.totalRevenue),
        orderCount: Number(r.orderCount),
        basePrice: prod?.basePrice != null ? Number(prod.basePrice) : null,
      };
    });

    const recentDailyUnits = dailyRows.map((r: any) => ({
      day: r.day instanceof Date ? r.day.toISOString().split("T")[0] : String(r.day),
      units: Number(r.units),
      orders: Number(r.orders),
    }));

    const topVendorsByRevenue = vendorRows.map((r: any) => ({
      vendor: r.vendor,
      revenue: Number(r.revenue),
      units: Number(r.units),
    }));

    return {
      totalUnits: Number(totals.totalUnits) || 0,
      totalRevenue: Number(totals.totalRevenue) || 0,
      uniqueSkus: Number(totals.uniqueSkus) || 0,
      totalOrders: Number(totals.totalOrders) || 0,
      topProducts,
      recentDailyUnits,
      topVendorsByRevenue,
    };
  }

  async executeQuery(sql: string, database?: string): Promise<TableDataResult> {
    const startTime = Date.now();
    const rows = await query(sql, undefined, database);
    const executionTime = Date.now() - startTime;

    if (Array.isArray(rows)) {
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
      return { columns, rows, rowCount: rows.length, executionTime };
    } else {
      return {
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
      };
    }
  }
}
