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
  ArrowLeft, Receipt,
} from "lucide-react";

const BUCKET_LABELS: Record<string, string> = {
  "current": "Current (Not Overdue)",
  "1-30": "1-30 Days Overdue",
  "31-60": "31-60 Days Overdue",
  "60+": "60+ Days Overdue",
};

const BUCKET_COLORS: Record<string, string> = {
  "current": "bg-emerald-500",
  "1-30": "bg-amber-500",
  "31-60": "bg-orange-500",
  "60+": "bg-red-500",
};

const paymentLabels: Record<string, string> = {
  not_paid: "Not Paid",
  partial: "Partial",
  in_payment: "In Payment",
  reversed: "Reversed",
};

const paymentVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  not_paid: "destructive",
  partial: "secondary",
  in_payment: "secondary",
  reversed: "outline",
};

interface AgingInvoice {
  id: number;
  name: string;
  partner_name: string;
  partner_id: number | null;
  invoice_date: string | false;
  invoice_date_due: string | false;
  amount_total: number;
  amount_residual: number;
  payment_state: string;
  invoice_origin: string;
}

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
}

export default function AgingDetail({ bucket }: { bucket: string }) {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [jumpInput, setJumpInput] = useState("");

  useEffect(() => { setPage(1); }, [debouncedSearch, pageSize]);

  const offset = (page - 1) * pageSize;
  const queryParams = new URLSearchParams();
  queryParams.set("limit", String(pageSize));
  queryParams.set("offset", String(offset));
  if (debouncedSearch) queryParams.set("search", debouncedSearch);

  const { data, isLoading, error, isFetching } = useQuery<{ records: AgingInvoice[]; total: number }>({
    queryKey: ["/api/odoo/invoice-aging", bucket, debouncedSearch, offset, pageSize],
    queryFn: async () => {
      const res = await fetch(`/api/odoo/invoice-aging/${bucket}?${queryParams.toString()}`);
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

  const totalOutstanding = data?.records.reduce((sum, inv) => sum + inv.amount_residual, 0) || 0;

  const label = BUCKET_LABELS[bucket] || bucket;
  const barColor = BUCKET_COLORS[bucket] || "bg-muted";

  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
          data-testid="button-back-dashboard"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span
            className="cursor-pointer hover:underline"
            onClick={() => navigate("/")}
            data-testid="link-breadcrumb-dashboard"
          >
            Dashboard
          </span>
          <ChevronRight className="w-3 h-3" />
          <span className="font-medium text-foreground" data-testid="text-breadcrumb-current">
            {label}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Receipt className="w-5 h-5" />
        <h1 className="text-xl font-semibold" data-testid="text-page-title">{label}</h1>
        <div className={`w-3 h-3 rounded-full ${barColor}`} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              {data && (
                <>
                  <Badge variant="secondary" data-testid="badge-invoice-count">{data.total} invoices</Badge>
                  {isFetching && !isLoading && <span className="text-xs text-muted-foreground">Loading...</span>}
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by invoice, customer, or source..." value={search}
                onChange={(e) => setSearch(e.target.value)} className="pl-9" data-testid="input-search-invoices" />
            </div>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="w-[100px]" data-testid="select-page-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
                <SelectItem value="100">100 / page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center text-destructive" data-testid="text-error">
              Failed to load invoices.
            </div>
          ) : !data?.records.length ? (
            <div className="p-6 text-center text-muted-foreground" data-testid="text-empty">
              No invoices found in this aging bucket.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Source Order</TableHead>
                    <TableHead>Invoice Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.records.map((inv) => (
                    <TableRow key={inv.id} data-testid={`row-invoice-${inv.id}`}>
                      <TableCell className="font-medium text-sm">{inv.name}</TableCell>
                      <TableCell className="text-sm">{inv.partner_name || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{inv.invoice_origin || "-"}</TableCell>
                      <TableCell className="text-sm">
                        {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {inv.invoice_date_due ? new Date(inv.invoice_date_due as string).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={paymentVariants[inv.payment_state] || "outline"}>
                          {paymentLabels[inv.payment_state] || inv.payment_state}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm font-mono">{formatCurrency(inv.amount_total)}</TableCell>
                      <TableCell className="text-right text-sm font-mono font-semibold">{formatCurrency(inv.amount_residual)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {data && data.total > 0 && (
            <div className="flex items-center justify-between gap-2 p-3 border-t flex-wrap">
              <span className="text-sm text-muted-foreground" data-testid="text-page-info">
                {offset + 1}-{Math.min(offset + pageSize, data.total)} of {data.total}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
