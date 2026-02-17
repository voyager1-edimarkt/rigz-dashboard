import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Globe, LayoutDashboard, ShoppingCart, ClipboardList, Package, DollarSign, TrendingUp, Barcode, ArrowRight, AlertTriangle, FileCheck, Truck, CheckCircle, XCircle, Calendar, TrendingDown, Users, Receipt, Star, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PurchaseOrderStats, SalesInsights, StaleProduct } from "@shared/schema";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
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
  const [, navigate] = useLocation();
  const [pipelinePreset, setPipelinePreset] = useState("all");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");

  const { pipelineDateFrom, pipelineDateTo } = useMemo(() => {
    if (pipelinePreset === "all") return { pipelineDateFrom: "", pipelineDateTo: "" };
    if (pipelinePreset === "custom") return { pipelineDateFrom: customDateFrom, pipelineDateTo: customDateTo };
    const days = Number(pipelinePreset);
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    const fmt = (d: Date) => d.toISOString().split("T")[0];
    return { pipelineDateFrom: fmt(from), pipelineDateTo: fmt(to) };
  }, [pipelinePreset, customDateFrom, customDateTo]);

  const { data: stats, isLoading: statsLoading } = useQuery<CustomerStats>({
  queryKey: ["/api/odoo/customers/stats"],
});

  const orderStatsParams = new URLSearchParams();
  if (pipelineDateFrom) orderStatsParams.set("dateFrom", pipelineDateFrom);
  if (pipelineDateTo) orderStatsParams.set("dateTo", pipelineDateTo);
  const orderStatsUrl = `/api/odoo/orders/stats${orderStatsParams.toString() ? `?${orderStatsParams}` : ""}`;
  const { data: orderStats, isLoading: orderStatsLoading } = useQuery<OrderStats>({
    queryKey: [orderStatsUrl],
  });

  const { data: poStats, isLoading: poStatsLoading } = useQuery<PurchaseOrderStats>({
    queryKey: ["/api/purchase-orders/stats"],
  });

type OdooKpis = {
  totalRevenue: number;
  totalOrders: number;
  totalUnits: number;
  uniqueSkus: number;
};

const kpiParams = new URLSearchParams();
if (pipelineDateFrom) kpiParams.set("dateFrom", pipelineDateFrom);
if (pipelineDateTo) kpiParams.set("dateTo", pipelineDateTo);

const kpiUrl = `/api/odoo/kpis${kpiParams.toString() ? `?${kpiParams}` : ""}`;

const { data: kpis, isLoading: kpisLoading } = useQuery<OdooKpis>({
  queryKey: [kpiUrl],
  queryFn: async () => {
    const res = await fetch(kpiUrl);
    if (!res.ok) throw new Error(`Failed: ${res.status}`);
    return res.json();
  },
});



