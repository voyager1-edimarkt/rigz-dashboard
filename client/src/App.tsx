import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";

import Dashboard from "@/pages/dashboard";
import Customers from "@/pages/customers";
import Orders, { OrderDetailPage } from "@/pages/orders";
import Products from "@/pages/products";
import PurchaseOrders, { PurchaseOrderDetailPage } from "@/pages/purchase-orders";
import Errors from "@/pages/errors";
import Suppliers from "@/pages/suppliers";
import Vendors from "@/pages/vendors";
import Warehouses from "@/pages/warehouses";
import Inventory from "@/pages/inventory";
import TableView from "@/pages/table-view";
import QueryRunner from "@/pages/query-runner";
import NotFound from "@/pages/not-found";

function AppContent() {
  const style = {
    "--sidebar-width": "17rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 p-2 border-b shrink-0">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
            </div>
          </header>
          <main className="flex-1 min-h-0 overflow-hidden">
            <Switch>
              <Route path="/">
                <Dashboard />
              </Route>
              <Route path="/customers">
                <Customers />
              </Route>
              <Route path="/orders">
                <Orders />
              </Route>
              <Route path="/products">
                <Products />
              </Route>
              <Route path="/purchase-orders">
                <PurchaseOrders />
              </Route>
              <Route path="/purchase-orders/:id">
                {(params: { id: string }) => (
                  <PurchaseOrderDetailPage poId={Number(params.id)} />
                )}
              </Route>
              <Route path="/errors">
                <Errors />
              </Route>
              <Route path="/suppliers">
                <Suppliers />
              </Route>
              <Route path="/vendors">
                <Vendors />
              </Route>
              <Route path="/warehouses">
                <Warehouses />
              </Route>
              <Route path="/inventory">
                <Inventory />
              </Route>
              <Route path="/orders/:id">
                {(params: { id: string }) => (
                  <OrderDetailPage orderId={Number(params.id)} />
                )}
              </Route>
              <Route path="/table/:database/:table">
                {(params: { database: string; table: string }) => (
                  <TableView database={params.database} table={params.table} />
                )}
              </Route>
              <Route path="/query">
                <QueryRunner database={null} />
              </Route>
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <AppContent />
          <Toaster />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
