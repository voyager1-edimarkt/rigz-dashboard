import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Boxes,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Hash,
  Warehouse,
  Calendar,
  DollarSign,
  Package,
  AlertTriangle,
  Tag,
  Building2,
  BarChart3,
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";
import type { InventoryRow, InventoryListResult, InventoryStats } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell } from "recharts";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DetailRow({
  icon: Icon,
  label,
  value,
  testId,
}: {
  icon: any;
  label: string;
  value: string | number | null;
  testId: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-all" data-testid={testId}>
          {value ?? "-"}
        </p>
      </div>
    </div>
  );
}

function StockBadge({ available }: { available: number }) {
  if (available === 0) {
    return <Badge variant="destructive" className="text-[10px]">Out of Stock</Badge>;
  }
  if (available <= 5) {
    return <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600 dark:text-amber-400">Low Stock</Badge>;
  }
  return <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-600 dark:text-emerald-400">In Stock</Badge>;
}

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [stockLevel, setStockLevel] = useState("");
  const [page, setPage] = useState(0);
  const [selectedItem, setSelectedItem] = useState<InventoryRow | null>(null);
  const limit = 50;

  const { data: stats, isLoading: statsLoading } = useQuery<InventoryStats>({
    queryKey: ["/api/inventory/stats"],
  });

  const queryParams = new URLSearchParams();
  queryParams.set("limit", String(limit));
  queryParams.set("offset", String(page * limit));
  if (search) queryParams.set("search", search);
  if (warehouse) queryParams.set("warehouse", warehouse);
  if (stockLevel) queryParams.set("stockLevel", stockLevel);
  const inventoryUrl = `/api/inventory?${queryParams.toString()}`;

  const { data, isLoading } = useQuery<InventoryListResult>({
    queryKey: [inventoryUrl],
  });

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(0);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
    queryClient.invalidateQueries({ queryKey: ["/api/inventory/stats"] });
  };

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  const warehouseColors = ["hsl(0, 70%, 50%)", "hsl(30, 70%, 50%)", "hsl(200, 70%, 50%)"];

  return (
    <div className="h-full overflow-auto p-6" data-testid="page-inventory">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex items-center justify-center w-10 h-10 rounded-md bg-red-500/15">
          <Boxes className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-inventory-title">Inventory</h1>
          <p className="text-sm text-muted-foreground">Stock levels across warehouses</p>
        </div>
        <div className="ml-auto">
          <Button size="icon" variant="ghost" onClick={handleRefresh} data-testid="button-refresh-inventory">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <Card data-testid="card-total-skus">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-md bg-blue-500/15">
                    <Hash className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Unique SKUs</p>
                    <p className="text-lg font-bold">{stats?.totalSkus.toLocaleString() ?? 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-total-units">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-md bg-emerald-500/15">
                    <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Units</p>
                    <p className="text-lg font-bold">{stats?.totalUnits.toLocaleString() ?? 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-low-stock">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-md bg-amber-500/15">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Low Stock</p>
                    <p className="text-lg font-bold">{stats?.lowStockCount.toLocaleString() ?? 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-out-of-stock">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-md bg-red-500/15">
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Out of Stock</p>
                    <p className="text-lg font-bold">{stats?.outOfStockCount.toLocaleString() ?? 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {stats && stats.byWarehouse.length > 0 && (
        <Card className="mb-6" data-testid="card-warehouse-breakdown">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-sm">Units by Warehouse</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.byWarehouse} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} />
                  <YAxis type="category" dataKey="warehouse" width={90} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => [v.toLocaleString() + " units", "Stock"]} />
                  <Bar dataKey="units" radius={[0, 4, 4, 0]}>
                    {stats.byWarehouse.map((_, i) => (
                      <Cell key={i} fill={warehouseColors[i % warehouseColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card data-testid="card-inventory-table">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 flex-wrap">
          <CardTitle className="text-sm">Inventory Items</CardTitle>
          <Badge variant="outline">{data?.total.toLocaleString() ?? 0} items</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 p-4 border-b flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by SKU or product name..."
                className="pl-9"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                data-testid="input-search-inventory"
              />
            </div>
            <Select value={warehouse} onValueChange={(v) => { setWarehouse(v === "all" ? "" : v); setPage(0); }}>
              <SelectTrigger className="w-[160px]" data-testid="select-warehouse">
                <SelectValue placeholder="All Warehouses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Warehouses</SelectItem>
                {stats?.byWarehouse.map((w) => (
                  <SelectItem key={w.warehouse} value={w.warehouse}>{w.warehouse}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stockLevel} onValueChange={(v) => { setStockLevel(v === "all" ? "" : v); setPage(0); }}>
              <SelectTrigger className="w-[150px]" data-testid="select-stock-level">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="healthy">In Stock (&gt;5)</SelectItem>
                <SelectItem value="low">Low Stock (1-5)</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="default" onClick={handleSearch} data-testid="button-search-inventory">
              Search
            </Button>
          </div>

          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">SKU</TableHead>
                      <TableHead className="text-xs">Product</TableHead>
                      <TableHead className="text-xs">Warehouse</TableHead>
                      <TableHead className="text-xs">Vendor</TableHead>
                      <TableHead className="text-xs text-right">Available</TableHead>
                      <TableHead className="text-xs text-right">Price</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No inventory items found
                        </TableCell>
                      </TableRow>
                    ) : (
                      data?.rows.map((item, idx) => (
                        <TableRow
                          key={`${item.sku}-${item.warehouse}-${idx}`}
                          className="cursor-pointer"
                          onClick={() => setSelectedItem(item)}
                          data-testid={`row-inventory-${item.sku}-${item.warehouse}`}
                        >
                          <TableCell className="font-mono text-xs font-medium">{item.sku}</TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">{item.productName || "-"}</TableCell>
                          <TableCell className="text-xs">{item.warehouse}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{item.vendor || "-"}</TableCell>
                          <TableCell className="text-right font-medium text-sm">{item.available.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {item.basePrice != null ? `$${item.basePrice.toFixed(2)}` : "-"}
                          </TableCell>
                          <TableCell><StockBadge available={item.available} /></TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(item.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-2 p-4 border-t flex-wrap">
                  <p className="text-xs text-muted-foreground">
                    Showing {page * limit + 1}-{Math.min((page + 1) * limit, data?.total ?? 0)} of {data?.total.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      disabled={page === 0}
                      onClick={() => setPage(page - 1)}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-xs px-2">
                      {page + 1} / {totalPages}
                    </span>
                    <Button
                      size="icon"
                      variant="outline"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage(page + 1)}
                      data-testid="button-next-page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <SheetContent className="overflow-y-auto" data-testid="sheet-inventory-detail">
          {selectedItem && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Boxes className="w-5 h-5" />
                  {selectedItem.sku}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-1">
                {selectedItem.productName && (
                  <p className="text-sm font-medium mb-3">{selectedItem.productName}</p>
                )}
                <div className="mb-3">
                  <StockBadge available={selectedItem.available} />
                </div>
                <Separator className="my-3" />
                <DetailRow icon={Hash} label="SKU" value={selectedItem.sku} testId="detail-sku" />
                <DetailRow icon={Package} label="Available Units" value={selectedItem.available.toLocaleString()} testId="detail-available" />
                <DetailRow icon={Warehouse} label="Warehouse" value={selectedItem.warehouse} testId="detail-warehouse" />
                <DetailRow icon={Building2} label="Vendor" value={selectedItem.vendor} testId="detail-vendor" />
                <DetailRow icon={DollarSign} label="Base Price" value={selectedItem.basePrice != null ? `$${selectedItem.basePrice.toFixed(2)}` : null} testId="detail-price" />
                {selectedItem.basePrice != null && (
                  <DetailRow icon={DollarSign} label="Total Value" value={`$${(selectedItem.available * selectedItem.basePrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} testId="detail-total-value" />
                )}
                <Separator className="my-3" />
                <DetailRow icon={Calendar} label="Created" value={formatDate(selectedItem.createdAt)} testId="detail-created" />
                <DetailRow icon={Calendar} label="Last Updated" value={formatDate(selectedItem.updatedAt)} testId="detail-updated" />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
