import { useLocation } from "wouter";
import rigzLogo from "@assets/image_1771021143162.png";
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
} from "@/components/ui/sidebar";
import { LayoutDashboard, Users, ShoppingCart, Package, ClipboardList, Truck, Building2, Warehouse, AlertTriangle, Boxes, Globe } from "lucide-react";

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
          <SidebarGroupLabel>
            <Globe className="w-3.5 h-3.5 mr-1" />
            Odoo ERP
          </SidebarGroupLabel>
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
              <SidebarMenuItem>
                <SidebarMenuButton
                  className={location === "/odoo/sale-orders" ? "bg-sidebar-accent" : ""}
                  onClick={() => setLocation("/odoo/sale-orders")}
                  data-testid="button-odoo-sale-orders"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Sale Orders</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  className={location === "/odoo/purchase-orders" ? "bg-sidebar-accent" : ""}
                  onClick={() => setLocation("/odoo/purchase-orders")}
                  data-testid="button-odoo-purchase-orders"
                >
                  <ClipboardList className="w-4 h-4" />
                  <span>Purchase Orders</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  className={location === "/odoo/partners" ? "bg-sidebar-accent" : ""}
                  onClick={() => setLocation("/odoo/partners")}
                  data-testid="button-odoo-partners"
                >
                  <Users className="w-4 h-4" />
                  <span>Partners</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Legacy Data</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
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
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
