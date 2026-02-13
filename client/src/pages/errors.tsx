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
  AlertTriangle,
  Search,
  RefreshCw,
  Hash,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  Radio,
  Navigation,
  MessageSquare,
  Tag,
  Building2,
  Copy,
  Check,
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";
import type { ErrorRow, ErrorListResult, ErrorStats } from "@shared/schema";

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

function CopyableContent({ label, content, icon: Icon }: { label: string; content: string | null; icon: any }) {
  const [copied, setCopied] = useState(false);

  if (!content) return <DetailRow icon={Icon} label={label} value="-" />;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  let displayContent = content;
  try {
    const parsed = JSON.parse(content);
    displayContent = JSON.stringify(parsed, null, 2);
  } catch {
    displayContent = content;
  }

  return (
    <div className="py-2.5">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted shrink-0">
            <Icon className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
        </div>
        <Button size="icon" variant="ghost" onClick={handleCopy} data-testid={`button-copy-${label.toLowerCase().replace(/\s+/g, '-')}`}>
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </Button>
      </div>
      <pre className="text-xs bg-muted/50 border rounded-md p-3 overflow-auto max-h-[300px] whitespace-pre-wrap break-words font-mono">
        {displayContent}
      </pre>
    </div>
  );
}

function ErrorDetailSheet({ error, open, onClose }: { error: ErrorRow | null; open: boolean; onClose: () => void }) {
  if (!error) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-lg" data-testid="sheet-error-detail">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-14 h-14 rounded-md bg-red-500/15">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-lg truncate" data-testid="text-detail-error-id">{error.id}</SheetTitle>
              <p className="text-xs text-muted-foreground">{formatDateTime(error.date)}</p>
            </div>
          </div>
        </SheetHeader>

        <Separator />

        <div className="py-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-1 pt-2">Error Info</p>
          <DetailRow icon={Hash} label="ID" value={error.id} testId="text-detail-id" />
          <DetailRow icon={Hash} label="Internal ID" value={String(error._id)} testId="text-detail-internal-id" />
          <DetailRow icon={Tag} label="Type" value={error.type} testId="text-detail-type" />
          <DetailRow icon={Radio} label="Channel" value={error.channelName} testId="text-detail-channel" />
          <DetailRow icon={Navigation} label="Destination" value={error.destination} testId="text-detail-destination" />
          <DetailRow icon={Building2} label="Vendor" value={error.vendor} testId="text-detail-vendor" />
          <DetailRow icon={Calendar} label="Date" value={formatDateTime(error.date)} testId="text-detail-date" />
        </div>

        <Separator />

        <div className="py-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-1 pt-2">Guide</p>
          <p className="text-sm text-muted-foreground break-words" data-testid="text-detail-guide">{error.guide || "-"}</p>
        </div>

        {error.statusMessage && (
          <>
            <Separator />
            <div className="py-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-1 pt-2">Status Message</p>
              <p className="text-sm break-words" data-testid="text-detail-status-message">{error.statusMessage}</p>
            </div>
          </>
        )}

        {error.detail && (
          <>
            <Separator />
            <CopyableContent label="Detail" content={error.detail} icon={FileText} />
          </>
        )}

        {error.message && (
          <>
            <Separator />
            <CopyableContent label="Message" content={error.message} icon={MessageSquare} />
          </>
        )}

        {error.response && (
          <>
            <Separator />
            <CopyableContent label="Response" content={error.response} icon={FileText} />
          </>
        )}

        <Separator />

        <div className="py-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-1 pt-2">Identifiers</p>
          <DetailRow icon={Hash} label="Message ID" value={error.messageId} testId="text-detail-message-id" />
          <DetailRow icon={Hash} label="Channel ID" value={error.channelId} testId="text-detail-channel-id" />
          <DetailRow icon={Hash} label="Destination ID" value={error.destinationId} testId="text-detail-destination-id" />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function getTypeBadgeStyle(type: string | null) {
  switch (type) {
    case "EDI":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800";
    case "JSON":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800";
    case "XML":
      return "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800";
    default:
      return "";
  }
}

export default function Errors() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [selectedError, setSelectedError] = useState<ErrorRow | null>(null);
  const limit = 25;

  const { data: stats, isLoading: statsLoading } = useQuery<ErrorStats>({
    queryKey: ["/api/errors/stats"],
  });

  const queryParams = new URLSearchParams();
  queryParams.set("limit", String(limit));
  queryParams.set("offset", String(page * limit));
  if (search) queryParams.set("search", search);
  if (typeFilter) queryParams.set("type", typeFilter);
  if (channelFilter) queryParams.set("channelName", channelFilter);

  const errorsUrl = `/api/errors?${queryParams.toString()}`;

  const { data: errors, isLoading: errorsLoading } = useQuery<ErrorListResult>({
    queryKey: [errorsUrl],
  });

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(0);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ predicate: (query) => {
      const key = query.queryKey[0];
      return typeof key === "string" && key.startsWith("/api/errors");
    }});
  };

  const totalRows = errors?.total ?? 0;
  const totalPages = Math.ceil(totalRows / limit);

  return (
    <div className="flex flex-col h-full gap-4 p-4 overflow-auto" data-testid="page-errors">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-md bg-red-500/15">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold" data-testid="text-errors-title">Errors</h1>
            <p className="text-sm text-muted-foreground">View and analyze error logs</p>
          </div>
        </div>
        <Button size="icon" variant="ghost" onClick={handleRefresh} data-testid="button-refresh-errors">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card data-testid="card-total-errors">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-md bg-red-500/15">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Errors</p>
                {statsLoading ? (
                  <Skeleton className="h-6 w-16 mt-0.5" />
                ) : (
                  <p className="text-lg font-bold" data-testid="text-total-errors">{stats?.total.toLocaleString()}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {stats?.byType.slice(0, 3).map((t) => (
          <Card key={t.type} data-testid={`card-type-${t.type}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-md bg-muted">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t.type}</p>
                  {statsLoading ? (
                    <Skeleton className="h-6 w-16 mt-0.5" />
                  ) : (
                    <p className="text-lg font-bold">{t.cnt.toLocaleString()}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">All Errors</CardTitle>
              <Badge variant="secondary" data-testid="badge-error-count">{totalRows.toLocaleString()}</Badge>
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
                placeholder="Search errors..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-8"
                data-testid="input-search"
              />
            </div>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v === "all" ? "" : v); setPage(0); }}>
              <SelectTrigger className="w-[120px]" data-testid="select-type-filter">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="EDI">EDI</SelectItem>
                <SelectItem value="JSON">JSON</SelectItem>
                <SelectItem value="XML">XML</SelectItem>
              </SelectContent>
            </Select>
            <Select value={channelFilter} onValueChange={(v) => { setChannelFilter(v === "all" ? "" : v); setPage(0); }}>
              <SelectTrigger className="w-[200px]" data-testid="select-channel-filter">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                {stats?.byChannel.map((c) => (
                  <SelectItem key={c.channelName} value={c.channelName}>{c.channelName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleSearch} data-testid="button-search">
              <Search className="w-3.5 h-3.5 mr-1.5" />
              Search
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 min-h-0 overflow-auto">
          {errorsLoading ? (
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
          ) : errors && errors.rows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead className="w-[70px]">Type</TableHead>
                  <TableHead className="min-w-[150px]">Channel</TableHead>
                  <TableHead className="min-w-[150px]">Destination</TableHead>
                  <TableHead className="min-w-[250px]">Guide</TableHead>
                  <TableHead className="w-[100px]">Vendor</TableHead>
                  <TableHead className="w-[130px]">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {errors.rows.map((row) => (
                  <TableRow
                    key={row._id}
                    className="cursor-pointer"
                    onClick={() => setSelectedError(row)}
                    data-testid={`row-error-${row._id}`}
                  >
                    <TableCell>
                      <span className="text-sm font-mono font-medium" data-testid={`text-id-${row._id}`}>
                        {row.id}
                      </span>
                    </TableCell>
                    <TableCell>
                      {row.type && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${getTypeBadgeStyle(row.type)}`}
                          data-testid={`badge-type-${row._id}`}
                        >
                          {row.type}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm truncate block max-w-[200px]" data-testid={`text-channel-${row._id}`}>
                        {row.channelName || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm truncate block max-w-[200px]" data-testid={`text-destination-${row._id}`}>
                        {row.destination || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground truncate block max-w-[350px]" data-testid={`text-guide-${row._id}`}>
                        {row.guide || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm" data-testid={`text-vendor-${row._id}`}>
                        {row.vendor || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground" data-testid={`text-date-${row._id}`}>
                        {formatDate(row.date)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertTriangle className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No errors found</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {search || typeFilter || channelFilter ? "Try adjusting your filters" : "No error records available"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <ErrorDetailSheet
        error={selectedError}
        open={!!selectedError}
        onClose={() => setSelectedError(null)}
      />
    </div>
  );
}
