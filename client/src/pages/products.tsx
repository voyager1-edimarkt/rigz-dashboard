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
  Package,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Hash,
  Tag,
  Calendar,
  DollarSign,
  MapPin,
  Building2,
  CheckCircle2,
  Clock,
  Barcode,
  Layers,
  Warehouse,
  TrendingUp,
  XCircle,
  BarChart3,
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";

interface ProductStats {
  total: number;
  activeCount: number;
  deletedCount: number;
  syncedCount: number;
  avgPrice: number;
  byVendor: { vendor: string | null; cnt: number }[];
  byLocation: { location: string | null; cnt: number }[];
}

interface ProductRow {
  sku: string;
  status: string;
  name: string | null;
  description: string | null;
  upc: string | null;
  basePrice: number | null;
  location: string | null;
  vendor: string | null;
  vendorCode: string | null;
  crmId: string | null;
  active: any;
  srp: number | null;
  createdAt: string;
  updatedAt: string;
  deleted: any;
  purchasePrice: number | null;
}

interface ProductsResponse {
  rows: ProductRow[];
  total: number;
}

function formatCurrency(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return "-";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function isActive(val: any): boolean {
  if (!val) return false;
  if (val === 1 || val === true) return true;
  if (val?.type === "Buffer" && val?.data?.[0] === 1) return true;
  return false;
}

function isDeleted(val: any): boolean {
  if (!val) return false;
  if (val === 1 || val === true) return true;
  if (val?.type === "Buffer" && val?.data?.[0] === 1) return true;
  return false;
}

function DetailRow({ icon: Icon, label, value, testId }: { icon: any; label: string; value: string | null | undefined; testId?: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
        <p className="text-sm mt-0.5 break-words" data-testid={testId}>{value || "-"}</p>
      </div>
    </div>
  );
}

function ProductDetailSheet({ product, open, onClose }: { product: ProductRow | null; open: boolean; onClose: () => void }) {
  if (!product) return null;

  const displayName = product.description || product.sku;
  const active = isActive(product.active);
  const deleted = isDeleted(product.deleted);
  const margin = (product.basePrice && product.purchasePrice && product.purchasePrice > 0)
    ? ((product.basePrice - product.purchasePrice) / product.purchasePrice * 100).toFixed(1)
    : null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-md" data-testid="sheet-product-detail">
        <SheetHeader className="pb-4">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-md bg-red-500/15 shrink-0">
              <Package className="w-6 h-6 text-red-600" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-lg leading-tight" data-testid="text-detail-product-name">{displayName}</SheetTitle>
              <p className="text-xs text-muted-foreground font-mono mt-1">SKU: {product.sku}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 flex-wrap">
            <Badge
              variant="secondary"
              className={`text-xs ${
                product.status === "SYNCED"
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                  : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
              }`}
              data-testid="badge-detail-status"
            >
              {product.status === "SYNCED" ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
              {product.status}
            </Badge>
            <Badge
              variant="outline"
              className={`text-xs ${active ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}
              data-testid="badge-detail-active"
            >
              {active ? "Active" : "Inactive"}
            </Badge>
            {deleted && (
              <Badge variant="outline" className="text-xs bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800" data-testid="badge-detail-deleted">
                Deleted
              </Badge>
            )}
          </div>
        </SheetHeader>

        <Separator />

        <div className="py-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-1 pt-2">Product Info</p>
          <DetailRow icon={Hash} label="SKU" value={product.sku} testId="text-detail-sku" />
          <DetailRow icon={Package} label="Description" value={product.description} testId="text-detail-description" />
          <DetailRow icon={Barcode} label="UPC" value={product.upc} testId="text-detail-upc" />
          <DetailRow icon={Hash} label="CRM ID" value={product.crmId} testId="text-detail-crm-id" />
        </div>

        <Separator />

        <div className="py-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-1 pt-2">Pricing</p>
          <DetailRow icon={DollarSign} label="Base Price" value={formatCurrency(product.basePrice)} testId="text-detail-base-price" />
          <DetailRow icon={DollarSign} label="Purchase Price" value={formatCurrency(product.purchasePrice)} testId="text-detail-purchase-price" />
          <DetailRow icon={DollarSign} label="SRP" value={product.srp ? formatCurrency(product.srp) : "-"} testId="text-detail-srp" />
          {margin && (
            <div className="mt-1 p-3 rounded-md bg-muted/50">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <p className="text-xs text-muted-foreground">Margin</p>
              </div>
              <p className="text-sm font-semibold mt-1" data-testid="text-detail-margin">{margin}%</p>
            </div>
          )}
        </div>

        <Separator />

        <div className="py-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-1 pt-2">Vendor & Location</p>
          <DetailRow icon={Building2} label="Vendor" value={product.vendor} testId="text-detail-vendor" />
          <DetailRow icon={Tag} label="Vendor Code" value={product.vendorCode} testId="text-detail-vendor-code" />
          <DetailRow icon={Warehouse} label="Location" value={product.location} testId="text-detail-location" />
        </div>

        <Separator />

        <div className="py-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-1 pt-2">Timestamps</p>
          <DetailRow icon={Calendar} label="Created" value={formatDateTime(product.createdAt)} testId="text-detail-created" />
          <DetailRow icon={Calendar} label="Last Updated" value={formatDateTime(product.updatedAt)} testId="text-detail-updated" />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent, testId }: { icon: any; label: string; value: string | number; sub?: string; accent: string; testId?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`flex items-center justify-center w-9 h-9 rounded-md ${accent} shrink-0`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold mt-0.5" data-testid={testId}>{typeof value === "number" ? value.toLocaleString() : value}</p>
            {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Products() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(null);
  const limit = 25;

  const { data: stats, isLoading: statsLoading } = useQuery<ProductStats>({
    queryKey: ["/api/products/stats"],
  });

  const queryParams = new URLSearchParams();
  queryParams.set("limit", String(limit));
  queryParams.set("offset", String(page * limit));
  if (search) queryParams.set("search", search);
  if (statusFilter) queryParams.set("status", statusFilter);
  if (vendorFilter) queryParams.set("vendor", vendorFilter);
  if (locationFilter) queryParams.set("location", locationFilter);
  if (activeFilter) queryParams.set("active", activeFilter);

  const productsUrl = `/api/products?${queryParams.toString()}`;

  const { data: products, isLoading: productsLoading } = useQuery<ProductsResponse>({
    queryKey: [productsUrl],
  });

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(0);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ predicate: (query) => {
      const key = query.queryKey[0];
      return typeof key === "string" && key.startsWith("/api/products");
    }});
  };

  const totalRows = products?.total ?? 0;
  const totalPages = Math.ceil(totalRows / limit);
  const inactiveCount = (stats?.total ?? 0) - (stats?.activeCount ?? 0);

  return (
    <div className="flex flex-col h-full gap-4 p-4 overflow-auto" data-testid="page-products">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-md bg-red-500/15">
            <Package className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold" data-testid="text-products-title">Products</h1>
            <p className="text-sm text-muted-foreground">Browse and manage all product records</p>
          </div>
        </div>
        <Button size="icon" variant="ghost" onClick={handleRefresh} data-testid="button-refresh-products">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {statsLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-14 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <StatCard icon={Package} label="Total Products" value={stats?.total ?? 0} accent="bg-red-500/15 text-red-700 dark:text-red-400" testId="text-stat-total" />
            <StatCard icon={CheckCircle2} label="Active" value={stats?.activeCount ?? 0} sub={`${inactiveCount} inactive`} accent="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" testId="text-stat-active" />
            <StatCard icon={Layers} label="Synced" value={stats?.syncedCount ?? 0} accent="bg-blue-500/15 text-blue-700 dark:text-blue-400" testId="text-stat-synced" />
            <StatCard icon={DollarSign} label="Avg Price" value={formatCurrency(stats?.avgPrice ?? 0)} accent="bg-violet-500/15 text-violet-700 dark:text-violet-400" testId="text-stat-avg-price" />
            <StatCard icon={XCircle} label="Deleted" value={stats?.deletedCount ?? 0} accent="bg-muted text-muted-foreground" testId="text-stat-deleted" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm">Top Vendors</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-3">
            {statsLoading ? (
              <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>
            ) : (
              <div className="space-y-1.5">
                {(stats?.byVendor || []).slice(0, 6).map((v, i) => {
                  const maxCnt = stats?.byVendor[0]?.cnt || 1;
                  return (
                    <div key={i} className="flex items-center gap-2" data-testid={`row-vendor-stat-${i}`}>
                      <p className="text-xs w-20 truncate text-muted-foreground font-mono">{v.vendor || "(none)"}</p>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-red-500/60" style={{ width: `${(v.cnt / maxCnt) * 100}%` }} />
                      </div>
                      <p className="text-xs font-medium w-10 text-right">{v.cnt}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm">By Warehouse</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-3">
            {statsLoading ? (
              <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
            ) : (
              <div className="space-y-1.5">
                {(stats?.byLocation || []).map((l, i) => {
                  const maxCnt = stats?.byLocation[0]?.cnt || 1;
                  return (
                    <div key={i} className="flex items-center gap-2" data-testid={`row-location-stat-${i}`}>
                      <p className="text-xs w-28 truncate text-muted-foreground">{l.location || "(none)"}</p>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500/60" style={{ width: `${(l.cnt / maxCnt) * 100}%` }} />
                      </div>
                      <p className="text-xs font-medium w-10 text-right">{l.cnt}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">All Products</CardTitle>
              <Badge variant="secondary" data-testid="badge-product-count">{totalRows.toLocaleString()}</Badge>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs text-muted-foreground px-2">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  data-testid="button-next-page"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0 flex-1 flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by SKU, description, UPC..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-8"
                data-testid="input-product-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setPage(0); }}>
              <SelectTrigger className="w-[120px]" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="SYNCED">Synced</SelectItem>
                <SelectItem value="TOSYNC">To Sync</SelectItem>
              </SelectContent>
            </Select>
            <Select value={activeFilter} onValueChange={(v) => { setActiveFilter(v === "all" ? "" : v); setPage(0); }}>
              <SelectTrigger className="w-[120px]" data-testid="select-active-filter">
                <SelectValue placeholder="Active" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="1">Active</SelectItem>
                <SelectItem value="0">Inactive</SelectItem>
              </SelectContent>
            </Select>
            {stats?.byVendor && stats.byVendor.length > 0 && (
              <Select value={vendorFilter} onValueChange={(v) => { setVendorFilter(v === "all" ? "" : v); setPage(0); }}>
                <SelectTrigger className="w-[140px]" data-testid="select-vendor-filter">
                  <SelectValue placeholder="Vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {stats.byVendor.filter(v => v.vendor).map((v) => (
                    <SelectItem key={v.vendor!} value={v.vendor!}>{v.vendor}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {stats?.byLocation && stats.byLocation.length > 0 && (
              <Select value={locationFilter} onValueChange={(v) => { setLocationFilter(v === "all" ? "" : v); setPage(0); }}>
                <SelectTrigger className="w-[160px]" data-testid="select-location-filter">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {stats.byLocation.filter(l => l.location).map((l) => (
                    <SelectItem key={l.location!} value={l.location!}>{l.location}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" size="sm" onClick={handleSearch} data-testid="button-search-products">
              <Search className="w-3.5 h-3.5 mr-1.5" />
              Search
            </Button>
          </div>

          <div className="flex-1 overflow-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px]">SKU</TableHead>
                  <TableHead className="min-w-[200px]">Description</TableHead>
                  <TableHead className="min-w-[80px]">Status</TableHead>
                  <TableHead className="min-w-[90px] text-right">Base Price</TableHead>
                  <TableHead className="min-w-[100px] text-right">Purchase Price</TableHead>
                  <TableHead className="min-w-[90px]">Vendor</TableHead>
                  <TableHead className="min-w-[120px]">Location</TableHead>
                  <TableHead className="min-w-[70px]">Active</TableHead>
                  <TableHead className="min-w-[100px]">UPC</TableHead>
                  <TableHead className="min-w-[90px]">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productsLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 10 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : products?.rows && products.rows.length > 0 ? (
                  products.rows.map((product, idx) => {
                    const active = isActive(product.active);
                    const deleted = isDeleted(product.deleted);
                    return (
                      <TableRow
                        key={product.sku}
                        className="cursor-pointer"
                        onClick={() => setSelectedProduct(product)}
                        data-testid={`row-product-${idx}`}
                      >
                        <TableCell className="font-mono text-xs font-medium" data-testid={`text-product-sku-${idx}`}>{product.sku}</TableCell>
                        <TableCell className="text-xs max-w-[250px]">
                          <p className="truncate" title={product.description || ""} data-testid={`text-product-desc-${idx}`}>{product.description || "-"}</p>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] ${
                              product.status === "SYNCED"
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                            }`}
                            data-testid={`badge-product-status-${idx}`}
                          >
                            {product.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-right font-medium" data-testid={`text-product-price-${idx}`}>{formatCurrency(product.basePrice)}</TableCell>
                        <TableCell className="text-xs text-right text-muted-foreground">{formatCurrency(product.purchasePrice)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{product.vendor || "-"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{product.location || "-"}</TableCell>
                        <TableCell>
                          {deleted ? (
                            <Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-700 dark:text-red-400">Del</Badge>
                          ) : active ? (
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                          ) : (
                            <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground/30" />
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{product.upc || "-"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(product.updatedAt)}</TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="w-8 h-8 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">No products found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ProductDetailSheet product={selectedProduct} open={!!selectedProduct} onClose={() => setSelectedProduct(null)} />
    </div>
  );
}
