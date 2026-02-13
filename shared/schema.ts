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

export interface OrderDataRow {
  id: number;
  orderId: number;
  date: string | null;
  initialStatus: string | null;
  newStatus: string | null;
  inboundContent: string | null;
  inboundIdentifier: string | null;
  inboundType: string | null;
  outboundContent: string | null;
  outboundIdentifier: string | null;
  outboundType: string | null;
}

export interface ProductRow {
  sku: string;
  status: string;
  name: string | null;
  description: string | null;
  upc: string | null;
  basePrice: number | null;
  location: string | null;
  vendor: string | null;
  vendorCode: string | null;
  crmId: string | null;
  active: any;
  srp: number | null;
  createdAt: string;
  updatedAt: string;
  deleted: any;
  purchasePrice: number | null;
}

export interface ProductListResult {
  rows: ProductRow[];
  total: number;
}

export interface ProductStats {
  total: number;
  activeCount: number;
  deletedCount: number;
  syncedCount: number;
  avgPrice: number;
  byVendor: { vendor: string | null; cnt: number }[];
  byLocation: { location: string | null; cnt: number }[];
}

export interface ProductFilters {
  limit: number;
  offset: number;
  search?: string;
  status?: string;
  vendor?: string;
  location?: string;
  active?: string;
}

export interface PurchaseOrderRow {
  id: number;
  vendor: string;
  index: number;
  poNumber: string;
  orderDate: string | null;
  crmId: string | null;
  status: string;
  statusMessage: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderDetail extends PurchaseOrderRow {
  content: string;
  invoiceContent: string | null;
}

export interface PurchaseOrderListResult {
  rows: PurchaseOrderRow[];
  total: number;
}

export interface PurchaseOrderStats {
  total: number;
  byStatus: { status: string; cnt: number }[];
  byVendor: { vendor: string; cnt: number }[];
  recentByDay: { day: string; cnt: number }[];
}

export interface PurchaseOrderDataRow {
  id: number;
  purchaseOrderId: number;
  date: string | null;
  initialStatus: string | null;
  newStatus: string | null;
  inboundContent: string | null;
  inboundIdentifier: string | null;
  inboundType: string | null;
  outboundContent: string | null;
  outboundIdentifier: string | null;
  outboundType: string | null;
}

export interface PurchaseOrderFilters {
  limit: number;
  offset: number;
  search?: string;
  status?: string;
  vendor?: string;
}

export interface SupplierRow {
  name: string;
  currentIndex: number;
  useCarrierDetermination: number;
  favouriteCarrier: string | null;
  validateAddresses: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierListResult {
  rows: SupplierRow[];
  total: number;
}

export interface SupplierStats {
  total: number;
  withCarrierDetermination: number;
  withAddressValidation: number;
  avgIndex: number;
}

export interface SupplierFilters {
  limit: number;
  offset: number;
  search?: string;
}

export interface VendorRow {
  name: string;
  status: string;
  deleted: any;
  crmId: string | null;
  companyName: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  email: string | null;
  secondaryEmail: string | null;
  phone: string | null;
  officePhone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VendorListResult {
  rows: VendorRow[];
  total: number;
}

export interface VendorStats {
  total: number;
  syncedCount: number;
  toSyncCount: number;
  deletedCount: number;
  withAddress: number;
  withEmail: number;
  withPhone: number;
  byState: { state: string | null; cnt: number }[];
}

export interface VendorFilters {
  limit: number;
  offset: number;
  search?: string;
  status?: string;
  state?: string;
}

export interface WarehouseRow {
  name: string;
  crmId: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface WarehouseListResult {
  rows: WarehouseRow[];
  total: number;
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