async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed ${res.status}`);
  return res.json();
}

type OrdersByDayRes = { data: { day: string; cnt: number }[] };

const params = new URLSearchParams();
if (pipelineDateFrom) params.set("dateFrom", pipelineDateFrom);
if (pipelineDateTo) params.set("dateTo", pipelineDateTo);

const ordersByDayUrl = `/api/odoo/orders-by-day${params.toString() ? `?${params}` : ""}`;

const { data: ordersByDay, isLoading: ordersByDayLoading } = useQuery<OrdersByDayRes>({
  queryKey: [ordersByDayUrl],
  queryFn: () => fetchJson<OrdersByDayRes>(ordersByDayUrl),
});

const ordersByDayChart = useMemo(() => {
  const all = ordersByDay?.data ?? [];

  const today = new Date();
  const cutoff = new Date();
  cutoff.setDate(today.getDate() - 30);

  return all
    .filter(d => new Date(d.day) >= cutoff)
    .sort((a, b) => a.day.localeCompare(b.day))
    .map(d => ({
      date: new Date(d.day).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      orders: d.cnt,
    }));
}, [ordersByDay]);

  const errorStatsParams = new URLSearchParams();
  if (pipelineDateFrom) errorStatsParams.set("dateFrom", pipelineDateFrom);
  if (pipelineDateTo) errorStatsParams.set("dateTo", pipelineDateTo);
  const errorStatsUrl = `/api/errors/stats${errorStatsParams.toString() ? `?${errorStatsParams}` : ""}`;

  const { data: errorStats, isLoading: errorStatsLoading } = useQuery<{ total: number; byType: { type: string; cnt: number }[] }>({
    queryKey: [errorStatsUrl],
  });

  const [staleLookback, setStaleLookback] = useState("30");
  const staleRecentDays = Number(staleLookback);
  const stalePreviousDays = staleRecentDays * 2;
  const staleUrl = `/api/odoo/stale-products?recentDays=${staleRecentDays}&previousDays=${stalePreviousDays}`;  const { data: staleProducts, isLoading: staleLoading } = useQuery<StaleProduct[]>({
    queryKey: [staleUrl],
  });

type TopCustomer = { partner_id: number; partner_name: string; orders_count: number; amount_total: number };
type InvoiceAging = { totalOutstanding: number; totalInvoices: number; buckets: { label: string; amount: number; count: number }[] };
type TopProduct = { productId: number; productName: string; totalQty: number; totalRevenue: number; orderCount: number };
type RevenueMonth = { month: string; revenue: number; orderCount: number };
type NewCustomersRes = { total: number; records: any[] };
type AovMonth = { month: string; avgOrderValue: number; totalRevenue: number; orderCount: number };

const { data: topCustomers, isLoading: topCustomersLoading } = useQuery<TopCustomer[]>({
  queryKey: ["/api/odoo/top-customers"],
});
const { data: invoiceAging, isLoading: invoiceAgingLoading } = useQuery<InvoiceAging>({
  queryKey: ["/api/odoo/invoice-aging"],
});
const { data: topProducts, isLoading: topProductsLoading } = useQuery<TopProduct[]>({
  queryKey: ["/api/odoo/top-products"],
});
const { data: revenueByMonth, isLoading: revenueByMonthLoading } = useQuery<RevenueMonth[]>({
  queryKey: ["/api/odoo/revenue-by-month"],
});
const { data: newCustomers, isLoading: newCustomersLoading } = useQuery<NewCustomersRes>({
  queryKey: ["/api/odoo/new-customers"],
});
const { data: aovTrend, isLoading: aovTrendLoading } = useQuery<AovMonth[]>({
  queryKey: ["/api/odoo/aov-trend"],
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
  <Card
    data-testid="card-total-units-sold"
    className="cursor-pointer hover-elevate"
    onClick={() => navigate("/products")}
  >
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-md bg-red-500/15">
          <Package className="w-4 h-4 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Units Sold</p>
          {kpisLoading ? (
            <Skeleton className="h-6 w-20 mt-0.5" />
          ) : (
            <p className="text-lg font-bold" data-testid="text-total-units">
              {(kpis?.totalUnits ?? 0).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </CardContent>
  </Card>

  <Card
    data-testid="card-total-revenue"
    className="cursor-pointer hover-elevate"
    onClick={() => navigate("/orders")}
  >
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-md bg-emerald-500/15">
          <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total Revenue</p>
          {kpisLoading ? (
            <Skeleton className="h-6 w-20 mt-0.5" />
          ) : (
            <p className="text-lg font-bold" data-testid="text-total-revenue">
              $
              {(kpis?.totalRevenue ?? 0).toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
            </p>
          )}
        </div>
      </div>
    </CardContent>
  </Card>

  <Card
    data-testid="card-unique-skus"
    className="cursor-pointer hover-elevate"
    onClick={() => navigate("/products")}
  >
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-md bg-blue-500/15">
          <Barcode className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Unique SKUs Sold</p>
          {kpisLoading ? (
            <Skeleton className="h-6 w-16 mt-0.5" />
          ) : (
            <p className="text-lg font-bold" data-testid="text-unique-skus">
              {(kpis?.uniqueSkus ?? 0).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </CardContent>
  </Card>

  <Card
    data-testid="card-orders-with-sales"
    className="cursor-pointer hover-elevate"
    onClick={() => navigate("/orders")}
  >
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-md bg-amber-500/15">
          <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Orders with Sales</p>
          {kpisLoading ? (
            <Skeleton className="h-6 w-16 mt-0.5" />
          ) : (
            <p className="text-lg font-bold" data-testid="text-orders-with-sales">
              {(kpis?.totalOrders ?? 0).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
</div>

      <Card className="mb-4" data-testid="card-order-pipeline">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-sm">Order Pipeline</CardTitle>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Select value={pipelinePreset} onValueChange={setPipelinePreset}>
              <SelectTrigger className="w-[140px] h-8 text-xs" data-testid="select-pipeline-date-range">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="15">Last 15 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="45">Last 45 Days</SelectItem>
                <SelectItem value="60">Last 60 Days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            {pipelinePreset === "custom" && (
              <>
                <Input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="w-[130px] h-8 text-xs"
                  data-testid="input-pipeline-date-from"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className="w-[130px] h-8 text-xs"
                  data-testid="input-pipeline-date-to"
                />
              </>
            )}
            <Badge variant="outline">{orderStats?.total.toLocaleString() ?? "..."} total orders</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {orderStatsLoading || errorStatsLoading ? (
            <Skeleton className="h-[100px] w-full" />
          ) : (() => {
            const statusMap: Record<string, number> = {};
            orderStats?.byStatus?.forEach((s) => { statusMap[s.status] = s.cnt; });
            const stages = [
              {
                label: "Received",
                count: statusMap["PO_RECEIVED"] ?? 0,
                icon: ShoppingCart,
                color: "bg-blue-500/15",
                iconColor: "text-blue-600 dark:text-blue-400",
                barColor: "bg-blue-500",
                path: "/orders",
              },
              {
                label: "PO Sent",
                count: statusMap["PO_SENT"] ?? 0,
                icon: FileCheck,
                color: "bg-amber-500/15",
                iconColor: "text-amber-600 dark:text-amber-400",
                barColor: "bg-amber-500",
                path: "/purchase-orders",
              },
              {
                label: "Fulfillment",
                count: statusMap["FULFILLMENT_READY"] ?? 0,
                icon: Package,
                color: "bg-purple-500/15",
                iconColor: "text-purple-600 dark:text-purple-400",
                barColor: "bg-purple-500",
                path: "/orders",
              },
              {
                label: "Invoiced",
                count: (statusMap["INVOICE_SENT"] ?? 0) + (statusMap["INVOICE_RECEIPT"] ?? 0),
                icon: DollarSign,
                color: "bg-emerald-500/15",
                iconColor: "text-emerald-600 dark:text-emerald-400",
                barColor: "bg-emerald-500",
                path: "/orders",
              },
              {
                label: "Cancelled",
                count: statusMap["CANCELLED"] ?? 0,
                icon: XCircle,
                color: "bg-stone-500/15",
                iconColor: "text-stone-500 dark:text-stone-400",
                barColor: "bg-stone-400",
                path: "/orders",
              },
            ];
            const maxCount = Math.max(...stages.map((s) => s.count), 1);
            return (
              <div className="flex items-stretch gap-1 flex-wrap">
                {stages.map((stage, i) => (
                  <div key={stage.label} className="flex items-center gap-1 flex-1 min-w-[120px]">
                    <div
                      className="flex-1 rounded-md p-3 cursor-pointer hover-elevate"
                      onClick={() => navigate(stage.path)}
                      data-testid={`pipeline-stage-${stage.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`flex items-center justify-center w-7 h-7 rounded-md ${stage.color}`}>
                          <stage.icon className={`w-3.5 h-3.5 ${stage.iconColor}`} />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground leading-tight">{stage.label}</p>
                          <p className="text-sm font-bold leading-tight">{stage.count.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${stage.barColor} transition-all`}
                          style={{ width: `${Math.max((stage.count / maxCount) * 100, 2)}%` }}
                        />
                      </div>
                    </div>
                    {i < stages.length - 1 && i !== 3 && (
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                    )}
                    {i === 3 && <div className="w-3.5 shrink-0" />}
                  </div>
                ))}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      <Card className="mb-4" data-testid="card-stale-products">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 flex-wrap">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-sm">Dropped Products</CardTitle>
            <span className="text-xs text-muted-foreground">Ordered previously but not in the last period</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Select value={staleLookback} onValueChange={setStaleLookback}>
              <SelectTrigger className="w-[140px] h-8 text-xs" data-testid="select-stale-lookback">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">Last 15 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="45">Last 45 Days</SelectItem>
                <SelectItem value="60">Last 60 Days</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline">{staleProducts?.length ?? "..."} products</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {staleLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : staleProducts && staleProducts.length > 0 ? (
            <div className="max-h-[400px] overflow-auto">
<Table className="w-full table-fixed">  <colgroup>
    <col style={{ width: "120px" }} />
    <col /> 
    <col style={{ width: "120px" }} />
    <col style={{ width: "120px" }} />
    <col style={{ width: "140px" }} />
    <col style={{ width: "100px" }} />
  </colgroup>

  <TableHeader>
    <TableRow>
      <TableHead className="text-xs w-[120px]">SKU</TableHead>
<TableHead className="text-xs w-[45%]">Product</TableHead>
<TableHead className="text-xs text-right w-[120px]">Prev. Units</TableHead>
<TableHead className="text-xs text-right w-[120px]">Prev. Orders</TableHead>
<TableHead className="text-xs w-[140px]">Last Ordered</TableHead>
<TableHead className="text-xs text-right w-[100px]">Price</TableHead>
    </TableRow>
  </TableHeader>

  <TableBody>
    {staleProducts.map((p) => (
      <TableRow key={p.sku}>
        <TableCell className="text-xs font-medium">
          {p.sku}
        </TableCell>

        <TableCell className="text-xs text-muted-foreground truncate">
  {p.name || "-"}
</TableCell>

        <TableCell className="text-xs text-right font-medium">
          {p.previousQty.toLocaleString()}
        </TableCell>

        <TableCell className="text-xs text-right">
          {p.previousOrders}
        </TableCell>

        <TableCell className="text-xs text-muted-foreground">
          {p.lastOrderDate || "-"}
        </TableCell>

        <TableCell className="text-xs text-right">
          {p.basePrice != null ? `$${p.basePrice.toFixed(2)}` : "-"}
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[100px]">
              <p className="text-sm text-muted-foreground">No dropped products found for this period</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
           {ordersByDay?.data?.reduce((a, d) => a + d.cnt, 0)?.toLocaleString() ?? "..."} total
          </Badge>
        </CardHeader>
        <CardContent>
          {ordersByDayLoading ? (
  <div className="flex items-center justify-center h-[260px]">
    <Skeleton className="h-[220px] w-full" />
  </div>
) : ordersByDayChart.length > 0 ? (
  <div className="h-[260px] w-full">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={ordersByDayChart} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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

      <Card className="mb-4" data-testid="card-revenue-trend">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-sm">Revenue Over Time</CardTitle>
          </div>
          <Badge variant="outline">Last 12 months</Badge>
        </CardHeader>
        <CardContent>
          {revenueByMonthLoading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : revenueByMonth && revenueByMonth.length > 0 ? (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByMonth} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    content={({ active, payload, label }: any) => {
                      if (!active || !payload?.[0]) return null;
                      return (
                        <div className="bg-background border rounded-lg shadow-lg px-3 py-2">
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="text-sm font-semibold">${Number(payload[0].value).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                          <p className="text-xs text-muted-foreground">{payload[0].payload.orderCount} orders</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="revenue" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[260px]">
              <p className="text-sm text-muted-foreground">No revenue data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-4" data-testid="card-aov-trend">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-sm">Average Order Value Trend</CardTitle>
          </div>
          <Badge variant="outline">Last 12 months</Badge>
        </CardHeader>
        <CardContent>
          {aovTrendLoading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : aovTrend && aovTrend.length > 0 ? (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={aovTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickFormatter={(v) => `$${v.toFixed(0)}`}
                  />
                  <Tooltip
                    content={({ active, payload, label }: any) => {
                      if (!active || !payload?.[0]) return null;
                      return (
                        <div className="bg-background border rounded-lg shadow-lg px-3 py-2">
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="text-sm font-semibold">AOV: ${Number(payload[0].value).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                          <p className="text-xs text-muted-foreground">{payload[0].payload.orderCount} orders</p>
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgOrderValue"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#8b5cf6", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: "#8b5cf6", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[260px]">
              <p className="text-sm text-muted-foreground">No AOV data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card data-testid="card-top-customers">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm">Top 10 Customers by Revenue</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {topCustomersLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : topCustomers && topCustomers.length > 0 ? (
              <div className="max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">#</TableHead>
                      <TableHead className="text-xs">Customer</TableHead>
                      <TableHead className="text-xs text-right">Orders</TableHead>
                      <TableHead className="text-xs text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topCustomers.map((c, i) => (
                      <TableRow
                        key={c.partner_id}
                        className="cursor-pointer hover-elevate"
                        onClick={() => navigate(`/sales-flow/customers/${c.partner_id}`)}
                        data-testid={`row-top-customer-${c.partner_id}`}
                      >
                        <TableCell className="text-xs font-medium text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="text-xs font-medium">{c.partner_name}</TableCell>
                        <TableCell className="text-xs text-right">{c.orders_count}</TableCell>
                        <TableCell className="text-xs text-right font-medium">${c.amount_total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px]">
                <p className="text-sm text-muted-foreground">No customer data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-top-products">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm">Top 10 Products by Revenue</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {topProductsLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : topProducts && topProducts.length > 0 ? (
              <div className="max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">#</TableHead>
                      <TableHead className="text-xs">Product</TableHead>
                      <TableHead className="text-xs text-right">Qty Sold</TableHead>
                      <TableHead className="text-xs text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topProducts.map((p, i) => (
                      <TableRow key={p.productId} data-testid={`row-top-product-${p.productId}`}>
                        <TableCell className="text-xs font-medium text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="text-xs font-medium truncate max-w-[180px]">{p.productName}</TableCell>
                        <TableCell className="text-xs text-right">{p.totalQty.toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-right font-medium">${p.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px]">
                <p className="text-sm text-muted-foreground">No product data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card data-testid="card-invoice-aging">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm">Accounts Receivable Aging</CardTitle>
            </div>
            {invoiceAging && (
              <Badge variant="outline" data-testid="badge-total-outstanding">
                ${invoiceAging.totalOutstanding.toLocaleString(undefined, { maximumFractionDigits: 0 })} outstanding
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {invoiceAgingLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : invoiceAging ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{invoiceAging.totalInvoices} unpaid invoices</span>
                </div>
                {invoiceAging.buckets.map((b) => {
                  const pct = invoiceAging.totalOutstanding > 0 ? (b.amount / invoiceAging.totalOutstanding) * 100 : 0;
                  const barColor = b.label === "Current" ? "bg-emerald-500" : b.label === "1-30 days" ? "bg-amber-500" : b.label === "31-60 days" ? "bg-orange-500" : "bg-red-500";
                  return (
                    <div key={b.label} data-testid={`aging-bucket-${b.label.replace(/\s+/g, "-")}`}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-medium">{b.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{b.count} inv</span>
                          <span className="text-xs font-semibold">${b.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className={`h-2 rounded-full ${barColor} transition-all`} style={{ width: `${Math.max(pct, 1)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px]">
                <p className="text-sm text-muted-foreground">No aging data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-new-customers">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm">New Customers</CardTitle>
            </div>
            {newCustomers && (
              <Badge variant="outline" data-testid="badge-new-customers-count">
                {newCustomers.total} in last 30 days
              </Badge>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {newCustomersLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : newCustomers && newCustomers.records.length > 0 ? (
              <div className="max-h-[300px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Name</TableHead>
                      <TableHead className="text-xs">Location</TableHead>
                      <TableHead className="text-xs">Added</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {newCustomers.records.map((c: any) => (
                      <TableRow
                        key={c.id}
                        className="cursor-pointer hover-elevate"
                        onClick={() => navigate(`/sales-flow/customers/${c.id}`)}
                        data-testid={`row-new-customer-${c.id}`}
                      >
                        <TableCell className="text-xs font-medium">
                          {c.name}
                          {c.child_ids?.length > 0 && (
                            <span className="text-muted-foreground ml-1">({c.child_ids.length} sub)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {[c.city, Array.isArray(c.state_id) ? c.state_id[1]?.replace(/\s*\(.*\)/, "") : ""].filter(Boolean).join(", ") || "-"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {c.create_date ? new Date(c.create_date).toLocaleDateString() : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px]">
                <p className="text-sm text-muted-foreground">No new customers in the last 30 days</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}