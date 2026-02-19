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
import {
  Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Package, Warehouse, Lock, CheckCircle2,
} from "lucide-react";

interface OdooProduct {
  id: number;
  name: string;
  default_code: string | false;
  description: string | false;
  list_price: number;
  standard_price: number;
  type: string;
  categ_id: [number, string] | false;
  active: boolean;
  create_date: string;
  write_date: string;
  qty_on_hand: number;
  reserved_qty: number;
  available_qty: number;
}

interface InventoryStats {
  totalProducts: number;
  totalOnHand: number;
  totalReserved: number;
  totalAvailable: number;
}

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function StatCard({ icon: Icon, label, value, accent }: {
  icon: any; label: string; value: string | number; accent: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`flex items-center justify-center w-9 h-9 rounded-md ${accent} shrink-0`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold mt-0.5">
              {typeof value === "number" ? value.toLocaleString() : value}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OdooProducts() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [activeFilter, setActiveFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [jumpInput, setJumpInput] = useState("");

  useEffect(() => { setPage(1); }, [debouncedSearch, activeFilter, pageSize]);

  const offset = (page - 1) * pageSize;

  const queryParams = new URLSearchParams();
  queryParams.set("limit", String(pageSize));
  queryParams.set("offset", String(offset));
  if (debouncedSearch) queryParams.set("search", debouncedSearch);
  if (activeFilter !== "all") queryParams.set("active", activeFilter);

  const { data: inventoryStats, isLoading: statsLoading } = useQuery<InventoryStats>({
    queryKey: ["/api/odoo/products/inventory-stats"],
    queryFn: async () => {
      const res = await fetch("/api/odoo/products/inventory-stats");
      if (!res.ok) throw new Error("Failed to fetch inventory stats");
      return res.json();
    },
  });

  const { data, isLoading, error, isFetching } = useQuery<{ records: OdooProduct[]; total: number }>({
    queryKey: ["/api/odoo/products", debouncedSearch, activeFilter, offset, pageSize],
    queryFn: async () => {
      const res = await fetch(`/api/odoo/products?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch Odoo products");
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
          <Package className="w-5 h-5" />
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Products</h1>
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-14 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <StatCard
              icon={Package}
              label="Total Products"
              value={inventoryStats?.totalProducts ?? 0}
              accent="bg-blue-500/15 text-blue-700 dark:text-blue-400"
            />
            <StatCard
              icon={Warehouse}
              label="On Hand Qty"
              value={inventoryStats?.totalOnHand ?? 0}
              accent="bg-violet-500/15 text-violet-700 dark:text-violet-400"
            />
            <StatCard
              icon={Lock}
              label="Reserved Qty"
              value={inventoryStats?.totalReserved ?? 0}
              accent="bg-amber-500/15 text-amber-700 dark:text-amber-400"
            />
            <StatCard
              icon={CheckCircle2}
              label="Available Qty"
              value={inventoryStats?.totalAvailable ?? 0}
              accent="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
            />
          </>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, SKU, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select value={activeFilter} onValueChange={setActiveFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-active-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Archived</SelectItem>
              </SelectContent>
            </Select>
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
              Failed to load products from Odoo. Please check the connection.
            </div>
          ) : !data?.records.length ? (
            <div className="p-6 text-center text-muted-foreground" data-testid="text-empty">
              No products found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Sale Price</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">On Hand</TableHead>
                    <TableHead className="text-right">Reserved</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.records.map((p) => (
                    <TableRow key={p.id} data-testid={`row-product-${p.id}`}>
                      <TableCell className="font-mono text-xs">
                        {p.default_code || "-"}
                      </TableCell>
                      <TableCell className="font-medium max-w-[250px] truncate">
                        {p.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {Array.isArray(p.categ_id) ? p.categ_id[1] : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${p.list_price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${p.standard_price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {p.qty_on_hand}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <span className={p.reserved_qty > 0 ? "text-amber-600 dark:text-amber-400" : ""}>
                          {p.reserved_qty}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <span className={
                          p.available_qty <= 0
                            ? "text-red-600 dark:text-red-400 font-semibold"
                            : p.available_qty < 10
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-emerald-600 dark:text-emerald-400"
                        }>
                          {p.available_qty}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {p.type === "consu" ? "consumable" : p.type === "service" ? "service" : p.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.active ? "default" : "secondary"}>
                          {p.active ? "Active" : "Archived"}
                        </Badge>
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
