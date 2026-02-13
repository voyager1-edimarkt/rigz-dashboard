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
  OrderDataRow,
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
  StaleProduct,
  InventoryListResult,
  InventoryStats,
  InventoryFilters,
  TableDataResult,
} from "@shared/schema";

export interface IStorage {
  testConnection(): Promise<ConnectionStatus>;
  getDatabases(): Promise<DatabaseInfo[]>;
  getTables(database: string): Promise<TableInfo[]>;
  getColumns(database: string, table: string): Promise<ColumnInfo[]>;
  getTableData(database: string, table: string, limit: number, offset: number): Promise<TableDataResult>;
  getCustomers(filters: CustomerFilters): Promise<CustomerListResult>;
  getCustomerStats(): Promise<CustomerStats>;
  getOrders(filters: OrderFilters): Promise<OrderListResult>;
  getOrderStats(dateFrom?: string, dateTo?: string): Promise<OrderStats>;
  getOrderById(id: number): Promise<OrderDetail | null>;
  getOrderHistory(orderId: number): Promise<OrderDataRow[]>;
  getProducts(filters: ProductFilters): Promise<ProductListResult>;
  getProductStats(): Promise<ProductStats>;
  getPurchaseOrders(filters: PurchaseOrderFilters): Promise<PurchaseOrderListResult>;
  getPurchaseOrderStats(): Promise<PurchaseOrderStats>;
  getPurchaseOrderById(id: number): Promise<PurchaseOrderDetail | null>;
  getPurchaseOrderHistory(poId: number): Promise<PurchaseOrderDataRow[]>;
  getSuppliers(filters: SupplierFilters): Promise<SupplierListResult>;
  getSupplierStats(): Promise<SupplierStats>;
  getSupplierByName(name: string): Promise<SupplierRow | null>;
  getVendors(filters: VendorFilters): Promise<VendorListResult>;
  getVendorStats(): Promise<VendorStats>;
  getVendorByName(name: string): Promise<VendorRow | null>;
  getWarehouses(): Promise<WarehouseListResult>;
  getErrors(filters: ErrorFilters): Promise<ErrorListResult>;
  getErrorStats(dateFrom?: string, dateTo?: string): Promise<ErrorStats>;
  getErrorById(id: number): Promise<ErrorRow | null>;
  getSalesInsights(): Promise<SalesInsights>;
  getInventory(filters: InventoryFilters): Promise<InventoryListResult>;
  getInventoryStats(): Promise<InventoryStats>;
  getStaleProducts(recentDays?: number, previousDays?: number): Promise<StaleProduct[]>;
  executeQuery(sql: string, database?: string): Promise<TableDataResult>;
}
