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

export type ConnectionStatus = z.infer<typeof connectionStatusSchema>;
export type DatabaseInfo = z.infer<typeof databaseInfoSchema>;
export type TableInfo = z.infer<typeof tableInfoSchema>;
export type ColumnInfo = z.infer<typeof columnInfoSchema>;
export type QueryResult = z.infer<typeof queryResultSchema>;
export type QueryRequest = z.infer<typeof queryRequestSchema>;
