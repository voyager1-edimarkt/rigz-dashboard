import { log } from "./index";

interface OdooConfig {
  url: string;
  db: string;
  user: string;
  password: string;
}

interface JsonRpcResponse {
  jsonrpc: string;
  id: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data: {
      message: string;
      debug?: string;
    };
  };
}

export class OdooClient {
  private config: OdooConfig;
  private uid: number | null = null;

  constructor() {
    this.config = {
      url: process.env.ODOO_URL || "https://rigz.odoo.com/jsonrpc",
      db: process.env.ODOO_DB || "rigz",
      user: process.env.ODOO_USER || "",
      password: process.env.ODOO_PWD || "",
    };
  }

  private async jsonRpc(payload: any, retries = 3): Promise<JsonRpcResponse> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const response = await fetch(this.config.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (response.status === 429 && attempt < retries) {
          clearTimeout(timeoutId);
          const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json() as JsonRpcResponse;

        if (data.error) {
          throw new Error(
            `Odoo error: ${data.error.data?.message || data.error.message}`
          );
        }

        return data;
      } finally {
        clearTimeout(timeoutId);
      }
    }
    throw new Error("Max retries exceeded");
  }

  async authenticate(): Promise<number> {
    if (this.uid !== null) {
      return this.uid;
    }

    log(`Authenticating with Odoo at ${this.config.url} as ${this.config.user} on db ${this.config.db}...`, "odoo");

    const resp = await this.jsonRpc({
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: "common",
        method: "authenticate",
        args: [this.config.db, this.config.user, this.config.password, {}],
      },
    });

    if (resp.result === false || resp.result === null || resp.result === undefined) {
      throw new Error("Odoo authentication failed - invalid credentials. Check ODOO_DB, ODOO_USER, ODOO_PWD values.");
    }

    this.uid = resp.result;
    log(`Authenticated with Odoo as uid ${this.uid}`, "odoo");
    return this.uid!;
  }

  async executeKw(
    model: string,
    method: string,
    args: any[],
    kwargs?: Record<string, any>
  ): Promise<any> {
    await this.authenticate();

    const callArgs: any[] = [
      this.config.db,
      this.uid,
      this.config.password,
      model,
      method,
      args,
    ];
    if (kwargs && Object.keys(kwargs).length > 0) {
      callArgs.push(kwargs);
    }

    const resp = await this.jsonRpc({
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: "object",
        method: "execute_kw",
        args: callArgs,
        id: Date.now(),
      },
    });

    return resp.result;
  }

  async searchRead(
    model: string,
    filters: any[] = [],
    fields: string[] = [],
    offset?: number,
    limit?: number,
    order?: string
  ): Promise<any[]> {
    const kwargs: Record<string, any> = {};
    if (fields.length > 0) kwargs.fields = fields;
    if (offset !== undefined) kwargs.offset = offset;
    if (limit !== undefined) kwargs.limit = limit;
    if (order) kwargs.order = order;

    const records = await this.executeKw(model, "search_read", [filters], kwargs);
    if (fields.length > 0 && Array.isArray(records)) {
      return records.map((r: any) => {
        const filtered: any = { id: r.id };
        for (const f of fields) {
          if (f in r) filtered[f] = r[f];
        }
        return filtered;
      });
    }
    return records || [];
  }

  async searchCount(model: string, filters: any[] = []): Promise<number> {
    return this.executeKw(model, "search_count", [filters]);
  }

  async read(model: string, ids: number[], fields: string[] = []): Promise<any[]> {
    const kwargs: Record<string, any> = {};
    if (fields.length > 0) kwargs.fields = fields;
    return this.executeKw(model, "read", [ids], kwargs);
  }

  async create(model: string, values: Record<string, any>): Promise<number> {
    return this.executeKw(model, "create", [values]);
  }

  async readGroup(
  model: string,
  domain: any[] = [],
  fields: string[] = [],
  groupby: string[] = [],
  options: Record<string, any> = {}
): Promise<any[]> {
  // Odoo read_group signature: domain, fields, groupby, [options]
  return this.executeKw(model, "read_group", [domain, fields, groupby], options);
}
  async write(
    model: string,
    ids: number[],
    values: Record<string, any>
  ): Promise<boolean> {
    return this.executeKw(model, "write", [ids, values]);
  }

  async testConnection(): Promise<{ connected: boolean; uid?: number; error?: string }> {
    try {
      const uid = await this.authenticate();
      return { connected: true, uid };
    } catch (err: any) {
      return { connected: false, error: err.message };
    }
  }

  reset(): void {
    this.uid = null;
  }

  async getSaleOrders(
    filters: any[] = [],
    offset = 0,
    limit = 25,
    order = "date_order desc"
  ): Promise<{ records: any[]; total: number }> {
    const fields = [
      "name", "partner_id", "partner_invoice_id", "partner_shipping_id",
      "date_order", "state", "amount_total", "amount_untaxed",
      "amount_tax", "order_line", "picking_ids", "invoice_ids",
      "currency_id", "create_date", "write_date",
    ];

    const records = await this.searchRead("sale.order", filters, fields, offset, limit, order);
    const total = await this.searchCount("sale.order", filters);

    return { records, total };
  }

  async getPurchaseOrders(
    filters: any[] = [],
    offset = 0,
    limit = 25,
    order = "date_order desc"
  ): Promise<{ records: any[]; total: number }> {
    const fields = [
      "name", "partner_id", "date_order", "date_planned",
      "state", "amount_total", "amount_untaxed", "amount_tax",
      "order_line", "currency_id", "create_date", "write_date",
    ];

    const records = await this.searchRead("purchase.order", filters, fields, offset, limit, order);
    const total = await this.searchCount("purchase.order", filters);

    return { records, total };
  }

  async getProducts(
    filters: any[] = [],
    offset = 0,
    limit = 25,
    order = "name asc"
  ): Promise<{ records: any[]; total: number }> {
    const fields = [
      "name", "default_code", "description", "list_price",
      "standard_price", "type", "categ_id", "active",
      "create_date", "write_date", "barcode", "seller_ids",
    ];

    const records = await this.searchRead("product.template", filters, fields, offset, limit, order);
    const total = await this.searchCount("product.template", filters);

    return { records, total };
  }

  async getInvoices(
    filters: any[] = [],
    offset = 0,
    limit = 25,
    order = "invoice_date desc"
  ): Promise<{ records: any[]; total: number }> {
    const baseFilters: any[] = [["move_type", "=", "out_invoice"], ...filters];
    const fields = [
      "name", "partner_id", "invoice_date", "invoice_date_due",
      "state", "payment_state", "amount_total", "amount_residual",
      "amount_untaxed", "amount_tax", "currency_id",
      "invoice_origin", "ref",
      "create_date", "write_date",
    ];

    const records = await this.searchRead("account.move", baseFilters, fields, offset, limit, order);
    const total = await this.searchCount("account.move", baseFilters);

    return { records, total };
  }

  async getRevenueThisMonth(): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const domain = [
    ["move_type", "=", "out_invoice"],
    ["state", "=", "posted"],
    ["invoice_date", ">=", startOfMonth],
  ];

  const rows = await this.readGroup(
    "account.move",
    domain,
    ["amount_total"],
    [],
    { lazy: false }
  );

  return rows?.[0]?.amount_total || 0;
}

 async getCustomerSalesTotals(params?: {
  dateFrom?: string; // "2026-01-01"
  dateTo?: string;   // "2026-01-31"
  state?: string[];  // default: ["sale","done"]
  limit?: number;
}) {
  const state = params?.state ?? ["sale", "done"];

  const domain: any[] = [["state", "in", state]];

  if (params?.dateFrom) domain.push(["date_order", ">=", params.dateFrom]);
  if (params?.dateTo) domain.push(["date_order", "<=", params.dateTo]);

  // Fields: partner_id (group), amount_total (sum), __count (auto)
  const rows = await this.readGroup(
    "sale.order",
    domain,
    ["partner_id", "amount_total"],
    ["partner_id"],
    {
      lazy: false,
      orderby: "amount_total desc",
      limit: params?.limit ?? 50,
    }
  );

  // rows look like: { partner_id: [id, "Name"], amount_total: 1234.5, __count: 7 }
  return rows.map((r: any) => ({
    partner_id: r.partner_id?.[0],
    partner_name: r.partner_id?.[1],
    orders_count: r.__count,
    amount_total: r.amount_total,
  }));
}

