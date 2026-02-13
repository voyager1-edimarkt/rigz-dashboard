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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ShoppingCart,
  Package,
  FileText,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Hash,
  Calendar,
  Truck,
  MapPin,
  DollarSign,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Send,
  Receipt,
  ClipboardList,
  User,
  Building2,
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";

interface OrderRow {
  id: number;
  index: number;
  orderNumber: string;
  vendor: string;
  country: string;
  orderDate: string;
  crmId: string;
  status: string;
  statusMessage: string | null;
  channel: string | null;
  test: any;
  createdAt: string;
  updatedAt: string;
  purchaseOrderNumber: string | null;
}

interface OrdersResponse {
  rows: OrderRow[];
  total: number;
}

interface OrderStats {
  total: number;
  byStatus: { status: string; cnt: number }[];
  recentByDay: { day: string; cnt: number }[];
}

interface OrderDetail extends OrderRow {
  content: string;
  poContent: string;
  invoiceContent: string;
}

const STATUS_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  PO_RECEIVED: { icon: ClipboardList, color: "bg-blue-500/15 text-blue-700 border-blue-200", label: "PO Received" },
  PO_SENT: { icon: Send, color: "bg-indigo-500/15 text-indigo-700 border-indigo-200", label: "PO Sent" },
  INVOICE_SENT: { icon: FileText, color: "bg-violet-500/15 text-violet-700 border-violet-200", label: "Invoice Sent" },
  INVOICE_RECEIPT: { icon: Receipt, color: "bg-emerald-500/15 text-emerald-700 border-emerald-200", label: "Invoice Receipt" },
  FULFILLMENT_READY: { icon: Truck, color: "bg-cyan-500/15 text-cyan-700 border-cyan-200", label: "Fulfillment Ready" },
  CANCELLED: { icon: XCircle, color: "bg-red-500/15 text-red-700 border-red-200", label: "Cancelled" },
  INVOICE_RECEIVED: { icon: CheckCircle2, color: "bg-teal-500/15 text-teal-700 border-teal-200", label: "Invoice Received" },
  BILL_SENT: { icon: Send, color: "bg-orange-500/15 text-orange-700 border-orange-200", label: "Bill Sent" },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || { icon: AlertCircle, color: "bg-gray-500/15 text-gray-700 border-gray-200", label: status };
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatCurrency(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null || amount === "") return "-";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "-";
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function safeParseJson(str: string | null | undefined): any {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function InfoCard({ icon: Icon, label, value, accent, testId }: { icon: any; label: string; value: string | null | undefined; accent?: string; testId?: string }) {
  const bg = accent || "bg-muted/60";
  const iconColor = accent ? accent.replace("bg-", "text-").replace("/10", "") : "text-muted-foreground";
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
      <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${bg} shrink-0`}>
        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">{label}</p>
        <p className="text-sm font-medium mt-0.5 break-words" data-testid={testId}>{value || "-"}</p>
      </div>
    </div>
  );
}

function StatMini({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className={`flex flex-col items-center gap-1 p-3 rounded-lg border border-border/50 ${color}`}>
      <Icon className="w-4 h-4" />
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
    </div>
  );
}

function LineItemsTable({ items }: { items: any[] }) {
  if (!items || items.length === 0) return null;

  const grandTotal = items.reduce((sum, item) => {
    const qty = item.quantity || item.qty || 0;
    const price = item.unitPrice || item.price || 0;
    return sum + qty * price;
  }, 0);

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="text-[10px] font-bold uppercase tracking-wider">SKU</TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-wider">Description</TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Qty</TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Price</TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item: any, i: number) => {
            const sku = item.number || item.sku || item.itemCode || "-";
            const desc = item.description || "-";
            const qty = item.quantity || item.qty || 0;
            const price = item.unitPrice || item.price || 0;
            const total = qty * price;
            return (
              <TableRow key={i} className="hover:bg-muted/20" data-testid={`row-line-item-${i}`}>
                <TableCell className="text-xs font-mono text-blue-600">{sku}</TableCell>
                <TableCell className="text-xs max-w-[220px] truncate">{desc}</TableCell>
                <TableCell className="text-xs text-right tabular-nums">{qty}</TableCell>
                <TableCell className="text-xs text-right tabular-nums text-muted-foreground">{formatCurrency(price)}</TableCell>
                <TableCell className="text-xs text-right tabular-nums font-semibold">{formatCurrency(total)}</TableCell>
              </TableRow>
            );
          })}
          <TableRow className="bg-muted/30 border-t-2">
            <TableCell colSpan={4} className="text-xs font-bold text-right uppercase tracking-wider">Grand Total</TableCell>
            <TableCell className="text-sm text-right font-bold tabular-nums text-blue-600">{formatCurrency(grandTotal)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

interface TabDef {
  id: string;
  label: string;
  icon: any;
  color: string;
}

function CapsuleTabs({ tabs, active, onChange }: { tabs: TabDef[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all ${
              isActive
                ? `${tab.color} shadow-sm ring-1 ring-inset ring-black/5`
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
            data-testid={`tab-${tab.id}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function OrderDetailModal({ orderId, open, onClose }: { orderId: number | null; open: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState("order");

  const { data: order, isLoading } = useQuery<OrderDetail>({
    queryKey: [`/api/orders/${orderId}`],
    enabled: !!orderId && open,
  });

  if (!orderId) return null;

  const content = safeParseJson(order?.content);
  const poContent = safeParseJson(order?.poContent);
  const invoiceContent = safeParseJson(order?.invoiceContent);

  const contentOrder = content?.orders?.[0] || content?.order || null;
  const poData = poContent?.pos?.[0] || null;
  const invoiceData = invoiceContent?.invoices?.[0] || null;

  const customerInfo = contentOrder?.customer || invoiceData?.customer || null;
  const shippingInfo = contentOrder?.shipping || null;
  const billingInfo = contentOrder?.billing || null;
  const contentLines = contentOrder?.lines || [];
  const poLines = poData?.items || [];
  const invoiceLines = invoiceData?.lines || [];

  const invoiceMeta = invoiceData?.invoice || null;
  const invoiceTotal = invoiceData?.total || null;
  const trackingNumbers = invoiceData?.trackingNumbers || [];

  const statusCfg = order ? getStatusConfig(order.status) : null;
  const StatusIcon = statusCfg?.icon || AlertCircle;

  const hasCustomer = !!customerInfo;
  const hasShipping = !!shippingInfo || !!billingInfo;
  const hasInvoice = !!invoiceMeta;
  const hasLineItems = contentLines.length > 0 || poLines.length > 0 || invoiceLines.length > 0;

  const allLineItems = invoiceLines.length > 0 ? invoiceLines : contentLines;
  const lineItemCount = allLineItems.length + poLines.length;

  const tabs: TabDef[] = [
    { id: "order", label: "Order Info", icon: ClipboardList, color: "bg-blue-500/15 text-blue-700" },
    ...(hasCustomer ? [{ id: "customer", label: "Customer", icon: User, color: "bg-violet-500/15 text-violet-700" }] : []),
    ...(hasShipping ? [{ id: "shipping", label: "Shipping", icon: Truck, color: "bg-cyan-500/15 text-cyan-700" }] : []),
    ...(hasInvoice ? [{ id: "invoice", label: "Invoice", icon: Receipt, color: "bg-emerald-500/15 text-emerald-700" }] : []),
    ...(hasLineItems ? [{ id: "items", label: `Items (${lineItemCount})`, icon: Package, color: "bg-amber-500/15 text-amber-700" }] : []),
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl h-[80vh] flex flex-col p-0 gap-0" data-testid="modal-order-detail">
        {isLoading ? (
          <div className="p-8 space-y-5">
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-xl" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-24 rounded-full" />
              <Skeleton className="h-8 w-20 rounded-full" />
              <Skeleton className="h-8 w-28 rounded-full" />
            </div>
            <div className="space-y-3 pt-2">
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
            </div>
          </div>
        ) : order ? (
          <>
            <div className="px-6 pt-6 pb-4 border-b shrink-0 bg-gradient-to-b from-blue-500/5 to-transparent">
              <DialogHeader className="pb-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-md shadow-blue-500/20">
                    <ShoppingCart className="w-6 h-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="text-xl font-bold" data-testid="text-detail-order-number">
                      Order #{order.orderNumber}
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">ID: {order.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-3 flex-wrap">
                  <Badge
                    variant="outline"
                    className={`text-xs font-semibold ${statusCfg?.color}`}
                    data-testid="badge-detail-status"
                  >
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusCfg?.label}
                  </Badge>
                  {order.purchaseOrderNumber && (
                    <Badge variant="outline" className="text-xs" data-testid="badge-detail-po">
                      <FileText className="w-3 h-3 mr-1" />
                      PO: {order.purchaseOrderNumber}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs bg-muted/50">
                    <MapPin className="w-3 h-3 mr-1" />
                    {order.country}
                  </Badge>
                </div>
              </DialogHeader>
              <CapsuleTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
            </div>

            <div className="flex-1 overflow-y-auto p-6 pt-5">
              {activeTab === "order" && (
                <div className="space-y-3" data-testid="tab-content-order">
                  <div className="grid grid-cols-2 gap-3">
                    <InfoCard icon={Hash} label="Order Number" value={order.orderNumber} accent="bg-blue-500/10" testId="text-detail-order-num" />
                    <InfoCard icon={Hash} label="CRM ID" value={order.crmId} accent="bg-indigo-500/10" testId="text-detail-crm-id" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <InfoCard icon={Package} label="Vendor" value={order.vendor} accent="bg-violet-500/10" testId="text-detail-vendor" />
                    <InfoCard icon={MapPin} label="Country" value={order.country} accent="bg-cyan-500/10" testId="text-detail-country" />
                  </div>
                  <Separator className="my-1" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pt-1">Timeline</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
                      <Calendar className="w-4 h-4 mx-auto text-blue-500 mb-1" />
                      <p className="text-xs font-bold">{formatDate(order.orderDate)}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Order Date</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center" data-testid="text-detail-created">
                      <Calendar className="w-4 h-4 mx-auto text-emerald-500 mb-1" />
                      <p className="text-xs font-bold">{formatDate(order.createdAt)}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Created</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center" data-testid="text-detail-updated">
                      <Calendar className="w-4 h-4 mx-auto text-amber-500 mb-1" />
                      <p className="text-xs font-bold">{formatDate(order.updatedAt)}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Updated</p>
                    </div>
                  </div>
                  {order.statusMessage && (
                    <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-200/50 mt-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Status Message</p>
                      </div>
                      <p className="text-sm mt-1" data-testid="text-detail-status-msg">{order.statusMessage}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "customer" && customerInfo && (
                <div className="space-y-3" data-testid="tab-content-customer">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-violet-500/5 border border-violet-200/50">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-violet-500/15">
                      <User className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-base font-bold">{customerInfo.name || customerInfo.companyName || "-"}</p>
                      <p className="text-xs text-muted-foreground">Customer</p>
                    </div>
                  </div>
                  {customerInfo.address && (
                    <InfoCard
                      icon={MapPin}
                      label="Address"
                      accent="bg-violet-500/10"
                      value={[
                        customerInfo.address?.address1,
                        customerInfo.address?.address2,
                        customerInfo.address?.city,
                        customerInfo.address?.state,
                        customerInfo.address?.zip,
                        customerInfo.address?.country,
                      ].filter(Boolean).join(", ")}
                    />
                  )}
                  {customerInfo.phone && <InfoCard icon={User} label="Phone" value={customerInfo.phone} accent="bg-violet-500/10" />}
                  {customerInfo.email && <InfoCard icon={User} label="Email" value={customerInfo.email} accent="bg-violet-500/10" />}
                </div>
              )}

              {activeTab === "shipping" && (
                <div className="space-y-4" data-testid="tab-content-shipping">
                  {shippingInfo && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500/15">
                          <Truck className="w-3 h-3 text-cyan-600" />
                        </div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ship To</p>
                      </div>
                      <InfoCard icon={User} label="Name" value={shippingInfo.name} accent="bg-cyan-500/10" />
                      <InfoCard icon={MapPin} label="Address" accent="bg-cyan-500/10" value={
                        [shippingInfo.address1, shippingInfo.address2, shippingInfo.city, shippingInfo.state, shippingInfo.zip, shippingInfo.country]
                          .filter(Boolean).join(", ")
                      } />
                    </div>
                  )}
                  {billingInfo && (
                    <div className="space-y-3">
                      {shippingInfo && <Separator />}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500/15">
                          <DollarSign className="w-3 h-3 text-indigo-600" />
                        </div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Bill To</p>
                      </div>
                      <InfoCard icon={User} label="Name" value={billingInfo.name} accent="bg-indigo-500/10" />
                      <InfoCard icon={MapPin} label="Address" accent="bg-indigo-500/10" value={
                        [billingInfo.address1, billingInfo.address2, billingInfo.city, billingInfo.state, billingInfo.zip, billingInfo.country]
                          .filter(Boolean).join(", ")
                      } />
                    </div>
                  )}
                </div>
              )}

              {activeTab === "invoice" && invoiceMeta && (
                <div className="space-y-3" data-testid="tab-content-invoice">
                  <div className="grid grid-cols-2 gap-3">
                    <InfoCard icon={FileText} label="Invoice Number" value={invoiceMeta.number} accent="bg-emerald-500/10" />
                    <InfoCard icon={Calendar} label="Invoice Date" value={formatDate(invoiceMeta.date)} accent="bg-emerald-500/10" />
                  </div>
                  {invoiceTotal && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col items-center gap-1 p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-200/50">
                        <DollarSign className="w-5 h-5 text-emerald-600" />
                        <p className="text-2xl font-bold text-emerald-700">{formatCurrency(invoiceTotal.amount)}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Total Amount</p>
                      </div>
                      <div className="flex flex-col items-center gap-1 p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-200/50">
                        <DollarSign className="w-5 h-5 text-blue-600" />
                        <p className="text-2xl font-bold text-blue-700">{formatCurrency(invoiceTotal.netAmount)}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Net Amount</p>
                      </div>
                    </div>
                  )}
                  {trackingNumbers.length > 0 && (
                    <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Tracking Numbers</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {trackingNumbers.map((t: string, i: number) => (
                          <Badge key={i} variant="secondary" className="font-mono text-xs">{t.replace("Tracking:", "")}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {invoiceData?.shipDate && <InfoCard icon={Calendar} label="Ship Date" value={formatDate(invoiceData.shipDate)} accent="bg-emerald-500/10" />}
                  {invoiceData?.storeNumber && <InfoCard icon={Building2} label="Store Number" value={invoiceData.storeNumber} accent="bg-emerald-500/10" />}
                </div>
              )}

              {activeTab === "items" && (
                <div className="space-y-4" data-testid="tab-content-items">
                  {allLineItems.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/15">
                          <Package className="w-3 h-3 text-amber-600" />
                        </div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                          {invoiceLines.length > 0 ? "Invoice" : "Order"} Items
                        </p>
                        <Badge variant="secondary" className="text-[10px]">{allLineItems.length}</Badge>
                      </div>
                      <LineItemsTable items={allLineItems} />
                    </div>
                  )}
                  {poLines.length > 0 && (
                    <div>
                      {allLineItems.length > 0 && <Separator className="mb-4" />}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500/15">
                          <ClipboardList className="w-3 h-3 text-indigo-600" />
                        </div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">PO Items</p>
                        <Badge variant="secondary" className="text-[10px]">{poLines.length}</Badge>
                      </div>
                      <LineItemsTable items={poLines} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <ShoppingCart className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Order not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Orders() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const limit = 25;

  const { data: stats, isLoading: statsLoading } = useQuery<OrderStats>({
    queryKey: ["/api/orders/stats"],
  });

  const queryParams = new URLSearchParams();
  queryParams.set("limit", String(limit));
  queryParams.set("offset", String(page * limit));
  if (search) queryParams.set("search", search);
  if (statusFilter) queryParams.set("status", statusFilter);

  const ordersUrl = `/api/orders?${queryParams.toString()}`;

  const { data: orders, isLoading: ordersLoading } = useQuery<OrdersResponse>({
    queryKey: [ordersUrl],
  });

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(0);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ predicate: (query) => {
      const key = query.queryKey[0];
      return typeof key === "string" && key.startsWith("/api/orders");
    }});
  };

  const totalRows = orders?.total ?? 0;
  const totalPages = Math.ceil(totalRows / limit);

  const topStatuses = stats?.byStatus.slice(0, 4) || [];

  return (
    <div className="flex flex-col h-full gap-4 p-4 overflow-auto" data-testid="page-orders">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-md bg-blue-500/15">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold" data-testid="text-orders-title">Orders</h1>
            <p className="text-sm text-muted-foreground">Browse and manage all order records</p>
          </div>
        </div>
        <Button size="icon" variant="ghost" onClick={handleRefresh} data-testid="button-refresh-orders">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card data-testid="card-total-orders">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-md bg-blue-500/15">
                <ShoppingCart className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Orders</p>
                {statsLoading ? (
                  <Skeleton className="h-6 w-16 mt-0.5" />
                ) : (
                  <p className="text-lg font-bold" data-testid="text-total-orders">{stats?.total.toLocaleString()}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {topStatuses.map((s, i) => {
          const cfg = getStatusConfig(s.status);
          const StatusIcon = cfg.icon;
          const bgColors = [
            "bg-emerald-500/15",
            "bg-violet-500/15",
            "bg-amber-500/15",
          ];
          const iconColors = [
            "text-emerald-600",
            "text-violet-600",
            "text-amber-600",
          ];
          return (
            <Card key={s.status} data-testid={`card-status-${s.status}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-9 h-9 rounded-md ${bgColors[i] || "bg-gray-500/15"}`}>
                    <StatusIcon className={`w-4 h-4 ${iconColors[i] || "text-gray-600"}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{cfg.label}</p>
                    {statsLoading ? (
                      <Skeleton className="h-6 w-16 mt-0.5" />
                    ) : (
                      <p className="text-lg font-bold" data-testid={`text-status-count-${s.status}`}>{s.cnt.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">All Orders</CardTitle>
              <Badge variant="secondary" data-testid="badge-order-count">{totalRows.toLocaleString()}</Badge>
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
                placeholder="Search by order number or CRM ID..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-8"
                data-testid="input-search-orders"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setPage(0); }}>
              <SelectTrigger className="w-[160px]" data-testid="select-order-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PO_RECEIVED">PO Received</SelectItem>
                <SelectItem value="PO_SENT">PO Sent</SelectItem>
                <SelectItem value="INVOICE_SENT">Invoice Sent</SelectItem>
                <SelectItem value="INVOICE_RECEIPT">Invoice Receipt</SelectItem>
                <SelectItem value="FULFILLMENT_READY">Fulfillment Ready</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleSearch} data-testid="button-search-orders">
              <Search className="w-3.5 h-3.5 mr-1.5" />
              Search
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 min-h-0 overflow-auto">
          {ordersLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-md" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : orders && orders.rows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[140px]">Order #</TableHead>
                  <TableHead className="min-w-[100px]">CRM ID</TableHead>
                  <TableHead className="min-w-[80px]">Vendor</TableHead>
                  <TableHead className="min-w-[120px]">Status</TableHead>
                  <TableHead className="min-w-[100px]">PO #</TableHead>
                  <TableHead className="min-w-[110px]">Order Date</TableHead>
                  <TableHead className="min-w-[110px]">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.rows.map((row) => {
                  const cfg = getStatusConfig(row.status);
                  const RowStatusIcon = cfg.icon;
                  return (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedOrderId(row.id)}
                      data-testid={`row-order-${row.id}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-blue-500/15 shrink-0">
                            <ShoppingCart className="w-3.5 h-3.5 text-blue-600" />
                          </div>
                          <span className="text-sm font-medium font-mono" data-testid={`text-order-num-${row.id}`}>
                            {row.orderNumber}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-mono text-muted-foreground">{row.crmId}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{row.vendor}</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${cfg.color}`}
                          data-testid={`badge-status-${row.id}`}
                        >
                          <RowStatusIcon className="w-3 h-3 mr-1" />
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono text-muted-foreground">
                          {row.purchaseOrderNumber || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">{formatDate(row.orderDate)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">{formatDate(row.createdAt)}</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <ShoppingCart className="w-8 h-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No orders found</p>
            </div>
          )}
        </CardContent>
      </Card>

      <OrderDetailModal
        orderId={selectedOrderId}
        open={selectedOrderId !== null}
        onClose={() => setSelectedOrderId(null)}
      />
    </div>
  );
}
