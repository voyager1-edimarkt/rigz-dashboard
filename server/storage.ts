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
  getOrderStats(): Promise<OrderStats>;
  getOrderById(id: number): Promise<OrderDetail | null>;
  getOrderHistory(orderId: number): Promise<OrderDataRow[]>;
  executeQuery(sql: string, database?: string): Promise<TableDataResult>;
}
