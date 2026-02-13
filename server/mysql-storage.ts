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
