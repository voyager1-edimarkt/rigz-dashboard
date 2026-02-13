import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MapPin, Globe, LayoutDashboard } from "lucide-react";
import { useState, useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";

const US_TOPO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";
const WORLD_TOPO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const STATE_FIPS_TO_ABBR: Record<string, string> = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA",
  "08": "CO", "09": "CT", "10": "DE", "11": "DC", "12": "FL",
  "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN",
  "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME",
  "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS",
  "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
  "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
  "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI",
  "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT",
  "50": "VT", "51": "VA", "53": "WA", "54": "WV", "55": "WI",
  "56": "WY",
};

interface CustomerStats {
  total: number;
  parentAccounts: number;
  byStatus: { status: string; cnt: number }[];
  byState: { state: string; cnt: number }[];
  byCountry: { country: string; cnt: number }[];
}

function getColorForCount(count: number, max: number): string {
  if (count === 0) return "#f1f5f9";
  const ratio = count / max;
  if (ratio > 0.5) return "#1e40af";
  if (ratio > 0.3) return "#2563eb";
  if (ratio > 0.15) return "#3b82f6";
  if (ratio > 0.05) return "#60a5fa";
  if (ratio > 0.02) return "#93c5fd";
  return "#bfdbfe";
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<CustomerStats>({
    queryKey: ["/api/customers/stats"],
  });

  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [hoveredCount, setHoveredCount] = useState<number>(0);

  const stateMap = useMemo(() => {
    const map: Record<string, number> = {};
    stats?.byState.forEach((s) => { map[s.state] = s.cnt; });
    return map;
  }, [stats]);

  const maxCount = useMemo(() => {
    return stats?.byState.length ? Math.max(...stats.byState.map((s) => s.cnt)) : 1;
  }, [stats]);

  const usCount = stats?.byCountry.find((c) => c.country === "US")?.cnt ?? 0;
  const caCount = stats?.byCountry.find((c) => c.country === "CA")?.cnt ?? 0;

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2" data-testid="card-customer-map">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm">Customer Distribution</CardTitle>
            </div>
            {hoveredState && (
              <Badge variant="secondary" data-testid="badge-hovered-state">
                {hoveredState}: {hoveredCount.toLocaleString()}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="pb-2">
            {statsLoading ? (
              <Skeleton className="w-full h-[340px]" />
            ) : (
              <div className="relative">
                <ComposableMap
                  projection="geoAlbersUsa"
                  projectionConfig={{ scale: 900 }}
                  width={800}
                  height={450}
                  style={{ width: "100%", height: "auto" }}
                  data-testid="map-us"
                >
                  <Geographies geography={US_TOPO_URL}>
                    {({ geographies }) =>
                      geographies.map((geo) => {
                        const fips = geo.id;
                        const abbr = STATE_FIPS_TO_ABBR[fips] ?? "";
                        const count = stateMap[abbr] ?? 0;
                        const fill = getColorForCount(count, maxCount);
                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={hoveredState === abbr ? "#1d4ed8" : fill}
                            stroke="#fff"
                            strokeWidth={0.5}
                            onMouseEnter={() => {
                              setHoveredState(abbr);
                              setHoveredCount(count);
                            }}
                            onMouseLeave={() => {
                              setHoveredState(null);
                              setHoveredCount(0);
                            }}
                            style={{
                              default: { outline: "none", cursor: "pointer" },
                              hover: { outline: "none", cursor: "pointer" },
                              pressed: { outline: "none" },
                            }}
                            data-testid={`map-state-${abbr}`}
                          />
                        );
                      })
                    }
                  </Geographies>
                </ComposableMap>

                <div className="flex items-center gap-2 justify-center mt-2" data-testid="map-legend">
                  <span className="text-xs text-muted-foreground">0</span>
                  <div className="flex h-2 rounded-full overflow-hidden">
                    {["#f1f5f9", "#bfdbfe", "#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1e40af"].map((c) => (
                      <div key={c} className="w-6 h-2" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">{maxCount.toLocaleString()}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card data-testid="card-countries">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm">Countries</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {statsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-md bg-blue-500/5 border border-blue-500/10" data-testid="stat-country-US">
                    <div className="text-2xl">🇺🇸</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">United States</p>
                      <p className="text-xs text-muted-foreground">
                        {stats?.total ? ((usCount / stats.total) * 100).toFixed(1) : 0}% of customers
                      </p>
                    </div>
                    <span className="text-lg font-bold text-blue-600">{usCount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-md bg-emerald-500/5 border border-emerald-500/10" data-testid="stat-country-CA">
                    <div className="text-2xl">🇨🇦</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Canada</p>
                      <p className="text-xs text-muted-foreground">
                        {stats?.total ? ((caCount / stats.total) * 100).toFixed(1) : 0}% of customers
                      </p>
                    </div>
                    <span className="text-lg font-bold text-emerald-600">{caCount.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

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
                    const pct = maxCount > 0 ? (s.cnt / maxCount) * 100 : 0;
                    return (
                      <div
                        key={s.state}
                        className="flex items-center gap-2"
                        data-testid={`stat-state-${s.state}`}
                        onMouseEnter={() => { setHoveredState(s.state); setHoveredCount(s.cnt); }}
                        onMouseLeave={() => { setHoveredState(null); setHoveredCount(0); }}
                      >
                        <span className={`text-xs w-8 font-mono ${hoveredState === s.state ? "text-blue-600 font-semibold" : "text-muted-foreground"}`}>{s.state}</span>
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-500 transition-all"
                            style={{ width: `${Math.max(pct, 2)}%` }}
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
        </div>
      </div>
    </div>
  );
}
