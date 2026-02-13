import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import rigzLogo from "@assets/image_1771021143162.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Database, Table2, Eye, Terminal, LayoutDashboard, Users, ShoppingCart, Package, ClipboardList, Truck, Building2, Warehouse, AlertTriangle, RefreshCw, ChevronDown, Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { DatabaseInfo, TableInfo } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";

interface AppSidebarProps {
  selectedDatabase: string | null;
  selectedTable: string | null;
  onSelectDatabase: (db: string) => void;
  onSelectTable: (table: string) => void;
}

export function AppSidebar({
  selectedDatabase,
  selectedTable,
  onSelectDatabase,
  onSelectTable,
}: AppSidebarProps) {
  const [location, setLocation] = useLocation();
  const [openDbs, setOpenDbs] = useState<Record<string, boolean>>({});

  const { data: databases, isLoading: dbLoading } = useQuery<DatabaseInfo[]>({
    queryKey: ["/api/databases"],
  });

  const { data: tables, isLoading: tablesLoading } = useQuery<TableInfo[]>({
    queryKey: ["/api/databases", selectedDatabase, "tables"],
    enabled: !!selectedDatabase,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/databases"] });
    if (selectedDatabase) {
      queryClient.invalidateQueries({ queryKey: ["/api/databases", selectedDatabase, "tables"] });
    }
  };

  const handleDbClick = (dbName: string) => {
    onSelectDatabase(dbName);
    setOpenDbs((prev) => ({ ...prev, [dbName]: !prev[dbName] }));
  };

  const tableItems = tables || [];
  const realTables = tableItems.filter((t) => t.type === "TABLE");
  const views = tableItems.filter((t) => t.type === "VIEW");

  return (
    <Sidebar>
      <SidebarHeader className="p-3">
        <img src={rigzLogo} alt="RIGZ" className="h-8 w-auto" data-testid="img-logo" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className={location === "/" ? "bg-sidebar-accent" : ""}
                onClick={() => setLocation("/")}
                data-testid="button-dashboard"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                className={location === "/customers" ? "bg-sidebar-accent" : ""}
                onClick={() => setLocation("/customers")}
                data-testid="button-customers"
              >
                <Users className="w-4 h-4" />
                <span>Customers</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                className={location === "/orders" ? "bg-sidebar-accent" : ""}
                onClick={() => setLocation("/orders")}
                data-testid="button-orders"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Orders</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                className={location === "/products" ? "bg-sidebar-accent" : ""}
                onClick={() => setLocation("/products")}
                data-testid="button-products"
              >
                <Package className="w-4 h-4" />
                <span>Products</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                className={location === "/purchase-orders" ? "bg-sidebar-accent" : ""}
                onClick={() => setLocation("/purchase-orders")}
                data-testid="button-purchase-orders"
              >
                <ClipboardList className="w-4 h-4" />
                <span>Purchase Orders</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                className={location === "/errors" ? "bg-sidebar-accent" : ""}
                onClick={() => setLocation("/errors")}
                data-testid="button-errors"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Errors</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                className={location === "/suppliers" ? "bg-sidebar-accent" : ""}
                onClick={() => setLocation("/suppliers")}
                data-testid="button-suppliers"
              >
                <Truck className="w-4 h-4" />
                <span>Suppliers</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                className={location === "/vendors" ? "bg-sidebar-accent" : ""}
                onClick={() => setLocation("/vendors")}
                data-testid="button-vendors"
              >
                <Building2 className="w-4 h-4" />
                <span>Vendors</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                className={location === "/warehouses" ? "bg-sidebar-accent" : ""}
                onClick={() => setLocation("/warehouses")}
                data-testid="button-warehouses"
              >
                <Warehouse className="w-4 h-4" />
                <span>Warehouses</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                className={location === "/inventory" ? "bg-sidebar-accent" : ""}
                onClick={() => setLocation("/inventory")}
                data-testid="button-inventory"
              >
                <Boxes className="w-4 h-4" />
                <span>Inventory</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <div className="flex items-center justify-between gap-2 px-2">
            <SidebarGroupLabel>Databases</SidebarGroupLabel>
            <Button
              size="icon"
              variant="ghost"
              className="w-6 h-auto"
              onClick={handleRefresh}
              data-testid="button-refresh-databases"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {dbLoading ? (
                <div className="space-y-2 px-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-7 w-full" />
                  ))}
                </div>
              ) : databases && databases.length > 0 ? (
                databases.map((db) => (
                  <Collapsible
                    key={db.name}
                    open={openDbs[db.name] || selectedDatabase === db.name}
                    onOpenChange={() => handleDbClick(db.name)}
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          className={selectedDatabase === db.name ? "bg-sidebar-accent" : ""}
                          data-testid={`button-database-${db.name}`}
                        >
                          <Database className="w-4 h-4" />
                          <span className="truncate">{db.name}</span>
                          <ChevronDown className="w-3 h-3 ml-auto transition-transform duration-200" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                    </SidebarMenuItem>

                    <CollapsibleContent>
                      {selectedDatabase === db.name && tablesLoading ? (
                        <div className="pl-6 space-y-1.5 py-1">
                          {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-6 w-full" />
                          ))}
                        </div>
                      ) : selectedDatabase === db.name ? (
                        <div className="pl-4">
                          {realTables.length > 0 && (
                            <div className="py-1">
                              <span className="px-2 text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                                Tables ({realTables.length})
                              </span>
                              {realTables.map((table) => (
                                <SidebarMenuItem key={table.name}>
                                  <SidebarMenuButton
                                    className={selectedTable === table.name && location.startsWith("/table/") ? "bg-sidebar-accent" : ""}
                                    onClick={() => {
                                      onSelectTable(table.name);
                                      setLocation(`/table/${db.name}/${table.name}`);
                                    }}
                                    data-testid={`button-table-${table.name}`}
                                  >
                                    <Table2 className="w-3.5 h-3.5" />
                                    <span className="truncate text-sm">{table.name}</span>
                                    {table.rows !== undefined && (
                                      <Badge variant="secondary" className="ml-auto text-[10px]">
                                        {table.rows.toLocaleString()}
                                      </Badge>
                                    )}
                                  </SidebarMenuButton>
                                </SidebarMenuItem>
                              ))}
                            </div>
                          )}
                          {views.length > 0 && (
                            <div className="py-1">
                              <span className="px-2 text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                                Views ({views.length})
                              </span>
                              {views.map((view) => (
                                <SidebarMenuItem key={view.name}>
                                  <SidebarMenuButton
                                    className={selectedTable === view.name && location.startsWith("/table/") ? "bg-sidebar-accent" : ""}
                                    onClick={() => {
                                      onSelectTable(view.name);
                                      setLocation(`/table/${db.name}/${view.name}`);
                                    }}
                                    data-testid={`button-view-${view.name}`}
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span className="truncate text-sm">{view.name}</span>
                                  </SidebarMenuButton>
                                </SidebarMenuItem>
                              ))}
                            </div>
                          )}
                          {realTables.length === 0 && views.length === 0 && (
                            <p className="px-2 py-2 text-xs text-muted-foreground">No tables found</p>
                          )}
                        </div>
                      ) : null}
                    </CollapsibleContent>
                  </Collapsible>
                ))
              ) : (
                <p className="px-2 py-4 text-xs text-muted-foreground text-center">
                  No databases found
                </p>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <SidebarMenuButton
          className={location === "/query" ? "bg-sidebar-accent" : ""}
          onClick={() => setLocation("/query")}
          data-testid="button-query-runner"
        >
          <Terminal className="w-4 h-4" />
          <span>Query Runner</span>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}
