import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Play, Loader2, Terminal, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { QueryResult } from "@shared/schema";

interface QueryRunnerProps {
  database: string | null;
}

export default function QueryRunner({ database }: QueryRunnerProps) {
  const [sql, setSql] = useState("");
  const [result, setResult] = useState<QueryResult | null>(null);

  const runQuery = useMutation({
    mutationFn: async (query: string) => {
      const res = await apiRequest("POST", "/api/query", {
        sql: query,
        database: database || undefined,
      });
      return res.json() as Promise<QueryResult>;
    },
    onSuccess: (data) => {
      setResult(data);
    },
  });

  const handleRun = () => {
    if (!sql.trim()) return;
    runQuery.mutate(sql);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleRun();
    }
  };

  return (
    <div className="flex flex-col h-full gap-4 p-4 overflow-auto">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10">
          <Terminal className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Query Runner</h1>
          <p className="text-sm text-muted-foreground">
            {database ? `Running on ${database}` : "Select a database first"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base">SQL Query</CardTitle>
            <span className="text-xs text-muted-foreground">Ctrl+Enter to run</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="SELECT * FROM your_table LIMIT 100;"
            className="font-mono text-sm min-h-[120px] resize-y"
            data-testid="input-sql-query"
          />
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {database && (
                <Badge variant="outline" className="font-mono text-xs">
                  {database}
                </Badge>
              )}
            </div>
            <Button
              onClick={handleRun}
              disabled={!sql.trim() || runQuery.isPending || !database}
              data-testid="button-run-query"
            >
              {runQuery.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Run Query
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <div className="flex items-center gap-2">
              {result.error ? (
                <AlertCircle className="w-4 h-4 text-destructive" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-status-online" />
              )}
              <CardTitle className="text-base">
                {result.error ? "Error" : "Results"}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {!result.error && (
                <Badge variant="secondary" className="text-xs" data-testid="badge-result-rows">
                  {result.rowCount} rows
                </Badge>
              )}
              <Badge variant="outline" className="text-xs gap-1" data-testid="badge-execution-time">
                <Clock className="w-3 h-3" />
                {result.executionTime}ms
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 min-h-0">
            {result.error ? (
              <div className="p-4">
                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                  <p className="text-sm font-mono text-destructive" data-testid="text-query-error">
                    {result.error}
                  </p>
                </div>
              </div>
            ) : result.rows.length > 0 ? (
              <ScrollArea className="h-full max-h-[400px]">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {result.columns.map((col) => (
                          <TableHead key={col} className="whitespace-nowrap font-mono text-xs">
                            {col}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.rows.map((row, idx) => (
                        <TableRow key={idx} data-testid={`row-result-${idx}`}>
                          {result.columns.map((col) => (
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
                <CheckCircle2 className="w-10 h-10 text-status-online/50 mb-3" />
                <p className="text-sm text-muted-foreground">Query executed successfully</p>
                <p className="text-xs text-muted-foreground mt-1">No rows returned</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!result && !runQuery.isPending && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
          <Terminal className="w-16 h-16 text-muted-foreground/20 mb-4" />
          <p className="text-muted-foreground">Write a SQL query and press Run</p>
          <p className="text-xs text-muted-foreground mt-1">Results will appear here</p>
        </div>
      )}
    </div>
  );
}
