import { useState, useEffect } from "react";
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
import OdooProducts from "@/pages/odoo-products";
import OdooVendors, { VendorDetailPage } from "@/pages/odoo-vendors";
import { Users } from "lucide-react";
import SalesFlow, { CustomersTab, CustomerDetailPage } from "@/pages/sales-flow";
import PurchaseFlow from "@/pages/purchase-flow";
import OdooOrderDetail from "@/pages/odoo-order-detail";
import OdooPODetail from "@/pages/odoo-po-detail";
import OdooBillDetail from "@/pages/odoo-bill-detail";
import AgingDetail from "@/pages/aging-detail";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";

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
                <div className="h-full overflow-auto p-4">
                  <Dashboard />
                </div>
              </Route>

              <Route path="/sales-flow/customers/:id">
                {(params: { id: string }) => (
                  <CustomerDetailPage customerId={Number(params.id)} />
                )}
              </Route>

              <Route path="/sales-flow/customers">
                <div className="h-full overflow-auto p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    <span className="text-xl font-semibold">Customers</span>
                  </div>
                  <CustomersTab />
                </div>
              </Route>

              <Route path="/sales-flow/orders/:id">
                {(params: { id: string }) => (
                  <OdooOrderDetail orderId={Number(params.id)} />
                )}
              </Route>

              <Route path="/sales-flow">
                <SalesFlow />
              </Route>

              <Route path="/odoo/vendors/:id">
                {(params: { id: string }) => (
                  <VendorDetailPage vendorId={Number(params.id)} />
                )}
              </Route>

              <Route path="/odoo/vendors">
                <OdooVendors />
              </Route>

              <Route path="/purchase-flow/orders/:id">
                {(params: { id: string }) => (
                  <OdooPODetail poId={Number(params.id)} />
                )}
              </Route>

              <Route path="/purchase-flow/bills/:id">
                {(params: { id: string }) => (
                  <OdooBillDetail billId={Number(params.id)} />
                )}
              </Route>

              <Route path="/purchase-flow">
                <PurchaseFlow />
              </Route>

              <Route path="/odoo/products">
                <OdooProducts />
              </Route>

              <Route path="/customers" component={Customers} />
              <Route path="/orders" component={Orders} />
              <Route path="/products" component={Products} />
              <Route path="/purchase-orders" component={PurchaseOrders} />

              <Route path="/purchase-orders/:id">
                {(params: { id: string }) => (
                  <PurchaseOrderDetailPage poId={Number(params.id)} />
                )}
              </Route>

              <Route path="/errors" component={Errors} />
              <Route path="/suppliers" component={Suppliers} />
              <Route path="/vendors" component={Vendors} />
              <Route path="/warehouses" component={Warehouses} />
              <Route path="/inventory" component={Inventory} />

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

              <Route path="/aging/:bucket">
                {(params: { bucket: string }) => (
                  <AgingDetail bucket={params.bucket} />
                )}
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
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => setAuthenticated(data.authenticated))
      .catch(() => setAuthenticated(false));
  }, []);

  if (authenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LoginPage onLogin={() => setAuthenticated(true)} />
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

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
