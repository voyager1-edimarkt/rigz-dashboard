import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Table2, Key, Hash, RefreshCw, ChevronLeft, ChevronRight, Columns3 } from "lucide-react";
import type { ColumnInfo, QueryResult } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";

interface TableViewProps {
  database: string;
  table: string;
}

export default function TableView({ database, table }: TableViewProps) {
  const [page, setPage] = useState(0);
  const limit = 50;
  const offset = page * limit;

  const { data: columns, isLoading: columnsLoading } = useQuery<ColumnInfo[]>({
    queryKey: ["/api/databases", database, "tables", table, "columns"],
  });

  const { data: tableData, isLoading: dataLoading } = useQuery<QueryResult>({
    queryKey: ["/api/databases", database, "tables", table, "data", `?limit=${limit}&offset=${offset}`],
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/databases", database, "tables", table] });
  };

  const totalRows = tableData?.rowCount ?? 0;
  const totalPages = Math.ceil(totalRows / limit);

  return (
    <div className="flex flex-col h-full gap-4 p-4 overflow-auto">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10">
            <Table2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold" data-testid="text-table-name">{table}</h1>
            <p className="text-sm text-muted-foreground">{database}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {totalRows > 0 && (
            <Badge variant="secondary" data-testid="badge-row-count">
              {totalRows.toLocaleString()} rows
            </Badge>
          )}
          <Button size="icon" variant="ghost" onClick={handleRefresh} data-testid="button-refresh-table">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <div className="flex items-center gap-2">
            <Columns3 className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">Structure</CardTitle>
          </div>
          <CardDescription>{columns?.length ?? 0} columns</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {columnsLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <ScrollArea className="max-h-64">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Column</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="w-[80px]">Nullable</TableHead>
                    <TableHead className="w-[80px]">Key</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead>Extra</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {columns?.map((col) => (
                    <TableRow key={col.name} data-testid={`row-column-${col.name}`}>
                      <TableCell className="font-mono text-sm font-medium">
                        <div className="flex items-center gap-1.5">
                          {col.key === "PRI" && <Key className="w-3 h-3 text-chart-4" />}
                          {col.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {col.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={col.nullable ? "text-muted-foreground" : "text-foreground"}>
                          {col.nullable ? "YES" : "NO"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {col.key && (
                          <Badge variant="secondary" className="text-xs">
                            {col.key}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">
                        {col.defaultValue ?? "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {col.extra || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">Data</CardTitle>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs text-muted-foreground px-2">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                size="icon"
                variant="ghost"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                data-testid="button-next-page"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="flex-1 p-0 min-h-0">
          {dataLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : tableData && tableData.rows.length > 0 ? (
            <ScrollArea className="h-full max-h-[500px]">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {tableData.columns.map((col) => (
                        <TableHead key={col} className="whitespace-nowrap font-mono text-xs">
                          {col}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableData.rows.map((row, idx) => (
                      <TableRow key={idx} data-testid={`row-data-${idx}`}>
                        {tableData.columns.map((col) => (
                          <TableCell key={col} className="font-mono text-xs max-w-[300px] truncate">
                            {row[col] === null ? (
                              <span className="text-muted-foreground italic">NULL</span>
                            ) : (
                              String(row[col])
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Table2 className="w-10 h-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No data in this table</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
