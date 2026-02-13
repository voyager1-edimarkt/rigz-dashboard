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
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ClipboardList } from "lucide-react";

interface OdooPurchaseOrder {
  id: number;
  name: string;
  partner_id: [number, string] | false;
  date_order: string;
  date_planned: string | false;
  state: string;
  amount_total: number;
  amount_untaxed: number;
  amount_tax: number;
  order_line: number[];
  currency_id: [number, string] | false;
  create_date: string;
  write_date: string;
}

const stateLabels: Record<string, string> = {
  draft: "RFQ",
  sent: "RFQ Sent",
  to_approve: "To Approve",
  purchase: "Purchase Order",
  done: "Locked",
  cancel: "Cancelled",
};

const stateVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  sent: "secondary",
  to_approve: "secondary",
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

export default function OdooPurchaseOrders() {
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

  const { data, isLoading, error, isFetching } = useQuery<{ records: OdooPurchaseOrder[]; total: number }>({
    queryKey: ["/api/odoo/purchase-orders", debouncedSearch, state, dateFrom, dateTo, offset, pageSize],
    queryFn: async () => {
      const res = await fetch(`/api/odoo/purchase-orders?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch Odoo purchase orders");
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
          <ClipboardList className="w-5 h-5" />
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Odoo Purchase Orders</h1>
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
                placeholder="Search by PO name or vendor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select value={state} onValueChange={setState}>
              <SelectTrigger className="w-[160px]" data-testid="select-state-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                <SelectItem value="draft">RFQ</SelectItem>
                <SelectItem value="sent">RFQ Sent</SelectItem>
                <SelectItem value="to_approve">To Approve</SelectItem>
                <SelectItem value="purchase">Purchase Order</SelectItem>
                <SelectItem value="done">Locked</SelectItem>
                <SelectItem value="cancel">Cancelled</SelectItem>
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
              Failed to load purchase orders from Odoo.
            </div>
          ) : !data?.records.length ? (
            <div className="p-6 text-center text-muted-foreground" data-testid="text-empty">
              No purchase orders found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Planned Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Untaxed</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Lines</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.records.map((po) => (
                    <TableRow key={po.id} data-testid={`row-po-${po.id}`}>
                      <TableCell className="font-medium">{po.name}</TableCell>
                      <TableCell>
                        {Array.isArray(po.partner_id) ? po.partner_id[1] : "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {po.date_order ? new Date(po.date_order).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {po.date_planned ? new Date(po.date_planned).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={stateVariants[po.state] || "outline"}>
                          {stateLabels[po.state] || po.state}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${po.amount_untaxed.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${po.amount_tax.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        ${po.amount_total.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {po.order_line?.length || 0}
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
