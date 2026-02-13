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
  Building2,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  CheckCircle2,
  Clock,
  Hash,
  Calendar,
  Home,
  MapPin,
  Globe,
  PhoneCall,
  Users,
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";
import type { VendorRow, VendorListResult, VendorStats } from "@shared/schema";

function isDeleted(deleted: any): boolean {
  if (!deleted) return false;
  if (typeof deleted === "object" && deleted.type === "Buffer" && Array.isArray(deleted.data)) {
    return deleted.data[0] === 1;
  }
  return Boolean(deleted);
}

function formatDate(dateStr: string | null): string {
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

function VendorDetailSheet({ vendor, open, onClose }: { vendor: VendorRow | null; open: boolean; onClose: () => void }) {
  if (!vendor) return null;

  const displayName = vendor.companyName || vendor.name;
  const fullAddress = [vendor.address, vendor.city, vendor.state, vendor.zip, vendor.country]
    .filter(Boolean)
    .join(", ");
  const deleted = isDeleted(vendor.deleted);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-md" data-testid="sheet-vendor-detail">
        <SheetHeader className="pb-4">
          <div className="min-w-0 flex-1">
            <SheetTitle className="text-lg truncate" data-testid="text-detail-name">{displayName}</SheetTitle>
            <p className="text-xs text-muted-foreground font-mono">{vendor.name}</p>
          </div>
          <div className="flex items-center gap-2 pt-2 flex-wrap">
            <Badge
              variant={vendor.status === "SYNCED" ? "secondary" : "outline"}
              className={`text-xs ${
                vendor.status === "SYNCED"
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                  : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
              }`}
              data-testid="badge-detail-status"
            >
              {vendor.status === "SYNCED" ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
              {vendor.status}
            </Badge>
          </div>
        </SheetHeader>

        <Separator />

        <div className="py-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-1 pt-2">Company Info</p>
          <DetailRow icon={Building2} label="Name" value={vendor.name} testId="text-detail-id" />
          <DetailRow icon={Building2} label="Company Name" value={vendor.companyName} testId="text-detail-company" />
          <DetailRow icon={Hash} label="CRM ID" value={vendor.crmId} testId="text-detail-crm-id" />
          <div className="flex items-start gap-3 py-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted shrink-0 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Deleted</p>
              <div className="mt-0.5">
                {deleted ? (
                  <Badge variant="outline" className="text-xs bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800" data-testid="badge-detail-deleted">
                    Yes
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs" data-testid="badge-detail-deleted">
                    No
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="py-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-1 pt-2">Address</p>
          <DetailRow icon={Home} label="Street Address" value={vendor.address} testId="text-detail-address" />
          <DetailRow icon={MapPin} label="City" value={vendor.city} testId="text-detail-city" />
          <DetailRow icon={MapPin} label="State" value={vendor.state} testId="text-detail-state" />
          <DetailRow icon={MapPin} label="Zip Code" value={vendor.zip} testId="text-detail-zip" />
          <DetailRow icon={Globe} label="Country" value={vendor.country} testId="text-detail-country" />
          {fullAddress && (
            <div className="mt-1 p-3 rounded-md bg-muted/50">
              <p className="text-xs text-muted-foreground">Full Address</p>
              <p className="text-sm mt-1" data-testid="text-detail-full-address">{fullAddress}</p>
            </div>
          )}
        </div>

        <Separator />

        <div className="py-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-1 pt-2">Contact</p>
          <DetailRow icon={Mail} label="Email" value={vendor.email} testId="text-detail-email" />
          <DetailRow icon={Mail} label="Secondary Email" value={vendor.secondaryEmail} testId="text-detail-secondary-email" />
          <DetailRow icon={Phone} label="Phone" value={vendor.phone} testId="text-detail-phone" />
          <DetailRow icon={PhoneCall} label="Office Phone" value={vendor.officePhone} testId="text-detail-office-phone" />
        </div>

        <Separator />

        <div className="py-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-1 pt-2">Timestamps</p>
          <DetailRow icon={Calendar} label="Created" value={formatDate(vendor.createdAt)} testId="text-detail-created" />
          <DetailRow icon={Calendar} label="Last Updated" value={formatDate(vendor.updatedAt)} testId="text-detail-updated" />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function Vendors() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<VendorRow | null>(null);
  const limit = 25;

  const { data: stats, isLoading: statsLoading } = useQuery<VendorStats>({
    queryKey: ["/api/vendors/stats"],
  });

  const queryParams = new URLSearchParams();
  queryParams.set("limit", String(limit));
  queryParams.set("offset", String(page * limit));
  if (search) queryParams.set("search", search);
  if (statusFilter) queryParams.set("status", statusFilter);
  if (stateFilter) queryParams.set("state", stateFilter);
  if (dateFrom) queryParams.set("dateFrom", dateFrom);
  if (dateTo) queryParams.set("dateTo", dateTo);

  const vendorsUrl = `/api/vendors?${queryParams.toString()}`;

  const { data: vendors, isLoading: vendorsLoading } = useQuery<VendorListResult>({
    queryKey: [vendorsUrl],
  });

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(0);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ predicate: (query) => {
      const key = query.queryKey[0];
      return typeof key === "string" && key.startsWith("/api/vendors");
    }});
  };

  const totalRows = vendors?.total ?? 0;
  const totalPages = Math.ceil(totalRows / limit);
  const contactCount = Math.max(stats?.withEmail ?? 0, stats?.withPhone ?? 0);

  return (
    <div className="flex flex-col h-full gap-4 p-4 overflow-auto" data-testid="page-vendors">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-md bg-red-500/15">
            <Building2 className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold" data-testid="text-vendors-title">Vendors</h1>
            <p className="text-sm text-muted-foreground">Manage and view all vendor accounts</p>
          </div>
        </div>
        <Button size="icon" variant="ghost" onClick={handleRefresh} data-testid="button-refresh-vendors">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card data-testid="card-total-vendors">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-md bg-red-500/15">
                <Building2 className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Vendors</p>
                {statsLoading ? (
                  <Skeleton className="h-6 w-16 mt-0.5" />
                ) : (
                  <p className="text-lg font-bold" data-testid="text-total-count">{stats?.total.toLocaleString()}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-synced">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-md bg-emerald-500/15">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Synced</p>
                {statsLoading ? (
                  <Skeleton className="h-6 w-16 mt-0.5" />
                ) : (
                  <p className="text-lg font-bold" data-testid="text-synced-count">{stats?.syncedCount.toLocaleString()}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-tosync">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-md bg-amber-500/15">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">To Sync</p>
                {statsLoading ? (
                  <Skeleton className="h-6 w-16 mt-0.5" />
                ) : (
                  <p className="text-lg font-bold" data-testid="text-tosync-count">{stats?.toSyncCount.toLocaleString()}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-contact-info">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-md bg-violet-500/15">
                <Users className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">With Contact Info</p>
                {statsLoading ? (
                  <Skeleton className="h-6 w-16 mt-0.5" />
                ) : (
                  <p className="text-lg font-bold" data-testid="text-contact-count">{contactCount.toLocaleString()}</p>
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
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">All Vendors</CardTitle>
              <Badge variant="secondary" data-testid="badge-vendor-count">{totalRows.toLocaleString()}</Badge>
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
                placeholder="Search by name, company, city, or email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-8"
                data-testid="input-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setPage(0); }}>
              <SelectTrigger className="w-[130px]" data-testid="select-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="SYNCED">Synced</SelectItem>
                <SelectItem value="TOSYNC">To Sync</SelectItem>
              </SelectContent>
            </Select>
            <Select value={stateFilter} onValueChange={(v) => { setStateFilter(v === "all" ? "" : v); setPage(0); }}>
              <SelectTrigger className="w-[130px]" data-testid="select-state">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {stats?.byState
                  ?.filter((s) => s.state)
                  .map((s) => (
                    <SelectItem key={s.state!} value={s.state!}>
                      {s.state} ({s.cnt})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
              className="w-[140px]"
              data-testid="input-date-from"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
              className="w-[140px]"
              data-testid="input-date-to"
            />
            <Button variant="outline" onClick={handleSearch} data-testid="button-search">
              <Search className="w-3.5 h-3.5 mr-1.5" />
              Search
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 min-h-0 overflow-auto">
          {vendorsLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-md" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : vendors && vendors.rows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Name</TableHead>
                  <TableHead className="min-w-[180px]">Company Name</TableHead>
                  <TableHead className="w-[90px]">Status</TableHead>
                  <TableHead className="w-[120px]">CRM ID</TableHead>
                  <TableHead className="w-[100px]">City</TableHead>
                  <TableHead className="w-[80px]">State</TableHead>
                  <TableHead className="min-w-[180px]">Email</TableHead>
                  <TableHead className="w-[120px]">Phone</TableHead>
                  <TableHead className="w-[120px]">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.rows.map((row) => (
                  <TableRow
                    key={row.name}
                    className="cursor-pointer"
                    onClick={() => setSelectedVendor(row)}
                    data-testid={`row-vendor-${row.name}`}
                  >
                    <TableCell>
                      <p className="text-sm font-medium truncate" data-testid={`text-name-${row.name}`}>
                        {row.name}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm truncate" data-testid={`text-company-${row.name}`}>
                        {row.companyName || "-"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={row.status === "SYNCED" ? "secondary" : "outline"}
                        className={`text-[10px] ${
                          row.status === "SYNCED"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                        }`}
                        data-testid={`badge-status-${row.name}`}
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground font-mono truncate">{row.crmId || "-"}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm truncate">{row.city || "-"}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm truncate">{row.state || "-"}</span>
                    </TableCell>
                    <TableCell>
                      {row.email ? (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="text-xs truncate">{row.email}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.phone ? (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="text-xs truncate">{row.phone}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(row.createdAt).split(",")[0]}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Building2 className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No vendors found</p>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters</p>
            </div>
          )}
        </CardContent>
      </Card>

      <VendorDetailSheet
        vendor={selectedVendor}
        open={selectedVendor !== null}
        onClose={() => setSelectedVendor(null)}
      />
    </div>
  );
}