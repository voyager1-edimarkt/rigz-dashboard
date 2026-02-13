import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Users,
  Building2,
  MapPin,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  CheckCircle2,
  Clock,
  Network,
  Hash,
  Tag,
  Calendar,
  Home,
  PhoneCall,
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";

interface CustomerStats {
  total: number;
  byStatus: { status: string; cnt: number }[];
  byState: { state: string; cnt: number }[];
  byCountry: { country: string; cnt: number }[];
  recent: { name: string; companyName: string; city: string; state: string; country: string; createdAt: string }[];
  parentAccounts: number;
}

interface CustomerRow {
  name: string;
  companyName: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  email: string | null;
  secondaryEmail: string | null;
  phone: string | null;
  officePhone: string | null;
  status: string;
  deleted: any;
  crmId: string | null;
  parent: string | null;
  priceLevel: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CustomersResponse {
  rows: CustomerRow[];
  total: number;
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const avatarColors = [
  "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  "bg-pink-500/15 text-pink-700 dark:text-pink-400",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function getDiceBearUrl(seed: string, size = 80): string {
  return `https://api.dicebear.com/9.x/open-peeps/svg?seed=${encodeURIComponent(seed)}&size=${size}`;
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

function CustomerDetailSheet({ customer, open, onClose }: { customer: CustomerRow | null; open: boolean; onClose: () => void }) {
  if (!customer) return null;

  const displayName = customer.companyName || customer.name;
  const fullAddress = [customer.address, customer.city, customer.state, customer.zip, customer.country]
    .filter(Boolean)
    .join(", ");
  const isDeleted = customer.deleted && (customer.deleted === 1 || (customer.deleted?.data && customer.deleted.data[0] === 1));

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-md" data-testid="sheet-customer-detail">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-14 h-14">
              <AvatarImage src={getDiceBearUrl(customer.name, 128)} alt={displayName} />
              <AvatarFallback className={`text-base font-semibold ${getAvatarColor(customer.name)}`}>
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-lg truncate" data-testid="text-detail-name">{displayName}</SheetTitle>
              <p className="text-xs text-muted-foreground font-mono">{customer.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 flex-wrap">
            <Badge
              variant={customer.status === "SYNCED" ? "secondary" : "outline"}
              className={`text-xs ${
                customer.status === "SYNCED"
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                  : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
              }`}
              data-testid="badge-detail-status"
            >
              {customer.status === "SYNCED" ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
              {customer.status}
            </Badge>
            {customer.priceLevel && (
              <Badge variant="outline" className="text-xs" data-testid="badge-detail-price-level">
                <Tag className="w-3 h-3 mr-1" />
                {customer.priceLevel}
              </Badge>
            )}
          </div>
        </SheetHeader>

        <Separator />

        <div className="py-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-1 pt-2">Company Info</p>
          <DetailRow icon={Building2} label="Company Name" value={customer.companyName} testId="text-detail-company" />
          <DetailRow icon={Hash} label="Customer ID" value={customer.name} testId="text-detail-id" />
          <DetailRow icon={Hash} label="CRM ID" value={customer.crmId} testId="text-detail-crm-id" />
          <DetailRow icon={Network} label="Parent Account" value={customer.parent} testId="text-detail-parent" />
          <DetailRow icon={Tag} label="Price Level" value={customer.priceLevel} testId="text-detail-price" />
          <div className="flex items-start gap-3 py-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted shrink-0 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Deleted</p>
              <div className="mt-0.5">
                {isDeleted ? (
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
          <DetailRow icon={Home} label="Street Address" value={customer.address} testId="text-detail-address" />
          <DetailRow icon={MapPin} label="City" value={customer.city} testId="text-detail-city" />
          <DetailRow icon={MapPin} label="State" value={customer.state} testId="text-detail-state" />
          <DetailRow icon={MapPin} label="Zip Code" value={customer.zip} testId="text-detail-zip" />
          <DetailRow icon={Globe} label="Country" value={customer.country} testId="text-detail-country" />
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
          <DetailRow icon={Mail} label="Email" value={customer.email} testId="text-detail-email" />
          <DetailRow icon={Mail} label="Secondary Email" value={customer.secondaryEmail} testId="text-detail-secondary-email" />
          <DetailRow icon={Phone} label="Phone" value={customer.phone} testId="text-detail-phone" />
          <DetailRow icon={PhoneCall} label="Office Phone" value={customer.officePhone} testId="text-detail-office-phone" />
        </div>

        <Separator />

        <div className="py-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-1 pt-2">Timestamps</p>
          <DetailRow icon={Calendar} label="Created" value={formatDate(customer.createdAt)} testId="text-detail-created" />
          <DetailRow icon={Calendar} label="Last Updated" value={formatDate(customer.updatedAt)} testId="text-detail-updated" />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function Customers() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null);
  const limit = 25;

  const { data: stats, isLoading: statsLoading } = useQuery<CustomerStats>({
    queryKey: ["/api/customers/stats"],
  });

  const queryParams = new URLSearchParams();
  queryParams.set("limit", String(limit));
  queryParams.set("offset", String(page * limit));
  if (search) queryParams.set("search", search);
  if (statusFilter) queryParams.set("status", statusFilter);
  if (stateFilter) queryParams.set("state", stateFilter);

  const customersUrl = `/api/customers?${queryParams.toString()}`;

  const { data: customers, isLoading: customersLoading } = useQuery<CustomersResponse>({
    queryKey: [customersUrl],
  });

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(0);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ predicate: (query) => {
      const key = query.queryKey[0];
      return typeof key === "string" && key.startsWith("/api/customers");
    }});
  };

  const totalRows = customers?.total ?? 0;
  const totalPages = Math.ceil(totalRows / limit);
  const syncedCount = stats?.byStatus.find((s) => s.status === "SYNCED")?.cnt ?? 0;
  const toSyncCount = stats?.byStatus.find((s) => s.status === "TOSYNC")?.cnt ?? 0;

  return (
    <div className="flex flex-col h-full gap-4 p-4 overflow-auto" data-testid="page-customers">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-md bg-blue-500/15">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold" data-testid="text-customers-title">Customers</h1>
            <p className="text-sm text-muted-foreground">Manage and view all customer accounts</p>
          </div>
        </div>
        <Button size="icon" variant="ghost" onClick={handleRefresh} data-testid="button-refresh-customers">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card data-testid="card-total-customers">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-md bg-blue-500/15">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Customers</p>
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
                  <p className="text-lg font-bold" data-testid="text-synced-count">{syncedCount.toLocaleString()}</p>
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
                <p className="text-xs text-muted-foreground">Pending Sync</p>
                {statsLoading ? (
                  <Skeleton className="h-6 w-16 mt-0.5" />
                ) : (
                  <p className="text-lg font-bold" data-testid="text-tosync-count">{toSyncCount.toLocaleString()}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-parent-accounts">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-md bg-violet-500/15">
                <Network className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Parent Accounts</p>
                {statsLoading ? (
                  <Skeleton className="h-6 w-16 mt-0.5" />
                ) : (
                  <p className="text-lg font-bold" data-testid="text-parent-count">{stats?.parentAccounts.toLocaleString()}</p>
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
              <CardTitle className="text-base">All Customers</CardTitle>
              <Badge variant="secondary" data-testid="badge-customer-count">{totalRows.toLocaleString()}</Badge>
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
            <Button variant="outline" onClick={handleSearch} data-testid="button-search">
              <Search className="w-3.5 h-3.5 mr-1.5" />
              Search
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 min-h-0 overflow-auto">
          {customersLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-full" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : customers && customers.rows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[250px]">Company</TableHead>
                  <TableHead className="min-w-[180px]">Location</TableHead>
                  <TableHead className="min-w-[180px]">Contact</TableHead>
                  <TableHead className="w-[90px]">Status</TableHead>
                  <TableHead className="w-[100px]">Parent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.rows.map((row) => (
                  <TableRow
                    key={row.name}
                    className="cursor-pointer"
                    onClick={() => setSelectedCustomer(row)}
                    data-testid={`row-customer-${row.name}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={getDiceBearUrl(row.name)} alt={row.companyName || row.name} />
                          <AvatarFallback className={`text-[10px] font-semibold ${getAvatarColor(row.name)}`}>
                            {getInitials(row.companyName || row.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" data-testid={`text-company-${row.name}`}>
                            {row.companyName || row.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{row.name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {row.city || row.state ? (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="text-sm truncate">
                            {[row.city, row.state].filter(Boolean).join(", ")}
                            {row.country ? ` (${row.country})` : ""}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        {row.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="text-xs truncate">{row.email}</span>
                          </div>
                        )}
                        {row.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="text-xs truncate">{row.phone}</span>
                          </div>
                        )}
                        {!row.email && !row.phone && (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </div>
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
                      {row.parent ? (
                        <span className="text-xs font-mono text-muted-foreground">{row.parent}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="w-10 h-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No customers found</p>
              {search && (
                <Button
                  variant="ghost"
                  className="mt-2"
                  onClick={() => { setSearch(""); setSearchInput(""); setPage(0); }}
                  data-testid="button-clear-search"
                >
                  Clear search
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <CustomerDetailSheet
        customer={selectedCustomer}
        open={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
      />
    </div>
  );
}
