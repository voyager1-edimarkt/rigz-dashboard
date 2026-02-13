import { useState, useEffect, useCallback } from "react";
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
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Receipt } from "lucide-react";

interface OdooBill {
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

const stateLabels: Record<string, string> = {
  draft: "Draft",
  posted: "Posted",
  cancel: "Cancelled",
};

const stateVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
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

export default function OdooBills() {
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

  const { data, isLoading, error, isFetching } = useQuery<{ records: OdooBill[]; total: number }>({
    queryKey: ["/api/odoo/bills", debouncedSearch, state, paymentState, dateFrom, dateTo, offset, pageSize],
    queryFn: async () => {
      const res = await fetch(`/api/odoo/bills?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch Odoo bills");
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
    <div className="h-full overflow-auto p-4 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5" />
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Purchase Bills</h1>
          {data && (
            <Badge variant="secondary" data-testid="badge-total-count">
              {data.total.toLocaleString()} total
            </Badge>
          )}
          {isFetching && !isLoading && (
            <span className="text-xs text-muted-foreground">Loading...</span>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by bill, vendor, or source..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select value={state} onValueChange={setState}>
              <SelectTrigger className="w-[140px]" data-testid="select-state-filter">
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
            <Input type="date" value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[150px]" data-testid="input-date-from" />
            <Input type="date" value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[150px]" data-testid="input-date-to" />
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
              Failed to load bills from Odoo.
            </div>
          ) : !data?.records.length ? (
            <div className="p-6 text-center text-muted-foreground" data-testid="text-empty">
              No bills found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Bill Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.records.map((bill) => (
                    <TableRow key={bill.id} data-testid={`row-bill-${bill.id}`}>
                      <TableCell className="font-medium">{bill.name}</TableCell>
                      <TableCell>
                        {Array.isArray(bill.partner_id) ? bill.partner_id[1] : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {bill.ref || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {bill.invoice_origin || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {bill.invoice_date ? new Date(bill.invoice_date).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {bill.invoice_date_due ? new Date(bill.invoice_date_due).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={stateVariants[bill.state] || "outline"}>
                          {stateLabels[bill.state] || bill.state}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={paymentVariants[bill.payment_state] || "outline"}>
                          {paymentLabels[bill.payment_state] || bill.payment_state}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        ${bill.amount_total.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {bill.amount_residual > 0 ? (
                          <span className="text-destructive">${bill.amount_residual.toFixed(2)}</span>
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

          {data && data.total > 0 && (
            <div className="flex items-center justify-between gap-2 p-3 border-t flex-wrap">
              <span className="text-sm text-muted-foreground" data-testid="text-page-info">
                {offset + 1}-{Math.min(offset + pageSize, data.total)} of {data.total.toLocaleString()}
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
