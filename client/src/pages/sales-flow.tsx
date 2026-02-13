import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Users, ShoppingCart, FileText, ArrowRight,
} from "lucide-react";

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

function CustomersTab() {
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
  if (debouncedSearch) queryParams.set("search", debouncedSearch);

  const { data, isLoading, error, isFetching } = useQuery<{ records: OdooPartner[]; total: number }>({
    queryKey: ["/api/odoo/partners", "customer", debouncedSearch, offset, pageSize],
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
            {data && <Badge variant="secondary" data-testid="badge-customers-count">{data.total.toLocaleString()} customers</Badge>}
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.records.map((p) => (
                  <TableRow key={p.id} data-testid={`row-customer-${p.id}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {p.name}
                        {p.is_company && <Badge variant="outline" className="text-xs">Company</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{p.email || "-"}</TableCell>
                    <TableCell className="text-sm">{p.phone || p.mobile || "-"}</TableCell>
                    <TableCell className="text-sm">{p.city || "-"}</TableCell>
                    <TableCell className="text-sm">{Array.isArray(p.state_id) ? p.state_id[1] : "-"}</TableCell>
                    <TableCell className="text-sm">{Array.isArray(p.country_id) ? p.country_id[1] : "-"}</TableCell>
                    <TableCell>
                      {p.is_company ? <Badge variant="secondary">Company</Badge> : <Badge variant="outline">Individual</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
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

function SaleOrdersTab() {
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

  const { data, isLoading, error, isFetching } = useQuery<{ records: OdooSaleOrder[]; total: number }>({
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
            {data && <Badge variant="secondary" data-testid="badge-orders-count">{data.total.toLocaleString()} orders</Badge>}
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
          <div className="p-6 text-center text-destructive">Failed to load sale orders.</div>
        ) : !data?.records.length ? (
          <div className="p-6 text-center text-muted-foreground">No sale orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Untaxed</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Lines</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.records.map((o) => (
                  <TableRow key={o.id} data-testid={`row-order-${o.id}`}>
                    <TableCell className="font-medium">{o.name}</TableCell>
                    <TableCell>{Array.isArray(o.partner_id) ? o.partner_id[1] : "-"}</TableCell>
                    <TableCell className="text-sm">{o.date_order ? new Date(o.date_order).toLocaleDateString() : "-"}</TableCell>
                    <TableCell>
                      <Badge variant={orderStateVariants[o.state] || "outline"}>
                        {orderStateLabels[o.state] || o.state}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">${o.amount_untaxed.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">${o.amount_tax.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">${o.amount_total.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{o.order_line?.length || 0}</TableCell>
                  </TableRow>
                ))}
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

function InvoicesTab() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [state, setState] = useState("all");
  const [paymentState, setPaymentState] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [jumpInput, setJumpInput] = useState("");

  useEffect(() => { setPage(1); }, [debouncedSearch, state, paymentState, dateFrom, dateTo, pageSize]);

  const offset = (page - 1) * pageSize;
  const queryParams = new URLSearchParams();
  queryParams.set("limit", String(pageSize));
  queryParams.set("offset", String(offset));
  if (debouncedSearch) queryParams.set("search", debouncedSearch);
  if (state !== "all") queryParams.set("state", state);
  if (paymentState !== "all") queryParams.set("paymentState", paymentState);
  if (dateFrom) queryParams.set("dateFrom", dateFrom);
  if (dateTo) queryParams.set("dateTo", dateTo);

  const { data, isLoading, error, isFetching } = useQuery<{ records: OdooInvoice[]; total: number }>({
    queryKey: ["/api/odoo/invoices", debouncedSearch, state, paymentState, dateFrom, dateTo, offset, pageSize],
    queryFn: async () => {
      const res = await fetch(`/api/odoo/invoices?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch invoices");
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
            {data && <Badge variant="secondary" data-testid="badge-invoices-count">{data.total.toLocaleString()} invoices</Badge>}
            {isFetching && !isLoading && <span className="text-xs text-muted-foreground">Loading...</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by invoice, customer, or source..." value={search}
              onChange={(e) => setSearch(e.target.value)} className="pl-9" data-testid="input-search-invoices" />
          </div>
          <Select value={state} onValueChange={setState}>
            <SelectTrigger className="w-[140px]" data-testid="select-invoice-state">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="posted">Posted</SelectItem>
              <SelectItem value="cancel">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={paymentState} onValueChange={setPaymentState}>
            <SelectTrigger className="w-[140px]" data-testid="select-payment-filter">
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="not_paid">Not Paid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="in_payment">In Payment</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="w-[150px]" data-testid="input-invoice-date-from" />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="w-[150px]" data-testid="input-invoice-date-to" />
          <PageSizeSelector pageSize={pageSize} setPageSize={setPageSize} />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? <LoadingSkeleton /> : error ? (
          <div className="p-6 text-center text-destructive">Failed to load invoices.</div>
        ) : !data?.records.length ? (
          <div className="p-6 text-center text-muted-foreground">No invoices found.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.records.map((inv) => (
                  <TableRow key={inv.id} data-testid={`row-invoice-${inv.id}`}>
                    <TableCell className="font-medium">{inv.name}</TableCell>
                    <TableCell>{Array.isArray(inv.partner_id) ? inv.partner_id[1] : "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{inv.invoice_origin || "-"}</TableCell>
                    <TableCell className="text-sm">{inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString() : "-"}</TableCell>
                    <TableCell className="text-sm">{inv.invoice_date_due ? new Date(inv.invoice_date_due).toLocaleDateString() : "-"}</TableCell>
                    <TableCell>
                      <Badge variant={invoiceStateVariants[inv.state] || "outline"}>
                        {invoiceStateLabels[inv.state] || inv.state}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={paymentVariants[inv.payment_state] || "outline"}>
                        {paymentLabels[inv.payment_state] || inv.payment_state}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">${inv.amount_total.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">
                      {inv.amount_residual > 0 ? (
                        <span className="text-destructive">${inv.amount_residual.toFixed(2)}</span>
                      ) : (
                        <span className="text-muted-foreground">$0.00</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
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

const steps = [
  { id: "customers", label: "Customers", icon: Users },
  { id: "orders", label: "Sale Orders", icon: ShoppingCart },
  { id: "invoices", label: "Invoices", icon: FileText },
] as const;

type StepId = typeof steps[number]["id"];

export default function SalesFlow() {
  const [activeTab, setActiveTab] = useState<StepId>("customers");

  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
        <ShoppingCart className="w-5 h-5" />
        <h1 className="text-xl font-semibold" data-testid="text-page-title">Sales Flow</h1>
      </div>

      <div className="flex items-center justify-center gap-1 py-2" data-testid="workflow-pipeline">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = step.id === activeTab;
          return (
            <div key={step.id} className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab(step.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
                  ${isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover-elevate"
                  }`}
                data-testid={`button-step-${step.id}`}
              >
                <Icon className="w-4 h-4" />
                {step.label}
              </button>
              {idx < steps.length - 1 && (
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as StepId)}>
        <TabsList className="sr-only">
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="orders">Sale Orders</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="customers">
          <CustomersTab />
        </TabsContent>
        <TabsContent value="orders">
          <SaleOrdersTab />
        </TabsContent>
        <TabsContent value="invoices">
          <InvoicesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
