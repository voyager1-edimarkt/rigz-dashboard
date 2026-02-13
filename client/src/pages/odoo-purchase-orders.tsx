import { useState } from "react";
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
import { Search, ChevronLeft, ChevronRight, ClipboardList } from "lucide-react";

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

export default function OdooPurchaseOrders() {
  const [search, setSearch] = useState("");
  const [state, setState] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 25;

  const queryParams = new URLSearchParams();
  queryParams.set("limit", String(limit));
  queryParams.set("offset", String(offset));
  if (search) queryParams.set("search", search);
  if (state !== "all") queryParams.set("state", state);
  if (dateFrom) queryParams.set("dateFrom", dateFrom);
  if (dateTo) queryParams.set("dateTo", dateTo);

  const { data, isLoading, error } = useQuery<{ records: OdooPurchaseOrder[]; total: number }>({
    queryKey: ["/api/odoo/purchase-orders", search, state, dateFrom, dateTo, offset],
    queryFn: async () => {
      const res = await fetch(`/api/odoo/purchase-orders?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch Odoo purchase orders");
      return res.json();
    },
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 0;
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5" />
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Odoo Purchase Orders</h1>
          {data && (
            <Badge variant="secondary" data-testid="badge-total-count">
              {data.total} total
            </Badge>
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
                onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select value={state} onValueChange={(v) => { setState(v); setOffset(0); }}>
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
              onChange={(e) => { setDateFrom(e.target.value); setOffset(0); }}
              className="w-[150px]" data-testid="input-date-from" />
            <Input type="date" value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setOffset(0); }}
              className="w-[150px]" data-testid="input-date-to" />
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

          {data && data.total > limit && (
            <div className="flex items-center justify-between gap-2 p-3 border-t">
              <span className="text-sm text-muted-foreground">
                Showing {offset + 1}-{Math.min(offset + limit, data.total)} of {data.total}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - limit))} data-testid="button-prev-page">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm px-2">{currentPage} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={offset + limit >= data.total}
                  onClick={() => setOffset(offset + limit)} data-testid="button-next-page">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
