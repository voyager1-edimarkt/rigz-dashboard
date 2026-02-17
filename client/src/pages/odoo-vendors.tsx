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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Truck, Building2, ArrowLeft, ChevronRightIcon, DollarSign, Package,
  Receipt, TrendingUp, ChevronDown, ChevronUp, Filter, Users, ClipboardList,
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

const poStateLabels: Record<string, string> = {
  draft: "RFQ",
  sent: "RFQ Sent",
  purchase: "Purchase Order",
  done: "Locked",
  cancel: "Cancelled",
};

const poStateVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  sent: "secondary",
  purchase: "default",
  done: "secondary",
  cancel: "destructive",
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

export function VendorsListTab() {
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
  queryParams.set("type", "supplier");
  queryParams.set("parentOnly", "true");
  if (debouncedSearch) queryParams.set("search", debouncedSearch);

  const { data, isLoading, error, isFetching } = useQuery<{ records: OdooPartner[]; total: number }>({
    queryKey: ["/api/odoo/partners", "supplier", "parentOnly", debouncedSearch, offset, pageSize],
    queryFn: async () => {
      const res = await fetch(`/api/odoo/partners?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch vendors");
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
            {data && <Badge variant="secondary" data-testid="badge-vendors-count">{data.total.toLocaleString()} parent accounts</Badge>}
            {isFetching && !isLoading && <span className="text-xs text-muted-foreground">Loading...</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name, email, or phone..." value={search}
              onChange={(e) => setSearch(e.target.value)} className="pl-9" data-testid="input-search-vendors" />
          </div>
          <PageSizeSelector pageSize={pageSize} setPageSize={setPageSize} />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? <LoadingSkeleton /> : error ? (
          <div className="p-6 text-center text-destructive">Failed to load vendors.</div>
        ) : !data?.records.length ? (
          <div className="p-6 text-center text-muted-foreground">No vendors found.</div>
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
                      data-testid={`row-vendor-${p.id}`}
                      className="cursor-pointer hover-elevate"
                      onClick={() => navigate(`/odoo/vendors/${p.id}`)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="truncate">{p.name}</span>
                          {p.is_company && <Badge variant="outline" className="text-xs shrink-0">Company</Badge>}
                          <ChevronRightIcon className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
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

interface VendorDashboardData {
  kpis: {
    totalSpend: number;
    totalPOs: number;
    avgPOValue: number;
    openBillCount: number;
    openBillTotal: number;
  };
  billBreakdown: {
    paid: number;
    unpaid: number;
    totalBills: number;
  };
  recentPOs: {
    id: number;
    name: string;
    partner_name: string;
    date_order: string;
    state: string;
    amount_total: number;
    has_bill: boolean;
  }[];
  topProducts: {
    id: number;
    name: string;
    totalQty: number;
    totalSpend: number;
  }[];
  childCount: number;
}

export function VendorDetailPage({ vendorId }: { vendorId: number }) {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [jumpInput, setJumpInput] = useState("");
  const [showAllPOs, setShowAllPOs] = useState(false);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [selectedSubAccount, setSelectedSubAccount] = useState<string>("all");
  const [subAccountOpen, setSubAccountOpen] = useState(false);

  useEffect(() => { setPage(1); }, [debouncedSearch, pageSize]);
  useEffect(() => { setShowAllPOs(false); setShowAllProducts(false); }, [selectedSubAccount]);

  const { data: parent, isLoading: parentLoading } = useQuery<OdooPartner>({
    queryKey: ["/api/odoo/partners", vendorId],
    queryFn: async () => {
      const res = await fetch(`/api/odoo/partners/${vendorId}`);
      if (!res.ok) throw new Error("Failed to fetch vendor");
      return res.json();
    },
  });

  const { data: allChildren } = useQuery<{ records: { id: number; name: string }[]; total: number }>({
    queryKey: ["/api/odoo/partners", "allChildren", "vendor", vendorId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", "10000");
      params.set("offset", "0");
      params.set("parentId", String(vendorId));
      params.set("type", "supplier");
      const res = await fetch(`/api/odoo/partners?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch children");
      return res.json();
    },
  });

  const dashboardPartnerId = selectedSubAccount === "all" ? vendorId : parseInt(selectedSubAccount);

  const { data: dashboard, isLoading: dashboardLoading, error: dashboardError } = useQuery<VendorDashboardData>({
    queryKey: ["/api/odoo/partners", dashboardPartnerId, "vendor-dashboard"],
    queryFn: async () => {
      const res = await fetch(`/api/odoo/partners/${dashboardPartnerId}/vendor-dashboard`);
      if (!res.ok) throw new Error("Failed to fetch vendor dashboard");
      return res.json();
    },
  });

  const offset = (page - 1) * pageSize;
  const queryParams = new URLSearchParams();
  queryParams.set("limit", String(pageSize));
  queryParams.set("offset", String(offset));
  queryParams.set("parentId", String(vendorId));
  queryParams.set("type", "supplier");
  if (debouncedSearch) queryParams.set("search", debouncedSearch);

  const { data: childrenData, isLoading: childrenLoading, error, isFetching } = useQuery<{ records: OdooPartner[]; total: number }>({
    queryKey: ["/api/odoo/partners", "children", "vendor", vendorId, debouncedSearch, offset, pageSize],
    queryFn: async () => {
      const res = await fetch(`/api/odoo/partners?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch child contacts");
      return res.json();
    },
    placeholderData: (prev) => prev,
  });

  const totalPages = childrenData ? Math.ceil(childrenData.total / pageSize) : 0;
  const handleJump = useCallback(() => {
    const p = parseInt(jumpInput);
    if (p >= 1 && p <= totalPages) { setPage(p); setJumpInput(""); }
  }, [jumpInput, totalPages]);

  const billChartData = dashboard ? [
    { name: "Paid", value: dashboard.billBreakdown.paid },
    { name: "Unpaid", value: dashboard.billBreakdown.unpaid },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/odoo/vendors")}
          data-testid="button-back-vendors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span
            className="cursor-pointer hover:underline"
            onClick={() => navigate("/odoo/vendors")}
            data-testid="link-breadcrumb-vendors"
          >
            Vendors
          </span>
          <ChevronRightIcon className="w-3 h-3" />
          <span className="font-medium text-foreground" data-testid="text-breadcrumb-current">
            {parentLoading ? "Loading..." : parent?.name || `Vendor #${vendorId}`}
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

      {allChildren && allChildren.total > 0 && (
        <div className="flex items-center gap-2 flex-wrap" data-testid="section-sub-account-filter">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">View data for:</span>
          <Popover open={subAccountOpen} onOpenChange={setSubAccountOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={subAccountOpen}
                className="min-w-[220px] justify-between"
                data-testid="button-sub-account-filter"
              >
                <span className="truncate">
                  {selectedSubAccount === "all"
                    ? `All accounts (${allChildren.total + 1})`
                    : selectedSubAccount === String(vendorId)
                      ? `${parent?.name || "Parent"} (parent only)`
                      : allChildren.records.find(c => String(c.id) === selectedSubAccount)?.name || "Selected account"}
                </span>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search sub-accounts..." data-testid="input-sub-account-search" />
                <CommandList>
                  <CommandEmpty>No sub-account found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all accounts combined"
                      onSelect={() => { setSelectedSubAccount("all"); setSubAccountOpen(false); }}
                      data-testid="option-sub-account-all"
                    >
                      All accounts ({allChildren.total + 1})
                    </CommandItem>
                    {allChildren.records.map((child) => (
                      <CommandItem
                        key={child.id}
                        value={child.name}
                        onSelect={() => { setSelectedSubAccount(String(child.id)); setSubAccountOpen(false); }}
                        data-testid={`option-sub-account-${child.id}`}
                      >
                        {child.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {selectedSubAccount !== "all" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedSubAccount("all")}
              data-testid="button-clear-filter"
            >
              Clear filter
            </Button>
          )}
          {dashboardLoading && <span className="text-xs text-muted-foreground">Loading...</span>}
        </div>
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
            <Card data-testid="card-kpi-spend">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">Total Spend</span>
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold mt-1" data-testid="text-kpi-spend">{formatCurrency(dashboard.kpis.totalSpend)}</p>
                <p className="text-xs text-muted-foreground mt-1">Across all accounts</p>
              </CardContent>
            </Card>
            <Card data-testid="card-kpi-pos">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">Total POs</span>
                  <ClipboardList className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold mt-1" data-testid="text-kpi-pos">{formatNumber(dashboard.kpis.totalPOs)}</p>
                <p className="text-xs text-muted-foreground mt-1">Excl. cancelled</p>
              </CardContent>
            </Card>
            <Card data-testid="card-kpi-avg-po">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">Avg PO Value</span>
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold mt-1" data-testid="text-kpi-avg-po">{formatCurrency(dashboard.kpis.avgPOValue)}</p>
                <p className="text-xs text-muted-foreground mt-1">Per purchase order</p>
              </CardContent>
            </Card>
            <Card data-testid="card-kpi-bills">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">Open Bills</span>
                  <Receipt className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold mt-1" data-testid="text-kpi-open-bills">{dashboard.kpis.openBillCount}</p>
                <p className="text-xs text-muted-foreground mt-1" data-testid="text-kpi-outstanding">{formatCurrency(dashboard.kpis.openBillTotal)} outstanding</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card data-testid="card-top-products-chart">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Top Products Purchased</span>
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
                        <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={140}
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v: string) => v.length > 22 ? v.slice(0, 20) + "..." : v}
                        />
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            name === "totalSpend" ? formatCurrency(value) : `${formatNumber(value)} units`,
                            name === "totalSpend" ? "Spend" : "Qty Ordered"
                          ]}
                          labelFormatter={(label: string) => label}
                        />
                        <Bar dataKey="totalSpend" name="totalSpend" radius={[0, 4, 4, 0]}>
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

            <Card data-testid="card-bill-breakdown">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Bill Breakdown</span>
                </div>
              </CardHeader>
              <CardContent>
                {dashboard.billBreakdown.totalBills === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No bills found.</p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Paid</span>
                        <p className="text-xl font-bold" style={{ color: "hsl(var(--chart-2))" }} data-testid="text-bill-paid">{formatCurrency(dashboard.billBreakdown.paid)}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Unpaid / Outstanding</span>
                        <p className="text-xl font-bold" style={{ color: "hsl(var(--chart-4))" }} data-testid="text-bill-unpaid">{formatCurrency(dashboard.billBreakdown.unpaid)}</p>
                      </div>
                    </div>
                    {billChartData.length > 0 && (
                      <div>
                        <div className="w-full h-4 rounded-md overflow-hidden flex">
                          {dashboard.billBreakdown.paid > 0 && (
                            <div
                              className="h-full"
                              style={{ width: `${(dashboard.billBreakdown.paid / (dashboard.billBreakdown.paid + dashboard.billBreakdown.unpaid)) * 100}%`, backgroundColor: "hsl(var(--chart-2))" }}
                              title={`Paid: ${formatCurrency(dashboard.billBreakdown.paid)}`}
                              data-testid="bar-bill-paid"
                            />
                          )}
                          {dashboard.billBreakdown.unpaid > 0 && (
                            <div
                              className="h-full"
                              style={{ width: `${(dashboard.billBreakdown.unpaid / (dashboard.billBreakdown.paid + dashboard.billBreakdown.unpaid)) * 100}%`, backgroundColor: "hsl(var(--chart-4))" }}
                              title={`Unpaid: ${formatCurrency(dashboard.billBreakdown.unpaid)}`}
                              data-testid="bar-bill-unpaid"
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1" data-testid="legend-bill-paid">
                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(var(--chart-2))" }} />
                            <span>Paid</span>
                          </div>
                          <div className="flex items-center gap-1" data-testid="legend-bill-unpaid">
                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(var(--chart-4))" }} />
                            <span>Unpaid</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">{dashboard.billBreakdown.totalBills} total bills</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card data-testid="card-recent-pos">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Recent Purchase Orders</span>
                <Badge variant="secondary">{dashboard.recentPOs.length} total</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {dashboard.recentPOs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No purchase orders found.</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table className="table-fixed w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[15%]">PO</TableHead>
                          <TableHead className="w-[22%]">Vendor</TableHead>
                          <TableHead className="w-[15%]">Date</TableHead>
                          <TableHead className="w-[14%]">Amount</TableHead>
                          <TableHead className="w-[14%]">Status</TableHead>
                          <TableHead className="w-[10%]">Bill</TableHead>
                          <TableHead className="w-[10%]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(showAllPOs ? dashboard.recentPOs : dashboard.recentPOs.slice(0, 5)).map((po) => (
                          <TableRow
                            key={po.id}
                            className="cursor-pointer hover-elevate"
                            onClick={() => navigate(`/purchase-flow/orders/${po.id}`)}
                            data-testid={`row-po-${po.id}`}
                          >
                            <TableCell className="font-medium text-sm">{po.name}</TableCell>
                            <TableCell className="text-sm truncate" title={po.partner_name}>{po.partner_name}</TableCell>
                            <TableCell className="text-sm">{po.date_order ? new Date(po.date_order).toLocaleDateString() : "-"}</TableCell>
                            <TableCell className="text-sm font-medium">{formatCurrency(po.amount_total)}</TableCell>
                            <TableCell>
                              <Badge variant={poStateVariants[po.state] || "outline"}>
                                {poStateLabels[po.state] || po.state}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {po.has_bill ? (
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
                  {dashboard.recentPOs.length > 5 && (
                    <div className="flex justify-center py-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAllPOs(!showAllPOs)}
                        data-testid="button-toggle-pos"
                      >
                        {showAllPOs ? (
                          <>Show Less <ChevronUp className="w-4 h-4 ml-1" /></>
                        ) : (
                          <>Show More ({dashboard.recentPOs.length - 5} more) <ChevronDown className="w-4 h-4 ml-1" /></>
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {dashboard.topProducts.length > 0 && (
            <Card data-testid="card-top-products-detail">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Top Products Detail</span>
                  <Badge variant="secondary">{dashboard.topProducts.length} total</Badge>
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
                        <TableHead className="w-[25%]">Spend</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(showAllProducts ? dashboard.topProducts : dashboard.topProducts.slice(0, 5)).map((p, i) => (
                        <TableRow key={p.id} data-testid={`row-product-${p.id}`}>
                          <TableCell className="text-sm text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="font-medium text-sm truncate" title={p.name}>{p.name}</TableCell>
                          <TableCell className="text-sm">{formatNumber(p.totalQty)}</TableCell>
                          <TableCell className="text-sm font-medium">{formatCurrency(p.totalSpend)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {dashboard.topProducts.length > 5 && (
                  <div className="flex justify-center py-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllProducts(!showAllProducts)}
                      data-testid="button-toggle-products"
                    >
                      {showAllProducts ? (
                        <>Show Less <ChevronUp className="w-4 h-4 ml-1" /></>
                      ) : (
                        <>Show More ({dashboard.topProducts.length - 5} more) <ChevronDown className="w-4 h-4 ml-1" /></>
                      )}
                    </Button>
                  </div>
                )}
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
              {childrenData && <Badge variant="secondary" data-testid="badge-children-count">{childrenData.total} contacts</Badge>}
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
                        onClick={() => hasChildren && navigate(`/odoo/vendors/${c.id}`)}
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

export default function OdooVendors() {
  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Truck className="w-5 h-5" />
        <h1 className="text-xl font-semibold" data-testid="text-page-title">Vendors</h1>
      </div>
      <VendorsListTab />
    </div>
  );
}
