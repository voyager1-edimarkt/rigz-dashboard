import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Search, ChevronLeft, ChevronRight, Package } from "lucide-react";

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
  qty_available: number;
  virtual_available: number;
  create_date: string;
  write_date: string;
}

export default function OdooProducts() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [offset, setOffset] = useState(0);
  const limit = 25;

  const queryParams = new URLSearchParams();
  queryParams.set("limit", String(limit));
  queryParams.set("offset", String(offset));
  if (search) queryParams.set("search", search);
  if (activeFilter !== "all") queryParams.set("active", activeFilter);

  const { data, isLoading, error } = useQuery<{ records: OdooProduct[]; total: number }>({
    queryKey: ["/api/odoo/products", search, activeFilter, offset],
    queryFn: async () => {
      const res = await fetch(`/api/odoo/products?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch Odoo products");
      return res.json();
    },
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 0;
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Odoo Products</h1>
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
                placeholder="Search by name, SKU, or description..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select value={activeFilter} onValueChange={(v) => { setActiveFilter(v); setOffset(0); }}>
              <SelectTrigger className="w-[140px]" data-testid="select-active-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Archived</SelectItem>
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
                    <TableHead className="text-right">Forecast</TableHead>
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
                      <TableCell className="text-right">{p.qty_available}</TableCell>
                      <TableCell className="text-right">{p.virtual_available}</TableCell>
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

          {data && data.total > limit && (
            <div className="flex items-center justify-between gap-2 p-3 border-t">
              <span className="text-sm text-muted-foreground">
                Showing {offset + 1}-{Math.min(offset + limit, data.total)} of {data.total}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm px-2">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset + limit >= data.total}
                  onClick={() => setOffset(offset + limit)}
                  data-testid="button-next-page"
                >
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
