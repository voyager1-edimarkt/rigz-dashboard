import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Warehouse,
  Building2,
  Hash,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";
import type { WarehouseRow, WarehouseListResult } from "@shared/schema";

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
  value: string | null | undefined;
  testId?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
          {label}
        </p>
        <p className="text-sm mt-0.5 break-words" data-testid={testId}>
          {value || "-"}
        </p>
      </div>
    </div>
  );
}

function WarehouseDetailSheet({
  warehouse,
  open,
  onClose,
}: {
  warehouse: WarehouseRow | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!warehouse) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        className="overflow-y-auto sm:max-w-md"
        data-testid="sheet-warehouse-detail"
      >
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-md bg-red-500/15">
              <Building2 className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle
                className="text-lg truncate"
                data-testid="text-detail-warehouse-name"
              >
                {warehouse.name}
              </SheetTitle>
            </div>
          </div>
        </SheetHeader>

        <Separator />

        <div className="py-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-1 pt-2">
            Warehouse Details
          </p>
          <DetailRow
            icon={Building2}
            label="Name"
            value={warehouse.name}
            testId="text-detail-name"
          />
          <DetailRow
            icon={Hash}
            label="CRM ID"
            value={warehouse.crmId}
            testId="text-detail-crm-id"
          />
          <DetailRow
            icon={Calendar}
            label="Created At"
            value={formatDate(warehouse.createdAt)}
            testId="text-detail-created"
          />
          <DetailRow
            icon={Calendar}
            label="Updated At"
            value={formatDate(warehouse.updatedAt)}
            testId="text-detail-updated"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function Warehouses() {
  const [selectedWarehouse, setSelectedWarehouse] =
    useState<WarehouseRow | null>(null);

  const { data, isLoading } = useQuery<WarehouseListResult>({
    queryKey: ["/api/warehouses"],
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/warehouses"] });
  };

  return (
    <div
      className="flex flex-col h-full gap-4 p-4 overflow-auto"
      data-testid="page-warehouses"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-md bg-red-500/15">
            <Warehouse className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h1
              className="text-xl font-semibold"
              data-testid="text-warehouses-title"
            >
              Warehouses
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage and view all warehouse locations
            </p>
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleRefresh}
          data-testid="button-refresh-warehouses"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <Card data-testid="card-total-warehouses">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-md bg-red-500/15">
              <Warehouse className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Warehouses</p>
              {isLoading ? (
                <Skeleton className="h-6 w-16 mt-0.5" />
              ) : (
                <p className="text-lg font-bold" data-testid="text-total-count">
                  {data?.total ?? 0}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-10 w-10 rounded-md" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data && data.rows.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.rows.map((warehouse) => (
            <Card
              key={warehouse.name}
              className="cursor-pointer hover-elevate"
              onClick={() => setSelectedWarehouse(warehouse)}
              data-testid={`card-warehouse-${warehouse.name}`}
            >
              <CardContent className="p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-md bg-red-500/15">
                    <Building2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3
                      className="text-lg font-semibold"
                      data-testid={`text-warehouse-name-${warehouse.name}`}
                    >
                      {warehouse.name}
                    </h3>
                  </div>
                  <Badge
                    variant="outline"
                    className="w-fit text-xs"
                    data-testid={`badge-crm-id-${warehouse.name}`}
                  >
                    <Hash className="w-3 h-3 mr-1" />
                    CRM ID: {warehouse.crmId}
                  </Badge>
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span data-testid={`text-created-${warehouse.name}`}>
                        Created: {formatDate(warehouse.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span data-testid={`text-updated-${warehouse.name}`}>
                        Updated: {formatDate(warehouse.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Warehouse className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No warehouses found
            </p>
          </CardContent>
        </Card>
      )}

      <WarehouseDetailSheet
        warehouse={selectedWarehouse}
        open={!!selectedWarehouse}
        onClose={() => setSelectedWarehouse(null)}
      />
    </div>
  );
}
