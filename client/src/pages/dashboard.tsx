import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Globe, LayoutDashboard } from "lucide-react";

interface CustomerStats {
  total: number;
  parentAccounts: number;
  byStatus: { status: string; cnt: number }[];
  byState: { state: string; cnt: number }[];
  byCountry: { country: string; cnt: number }[];
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<CustomerStats>({
    queryKey: ["/api/customers/stats"],
  });

  return (
    <div className="h-full overflow-auto p-6" data-testid="page-dashboard">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-md bg-blue-500/15">
          <LayoutDashboard className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-dashboard-title">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your customer data</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card data-testid="card-top-states">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-sm">Top States</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {statsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-5 w-full" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {stats?.byState.slice(0, 8).map((s) => {
                  const pct = stats.total > 0 ? (s.cnt / stats.total) * 100 : 0;
                  return (
                    <div key={s.state} className="flex items-center gap-2" data-testid={`stat-state-${s.state}`}>
                      <span className="text-xs w-8 text-muted-foreground font-mono">{s.state}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all"
                          style={{ width: `${Math.max(pct, 1)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-10 text-right">{s.cnt.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-countries">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-sm">Countries</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {statsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-5 w-full" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {stats?.byCountry.map((c) => {
                  const pct = stats.total > 0 ? (c.cnt / stats.total) * 100 : 0;
                  return (
                    <div key={c.country} className="flex items-center gap-3" data-testid={`stat-country-${c.country}`}>
                      <span className="text-sm font-medium w-8">{c.country}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${Math.max(pct, 1)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-16 text-right">
                        {c.cnt.toLocaleString()} ({pct.toFixed(1)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
