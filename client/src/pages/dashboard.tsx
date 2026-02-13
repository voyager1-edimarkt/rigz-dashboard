import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Globe, LayoutDashboard, ShoppingCart, ClipboardList, Package, DollarSign, TrendingUp, Barcode } from "lucide-react";
import type { PurchaseOrderStats, SalesInsights } from "@shared/schema";
import { useState, useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
} from "react-simple-maps";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell } from "recharts";

const US_TOPO_URL = "/states-10m.json";
const CA_GEO_URL = "/canada-provinces.json";

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

const PROVINCE_NAME_TO_ABBR: Record<string, string> = {
  "Alberta": "AB", "British Columbia": "BC", "Manitoba": "MB",
  "New Brunswick": "NB", "Newfoundland and Labrador": "NL",
  "Northwest Territories": "NT", "Nova Scotia": "NS", "Nunavut": "NU",
  "Ontario": "ON", "Prince Edward Island": "PE", "Quebec": "QC",
  "Saskatchewan": "SK", "Yukon Territory": "YT",
};

interface CustomerStats {
  total: number;
  parentAccounts: number;
  byStatus: { status: string; cnt: number }[];
  byState: { state: string; cnt: number }[];
  byCountry: { country: string; cnt: number }[];
  byProvince: { province: string; cnt: number }[];
}

interface OrderStats {
  total: number;
  byStatus: { status: string; cnt: number }[];
  recentByDay: { day: string; cnt: number }[];
}


function getColorUS(count: number, max: number): string {
  if (count === 0) return "#f1f5f9";
  const ratio = count / max;
  if (ratio > 0.5) return "#7f1d1d";
  if (ratio > 0.3) return "#991b1b";
  if (ratio > 0.15) return "#b91c1c";
  if (ratio > 0.05) return "#dc2626";
  if (ratio > 0.02) return "#f87171";
  return "#fecaca";
}

function getColorCA(count: number, max: number): string {
  if (count === 0) return "#f1f5f9";
  const ratio = count / max;
  if (ratio > 0.5) return "#1c1917";
  if (ratio > 0.3) return "#292524";
  if (ratio > 0.15) return "#44403c";
  if (ratio > 0.05) return "#78716c";
  if (ratio > 0.02) return "#a8a29e";
  return "#d6d3d1";
}

function LineChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.[0]) return null;
  return (
    <div className="bg-background border rounded-lg shadow-lg px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{payload[0].value} orders</p>
    </div>
  );
}

function BarChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.[0]) return null;
  return (
    <div className="bg-background border rounded-lg shadow-lg px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{payload[0].value} POs</p>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  synced: "#22c55e",
  toSync: "#eab308",
  pending: "#f97316",
  error: "#ef4444",
  deleted: "#6b7280",
  completed: "#3b82f6",
  cancelled: "#a855f7",
};

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<CustomerStats>({
    queryKey: ["/api/customers/stats"],
  });

  const { data: orderStats, isLoading: orderStatsLoading } = useQuery<OrderStats>({
    queryKey: ["/api/orders/stats"],
  });

  const { data: poStats, isLoading: poStatsLoading } = useQuery<PurchaseOrderStats>({
    queryKey: ["/api/purchase-orders/stats"],
  });

  const { data: salesInsights, isLoading: salesLoading } = useQuery<SalesInsights>({
    queryKey: ["/api/sales/insights"],
  });

  const [hoveredUS, setHoveredUS] = useState<{ abbr: string; cnt: number } | null>(null);
  const [hoveredCA, setHoveredCA] = useState<{ abbr: string; cnt: number } | null>(null);

  const stateMap = useMemo(() => {
    const map: Record<string, number> = {};
    stats?.byState.forEach((s) => { map[s.state] = s.cnt; });
    return map;
  }, [stats]);

  const provinceMap = useMemo(() => {
    const map: Record<string, number> = {};
    stats?.byProvince?.forEach((p) => { map[p.province] = p.cnt; });
    return map;
  }, [stats]);

  const maxState = useMemo(() => {
    return stats?.byState.length ? Math.max(...stats.byState.map((s) => s.cnt)) : 1;
  }, [stats]);

  const maxProv = useMemo(() => {
    return stats?.byProvince?.length ? Math.max(...stats.byProvince.map((p) => p.cnt)) : 1;
  }, [stats]);

  const usCount = stats?.byCountry.find((c) => c.country === "US")?.cnt ?? 0;
  const caCount = stats?.byCountry.find((c) => c.country === "CA")?.cnt ?? 0;

  const lineData = useMemo(() => {
    if (!orderStats?.recentByDay) return [];
    return [...orderStats.recentByDay]
      .sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime())
      .map((d) => ({
        date: new Date(d.day).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        orders: d.cnt,
      }));
  }, [orderStats]);

  const poStatusData = useMemo(() => {
    if (!poStats?.byStatus) return [];
    return [...poStats.byStatus].sort((a, b) => b.cnt - a.cnt);
  }, [poStats]);

  const poVendorData = useMemo(() => {
    if (!poStats?.byVendor) return [];
    return [...poStats.byVendor].sort((a, b) => b.cnt - a.cnt).slice(0, 10);
  }, [poStats]);

  const poLineData = useMemo(() => {
    if (!poStats?.recentByDay) return [];
    return [...poStats.recentByDay]
      .sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime())
      .map((d) => ({
        date: new Date(d.day).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        pos: d.cnt,
      }));
  }, [poStats]);

  const salesDailyData = useMemo(() => {
    if (!salesInsights?.recentDailyUnits) return [];
    return [...salesInsights.recentDailyUnits]
      .sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime())
      .map((d) => ({
        date: new Date(d.day).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        units: d.units,
        orders: d.orders,
      }));
  }, [salesInsights]);

  return (
    <div className="h-full overflow-auto p-6" data-testid="page-dashboard">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-md bg-red-500/15">
          <LayoutDashboard className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-dashboard-title">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Sales insights, customer data, and order activity</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card data-testid="card-total-units-sold">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-md bg-red-500/15">
                <Package className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Units Sold</p>
                {salesLoading ? (
                  <Skeleton className="h-6 w-20 mt-0.5" />
                ) : (
                  <p className="text-lg font-bold" data-testid="text-total-units">{salesInsights?.totalUnits.toLocaleString()}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-total-revenue">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-md bg-emerald-500/15">
                <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                {salesLoading ? (
                  <Skeleton className="h-6 w-20 mt-0.5" />
                ) : (
                  <p className="text-lg font-bold" data-testid="text-total-revenue">
                    ${salesInsights?.totalRevenue ? (salesInsights.totalRevenue >= 1000000 ? (salesInsights.totalRevenue / 1000000).toFixed(1) + "M" : salesInsights.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })) : "0"}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-unique-skus">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-md bg-blue-500/15">
                <Barcode className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Unique SKUs Sold</p>
                {salesLoading ? (
                  <Skeleton className="h-6 w-16 mt-0.5" />
                ) : (
                  <p className="text-lg font-bold" data-testid="text-unique-skus">{salesInsights?.uniqueSkus.toLocaleString()}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-orders-with-sales">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-md bg-amber-500/15">
                <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Orders with Sales</p>
                {salesLoading ? (
                  <Skeleton className="h-6 w-16 mt-0.5" />
                ) : (
                  <p className="text-lg font-bold" data-testid="text-orders-with-sales">{salesInsights?.totalOrders.toLocaleString()}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card data-testid="card-top-products">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm">Top Selling Products</CardTitle>
            </div>
            <Badge variant="outline">By Quantity</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {salesLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : salesInsights?.topProducts && salesInsights.topProducts.length > 0 ? (
              <div className="max-h-[320px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card z-10">
                    <tr className="border-b text-left">
                      <th className="px-4 py-2 font-medium text-muted-foreground text-xs">SKU</th>
                      <th className="px-4 py-2 font-medium text-muted-foreground text-xs">Vendor</th>
                      <th className="px-4 py-2 font-medium text-muted-foreground text-xs text-right">Qty Sold</th>
                      <th className="px-4 py-2 font-medium text-muted-foreground text-xs text-right">Revenue</th>
                      <th className="px-4 py-2 font-medium text-muted-foreground text-xs text-right">Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesInsights.topProducts.map((p) => (
                      <tr key={p.sku} className="border-b last:border-0" data-testid={`row-product-${p.sku}`}>
                        <td className="px-4 py-2">
                          <span className="font-mono font-medium text-xs">{p.sku}</span>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">{p.vendor || "-"}</td>
                        <td className="px-4 py-2 text-right font-medium">{p.totalQty.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right text-muted-foreground">
                          ${p.totalRevenue >= 1000000 ? (p.totalRevenue / 1000000).toFixed(1) + "M" : p.totalRevenue >= 1000 ? (p.totalRevenue / 1000).toFixed(1) + "K" : p.totalRevenue.toFixed(0)}
                        </td>
                        <td className="px-4 py-2 text-right text-muted-foreground">{p.orderCount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px]">
                <p className="text-sm text-muted-foreground">No sales data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-daily-units-chart">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm">Units Sold by Day</CardTitle>
            </div>
            <Badge variant="outline">Last 30 days with sales</Badge>
          </CardHeader>
          <CardContent>
            {salesLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : salesDailyData.length > 0 ? (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesDailyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                    />
                    <Tooltip content={({ active, payload, label }: any) => {
                      if (!active || !payload?.[0]) return null;
                      return (
                        <div className="bg-background border rounded-lg shadow-lg px-3 py-2">
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="text-sm font-semibold">{payload[0].value.toLocaleString()} units</p>
                          {payload[0].payload.orders && (
                            <p className="text-xs text-muted-foreground">{payload[0].payload.orders} orders</p>
                          )}
                        </div>
                      );
                    }} />
                    <Bar dataKey="units" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[280px]">
                <p className="text-sm text-muted-foreground">No daily data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card data-testid="card-us-map">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-1">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm">United States</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {hoveredUS && (
                <Badge variant="secondary" data-testid="badge-hovered-us">
                  {hoveredUS.abbr}: {hoveredUS.cnt.toLocaleString()}
                </Badge>
              )}
              <Badge variant="outline" data-testid="badge-us-count">
                {usCount.toLocaleString()} customers
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pb-2">
            {statsLoading ? (
              <Skeleton className="w-full h-[220px]" />
            ) : (
              <div>
                <ComposableMap
                  projection="geoAlbersUsa"
                  projectionConfig={{ scale: 700 }}
                  width={700}
                  height={380}
                  style={{ width: "100%", height: "auto" }}
                  data-testid="map-us"
                >
                  <Geographies geography={US_TOPO_URL}>
                    {({ geographies }: { geographies: any[] }) =>
                      geographies.map((geo) => {
                        const fips = geo.id;
                        const abbr = STATE_FIPS_TO_ABBR[fips] ?? "";
                        const count = stateMap[abbr] ?? 0;
                        const fill = getColorUS(count, maxState);
                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={hoveredUS?.abbr === abbr ? "#1d4ed8" : fill}
                            stroke="#fff"
                            strokeWidth={0.5}
                            onMouseEnter={() => setHoveredUS({ abbr, cnt: count })}
                            onMouseLeave={() => setHoveredUS(null)}
                            style={{
                              default: { outline: "none", cursor: "pointer" },
                              hover: { outline: "none", cursor: "pointer" },
                              pressed: { outline: "none" },
                            }}
                          />
                        );
                      })
                    }
                  </Geographies>
                </ComposableMap>
                <div className="flex items-center gap-2 justify-center mt-1" data-testid="legend-us">
                  <span className="text-[10px] text-muted-foreground">0</span>
                  <div className="flex h-1.5 rounded-full overflow-hidden">
                    {["#f1f5f9", "#fecaca", "#f87171", "#dc2626", "#b91c1c", "#991b1b", "#7f1d1d"].map((c) => (
                      <div key={c} className="w-5 h-1.5" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{maxState.toLocaleString()}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-ca-map">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-1">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm">Canada</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {hoveredCA && (
                <Badge variant="secondary" data-testid="badge-hovered-ca">
                  {hoveredCA.abbr}: {hoveredCA.cnt.toLocaleString()}
                </Badge>
              )}
              <Badge variant="outline" data-testid="badge-ca-count">
                {caCount.toLocaleString()} customers
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pb-2">
            {statsLoading ? (
              <Skeleton className="w-full h-[220px]" />
            ) : (
              <div>
                <ComposableMap
                  projection="geoMercator"
                  projectionConfig={{ scale: 280, center: [-96, 62] }}
                  width={700}
                  height={380}
                  style={{ width: "100%", height: "auto" }}
                  data-testid="map-ca"
                >
                  <Geographies geography={CA_GEO_URL}>
                    {({ geographies }: { geographies: any[] }) =>
                      geographies.map((geo) => {
                        const name = geo.properties?.name ?? "";
                        const abbr = PROVINCE_NAME_TO_ABBR[name] ?? name;
                        const count = provinceMap[abbr] ?? 0;
                        const fill = getColorCA(count, maxProv);
                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={hoveredCA?.abbr === abbr ? "#047857" : fill}
                            stroke="#fff"
                            strokeWidth={0.5}
                            onMouseEnter={() => setHoveredCA({ abbr, cnt: count })}
                            onMouseLeave={() => setHoveredCA(null)}
                            style={{
                              default: { outline: "none", cursor: "pointer" },
                              hover: { outline: "none", cursor: "pointer" },
                              pressed: { outline: "none" },
                            }}
                          />
                        );
                      })
                    }
                  </Geographies>
                </ComposableMap>
                <div className="flex items-center gap-2 justify-center mt-1" data-testid="legend-ca">
                  <span className="text-[10px] text-muted-foreground">0</span>
                  <div className="flex h-1.5 rounded-full overflow-hidden">
                    {["#f1f5f9", "#d6d3d1", "#a8a29e", "#78716c", "#44403c", "#292524", "#1c1917"].map((c) => (
                      <div key={c} className="w-5 h-1.5" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{maxProv.toLocaleString()}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-order-activity-chart">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-sm">Recent Order Activity</CardTitle>
          </div>
          <Badge variant="outline" data-testid="badge-total-orders">
            {orderStats?.total.toLocaleString() ?? "..."} total
          </Badge>
        </CardHeader>
        <CardContent>
          {orderStatsLoading ? (
            <div className="flex items-center justify-center h-[260px]">
              <Skeleton className="h-[220px] w-full" />
            </div>
          ) : lineData.length > 0 ? (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <Tooltip content={<LineChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    stroke="#dc2626"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#dc2626", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: "#dc2626", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[260px]">
              <p className="text-sm text-muted-foreground">No order data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 mb-4">
        <Card data-testid="card-po-by-status">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm">POs by Status</CardTitle>
            <Badge variant="outline">{poStatusData.length} statuses</Badge>
          </CardHeader>
          <CardContent>
            {poStatsLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : poStatusData.length > 0 ? (
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={poStatusData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="status"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                    />
                    <Tooltip content={<BarChartTooltip />} />
                    <Bar dataKey="cnt" radius={[4, 4, 0, 0]}>
                      {poStatusData.map((entry) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#6b7280"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[220px]">
                <p className="text-sm text-muted-foreground">No status data</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-po-by-vendor">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm">Top Vendors by PO Count</CardTitle>
            <Badge variant="outline">Top 10</Badge>
          </CardHeader>
          <CardContent>
            {poStatsLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : poVendorData.length > 0 ? (
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={poVendorData} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                    />
                    <YAxis
                      type="category"
                      dataKey="vendor"
                      width={100}
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                    />
                    <Tooltip content={<BarChartTooltip />} />
                    <Bar dataKey="cnt" fill="#dc2626" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[220px]">
                <p className="text-sm text-muted-foreground">No vendor data</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-po-activity-chart" className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-sm">Recent PO Activity</CardTitle>
          </div>
          <Badge variant="outline" data-testid="badge-total-pos">
            {poStats?.total.toLocaleString() ?? "..."} total
          </Badge>
        </CardHeader>
        <CardContent>
          {poStatsLoading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : poLineData.length > 0 ? (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={poLineData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <Tooltip content={<BarChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="pos"
                    stroke="#1d4ed8"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#1d4ed8", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: "#1d4ed8", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[260px]">
              <p className="text-sm text-muted-foreground">No PO activity data</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
