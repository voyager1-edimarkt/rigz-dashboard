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
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Users } from "lucide-react";

interface OdooPartner {
  id: number;
  name: string;
  email: string | false;
  phone: string | false;
  mobile: string | false;
  city: string | false;
  state_id: [number, string] | false;
  country_id: [number, string] | false;
  is_company: boolean;
  customer_rank: number;
  supplier_rank: number;
  active: boolean;
}

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function OdooCustomers() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [jumpInput, setJumpInput] = useState("");

  useEffect(() => { setPage(1); }, [debouncedSearch, pageSize]);

  const offset = (page - 1) * pageSize;

  const queryParams = new URLSearchParams();
  queryParams.set("limit", String(pageSize));
  queryParams.set("offset", String(offset));
  queryParams.set("type", "customer");
  if (debouncedSearch) queryParams.set("search", debouncedSearch);

  const { data, isLoading, error, isFetching } = useQuery<{ records: OdooPartner[]; total: number }>({
    queryKey: ["/api/odoo/partners", "customer", debouncedSearch, offset, pageSize],
    queryFn: async () => {
      const res = await fetch(`/api/odoo/partners?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch Odoo customers");
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
          <Users className="w-5 h-5" />
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Customers</h1>
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
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
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
              Failed to load customers from Odoo.
            </div>
          ) : !data?.records.length ? (
            <div className="p-6 text-center text-muted-foreground" data-testid="text-empty">
              No customers found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.records.map((p) => (
                    <TableRow key={p.id} data-testid={`row-customer-${p.id}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {p.name}
                          {p.is_company && (
                            <Badge variant="outline" className="text-xs">Company</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{p.email || "-"}</TableCell>
                      <TableCell className="text-sm">{p.phone || p.mobile || "-"}</TableCell>
                      <TableCell className="text-sm">{p.city || "-"}</TableCell>
                      <TableCell className="text-sm">
                        {Array.isArray(p.state_id) ? p.state_id[1] : "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {Array.isArray(p.country_id) ? p.country_id[1] : "-"}
                      </TableCell>
                      <TableCell>
                        {p.is_company ? (
                          <Badge variant="secondary">Company</Badge>
                        ) : (
                          <Badge variant="outline">Individual</Badge>
                        )}
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
