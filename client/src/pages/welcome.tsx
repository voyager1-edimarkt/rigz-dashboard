import { Card, CardContent } from "@/components/ui/card";
import { Database, Table2, Terminal, ArrowRight } from "lucide-react";

export default function Welcome() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mx-auto">
          <Database className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold mb-2">MySQL Explorer</h1>
          <p className="text-muted-foreground">
            Browse your databases, explore table structures, and run queries with ease.
          </p>
        </div>

        <div className="space-y-3 text-left">
          <Card className="hover-elevate">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex items-center justify-center w-9 h-9 rounded-md bg-chart-1/10 shrink-0">
                <Database className="w-4 h-4 text-chart-1" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Browse Databases</p>
                <p className="text-xs text-muted-foreground">Select a database from the sidebar</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex items-center justify-center w-9 h-9 rounded-md bg-chart-2/10 shrink-0">
                <Table2 className="w-4 h-4 text-chart-2" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Explore Tables</p>
                <p className="text-xs text-muted-foreground">View columns, types, and data</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex items-center justify-center w-9 h-9 rounded-md bg-chart-3/10 shrink-0">
                <Terminal className="w-4 h-4 text-chart-3" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Run Queries</p>
                <p className="text-xs text-muted-foreground">Execute SQL and see results instantly</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
