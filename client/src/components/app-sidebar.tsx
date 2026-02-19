import { useLocation } from "wouter";
import rigzLogo from "@assets/Rigz.jpg";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Users, ShoppingCart, Package, ClipboardList, Truck, Building2, Warehouse, AlertTriangle, Boxes, LogOut } from "lucide-react";

export function AppSidebar() {
  const [location, setLocation] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-3 flex items-center justify-start">
        <img src={rigzLogo} alt="RIGZ" className="h-6 w-auto object-contain" data-testid="img-logo" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  className={location === "/" ? "bg-sidebar-accent" : ""}
                  onClick={() => setLocation("/")}
                  data-testid="button-dashboard"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Overview</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Sales Flow</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  className={location === "/sales-flow/customers" ? "bg-sidebar-accent" : ""}
                  onClick={() => setLocation("/sales-flow/customers")}
                  data-testid="button-sales-customers"
                >
                  <Users className="w-4 h-4" />
                  <span>Customers</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  className={location === "/sales-flow" || location.startsWith("/sales-flow/orders") ? "bg-sidebar-accent" : ""}
                  onClick={() => setLocation("/sales-flow")}
                  data-testid="button-sales-flow"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Orders & Invoices</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Purchase Flow</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  className={location === "/odoo/vendors" ? "bg-sidebar-accent" : ""}
                  onClick={() => setLocation("/odoo/vendors")}
                  data-testid="button-odoo-vendors"
                >
                  <Truck className="w-4 h-4" />
                  <span>Vendors</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  className={location === "/purchase-flow" || location.startsWith("/purchase-flow/") ? "bg-sidebar-accent" : ""}
                  onClick={() => setLocation("/purchase-flow")}
                  data-testid="button-purchase-flow"
                >
                  <ClipboardList className="w-4 h-4" />
                  <span>POs & Bills</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Products</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  className={location === "/odoo/products" ? "bg-sidebar-accent" : ""}
                  onClick={() => setLocation("/odoo/products")}
                  data-testid="button-odoo-products"
                >
                  <Package className="w-4 h-4" />
                  <span>Products</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 space-y-2">
        <button
          onClick={async () => {
            await fetch("/api/logout", { method: "POST", credentials: "include" });
            window.location.href = "/";
          }}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-md transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out</span>
        </button>
        <p className="text-[10px] text-muted-foreground text-center">
          Powered By EDIMarkt Technologies
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
