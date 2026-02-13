import { z } from "zod";

export const connectionStatusSchema = z.object({
  connected: z.boolean(),
  host: z.string().optional(),
  database: z.string().optional(),
  error: z.string().optional(),
});

export const databaseInfoSchema = z.object({
  name: z.string(),
});

export const tableInfoSchema = z.object({
  name: z.string(),
  type: z.enum(["TABLE", "VIEW"]),
  rows: z.number().optional(),
  engine: z.string().optional(),
});

export const columnInfoSchema = z.object({
  name: z.string(),
  type: z.string(),
  nullable: z.boolean(),
  key: z.string(),
  defaultValue: z.string().nullable(),
  extra: z.string(),
});

export const queryResultSchema = z.object({
  columns: z.array(z.string()),
  rows: z.array(z.record(z.unknown())),
  rowCount: z.number(),
  executionTime: z.number(),
  error: z.string().optional(),
});

export const queryRequestSchema = z.object({
  sql: z.string().min(1, "Query cannot be empty"),
  database: z.string().optional(),
});

export interface Customer {
  name: string;
  companyName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  email: string;
  secondaryEmail: string;
  phone: string;
  officePhone: string;
  status: string;
  deleted: boolean;
  crmId: string;
  parent: string | null;
  priceLevel: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerListResult {
  rows: Customer[];
  total: number;
}

export interface RecentCustomer {
  name: string;
  companyName: string;
  city: string;
  state: string;
  country: string;
  createdAt: string;
}

export interface CustomerStats {
  total: number;
  parentAccounts: number;
  byStatus: { status: string; cnt: number }[];
  byState: { state: string; cnt: number }[];
  byCountry: { country: string; cnt: number }[];
  byProvince: { province: string; cnt: number }[];
  recent: RecentCustomer[];
}

export interface OrderRow {
  id: number;
  index: number;
  orderNumber: string;
  vendor: string;
  country: string;
  orderDate: string;
  crmId: string;
  status: string;
  statusMessage: string;
  channel: string;
  test: boolean;
  createdAt: string;
  updatedAt: string;
  purchaseOrderNumber: string;
}

export interface OrderDetail extends OrderRow {
  content: string;
  poContent: string;
  invoiceContent: string;
}

export interface OrderListResult {
  rows: OrderRow[];
  total: number;
}

export interface OrderStats {
  total: number;
  byStatus: { status: string; cnt: number }[];
  recentByDay: { day: string; cnt: number }[];
}

export interface CustomerFilters {
  limit: number;
  offset: number;
  search?: string;
  status?: string;
  state?: string;
}

export interface OrderFilters {
  limit: number;
  offset: number;
  search?: string;
  status?: string;
}

export interface TableDataResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTime: number;
}

export type ConnectionStatus = z.infer<typeof connectionStatusSchema>;
export type DatabaseInfo = z.infer<typeof databaseInfoSchema>;
export type TableInfo = z.infer<typeof tableInfoSchema>;
export type ColumnInfo = z.infer<typeof columnInfoSchema>;
export type QueryResult = z.infer<typeof queryResultSchema>;
export type QueryRequest = z.infer<typeof queryRequestSchema>;
