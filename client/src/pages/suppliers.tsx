import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
  Truck,
  Package,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Hash,
  Calendar,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Shield,
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";
import type { SupplierRow, SupplierListResult, SupplierStats } from "@shared/schema";

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

function SupplierDetailSheet({ supplier, open, onClose }: { supplier: SupplierRow | null; open: boolean; onClose: () => void }) {
  if (!supplier) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-md" data-testid="sheet-supplier-detail">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-14 h-14 rounded-md bg-red-500/15">
              <Truck className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-lg truncate" data-testid="text-detail-name">{supplier.name}</SheetTitle>
            </div>
          </div>
        </SheetHeader>

        <Separator />

        <div className="py-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-1 pt-2">Supplier Info</p>
          <DetailRow icon={Hash} label="Name" value={supplier.name} testId="text-detail-supplier-name" />
          <DetailRow icon={Hash} label="Current Index" value={String(supplier.currentIndex)} testId="text-detail-current-index" />
          <div className="flex items-start gap-3 py-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted shrink-0 mt-0.5">
              <Package className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Carrier Determination</p>
              <div className="mt-0.5">
                {supplier.useCarrierDetermination ? (
                  <Badge variant="outline" className="text-xs bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" data-testid="badge-detail-carrier-determination">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Enabled
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs" data-testid="badge-detail-carrier-determination">
                    <XCircle className="w-3 h-3 mr-1" />
                    Disabled
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <DetailRow icon={Truck} label="Favourite Carrier" value={supplier.favouriteCarrier} testId="text-detail-favourite-carrier" />
          <div className="flex items-start gap-3 py-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted shrink-0 mt-0.5">
              <Shield className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Address Validation</p>
              <div className="mt-0.5">
                {supplier.validateAddresses ? (
                  <Badge variant="outline" className="text-xs bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" data-testid="badge-detail-address-validation">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Enabled
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs" data-testid="badge-detail-address-validation">
                    <XCircle className="w-3 h-3 mr-1" />
                    Disabled
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="py-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-1 pt-2">Timestamps</p>
          <DetailRow icon={Calendar} label="Created At" value={formatDateTime(supplier.createdAt)} testId="text-detail-created" />
          <DetailRow icon={Calendar} label="Updated At" value={formatDateTime(supplier.updatedAt)} testId="text-detail-updated" />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function Suppliers() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierRow | null>(null);
  const limit = 25;

  const { data: stats, isLoading: statsLoading } = useQuery<SupplierStats>({
    queryKey: ["/api/suppliers/stats"],
  });

  const queryParams = new URLSearchParams();
  queryParams.set("limit", String(limit));
  queryParams.set("offset", String(page * limit));
  if (search) queryParams.set("search", search);

  const suppliersUrl = `/api/suppliers?${queryParams.toString()}`;

  const { data: suppliers, isLoading: suppliersLoading } = useQuery<SupplierListResult>({
    queryKey: [suppliersUrl],
  });

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(0);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ predicate: (query) => {
      const key = query.queryKey[0];
      return typeof key === "string" && key.startsWith("/api/suppliers");
    }});
  };

  const totalRows = suppliers?.total ?? 0;
  const totalPages = Math.ceil(totalRows / limit);

  return (
    <div className="flex flex-col h-full gap-4 p-4 overflow-auto" data-testid="page-suppliers">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-md bg-red-500/15">
            <Truck className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold" data-testid="text-suppliers-title">Suppliers</h1>
            <p className="text-sm text-muted-foreground">Manage and view all supplier accounts</p>
          </div>
        </div>
        <Button size="icon" variant="ghost" onClick={handleRefresh} data-testid="button-refresh-suppliers">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card data-testid="card-total-suppliers">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-md bg-red-500/15">
                <Truck className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Suppliers</p>
                {statsLoading ? (
                  <Skeleton className="h-6 w-16 mt-0.5" />
                ) : (
                  <p className="text-lg font-bold" data-testid="text-total-count">{stats?.total.toLocaleString()}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-carrier-determination">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-md bg-emerald-500/15">
                <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Carrier Determination</p>
                {statsLoading ? (
                  <Skeleton className="h-6 w-16 mt-0.5" />
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold" data-testid="text-carrier-determination-count">{stats?.withCarrierDetermination.toLocaleString()}</p>
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" data-testid="badge-carrier-determination">
                      Enabled
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-address-validation">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-md bg-violet-500/15">
                <MapPin className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Address Validation</p>
                {statsLoading ? (
                  <Skeleton className="h-6 w-16 mt-0.5" />
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold" data-testid="text-address-validation-count">{stats?.withAddressValidation.toLocaleString()}</p>
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" data-testid="badge-address-validation">
                      Enabled
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-index">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-md bg-amber-500/15">
                <Hash className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg PO Index</p>
                {statsLoading ? (
                  <Skeleton className="h-6 w-16 mt-0.5" />
                ) : (
                  <p className="text-lg font-bold" data-testid="text-avg-index">{stats?.avgIndex != null ? stats.avgIndex.toLocaleString(undefined, { maximumFractionDigits: 1 }) : "-"}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">All Suppliers</CardTitle>
              <Badge variant="secondary" data-testid="badge-supplier-count">{totalRows.toLocaleString()}</Badge>
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
          <div className="flex items-center gap-2 pt-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by supplier name..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-8"
                data-testid="input-search"
              />
            </div>
            <Button variant="outline" onClick={handleSearch} data-testid="button-search">
              <Search className="w-3.5 h-3.5 mr-1.5" />
              Search
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 min-h-0 overflow-auto">
          {suppliersLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : suppliers && suppliers.rows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Name</TableHead>
                  <TableHead className="w-[120px]">Current Index</TableHead>
                  <TableHead className="w-[160px]">Carrier Determination</TableHead>
                  <TableHead className="min-w-[150px]">Favourite Carrier</TableHead>
                  <TableHead className="w-[160px]">Address Validation</TableHead>
                  <TableHead className="w-[120px]">Created</TableHead>
                  <TableHead className="w-[120px]">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.rows.map((row) => (
                  <TableRow
                    key={row.name}
                    className="cursor-pointer"
                    onClick={() => setSelectedSupplier(row)}
                    data-testid={`row-supplier-${row.name}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-red-500/15 shrink-0">
                          <Truck className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                        </div>
                        <p className="text-sm font-medium truncate" data-testid={`text-name-${row.name}`}>
                          {row.name}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono" data-testid={`text-index-${row.name}`}>{row.currentIndex}</span>
                    </TableCell>
                    <TableCell>
                      {row.useCarrierDetermination ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                          data-testid={`badge-carrier-${row.name}`}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Yes
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px]"
                          data-testid={`badge-carrier-${row.name}`}
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          No
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm" data-testid={`text-favourite-carrier-${row.name}`}>
                        {row.favouriteCarrier || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {row.validateAddresses ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                          data-testid={`badge-validation-${row.name}`}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Yes
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px]"
                          data-testid={`badge-validation-${row.name}`}
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          No
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground" data-testid={`text-created-${row.name}`}>
                        {formatDate(row.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground" data-testid={`text-updated-${row.name}`}>
                        {formatDate(row.updatedAt)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Truck className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No suppliers found</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {search ? "Try adjusting your search criteria" : "No supplier records available"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <SupplierDetailSheet
        supplier={selectedSupplier}
        open={!!selectedSupplier}
        onClose={() => setSelectedSupplier(null)}
      />
    </div>
  );
}