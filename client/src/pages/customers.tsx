import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Globe,
  Network,
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
  phone: string | null;
  status: string;
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

export default function Customers() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card data-testid="card-top-states">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-sm">Top States</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {statsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-5 w-full" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {stats?.byState.slice(0, 8).map((s) => {
                  const pct = stats.total > 0 ? (s.cnt / stats.total) * 100 : 0;
                  return (
                    <div key={s.state} className="flex items-center gap-2" data-testid={`stat-state-${s.state}`}>
                      <span className="text-xs w-8 text-muted-foreground font-mono">{s.state}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500 dark:bg-blue-400 transition-all"
                          style={{ width: `${Math.max(pct, 1)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-10 text-right">{s.cnt.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-countries">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-sm">Countries</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {statsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-5 w-full" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {stats?.byCountry.map((c) => {
                  const pct = stats.total > 0 ? (c.cnt / stats.total) * 100 : 0;
                  return (
                    <div key={c.country} className="flex items-center gap-3" data-testid={`stat-country-${c.country}`}>
                      <span className="text-sm font-medium w-8">{c.country}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 dark:bg-emerald-400 transition-all"
                          style={{ width: `${Math.max(pct, 1)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-16 text-right">
                        {c.cnt.toLocaleString()} ({pct.toFixed(1)}%)
                      </span>
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
                  <TableRow key={row.name} data-testid={`row-customer-${row.name}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
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
    </div>
  );
}