async getCustomerInvoiceTotals(params?: {
  dateFrom?: string; // "2026-01-01"
  dateTo?: string;
  states?: string[]; // e.g. ["posted"]
  limit?: number;
}) {
  const domain: any[] = [["move_type", "=", "out_invoice"]];

  if (params?.states?.length) domain.push(["state", "in", params.states]);
  if (params?.dateFrom) domain.push(["invoice_date", ">=", params.dateFrom]);
  if (params?.dateTo) domain.push(["invoice_date", "<=", params.dateTo]);

  const rows = await this.readGroup(
    "account.move",
    domain,
    ["partner_id", "amount_total", "amount_residual"],
    ["partner_id"],
    {
      lazy: false,
      orderby: "amount_total desc",
      limit: params?.limit ?? 50,
    }
  );

  return rows.map((r: any) => ({
    partner_id: r.partner_id?.[0],
    partner_name: r.partner_id?.[1],
    invoices_count: r.__count,
    invoiced_total: r.amount_total,
    outstanding_total: r.amount_residual, // unpaid/remaining
  }));
}

  async getBills(
    filters: any[] = [],
    offset = 0,
    limit = 25,
    order = "invoice_date desc"
  ): Promise<{ records: any[]; total: number }> {
    const baseFilters: any[] = [["move_type", "=", "in_invoice"], ...filters];
    const fields = [
      "name", "partner_id", "invoice_date", "invoice_date_due",
      "state", "payment_state", "amount_total", "amount_residual",
      "amount_untaxed", "amount_tax", "currency_id",
      "invoice_origin", "ref",
      "create_date", "write_date",
    ];

    const records = await this.searchRead("account.move", baseFilters, fields, offset, limit, order);
    const total = await this.searchCount("account.move", baseFilters);

    return { records, total };
  }

  async getPartners(
    filters: any[] = [],
    offset = 0,
    limit = 25,
    order = "name asc"
  ): Promise<{ records: any[]; total: number }> {
    const fields = [
      "name", "email", "phone", "mobile", "street", "street2",
      "city", "state_id", "zip", "country_id", "is_company",
      "customer_rank", "supplier_rank", "active",
      "parent_id", "child_ids",
      "create_date", "write_date",
    ];

    const records = await this.searchRead("res.partner", filters, fields, offset, limit, order);
    const total = await this.searchCount("res.partner", filters);

    return { records, total };
  }

  async getPartnerById(id: number): Promise<any | null> {
    const fields = [
      "name", "email", "phone", "mobile", "street", "street2",
      "city", "state_id", "zip", "country_id", "is_company",
      "customer_rank", "supplier_rank", "active",
      "parent_id", "child_ids",
      "create_date", "write_date",
    ];
    const records = await this.read("res.partner", [id], fields);
    return records?.[0] || null;
  }

  async getPartnerChildren(parentId: number, offset = 0, limit = 100, order = "name asc"): Promise<{ records: any[]; total: number }> {
    const fields = [
      "name", "email", "phone", "mobile", "street", "street2",
      "city", "state_id", "zip", "country_id", "is_company",
      "customer_rank", "supplier_rank", "active",
      "parent_id", "child_ids",
      "create_date", "write_date",
    ];
    const filters: any[] = [["parent_id", "=", parentId]];
    const records = await this.searchRead("res.partner", filters, fields, offset, limit, order);
    const total = await this.searchCount("res.partner", filters);
    return { records, total };
  }
}

let odooClient: OdooClient | null = null;

export function getOdooClient(): OdooClient {
  if (!odooClient) {
    odooClient = new OdooClient();
  }
  return odooClient;
}
