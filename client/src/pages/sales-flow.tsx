import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Users, ShoppingCart, FileText, Building2, ArrowLeft, ChevronRightIcon,
  DollarSign, Package, Receipt, TrendingUp,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell } from "recharts";

interface OdooPartner {
  id: number;
  name: string;
  email: string | false;
  phone: string | false;
  mobile: string | false;
  city: string | false;
  state_id: [number, string] | false;
  country_id: [number, string] | false;
  is_company: boolean;
  customer_rank: number;
  supplier_rank: number;
  active: boolean;
  parent_id: [number, string] | false;
  child_ids: number[];
}

interface OdooSaleOrder {
  id: number;
  name: string;
  partner_id: [number, string] | false;
  date_order: string;
  state: string;
  amount_total: number;
  amount_untaxed: number;
  amount_tax: number;
  order_line: number[];
  currency_id: [number, string] | false;
  create_date: string;
  write_date: string;
}

interface OdooInvoice {
  id: number;
  name: string;
  partner_id: [number, string] | false;
  invoice_date: string | false;
  invoice_date_due: string | false;
  state: string;
  payment_state: string;
  amount_total: number;
  amount_residual: number;
  amount_untaxed: number;
  amount_tax: number;
  currency_id: [number, string] | false;
  invoice_origin: string | false;
  ref: string | false;
  create_date: string;
  write_date: string;
}

const orderStateLabels: Record<string, string> = {
  draft: "Quotation",
  sent: "Quotation Sent",
  sale: "Sales Order",
  done: "Locked",
  cancel: "Cancelled",
};

const orderStateVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  sent: "secondary",
  sale: "default",
  done: "secondary",
  cancel: "destructive",
};

const invoiceStateLabels: Record<string, string> = {
  draft: "Draft",
  posted: "Posted",
  cancel: "Cancelled",
};

const invoiceStateVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  posted: "default",
  cancel: "destructive",
};

const paymentLabels: Record<string, string> = {
  not_paid: "Not Paid",
  partial: "Partial",
  paid: "Paid",
  in_payment: "In Payment",
  reversed: "Reversed",
};

const paymentVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  not_paid: "destructive",
  partial: "secondary",
  paid: "default",
  in_payment: "secondary",
  reversed: "outline",
};

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function Pagination({ page, totalPages, pageSize, total, offset, setPage, jumpInput, setJumpInput, handleJump }: {
  page: number; totalPages: number; pageSize: number; total: number; offset: number;
  setPage: (p: number) => void; jumpInput: string; setJumpInput: (v: string) => void; handleJump: () => void;
}) {
  if (total <= 0) return null;
  return (
    <div className="flex items-center justify-between gap-2 p-3 border-t flex-wrap">
      <span className="text-sm text-muted-foreground" data-testid="text-page-info">
        {offset + 1}-{Math.min(offset + pageSize, total)} of {total.toLocaleString()}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" disabled={page <= 1}
          onClick={() => setPage(1)} data-testid="button-first-page">
          <ChevronsLeft className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="icon" disabled={page <= 1}
          onClick={() => setPage(page - 1)} data-testid="button-prev-page">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-1 px-1">
          <Input
            className="w-14 text-center"
            value={jumpInput || String(page)}
            onChange={(e) => setJumpInput(e.target.value)}
            onBlur={handleJump}
            onKeyDown={(e) => e.key === "Enter" && handleJump()}
            data-testid="input-page-jump"
          />
          <span className="text-sm text-muted-foreground">/ {totalPages}</span>
        </div>
        <Button variant="outline" size="icon" disabled={page >= totalPages}
          onClick={() => setPage(page + 1)} data-testid="button-next-page">
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="icon" disabled={page >= totalPages}
          onClick={() => setPage(totalPages)} data-testid="button-last-page">
          <ChevronsRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function PageSizeSelector({ pageSize, setPageSize }: { pageSize: number; setPageSize: (v: number) => void }) {
  return (
    <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
      <SelectTrigger className="w-[100px]" data-testid="select-page-size">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="10">10 / page</SelectItem>
        <SelectItem value="25">25 / page</SelectItem>
        <SelectItem value="50">50 / page</SelectItem>
        <SelectItem value="100">100 / page</SelectItem>
      </SelectContent>
    </Select>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function CustomersTab() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [jumpInput, setJumpInput] = useState("");

  useEffect(() => { setPage(1); }, [debouncedSearch, pageSize]);

  const offset = (page - 1) * pageSize;
  const queryParams = new URLSearchParams();
  queryParams.set("limit", String(pageSize));
  queryParams.set("offset", String(offset));
  queryParams.set("type", "customer");
  queryParams.set("parentOnly", "true");
  if (debouncedSearch) queryParams.set("search", debouncedSearch);

  const { data, isLoading, error, isFetching } = useQuery<{ records: OdooPartner[]; total: number }>({
    queryKey: ["/api/odoo/partners", "customer", "parentOnly", debouncedSearch, offset, pageSize],
    queryFn: async () => {
      const res = await fetch(`/api/odoo/partners?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
    placeholderData: (prev) => prev,
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;
  const handleJump = useCallback(() => {
    const p = parseInt(jumpInput);
    if (p >= 1 && p <= totalPages) { setPage(p); setJumpInput(""); }
  }, [jumpInput, totalPages]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {data && <Badge variant="secondary" data-testid="badge-customers-count">{data.total.toLocaleString()} parent accounts</Badge>}
            {isFetching && !isLoading && <span className="text-xs text-muted-foreground">Loading...</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name, email, or phone..." value={search}
              onChange={(e) => setSearch(e.target.value)} className="pl-9" data-testid="input-search-customers" />
          </div>
          <PageSizeSelector pageSize={pageSize} setPageSize={setPageSize} />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? <LoadingSkeleton /> : error ? (
          <div className="p-6 text-center text-destructive">Failed to load customers.</div>
        ) : !data?.records.length ? (
          <div className="p-6 text-center text-muted-foreground">No customers found.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[18%]">Name</TableHead>
                  <TableHead className="w-[20%]">Email</TableHead>
                  <TableHead className="w-[13%]">Phone</TableHead>
                  <TableHead className="w-[11%]">City</TableHead>
                  <TableHead className="w-[12%]">State</TableHead>
                  <TableHead className="w-[12%]">Country</TableHead>
                  <TableHead className="w-[14%]">Sub-accounts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.records.map((p) => {
                  const hasChildren = Array.isArray(p.child_ids) && p.child_ids.length > 0;
                  return (
                    <TableRow
                      key={p.id}
                      data-testid={`row-customer-${p.id}`}
                      className={hasChildren ? "cursor-pointer hover-elevate" : ""}
                      onClick={() => hasChildren && navigate(`/sales-flow/customers/${p.id}`)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="truncate">{p.name}</span>
                          {p.is_company && <Badge variant="outline" className="text-xs shrink-0">Company</Badge>}
                          {hasChildren && <ChevronRightIcon className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm truncate" title={p.email || ""}>{p.email || "-"}</TableCell>
                      <TableCell className="text-sm truncate">{p.phone || p.mobile || "-"}</TableCell>
                      <TableCell className="text-sm truncate">{p.city || "-"}</TableCell>
                      <TableCell className="text-sm truncate">{Array.isArray(p.state_id) ? p.state_id[1] : "-"}</TableCell>
                      <TableCell className="text-sm truncate">{Array.isArray(p.country_id) ? p.country_id[1] : "-"}</TableCell>
                      <TableCell>
                        {hasChildren ? (
                          <Badge variant="secondary">{p.child_ids.length}</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        {data && <Pagination page={page} totalPages={totalPages} pageSize={pageSize} total={data.total}
          offset={offset} setPage={setPage} jumpInput={jumpInput} setJumpInput={setJumpInput} handleJump={handleJump} />}
      </CardContent>
    </Card>
  );
}

interface DashboardData {
  kpis: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    openInvoiceCount: number;
    openInvoiceTotal: number;
  };
  invoiceBreakdown: {
    paid: number;
    unpaid: number;
    overdue: number;
    totalInvoices: number;
  };
  recentOrders: {
    id: number;
    name: string;
    partner_name: string;
    date_order: string;
    state: string;
    amount_total: number;
    has_invoice: boolean;
  }[];
  topProducts: {
    id: number;
    name: string;
    totalQty: number;
    totalRevenue: number;
  }[];
  childCount: number;
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(220 70% 55%)",
  "hsl(280 65% 55%)",
  "hsl(340 65% 55%)",
  "hsl(30 80% 55%)",
  "hsl(160 60% 45%)",
];

function formatCurrency(val: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
}

function formatNumber(val: number) {
  return new Intl.NumberFormat("en-US").format(val);
}

export function CustomerDetailPage({ customerId }: { customerId: number }) {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [jumpInput, setJumpInput] = useState("");

  useEffect(() => { setPage(1); }, [debouncedSearch, pageSize]);

  const { data: parent, isLoading: parentLoading } = useQuery<OdooPartner>({
    queryKey: ["/api/odoo/partners", customerId],
    queryFn: async () => {
      const res = await fetch(`/api/odoo/partners/${customerId}`);
      if (!res.ok) throw new Error("Failed to fetch customer");
      return res.json();
    },
  });

  const { data: dashboard, isLoading: dashboardLoading, error: dashboardError } = useQuery<DashboardData>({
    queryKey: ["/api/odoo/partners", customerId, "dashboard"],
    queryFn: async () => {
      const res = await fetch(`/api/odoo/partners/${customerId}/dashboard`);
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      return res.json();
    },
  });

  const offset = (page - 1) * pageSize;
  const queryParams = new URLSearchParams();
  queryParams.set("limit", String(pageSize));
  queryParams.set("offset", String(offset));
  queryParams.set("parentId", String(customerId));
  queryParams.set("type", "customer");
  if (debouncedSearch) queryParams.set("search", debouncedSearch);

  const { data: childrenData, isLoading: childrenLoading, error, isFetching } = useQuery<{ records: OdooPartner[]; total: number }>({
    queryKey: ["/api/odoo/partners", "children", customerId, debouncedSearch, offset, pageSize],
    queryFn: async () => {
      const res = await fetch(`/api/odoo/partners?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch child companies");
      return res.json();
    },
    placeholderData: (prev) => prev,
  });

  const totalPages = childrenData ? Math.ceil(childrenData.total / pageSize) : 0;
  const handleJump = useCallback(() => {
    const p = parseInt(jumpInput);
    if (p >= 1 && p <= totalPages) { setPage(p); setJumpInput(""); }
  }, [jumpInput, totalPages]);

  const invoiceChartData = dashboard ? [
    { name: "Paid", value: dashboard.invoiceBreakdown.paid },
    { name: "Unpaid", value: dashboard.invoiceBreakdown.unpaid },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/sales-flow/customers")}
          data-testid="button-back-customers"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span
            className="cursor-pointer hover:underline"
            onClick={() => navigate("/sales-flow/customers")}
            data-testid="link-breadcrumb-customers"
          >
            Customers
          </span>
          <ChevronRightIcon className="w-3 h-3" />
          <span className="font-medium text-foreground" data-testid="text-breadcrumb-current">
            {parentLoading ? "Loading..." : parent?.name || `Customer #${customerId}`}
          </span>
        </div>
      </div>

      {parent && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3 flex-wrap">
              <Building2 className="w-5 h-5 text-muted-foreground" />
              <div>
                <h2 className="text-lg font-semibold" data-testid="text-parent-name">{parent.name}</h2>
                <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
                  {parent.city && <span>{parent.city}</span>}
                  {Array.isArray(parent.state_id) && <span>{parent.state_id[1]}</span>}
                  {Array.isArray(parent.country_id) && <span>{parent.country_id[1]}</span>}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2 flex-wrap">
                {parent.email && <Badge variant="outline">{parent.email}</Badge>}
                {parent.phone && <Badge variant="outline">{parent.phone}</Badge>}
                {dashboard && <Badge variant="secondary">{dashboard.childCount} sub-accounts</Badge>}
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {dashboardLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : dashboardError ? (
        <Card>
          <CardContent className="p-6 text-center text-destructive" data-testid="text-dashboard-error">
            Failed to load dashboard data. Please try refreshing the page.
          </CardContent>
        </Card>
      ) : dashboard && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="section-kpi-cards">
            <Card data-testid="card-kpi-revenue">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">Total Revenue</span>
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold mt-1" data-testid="text-kpi-revenue">{formatCurrency(dashboard.kpis.totalRevenue)}</p>
                <p className="text-xs text-muted-foreground mt-1">Across all accounts</p>
              </CardContent>
            </Card>
            <Card data-testid="card-kpi-orders">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">Total Orders</span>
                  <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold mt-1" data-testid="text-kpi-orders">{formatNumber(dashboard.kpis.totalOrders)}</p>
                <p className="text-xs text-muted-foreground mt-1">Excl. cancelled</p>
              </CardContent>
            </Card>
            <Card data-testid="card-kpi-aov">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">Avg Order Value</span>
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold mt-1" data-testid="text-kpi-aov">{formatCurrency(dashboard.kpis.avgOrderValue)}</p>
                <p className="text-xs text-muted-foreground mt-1">Per order</p>
              </CardContent>
            </Card>
            <Card data-testid="card-kpi-invoices">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">Open Invoices</span>
                  <Receipt className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold mt-1" data-testid="text-kpi-open-invoices">{dashboard.kpis.openInvoiceCount}</p>
                <p className="text-xs text-muted-foreground mt-1" data-testid="text-kpi-outstanding">{formatCurrency(dashboard.kpis.openInvoiceTotal)} outstanding</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card data-testid="card-top-products-chart">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Most Ordered Products</span>
                </div>
              </CardHeader>
              <CardContent>
                {dashboard.topProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No product data available.</p>
                ) : (
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dashboard.topProducts.slice(0, 8)}
                        layout="vertical"
                        margin={{ top: 0, right: 10, bottom: 0, left: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tickFormatter={(v) => formatNumber(v)} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={140}
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v: string) => v.length > 22 ? v.slice(0, 20) + "..." : v}
                        />
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            name === "totalQty" ? `${formatNumber(value)} units` : formatCurrency(value),
                            name === "totalQty" ? "Qty Ordered" : "Revenue"
                          ]}
                          labelFormatter={(label: string) => label}
                        />
                        <Bar dataKey="totalQty" name="totalQty" radius={[0, 4, 4, 0]}>
                          {dashboard.topProducts.slice(0, 8).map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-invoice-breakdown">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Invoice Breakdown</span>
                </div>
              </CardHeader>
              <CardContent>
                {dashboard.invoiceBreakdown.totalInvoices === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No invoices found.</p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Paid</span>
                        <p className="text-xl font-bold" style={{ color: "hsl(var(--chart-2))" }} data-testid="text-invoice-paid">{formatCurrency(dashboard.invoiceBreakdown.paid)}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Unpaid / Outstanding</span>
                        <p className="text-xl font-bold" style={{ color: "hsl(var(--chart-4))" }} data-testid="text-invoice-unpaid">{formatCurrency(dashboard.invoiceBreakdown.unpaid)}</p>
                      </div>
                    </div>
                    {invoiceChartData.length > 0 && (
                      <div>
                        <div className="w-full h-4 rounded-md overflow-hidden flex">
                          {dashboard.invoiceBreakdown.paid > 0 && (
                            <div
                              className="h-full"
                              style={{ width: `${(dashboard.invoiceBreakdown.paid / (dashboard.invoiceBreakdown.paid + dashboard.invoiceBreakdown.unpaid)) * 100}%`, backgroundColor: "hsl(var(--chart-2))" }}
                              title={`Paid: ${formatCurrency(dashboard.invoiceBreakdown.paid)}`}
                              data-testid="bar-invoice-paid"
                            />
                          )}
                          {dashboard.invoiceBreakdown.unpaid > 0 && (
                            <div
                              className="h-full"
                              style={{ width: `${(dashboard.invoiceBreakdown.unpaid / (dashboard.invoiceBreakdown.paid + dashboard.invoiceBreakdown.unpaid)) * 100}%`, backgroundColor: "hsl(var(--chart-4))" }}
                              title={`Unpaid: ${formatCurrency(dashboard.invoiceBreakdown.unpaid)}`}
                              data-testid="bar-invoice-unpaid"
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1" data-testid="legend-invoice-paid">
                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(var(--chart-2))" }} />
                            <span>Paid</span>
                          </div>
                          <div className="flex items-center gap-1" data-testid="legend-invoice-unpaid">
                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(var(--chart-4))" }} />
                            <span>Unpaid</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">{dashboard.invoiceBreakdown.totalInvoices} total invoices</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card data-testid="card-recent-orders">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Recent Orders</span>
                <Badge variant="secondary">{dashboard.recentOrders.length} shown</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {dashboard.recentOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No orders found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="table-fixed w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[15%]">Order</TableHead>
                        <TableHead className="w-[22%]">Customer</TableHead>
                        <TableHead className="w-[15%]">Date</TableHead>
                        <TableHead className="w-[14%]">Amount</TableHead>
                        <TableHead className="w-[14%]">Status</TableHead>
                        <TableHead className="w-[10%]">Invoice</TableHead>
                        <TableHead className="w-[10%]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dashboard.recentOrders.map((o) => (
                        <TableRow
                          key={o.id}
                          className="cursor-pointer hover-elevate"
                          onClick={() => navigate(`/sales-flow/orders/${o.id}`)}
                          data-testid={`row-order-${o.id}`}
                        >
                          <TableCell className="font-medium text-sm">{o.name}</TableCell>
                          <TableCell className="text-sm truncate" title={o.partner_name}>{o.partner_name}</TableCell>
                          <TableCell className="text-sm">{o.date_order ? new Date(o.date_order).toLocaleDateString() : "-"}</TableCell>
                          <TableCell className="text-sm font-medium">{formatCurrency(o.amount_total)}</TableCell>
                          <TableCell>
                            <Badge variant={orderStateVariants[o.state] || "outline"}>
                              {orderStateLabels[o.state] || o.state}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {o.has_invoice ? (
                              <Badge variant="default">Yes</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">No</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {dashboard.topProducts.length > 0 && (
            <Card data-testid="card-top-products-detail">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Top Products Detail</span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="table-fixed w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[5%]">#</TableHead>
                        <TableHead className="w-[50%]">Product</TableHead>
                        <TableHead className="w-[20%]">Units Ordered</TableHead>
                        <TableHead className="w-[25%]">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dashboard.topProducts.map((p, i) => (
                        <TableRow key={p.id} data-testid={`row-product-${p.id}`}>
                          <TableCell className="text-sm text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="font-medium text-sm truncate" title={p.name}>{p.name}</TableCell>
                          <TableCell className="text-sm">{formatNumber(p.totalQty)}</TableCell>
                          <TableCell className="text-sm font-medium">{formatCurrency(p.totalRevenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Sub-accounts</span>
              {childrenData && <Badge variant="secondary" data-testid="badge-children-count">{childrenData.total} accounts</Badge>}
              {isFetching && !childrenLoading && <span className="text-xs text-muted-foreground">Loading...</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search sub-accounts..." value={search}
                onChange={(e) => setSearch(e.target.value)} className="pl-9" data-testid="input-search-children" />
            </div>
            <PageSizeSelector pageSize={pageSize} setPageSize={setPageSize} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {childrenLoading ? <LoadingSkeleton /> : error ? (
            <div className="p-6 text-center text-destructive">Failed to load sub-accounts.</div>
          ) : !childrenData?.records.length ? (
            <div className="p-6 text-center text-muted-foreground">No sub-accounts found.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="table-fixed w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[15%]">Name</TableHead>
                    <TableHead className="w-[22%]">Email</TableHead>
                    <TableHead className="w-[13%]">Phone</TableHead>
                    <TableHead className="w-[12%]">City</TableHead>
                    <TableHead className="w-[13%]">State</TableHead>
                    <TableHead className="w-[12%]">Country</TableHead>
                    <TableHead className="w-[13%]">Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {childrenData.records.map((c) => {
                    const hasChildren = Array.isArray(c.child_ids) && c.child_ids.length > 0;
                    return (
                      <TableRow
                        key={c.id}
                        data-testid={`row-child-${c.id}`}
                        className={hasChildren ? "cursor-pointer hover-elevate" : ""}
                        onClick={() => hasChildren && navigate(`/sales-flow/customers/${c.id}`)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span className="truncate">{c.name}</span>
                            {c.is_company && <Badge variant="outline" className="text-xs shrink-0">Company</Badge>}
                            {hasChildren && <ChevronRightIcon className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm truncate" title={c.email || ""}>{c.email || "-"}</TableCell>
                        <TableCell className="text-sm truncate">{c.phone || c.mobile || "-"}</TableCell>
                        <TableCell className="text-sm truncate">{c.city || "-"}</TableCell>
                        <TableCell className="text-sm truncate">{Array.isArray(c.state_id) ? c.state_id[1] : "-"}</TableCell>
                        <TableCell className="text-sm truncate">{Array.isArray(c.country_id) ? c.country_id[1] : "-"}</TableCell>
                        <TableCell>
                          {c.is_company ? <Badge variant="secondary">Company</Badge> : <Badge variant="outline">Individual</Badge>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {childrenData && <Pagination page={page} totalPages={totalPages} pageSize={pageSize} total={childrenData.total}
            offset={offset} setPage={setPage} jumpInput={jumpInput} setJumpInput={setJumpInput} handleJump={handleJump} />}
        </CardContent>
      </Card>
    </div>
  );
}

interface InvoiceSummary {
  id: number;
  name: string;
  state: string;
  payment_state: string;
  amount_total: number;
  amount_residual: number;
}

interface SaleOrderWithInvoice extends OdooSaleOrder {
  invoice_ids: number[];
  invoices_summary: InvoiceSummary[];
}

function OrdersAndInvoicesTab() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [state, setState] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [jumpInput, setJumpInput] = useState("");

  useEffect(() => { setPage(1); }, [debouncedSearch, state, dateFrom, dateTo, pageSize]);

  const offset = (page - 1) * pageSize;
  const queryParams = new URLSearchParams();
  queryParams.set("limit", String(pageSize));
  queryParams.set("offset", String(offset));
  if (debouncedSearch) queryParams.set("search", debouncedSearch);
  if (state !== "all") queryParams.set("state", state);
  if (dateFrom) queryParams.set("dateFrom", dateFrom);
  if (dateTo) queryParams.set("dateTo", dateTo);

  const { data, isLoading, error, isFetching } = useQuery<{ records: SaleOrderWithInvoice[]; total: number }>({
    queryKey: ["/api/odoo/sale-orders", debouncedSearch, state, dateFrom, dateTo, offset, pageSize],
    queryFn: async () => {
      const res = await fetch(`/api/odoo/sale-orders?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch sale orders");
      return res.json();
    },
    placeholderData: (prev) => prev,
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;
  const handleJump = useCallback(() => {
    const p = parseInt(jumpInput);
    if (p >= 1 && p <= totalPages) { setPage(p); setJumpInput(""); }
  }, [jumpInput, totalPages]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {data && (
              <>
                <Badge variant="secondary" data-testid="badge-orders-count">{data.total.toLocaleString()} orders</Badge>
                <Badge variant="outline" data-testid="badge-invoiced-count">
                  {data.records.filter(o => o.invoice_ids?.length > 0).length} invoiced
                </Badge>
              </>
            )}
            {isFetching && !isLoading && <span className="text-xs text-muted-foreground">Loading...</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by order name or customer..." value={search}
              onChange={(e) => setSearch(e.target.value)} className="pl-9" data-testid="input-search-orders" />
          </div>
          <Select value={state} onValueChange={setState}>
            <SelectTrigger className="w-[160px]" data-testid="select-order-state">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              <SelectItem value="draft">Quotation</SelectItem>
              <SelectItem value="sent">Quotation Sent</SelectItem>
              <SelectItem value="sale">Sales Order</SelectItem>
              <SelectItem value="done">Locked</SelectItem>
              <SelectItem value="cancel">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="w-[150px]" data-testid="input-date-from" />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="w-[150px]" data-testid="input-date-to" />
          <PageSizeSelector pageSize={pageSize} setPageSize={setPageSize} />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? <LoadingSkeleton /> : error ? (
          <div className="p-6 text-center text-destructive">Failed to load orders.</div>
        ) : !data?.records.length ? (
          <div className="p-6 text-center text-muted-foreground">No orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Lines</TableHead>
                  <TableHead>Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.records.map((o) => {
                  const hasInvoice = o.invoice_ids?.length > 0;
                  return (
                    <TableRow key={o.id} data-testid={`row-order-${o.id}`}
                      className="cursor-pointer"
                      onClick={() => navigate(`/sales-flow/orders/${o.id}`)}>
                      <TableCell className="font-medium">{o.name}</TableCell>
                      <TableCell>{Array.isArray(o.partner_id) ? o.partner_id[1] : "-"}</TableCell>
                      <TableCell className="text-sm">{o.date_order ? new Date(o.date_order).toLocaleDateString() : "-"}</TableCell>
                      <TableCell>
                        <Badge variant={orderStateVariants[o.state] || "outline"}>
                          {orderStateLabels[o.state] || o.state}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">${o.amount_total.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{o.order_line?.length || 0}</TableCell>
                      <TableCell>
                        {hasInvoice && o.invoices_summary?.length > 0 ? (
                          <div className="flex flex-col gap-1" data-testid={`badge-invoice-status-${o.id}`}>
                            {o.invoices_summary.map((inv) => (
                              <div key={inv.id} className="flex items-center gap-1 flex-wrap">
                                <Badge variant={invoiceStateVariants[inv.state] || "outline"} className="text-xs">
                                  <FileText className="w-3 h-3 mr-1" />
                                  {inv.name || "Draft"}
                                </Badge>
                                <Badge variant={paymentVariants[inv.payment_state] || "outline"} className="text-xs">
                                  {paymentLabels[inv.payment_state] || inv.payment_state}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ) : hasInvoice ? (
                          <Badge variant="outline" data-testid={`badge-invoice-status-${o.id}`}>
                            <FileText className="w-3 h-3 mr-1" />
                            {o.invoice_ids.length} Invoice{o.invoice_ids.length !== 1 ? "s" : ""}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground" data-testid={`badge-invoice-status-${o.id}`}>No invoice</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        {data && <Pagination page={page} totalPages={totalPages} pageSize={pageSize} total={data.total}
          offset={offset} setPage={setPage} jumpInput={jumpInput} setJumpInput={setJumpInput} handleJump={handleJump} />}
      </CardContent>
    </Card>
  );
}

export default function SalesFlow() {
  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
        <ShoppingCart className="w-5 h-5" />
        <h1 className="text-xl font-semibold" data-testid="text-page-title">Orders & Invoices</h1>
      </div>

      <OrdersAndInvoicesTab />
    </div>
  );
}
