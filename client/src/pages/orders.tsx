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
  DialogDescription,
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
  History,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Inbox,
  Send as SendIcon,
  Zap,
  Eye,
  EyeOff,
  Copy,
  Check,
  Code,
  LayoutList,
  Store,
  Mail,
  Globe,
  Phone,
  CreditCard,
  Tag,
  Layers,
  Box,
  Ruler,
  LayoutDashboard,
  ExternalLink,
  Download,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useState, useRef } from "react";
import { useLocation } from "wouter";
import shipmentTruckImg from "@assets/image_1770956397882.png";
import deliveryGuyImg from "@assets/image_1770956601437.png";
import { ArrowLeft } from "lucide-react";

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
  PO_RECEIVED: { icon: ClipboardList, color: "bg-red-500/15 text-red-700 border-red-200", label: "PO Received" },
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

function DetailRow({ icon: Icon, label, value, testId }: { icon?: any; label: string; value: string | null | undefined; testId?: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-2 shrink-0">
        {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground/70" />}
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      <p className="text-sm font-medium text-right break-words min-w-0" data-testid={testId}>{value || "-"}</p>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, accent, testId }: { icon: any; label: string; value: string | null | undefined; accent?: string; testId?: string }) {
  const bg = accent || "bg-muted/60";
  const iconColor = accent ? accent.replace("bg-", "text-").replace("/10", "") : "text-muted-foreground";
  return (
    <div className="flex items-start gap-3 p-4 rounded-md border bg-card">
      <div className={`flex items-center justify-center w-9 h-9 rounded-full ${bg} shrink-0 mt-0.5`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
        <p className="text-base font-semibold mt-1 break-words" data-testid={testId}>{value || "-"}</p>
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
                <TableCell className="text-xs font-mono text-red-600">{sku}</TableCell>
                <TableCell className="text-xs max-w-[220px] truncate">{desc}</TableCell>
                <TableCell className="text-xs text-right tabular-nums">{qty}</TableCell>
                <TableCell className="text-xs text-right tabular-nums text-muted-foreground">{formatCurrency(price)}</TableCell>
                <TableCell className="text-xs text-right tabular-nums font-semibold">{formatCurrency(total)}</TableCell>
              </TableRow>
            );
          })}
          <TableRow className="bg-muted/30 border-t-2">
            <TableCell colSpan={4} className="text-xs font-bold text-right uppercase tracking-wider">Grand Total</TableCell>
            <TableCell className="text-sm text-right font-bold tabular-nums text-red-600">{formatCurrency(grandTotal)}</TableCell>
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

interface OrderDataRow {
  id: number;
  orderId: number;
  date: string | null;
  initialStatus: string | null;
  newStatus: string | null;
  inboundContent: string | null;
  inboundIdentifier: string | null;
  inboundType: string | null;
  outboundContent: string | null;
  outboundIdentifier: string | null;
  outboundType: string | null;
}

function parseEDI(raw: string): { segments: { id: string; elements: string[] }[]; poNumber?: string; buyer?: { name: string; code: string }; seller?: { name: string; code: string }; buyerAddress?: { street: string; city: string; state: string; zip: string }; items: { sku: string; vendorNo: string; qty: string; price: string; uom: string; desc: string }[] } | null {
  if (!raw || !raw.includes("~")) return null;
  try {
    const segs = raw.split("~").filter(s => s.trim()).map(s => {
      const parts = s.trim().split("*");
      return { id: parts[0], elements: parts.slice(1) };
    });
    let poNumber: string | undefined;
    let buyer: { name: string; code: string } | undefined;
    let seller: { name: string; code: string } | undefined;
    let buyerAddress: { street: string; city: string; state: string; zip: string } | undefined;
    const items: { sku: string; vendorNo: string; qty: string; price: string; uom: string; desc: string }[] = [];
    let lastN1Type: string | undefined;
    let currentItem: any = {};

    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i];
      if (seg.id === "BEG" && seg.elements.length >= 3) {
        poNumber = seg.elements[2];
      } else if (seg.id === "N1") {
        lastN1Type = seg.elements[0];
        const name = seg.elements[1] || "";
        const code = seg.elements[3] || "";
        if (lastN1Type === "BY") buyer = { name, code };
        else if (lastN1Type === "SE") seller = { name, code };
      } else if (seg.id === "N3" && lastN1Type === "BY") {
        buyerAddress = { street: seg.elements[0] || "", city: "", state: "", zip: "" };
      } else if (seg.id === "N4" && lastN1Type === "BY" && buyerAddress) {
        buyerAddress.city = seg.elements[0] || "";
        buyerAddress.state = seg.elements[1] || "";
        buyerAddress.zip = seg.elements[2] || "";
      } else if (seg.id === "PO1") {
        currentItem = {
          qty: seg.elements[1] || "0",
          uom: seg.elements[2] || "",
          price: seg.elements[3] || "0",
          sku: "",
          vendorNo: "",
          desc: "",
        };
        for (let j = 4; j < seg.elements.length - 1; j++) {
          if (seg.elements[j] === "VC") currentItem.sku = seg.elements[j + 1] || "";
          if (seg.elements[j] === "IN") currentItem.vendorNo = seg.elements[j + 1] || "";
        }
        items.push(currentItem);
      } else if (seg.id === "PID" && items.length > 0) {
        items[items.length - 1].desc = seg.elements[3] || seg.elements[4] || "";
      }
    }
    return { segments: segs, poNumber, buyer, seller, buyerAddress, items };
  } catch {
    return null;
  }
}

function ParsedEDIView({ raw }: { raw: string }) {
  const parsed = parseEDI(raw);
  if (!parsed) {
    return (
      <pre className="text-xs font-mono bg-muted/30 rounded-lg p-4 overflow-auto max-h-96 whitespace-pre-wrap break-words">
        {raw}
      </pre>
    );
  }

  return (
    <div className="space-y-4">
      {parsed.poNumber && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono">PO #{parsed.poNumber}</Badge>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {parsed.buyer && (
          <div className="rounded-lg border border-border/50 p-3 space-y-1">
            <div className="flex items-center gap-1.5 mb-1">
              <Store className="w-3.5 h-3.5 text-blue-500" />
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Buyer</p>
            </div>
            <p className="text-sm font-medium">{parsed.buyer.name}</p>
            {parsed.buyer.code && <p className="text-xs text-muted-foreground font-mono">{parsed.buyer.code}</p>}
            {parsed.buyerAddress && (
              <p className="text-xs text-muted-foreground">
                {parsed.buyerAddress.street.trim()}, {parsed.buyerAddress.city}, {parsed.buyerAddress.state} {parsed.buyerAddress.zip}
              </p>
            )}
          </div>
        )}
        {parsed.seller && (
          <div className="rounded-lg border border-border/50 p-3 space-y-1">
            <div className="flex items-center gap-1.5 mb-1">
              <Building2 className="w-3.5 h-3.5 text-emerald-500" />
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Seller</p>
            </div>
            <p className="text-sm font-medium">{parsed.seller.name}</p>
            {parsed.seller.code && <p className="text-xs text-muted-foreground font-mono">{parsed.seller.code}</p>}
          </div>
        )}
      </div>
      {parsed.items.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Package className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Line Items</p>
          </div>
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
                {parsed.items.map((item, i) => {
                  const qty = parseFloat(item.qty) || 0;
                  const price = parseFloat(item.price) || 0;
                  return (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-mono text-red-600">{item.sku || "-"}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{item.desc || "-"}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{item.qty}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums text-muted-foreground">{formatCurrency(price)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums font-semibold">{formatCurrency(qty * price)}</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-muted/30 border-t-2">
                  <TableCell colSpan={4} className="text-xs font-bold text-right uppercase tracking-wider">Total</TableCell>
                  <TableCell className="text-sm text-right font-bold tabular-nums text-red-600">
                    {formatCurrency(parsed.items.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.price) || 0), 0))}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

function ParsedJSONView({ data }: { data: any }) {
  if (!data || typeof data !== "object") return null;

  const customer = data.customer || data.shipTo;
  const shipTo = data.shipTo;
  const billTo = data.billTo;
  const items = data.items || [];
  const invoices = data.invoices;

  if (invoices && Array.isArray(invoices) && invoices.length > 0) {
    return (
      <div className="space-y-4">
        {invoices.map((inv: any, idx: number) => {
          const invoice = inv.invoice || {};
          const order = inv.order || {};
          const cust = inv.customer || {};
          const lines = inv.lines || [];
          return (
            <div key={idx} className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {invoice.number && (
                  <div className="rounded-lg border border-border/50 p-2.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Invoice #</p>
                    <p className="text-sm font-medium font-mono mt-0.5">{invoice.number}</p>
                  </div>
                )}
                {invoice.date && (
                  <div className="rounded-lg border border-border/50 p-2.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Date</p>
                    <p className="text-sm font-medium mt-0.5">{invoice.date}</p>
                  </div>
                )}
                {inv.shipDate && (
                  <div className="rounded-lg border border-border/50 p-2.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Ship Date</p>
                    <p className="text-sm font-medium mt-0.5">{inv.shipDate}</p>
                  </div>
                )}
              </div>
              {cust.name && (
                <div className="rounded-lg border border-border/50 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Store className="w-3.5 h-3.5 text-blue-500" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ship To</p>
                  </div>
                  <p className="text-sm font-medium">{cust.name}</p>
                  {cust.address && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[cust.address.address1, cust.address.city, cust.address.state, cust.address.zip].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
              )}
              {inv.trackingNumbers?.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                  {inv.trackingNumbers.map((t: string, ti: number) => (
                    <Badge key={ti} variant="secondary" className="text-xs font-mono">{t}</Badge>
                  ))}
                </div>
              )}
              {lines.length > 0 && (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider">SKU</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Qty</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Price</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((line: any, li: number) => (
                        <TableRow key={li}>
                          <TableCell className="text-xs font-mono text-red-600">{line.number || "-"}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{line.quantity || 0}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums text-muted-foreground">{formatCurrency(line.unitPrice)}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums font-semibold">{formatCurrency((line.quantity || 0) * (line.unitPrice || 0))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {inv.total?.amount && (
                <div className="flex justify-end">
                  <div className="rounded-lg bg-muted/30 border px-4 py-2">
                    <span className="text-xs text-muted-foreground mr-2">Total:</span>
                    <span className="text-sm font-bold text-red-600">{formatCurrency(inv.total.amount)}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {data.poNumber && (
          <div className="rounded-lg border border-border/50 p-2.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">PO Number</p>
            <p className="text-sm font-medium font-mono mt-0.5">{data.poNumber}</p>
          </div>
        )}
        {data.date && (
          <div className="rounded-lg border border-border/50 p-2.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Date</p>
            <p className="text-sm font-medium mt-0.5">{data.date}</p>
          </div>
        )}
        {data.status && (
          <div className="rounded-lg border border-border/50 p-2.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Status</p>
            <p className="text-sm font-medium mt-0.5">{data.status}</p>
          </div>
        )}
        {data.vendor && (
          <div className="rounded-lg border border-border/50 p-2.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Vendor</p>
            <p className="text-sm font-medium mt-0.5">{data.vendor}</p>
          </div>
        )}
        {data.totalItems && (
          <div className="rounded-lg border border-border/50 p-2.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Total Items</p>
            <p className="text-sm font-medium mt-0.5">{data.totalItems}</p>
          </div>
        )}
        {data.totalAmount && (
          <div className="rounded-lg border border-border/50 p-2.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Total Amount</p>
            <p className="text-sm font-medium mt-0.5 text-red-600">{formatCurrency(data.totalAmount)}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {customer?.name && (
          <div className="rounded-lg border border-border/50 p-3 space-y-1">
            <div className="flex items-center gap-1.5 mb-1">
              <Store className="w-3.5 h-3.5 text-blue-500" />
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Customer</p>
            </div>
            <p className="text-sm font-medium">{customer.name}</p>
            {customer.id && <p className="text-xs text-muted-foreground font-mono">{customer.id}</p>}
            {customer.street && (
              <p className="text-xs text-muted-foreground">
                {[customer.street?.trim(), customer.city, customer.state, customer.zip].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        )}
        {shipTo?.name && shipTo.name !== customer?.name && (
          <div className="rounded-lg border border-border/50 p-3 space-y-1">
            <div className="flex items-center gap-1.5 mb-1">
              <Truck className="w-3.5 h-3.5 text-emerald-500" />
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ship To</p>
            </div>
            <p className="text-sm font-medium">{shipTo.name}</p>
            {shipTo.locationCode && <p className="text-xs text-muted-foreground font-mono">{shipTo.locationCode}</p>}
            {shipTo.street && (
              <p className="text-xs text-muted-foreground">
                {[shipTo.street?.trim(), shipTo.city, shipTo.state, shipTo.zip].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Package className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Line Items</p>
          </div>
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
                  const sku = item.sku || item.number || item.itemCode || "-";
                  const desc = item.itemDesc || item.description || "-";
                  const qty = parseFloat(item.requestedQuantity || item.quantity || item.qty || "0");
                  const price = parseFloat(item.price || item.unitPrice || "0");
                  return (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-mono text-red-600">{sku}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{desc}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{qty}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums text-muted-foreground">{formatCurrency(price)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums font-semibold">{formatCurrency(qty * price)}</TableCell>
                    </TableRow>
                  );
                })}
                {data.totalAmount && (
                  <TableRow className="bg-muted/30 border-t-2">
                    <TableCell colSpan={4} className="text-xs font-bold text-right uppercase tracking-wider">Total</TableCell>
                    <TableCell className="text-sm text-right font-bold tabular-nums text-red-600">{formatCurrency(data.totalAmount)}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

function ContentViewerDialog({ open, onClose, title, titleIcon, content, rawContent, accentColor }: {
  open: boolean;
  onClose: () => void;
  title: string;
  titleIcon: any;
  content: string | null;
  rawContent: string | null;
  accentColor: "blue" | "emerald";
}) {
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const TitleIcon = titleIcon;

  const prevContentRef = useRef<string | null>(null);
  if (open && content !== prevContentRef.current) {
    prevContentRef.current = content;
    if (showRaw) setShowRaw(false);
    if (copied) setCopied(false);
  }

  if (!open) return null;
  if (!content && !rawContent) return null;

  const effectiveRaw = rawContent || content || "";
  const decoded = effectiveRaw.replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&amp;/g, "&");
  const parsed = safeParseJson(decoded);
  const isEDI = !parsed && decoded.includes("~") && decoded.includes("*");

  const colorMap = {
    blue: { iconBg: "bg-blue-500/15", iconColor: "text-blue-600", titleColor: "text-blue-700 dark:text-blue-400" },
    emerald: { iconBg: "bg-emerald-500/15", iconColor: "text-emerald-600", titleColor: "text-emerald-700 dark:text-emerald-400" },
  };
  const colors = colorMap[accentColor];

  const handleCopy = () => {
    const text = parsed ? JSON.stringify(parsed, null, 2) : decoded;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast({ title: "Failed to copy", variant: "destructive" });
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col" data-testid="dialog-content-viewer">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-7 h-7 rounded-lg ${colors.iconBg} shrink-0`}>
              <TitleIcon className={`w-4 h-4 ${colors.iconColor}`} />
            </div>
            <span className={colors.titleColor}>{title}</span>
          </DialogTitle>
          <DialogDescription className="sr-only">{title} content details</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 pr-1">
          {!showRaw ? (
            <div className="py-1">
              {isEDI ? (
                <ParsedEDIView raw={decoded} />
              ) : parsed ? (
                <ParsedJSONView data={parsed} />
              ) : (
                <pre className="text-xs font-mono bg-muted/30 rounded-lg p-4 overflow-auto max-h-96 whitespace-pre-wrap break-words">
                  {decoded}
                </pre>
              )}
            </div>
          ) : (
            <pre className="text-xs font-mono bg-muted/30 rounded-lg p-4 overflow-auto whitespace-pre-wrap break-words" data-testid="raw-content-view">
              {parsed ? JSON.stringify(parsed, null, 2) : decoded}
            </pre>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRaw(!showRaw)}
            data-testid="button-toggle-raw"
          >
            {showRaw ? <LayoutList className="w-3.5 h-3.5 mr-1.5" /> : <Code className="w-3.5 h-3.5 mr-1.5" />}
            {showRaw ? "Parsed View" : "Raw Data"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            data-testid="button-copy-content"
          >
            {copied ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const STEP_COLORS = [
  { bg: "bg-red-500", ring: "ring-red-200 dark:ring-red-900", dot: "bg-red-100 dark:bg-red-950" },
  { bg: "bg-blue-500", ring: "ring-blue-200 dark:ring-blue-900", dot: "bg-blue-100 dark:bg-blue-950" },
  { bg: "bg-emerald-500", ring: "ring-emerald-200 dark:ring-emerald-900", dot: "bg-emerald-100 dark:bg-emerald-950" },
  { bg: "bg-violet-500", ring: "ring-violet-200 dark:ring-violet-900", dot: "bg-violet-100 dark:bg-violet-950" },
  { bg: "bg-amber-500", ring: "ring-amber-200 dark:ring-amber-900", dot: "bg-amber-100 dark:bg-amber-950" },
  { bg: "bg-cyan-500", ring: "ring-cyan-200 dark:ring-cyan-900", dot: "bg-cyan-100 dark:bg-cyan-950" },
  { bg: "bg-pink-500", ring: "ring-pink-200 dark:ring-pink-900", dot: "bg-pink-100 dark:bg-pink-950" },
  { bg: "bg-orange-500", ring: "ring-orange-200 dark:ring-orange-900", dot: "bg-orange-100 dark:bg-orange-950" },
];

const STEP_ICONS = [Zap, ClipboardList, Send, FileText, Receipt, Truck, CheckCircle2, Package];

function OrderHistoryTimeline({ orderId }: { orderId: number }) {
  const { data: history, isLoading } = useQuery<OrderDataRow[]>({
    queryKey: ['/api/orders', orderId, 'history'],
    enabled: !!orderId,
  });

  const [dialogState, setDialogState] = useState<{
    open: boolean;
    type: "inbound" | "outbound";
    content: string | null;
  }>({ open: false, type: "inbound", content: null });

  if (isLoading) {
    return (
      <div className="space-y-4 py-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted/50">
          <History className="w-7 h-7 text-muted-foreground/40" />
        </div>
        <p className="text-sm text-muted-foreground">No history records found</p>
      </div>
    );
  }

  return (
    <div className="relative" data-testid="order-history-timeline">
      <div className="absolute left-5 top-6 bottom-6 w-0.5 bg-gradient-to-b from-red-300 via-blue-300 to-emerald-300 dark:from-red-800 dark:via-blue-800 dark:to-emerald-800 rounded-full" />

      <div className="space-y-1">
        {history.map((entry, idx) => {
          const initialCfg = entry.initialStatus ? getStatusConfig(entry.initialStatus) : null;
          const newCfg = entry.newStatus ? getStatusConfig(entry.newStatus) : null;
          const InitialIcon = initialCfg?.icon || AlertCircle;
          const NewIcon = newCfg?.icon || AlertCircle;

          const hasInbound = !!entry.inboundContent && entry.inboundContent !== "";
          const hasOutbound = !!entry.outboundContent && entry.outboundContent !== "";

          const colorSet = STEP_COLORS[idx % STEP_COLORS.length];
          const StepIcon = STEP_ICONS[idx % STEP_ICONS.length];

          return (
            <div key={entry.id} className="relative pl-12 pb-4" data-testid={`history-entry-${idx}`}>
              <div className={`absolute left-2 top-1 w-7 h-7 rounded-full ${colorSet.dot} ring-4 ${colorSet.ring} flex items-center justify-center z-10`}>
                <StepIcon className={`w-3.5 h-3.5 text-white ${colorSet.bg} rounded-full p-0.5`} />
              </div>

              <div className="rounded-xl border border-border/40 bg-card p-3.5">
                <div className="flex items-center gap-2 flex-wrap">
                  {entry.initialStatus && (
                    <Badge variant="outline" className={`text-[10px] font-semibold ${initialCfg?.color}`}>
                      <InitialIcon className="w-3 h-3 mr-1" />
                      {initialCfg?.label || entry.initialStatus}
                    </Badge>
                  )}
                  {entry.initialStatus && entry.newStatus && (
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                  )}
                  {entry.newStatus && (
                    <Badge variant="outline" className={`text-[10px] font-semibold ${newCfg?.color}`}>
                      <NewIcon className="w-3 h-3 mr-1" />
                      {newCfg?.label || entry.newStatus}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-muted-foreground/60" />
                    <p className="text-[11px] text-muted-foreground">
                      {entry.date ? formatDateTime(entry.date) : "-"}
                    </p>
                  </div>
                  {entry.inboundType && (
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <Inbox className="w-2.5 h-2.5" />
                      {entry.inboundType}
                    </Badge>
                  )}
                  {entry.outboundType && (
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <SendIcon className="w-2.5 h-2.5" />
                      {entry.outboundType}
                    </Badge>
                  )}
                </div>

                {(entry.inboundIdentifier || entry.outboundIdentifier) && (
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {entry.inboundIdentifier && (
                      <span className="text-[10px] text-muted-foreground/70 font-mono bg-muted/50 px-1.5 py-0.5 rounded">
                        {entry.inboundIdentifier}
                      </span>
                    )}
                    {entry.outboundIdentifier && entry.outboundIdentifier !== entry.inboundIdentifier && (
                      <span className="text-[10px] text-muted-foreground/70 font-mono bg-muted/50 px-1.5 py-0.5 rounded">
                        {entry.outboundIdentifier}
                      </span>
                    )}
                  </div>
                )}

                {(hasInbound || hasOutbound) && (
                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                    {hasInbound && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[11px] gap-1.5"
                        onClick={() => setDialogState({ open: true, type: "inbound", content: entry.inboundContent })}
                        data-testid={`button-view-inbound-${idx}`}
                      >
                        <Inbox className="w-3 h-3 text-blue-500" />
                        View Inbound
                      </Button>
                    )}
                    {hasOutbound && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[11px] gap-1.5"
                        onClick={() => setDialogState({ open: true, type: "outbound", content: entry.outboundContent })}
                        data-testid={`button-view-outbound-${idx}`}
                      >
                        <SendIcon className="w-3 h-3 text-emerald-500" />
                        View Outbound
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ContentViewerDialog
        open={dialogState.open}
        onClose={() => setDialogState({ open: false, type: "inbound", content: null })}
        title={dialogState.type === "inbound" ? "Inbound Content" : "Outbound Content"}
        titleIcon={dialogState.type === "inbound" ? Inbox : SendIcon}
        content={dialogState.content}
        rawContent={dialogState.content}
        accentColor={dialogState.type === "inbound" ? "blue" : "emerald"}
      />
    </div>
  );
}

function OrderTimeline({ steps }: { steps: { label: string; date: string | null; completed: boolean; warning?: boolean }[] }) {
  return (
    <div className="flex items-center w-full overflow-x-auto" data-testid="order-timeline">
      {steps.map((step, i) => {
        const isShipment = step.label === "Shipment";
        const isDelivery = step.label === "Delivery";
        return (
          <div key={i} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1">
              {isShipment ? (
                <img src={shipmentTruckImg} alt="Shipment" className={`w-18 h-18 ${step.completed ? 'opacity-100' : 'opacity-30 grayscale'}`} />
              ) : isDelivery ? (
                <img src={deliveryGuyImg} alt="Delivery" className={`w-18 h-18 ${step.completed ? 'opacity-100' : 'opacity-30 grayscale'}`} />
              ) : (
                <div className={`w-3 h-3 rounded-full ${step.completed ? 'bg-emerald-500' : step.warning ? 'bg-amber-500' : 'bg-muted-foreground/30'}`} />
              )}
              <p className={`text-[10px] font-medium text-center ${step.completed ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</p>
              {step.date && <p className="text-[9px] text-muted-foreground">{step.date}</p>}
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 ${step.completed ? 'bg-emerald-500' : 'bg-muted-foreground/20'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function OrderDetailPage({ orderId }: { orderId: number }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [, navigate] = useLocation();
  const [docDialog, setDocDialog] = useState<{ open: boolean; title: string; content: string | null }>({ open: false, title: "", content: null });
  const [skuFilter, setSkuFilter] = useState("");
  const [sortByPrice, setSortByPrice] = useState(false);

  const { data: order, isLoading } = useQuery<OrderDetail>({
    queryKey: ['/api/orders', orderId],
    enabled: !!orderId,
  });

  const content = safeParseJson(order?.content);
  const poContent = safeParseJson(order?.poContent);
  const invoiceContent = safeParseJson(order?.invoiceContent);

  const contentOrder = content?.orders?.[0] || content?.order || null;
  const poData = poContent?.pos?.[0] || null;
  const invoiceData = invoiceContent?.invoices?.[0] || null;

  const customerInfo = contentOrder?.customer || content?.customer || invoiceData?.customer || null;
  const shippingInfo = contentOrder?.shipping || content?.shipTo || null;
  const billingInfo = contentOrder?.billing || content?.billTo || null;
  const contentLines = contentOrder?.lines || content?.items || [];
  const poLines = poData?.items || [];
  const invoiceLines = invoiceData?.lines || [];

  const invoiceMeta = invoiceData?.invoice || null;
  const invoiceTotal = invoiceData?.total || null;
  const trackingNumbers = invoiceData?.trackingNumbers || [];

  const statusCfg = order ? getStatusConfig(order.status) : null;
  const StatusIcon = statusCfg?.icon || AlertCircle;

  const hasInvoice = !!invoiceMeta;
  const hasLineItems = contentLines.length > 0 || poLines.length > 0 || invoiceLines.length > 0;
  const hasSupplier = !!(content?.supplier && (content.supplier.name || content.supplier.phone || content.supplier.email));

  const allLineItems = invoiceLines.length > 0 ? invoiceLines : contentLines;
  const lineItemCount = allLineItems.length + poLines.length;

  const itemsForCalc = allLineItems;
  const totalItemsCount = itemsForCalc.length;
  const totalAmount = itemsForCalc.reduce((s: number, it: any) => {
    const total = parseFloat(it.totalAmount || "0") || 0;
    if (total > 0) return s + total;
    const qty = parseFloat(it.requestedQuantity || it.quantity || it.qty || "0") || 0;
    const price = parseFloat(it.price || it.unitPrice || "0") || 0;
    return s + qty * price;
  }, 0);
  const totalAccepted = itemsForCalc.reduce((s: number, it: any) => s + (parseFloat(it.acceptedQuantity || "0") || 0), 0);
  const totalRequested = itemsForCalc.reduce((s: number, it: any) => s + (parseFloat(it.requestedQuantity || it.quantity || it.qty || "0") || 0), 0);
  const totalRebates = itemsForCalc.reduce((s: number, it: any) => {
    const r = it.rebate;
    if (!r) return s;
    const num = typeof r === "string" ? parseFloat(r) : r;
    return s + (isNaN(num) ? 0 : num);
  }, 0);

  const grossNum = parseFloat(content?.grossAmount || "0") || 0;
  const allowanceNum = parseFloat(content?.allowanceOrCharge || "0") || 0;
  const netTotal = grossNum > 0 ? grossNum - allowanceNum + totalRebates : parseFloat(content?.totalAmount || "0") || 0;

  const deliveryPassed = content?.plannedDeliveryDate ? new Date(content.plannedDeliveryDate) < new Date() : false;

  const timelineSteps = [
    { label: "Created", date: order ? formatDate(order.createdAt) : null, completed: !!order },
    { label: "PO Generated", date: content?.date ? formatDate(content.date) : null, completed: !!content?.date },
    { label: "Shipment", date: content?.shipmentDate ? formatDate(content.shipmentDate) : null, completed: !!content?.shipmentDate },
    { label: "Delivery", date: content?.plannedDeliveryDate ? formatDate(content.plannedDeliveryDate) : null, completed: deliveryPassed, warning: deliveryPassed && !hasInvoice },
    { label: "Invoice", date: invoiceMeta ? formatDate(invoiceMeta.date) : null, completed: !!invoiceMeta },
  ];

  const filteredItems = allLineItems.filter((item: any) => {
    if (!skuFilter) return true;
    const term = skuFilter.toLowerCase();
    const sku = (item.sku || item.number || item.itemCode || "").toLowerCase();
    const desc = (item.itemDesc || item.description || "").toLowerCase();
    return sku.includes(term) || desc.includes(term);
  });
  const sortedItems = sortByPrice
    ? [...filteredItems].sort((a: any, b: any) => (parseFloat(b.price || "0") || 0) - (parseFloat(a.price || "0") || 0))
    : filteredItems;

  const tabs: TabDef[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard, color: "bg-red-500/15 text-red-700" },
    { id: "details", label: "Order Details", icon: ClipboardList, color: "bg-blue-500/15 text-blue-700" },
    ...(hasLineItems ? [{ id: "items", label: `Line Items (${lineItemCount})`, icon: Package, color: "bg-amber-500/15 text-amber-700" }] : []),
    { id: "financials", label: "Financials", icon: DollarSign, color: "bg-emerald-500/15 text-emerald-700" },
    ...(hasSupplier ? [{ id: "supplier", label: "Supplier", icon: Building2, color: "bg-purple-500/15 text-purple-700" }] : []),
    { id: "customer", label: "Customer & Shipping", icon: User, color: "bg-cyan-500/15 text-cyan-700" },
    { id: "documents", label: "Documents", icon: FileText, color: "bg-slate-500/15 text-slate-700" },
    ...(hasInvoice ? [{ id: "invoices", label: "Invoices", icon: Receipt, color: "bg-teal-500/15 text-teal-700" }] : []),
    { id: "activity", label: "Activity Log", icon: History, color: "bg-orange-500/15 text-orange-700" },
  ];

  return (
    <div className="flex flex-col h-full overflow-auto" data-testid="page-order-detail">
      {isLoading ? (
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-28" />
          </div>
          <div className="space-y-3 pt-2">
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        </div>
      ) : order ? (
        <div className="pb-6">
          <div className="px-6 pt-5 pb-0">
            <div className="flex items-center gap-3 pb-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/orders")} data-testid="button-back-orders">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-500 shrink-0">
                <ShoppingCart className="w-4.5 h-4.5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-semibold" data-testid="text-detail-order-number">
                  Order #{order.orderNumber}
                </h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-semibold ${statusCfg?.color}`}
                    data-testid="badge-detail-status"
                  >
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusCfg?.label}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          <div className="border-b px-6">
            <div className="flex items-center gap-6 flex-wrap">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const countMatch = tab.label.match(/^(.+?)\s*\((\d+)\)$/);
                const labelText = countMatch ? countMatch[1] : tab.label;
                const countValue = countMatch ? countMatch[2] : null;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-1.5 px-1 py-3 text-[13px] font-medium transition-colors border-b-2 ${
                      isActive
                        ? "border-foreground text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid={`tab-${tab.id}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {labelText}
                    {countValue && (
                      <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                        {countValue}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-6 pt-4">
            {activeTab === "overview" && (
              <div className="space-y-6" data-testid="tab-content-overview">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <Card data-testid="card-overview-status">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-red-500/15 shrink-0">
                          <StatusIcon className="w-4 h-4 text-red-700" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Order Status</p>
                          <p className="text-sm font-semibold mt-0.5">{statusCfg?.label || order.status}</p>
                          {order.statusMessage && <p className="text-xs text-muted-foreground mt-0.5 truncate">{order.statusMessage}</p>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card data-testid="card-overview-po">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-blue-500/15 shrink-0">
                          <ClipboardList className="w-4 h-4 text-blue-700" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">PO Number</p>
                          <p className="text-sm font-semibold mt-0.5">{content?.poNumber || order.orderNumber}</p>
                          {content?.poType && <p className="text-xs text-muted-foreground mt-0.5">{content.poType}</p>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card data-testid="card-overview-amount">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-emerald-500/15 shrink-0">
                          <DollarSign className="w-4 h-4 text-emerald-700" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Gross Amount</p>
                          <p className="text-sm font-semibold mt-0.5">{content?.grossAmount || formatCurrency(content?.totalAmount)}</p>
                          {content?.totalItems && <p className="text-xs text-muted-foreground mt-0.5">{content.totalItems} items</p>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card data-testid="card-overview-delivery">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-cyan-500/15 shrink-0">
                          <Truck className="w-4 h-4 text-cyan-700" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Delivery</p>
                          <p className="text-sm font-semibold mt-0.5">{content?.plannedDeliveryDate ? formatDate(content.plannedDeliveryDate) : "-"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card data-testid="card-overview-brand">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-purple-500/15 shrink-0">
                          <Tag className="w-4 h-4 text-purple-700" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Brand</p>
                          <p className="text-sm font-semibold mt-0.5">{content?.brand || "-"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card data-testid="card-overview-vendor">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-amber-500/15 shrink-0">
                          <Building2 className="w-4 h-4 text-amber-700" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Vendor</p>
                          <p className="text-sm font-semibold mt-0.5">{order.vendor}</p>
                          {content?.vendorNumber && <p className="text-xs text-muted-foreground mt-0.5">#{content.vendorNumber}</p>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardContent className="p-4">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Order Timeline</p>
                    <OrderTimeline steps={timelineSteps} />
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 space-y-3">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Channel & Metadata</p>
                    <DetailRow icon={Hash} label="Order Number" value={order.orderNumber} testId="text-overview-order-num" />
                    <DetailRow icon={Globe} label="Channel" value={order.channel} />
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2 shrink-0">
                        <Zap className="w-3.5 h-3.5 text-muted-foreground/70" />
                        <p className="text-sm text-muted-foreground">Test</p>
                      </div>
                      <div>
                        {order.test === 1 || order.test === "1" || order.test === true ? <Badge variant="secondary" className="text-[10px]" data-testid="badge-test-flag">Test</Badge> : <p className="text-sm font-medium">No</p>}
                      </div>
                    </div>
                    <DetailRow icon={Hash} label="CRM ID" value={order.crmId} testId="text-overview-crm-id" />
                    <DetailRow icon={Calendar} label="Created At" value={formatDateTime(order.createdAt)} />
                    <DetailRow icon={Calendar} label="Updated At" value={formatDateTime(order.updatedAt)} />
                    <DetailRow icon={Globe} label="Country" value={order.country} />
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "details" && (
              <div className="space-y-6" data-testid="tab-content-details">
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Basic Order Info</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-5 space-y-4">
                        <DetailRow icon={Hash} label="Order ID" value={String(order.id)} testId="text-detail-id" />
                        <DetailRow icon={Hash} label="Order Number" value={order.orderNumber} testId="text-detail-order-num" />
                        <DetailRow icon={Hash} label="Index" value={String(order.index)} />
                        <DetailRow icon={FileText} label="Purchase Order ID" value={content?.poNumber || "-"} />
                        <DetailRow icon={FileText} label="Purchase Order Number" value={order.purchaseOrderNumber || "-"} />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-5 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-2 shrink-0">
                            <Zap className="w-3.5 h-3.5 text-muted-foreground/70" />
                            <p className="text-sm text-muted-foreground">Status</p>
                          </div>
                          <Badge variant="outline" className={`text-[10px] font-semibold ${statusCfg?.color}`} data-testid="badge-details-status">
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusCfg?.label}
                          </Badge>
                        </div>
                        <DetailRow icon={AlertCircle} label="Status Message" value={order.statusMessage} testId="text-detail-status-msg" />
                        <DetailRow icon={Globe} label="Channel" value={order.channel} />
                        <DetailRow icon={Calendar} label="Created At" value={formatDateTime(order.createdAt)} />
                        <DetailRow icon={Calendar} label="Updated At" value={formatDateTime(order.updatedAt)} />
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {content && (
                  <div>
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">PO Content</p>
                    <Card>
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-4 flex-wrap">
                          {content.poType && <Badge variant="secondary" className="text-[10px]" data-testid="badge-po-type">{content.poType}</Badge>}
                          {content.status && <Badge variant="outline" className="text-[10px]" data-testid="badge-po-status">{content.status}</Badge>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                          <DetailRow icon={FileText} label="PO Number" value={content.poNumber} />
                          <DetailRow icon={Calendar} label="Date" value={formatDate(content.date)} />
                          <DetailRow icon={ClipboardList} label="PO Type" value={content.poType} />
                          <DetailRow icon={Tag} label="Price Identifier" value={content.priceIdentifier?.name} />
                          <DetailRow icon={Hash} label="Vendor Number" value={content.vendorNumber} />
                          <DetailRow icon={CreditCard} label="Payment Mode" value={content.paymentMode} />
                          <DetailRow icon={FileText} label="Terms" value={content.terms} />
                          <DetailRow icon={DollarSign} label="Allowance/Charge" value={content.allowanceOrCharge} />
                          <DetailRow icon={DollarSign} label="Gross Amount" value={content.grossAmount} />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}

            {activeTab === "items" && (
              <div className="space-y-4" data-testid="tab-content-items">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <StatMini icon={Package} label="Total Items" value={String(totalItemsCount)} color="bg-amber-500/10 text-amber-700" />
                  <StatMini icon={DollarSign} label="Total Amount" value={formatCurrency(totalAmount)} color="bg-emerald-500/10 text-emerald-700" />
                  <StatMini icon={CheckCircle2} label="Accepted Qty" value={String(totalAccepted)} color="bg-blue-500/10 text-blue-700" />
                  <StatMini icon={Layers} label="Requested Qty" value={String(totalRequested)} color="bg-purple-500/10 text-purple-700" />
                  <StatMini icon={Tag} label="Total Rebates" value={formatCurrency(totalRebates)} color="bg-red-500/10 text-red-700" />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Filter by SKU or description..."
                      value={skuFilter}
                      onChange={(e) => setSkuFilter(e.target.value)}
                      className="pl-8"
                      data-testid="input-sku-filter"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortByPrice(!sortByPrice)}
                    className={`${sortByPrice ? 'toggle-elevate toggle-elevated' : ''}`}
                    data-testid="button-sort-price"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" />
                    Sort by Price
                  </Button>
                </div>

                {sortedItems.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/15">
                        <Package className="w-3 h-3 text-amber-600" />
                      </div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Line Items</p>
                      <Badge variant="secondary" className="text-[10px]">{sortedItems.length}</Badge>
                    </div>
                    <div className="rounded-md border bg-card overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">#</TableHead>
                            <TableHead className="text-xs">SKU</TableHead>
                            <TableHead className="text-xs min-w-[200px]">Description</TableHead>
                            <TableHead className="text-xs">Vendor #</TableHead>
                            <TableHead className="text-xs">UPC</TableHead>
                            <TableHead className="text-xs">Size</TableHead>
                            <TableHead className="text-xs text-right">Price</TableHead>
                            <TableHead className="text-xs text-right">Req Qty</TableHead>
                            <TableHead className="text-xs text-right">Acc Qty</TableHead>
                            <TableHead className="text-xs">UOM</TableHead>
                            <TableHead className="text-xs text-right">Total</TableHead>
                            <TableHead className="text-xs">Rebate</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedItems.map((item: any, idx: number) => {
                            const reqQty = parseFloat(item.requestedQuantity || item.quantity || item.qty || "0") || 0;
                            const accQty = parseFloat(item.acceptedQuantity || "0") || 0;
                            const qtyMismatch = reqQty !== accQty && reqQty > 0 && accQty > 0;
                            const itemSku = item.sku || item.number || item.itemCode || "-";
                            const itemDesc = item.itemDesc || item.description || "-";
                            const itemPrice = item.price || item.unitPrice;
                            const itemTotal = item.totalAmount || (reqQty * (parseFloat(itemPrice || "0") || 0));
                            return (
                              <TableRow key={idx} className={qtyMismatch ? "bg-amber-500/5" : ""} data-testid={`row-line-item-${idx}`}>
                                <TableCell className="text-xs">{item.itemNo || idx + 1}</TableCell>
                                <TableCell className="text-xs font-mono">{itemSku}</TableCell>
                                <TableCell className="text-xs">{itemDesc}</TableCell>
                                <TableCell className="text-xs">{item.vendorNo || "-"}</TableCell>
                                <TableCell className="text-xs">{item.upc || "-"}</TableCell>
                                <TableCell className="text-xs">{item.size ? [item.size.width, item.size.height, item.size.depth].filter(Boolean).join(" x ") : "-"}</TableCell>
                                <TableCell className="text-xs text-right">{itemPrice ? formatCurrency(itemPrice) : "-"}</TableCell>
                                <TableCell className="text-xs text-right">{item.requestedQuantity || item.quantity || item.qty || "-"}</TableCell>
                                <TableCell className="text-xs text-right">{item.acceptedQuantity || "-"}</TableCell>
                                <TableCell className="text-xs">{item.uom || "-"}</TableCell>
                                <TableCell className="text-xs text-right">{itemTotal ? formatCurrency(itemTotal) : "-"}</TableCell>
                                <TableCell className="text-xs">{item.rebate || "-"}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {poLines.length > 0 && (
                  <div>
                    {sortedItems.length > 0 && <Separator className="mb-4" />}
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

            {activeTab === "financials" && (
              <div className="space-y-6" data-testid="tab-content-financials">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <DollarSign className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                      <p className="text-lg font-bold" data-testid="text-financial-gross">{content?.grossAmount || formatCurrency(content?.totalAmount)}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Gross Amount</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Tag className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                      <p className="text-lg font-bold" data-testid="text-financial-allowance">{content?.allowanceOrCharge || "-"}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Allowances/Charges</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Tag className="w-5 h-5 text-red-600 mx-auto mb-1" />
                      <p className="text-lg font-bold" data-testid="text-financial-rebates">{formatCurrency(totalRebates)}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Rebates</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <DollarSign className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                      <p className="text-lg font-bold" data-testid="text-financial-net">{formatCurrency(netTotal)}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Net Total</p>
                    </CardContent>
                  </Card>
                </div>

                {itemsForCalc.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Item-level Breakdown</p>
                    <div className="rounded-md border bg-card overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider">SKU</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Price</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Qty</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Total</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Rebate</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {itemsForCalc.map((item: any, idx: number) => (
                            <TableRow key={idx} data-testid={`row-financial-item-${idx}`}>
                              <TableCell className="text-xs font-mono">{item.sku || "-"}</TableCell>
                              <TableCell className="text-xs text-right tabular-nums">{item.price ? formatCurrency(item.price) : "-"}</TableCell>
                              <TableCell className="text-xs text-right tabular-nums">{item.requestedQuantity || item.acceptedQuantity || "-"}</TableCell>
                              <TableCell className="text-xs text-right tabular-nums font-semibold">{item.totalAmount ? formatCurrency(item.totalAmount) : "-"}</TableCell>
                              <TableCell className="text-xs text-right tabular-nums">{item.rebate || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "supplier" && hasSupplier && (
              <div className="space-y-4" data-testid="tab-content-supplier">
                <Card>
                  <CardContent className="p-5 space-y-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Supplier Information</p>
                    {content.supplier.name && <DetailRow icon={Building2} label="Name" value={content.supplier.name} testId="text-supplier-name" />}
                    {content.supplier.warehouseZip && <DetailRow icon={MapPin} label="Warehouse Zip" value={content.supplier.warehouseZip} />}
                    {content.supplier.phone && (
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2 shrink-0">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground/70" />
                          <p className="text-sm text-muted-foreground">Phone</p>
                        </div>
                        <a href={`tel:${content.supplier.phone}`} className="text-sm font-medium text-right underline" data-testid="link-supplier-phone">{content.supplier.phone}</a>
                      </div>
                    )}
                    {content.supplier.email && (
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2 shrink-0">
                          <Mail className="w-3.5 h-3.5 text-muted-foreground/70" />
                          <p className="text-sm text-muted-foreground">Email</p>
                        </div>
                        <a href={`mailto:${content.supplier.email}`} className="text-sm font-medium text-right underline" data-testid="link-supplier-email">{content.supplier.email}</a>
                      </div>
                    )}
                    {content.supplier.fax && <DetailRow icon={Phone} label="Fax" value={content.supplier.fax} />}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "customer" && (
              <div className="space-y-4" data-testid="tab-content-customer">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-5 space-y-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</p>
                      {content?.customer?.name && <DetailRow icon={User} label="Name" value={content.customer.name} testId="text-customer-name" />}
                      {content?.customer?.id && <DetailRow icon={Hash} label="ID" value={content.customer.id} />}
                      {content?.customer?.email && <DetailRow icon={Mail} label="Email" value={content.customer.email} />}
                      <DetailRow icon={MapPin} label="Address" value={content?.customer ? [content.customer.street, content.customer.city, content.customer.state, content.customer.zip, content.customer.country].filter(Boolean).join(", ") || "-" : "-"} />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ship To</p>
                        {content?.shipTo?.name && content?.customer?.name && content.shipTo.name === content.customer.name && (
                          <Badge variant="secondary" className="text-[10px]" data-testid="badge-same-as-customer">Same as Customer</Badge>
                        )}
                      </div>
                      {content?.shipTo?.name && <DetailRow icon={User} label="Name" value={content.shipTo.name} />}
                      {content?.shipTo?.locationCode && <DetailRow icon={Hash} label="Location Code" value={content.shipTo.locationCode} />}
                      <DetailRow icon={MapPin} label="Address" value={content?.shipTo ? [content.shipTo.street, content.shipTo.city, content.shipTo.state, content.shipTo.zip, content.shipTo.country].filter(Boolean).join(", ") || "-" : "-"} />
                      {content?.shipTo?.email && <DetailRow icon={Mail} label="Email" value={content.shipTo.email} />}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-5 space-y-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bill To</p>
                      {content?.billTo?.name && <DetailRow icon={User} label="Name" value={content.billTo.name} />}
                      <DetailRow icon={MapPin} label="Address" value={content?.billTo ? [content.billTo.street, content.billTo.city, content.billTo.state, content.billTo.zip, content.billTo.country].filter(Boolean).join(", ") || "-" : "-"} />
                      {content?.billTo?.email && <DetailRow icon={Mail} label="Email" value={content.billTo.email} />}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === "documents" && (
              <div className="space-y-4" data-testid="tab-content-documents">
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <p className="text-sm font-semibold">Packing Slip</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{content?.packingSlipUrl ? "Available for download" : "No packing slip available"}</p>
                      </div>
                      {content?.packingSlipUrl && (
                        <a href={content.packingSlipUrl} target="_blank" rel="noopener noreferrer" data-testid="link-packing-slip">
                          <Button variant="outline" size="sm">
                            <Download className="w-3.5 h-3.5 mr-1.5" />
                            Download
                          </Button>
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <p className="text-sm font-semibold">PO Content</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{order.poContent ? "Purchase order data available" : "No PO content available"}</p>
                      </div>
                      {order.poContent && (
                        <Button variant="outline" size="sm" onClick={() => setDocDialog({ open: true, title: "PO Content", content: order.poContent })} data-testid="button-view-po-content">
                          <Eye className="w-3.5 h-3.5 mr-1.5" />
                          View
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <p className="text-sm font-semibold">Invoice</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{order.invoiceContent ? "Invoice data available" : "No invoice generated yet"}</p>
                      </div>
                      {order.invoiceContent && (
                        <Button variant="outline" size="sm" onClick={() => setDocDialog({ open: true, title: "Invoice Content", content: order.invoiceContent })} data-testid="button-view-invoice-content">
                          <Eye className="w-3.5 h-3.5 mr-1.5" />
                          View
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

              </div>
            )}

            {activeTab === "invoices" && hasInvoice && (
              <div className="space-y-4" data-testid="tab-content-invoices">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <InfoCard icon={FileText} label="Invoice Number" value={invoiceMeta.number} accent="bg-teal-500/10" testId="text-invoice-number" />
                  <InfoCard icon={Calendar} label="Invoice Date" value={formatDate(invoiceMeta.date)} accent="bg-teal-500/10" />
                  {invoiceData?.shipDate && <InfoCard icon={Truck} label="Ship Date" value={formatDate(invoiceData.shipDate)} accent="bg-teal-500/10" />}
                  {invoiceData?.storeNumber && <InfoCard icon={Building2} label="Store Number" value={invoiceData.storeNumber} accent="bg-teal-500/10" />}
                </div>

                {trackingNumbers.length > 0 && (
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Tracking Numbers</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {trackingNumbers.map((t: string, i: number) => (
                        <Badge key={i} variant="secondary" className="font-mono text-xs" data-testid={`badge-tracking-${i}`}>{t.replace("Tracking:", "")}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {invoiceLines.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Invoice Line Items</p>
                    <LineItemsTable items={invoiceLines} />
                  </div>
                )}

                {invoiceTotal && (
                  <div className="grid grid-cols-2 gap-3">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <DollarSign className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                        <p className="text-xl font-bold" data-testid="text-invoice-total">{formatCurrency(invoiceTotal.amount)}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Invoice Total</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <DollarSign className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                        <p className="text-xl font-bold" data-testid="text-invoice-net">{formatCurrency(invoiceTotal.netAmount)}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Net Amount</p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {invoiceTotal && content?.totalAmount && (
                  (() => {
                    const invAmt = parseFloat(invoiceTotal.amount || "0") || 0;
                    const poAmt = parseFloat(content.totalAmount || "0") || 0;
                    if (invAmt > 0 && poAmt > 0 && Math.abs(invAmt - poAmt) > 0.01) {
                      return (
                        <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-200/50" data-testid="alert-invoice-discrepancy">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Discrepancy Detected</p>
                          </div>
                          <p className="text-sm mt-1">Invoice total ({formatCurrency(invAmt)}) does not match PO total ({formatCurrency(poAmt)}). Difference: {formatCurrency(Math.abs(invAmt - poAmt))}</p>
                        </div>
                      );
                    }
                    return null;
                  })()
                )}
              </div>
            )}

            {activeTab === "activity" && (
              <div data-testid="tab-content-activity">
                <OrderHistoryTimeline orderId={orderId} />
              </div>
            )}

            <ContentViewerDialog
              open={docDialog.open}
              onClose={() => setDocDialog({ open: false, title: "", content: null })}
              title={docDialog.title}
              titleIcon={docDialog.title.includes("Invoice") ? Receipt : ClipboardList}
              content={docDialog.content}
              rawContent={docDialog.content}
              accentColor={docDialog.title.includes("Invoice") ? "emerald" : "blue"}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-40 gap-2">
          <ShoppingCart className="w-8 h-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Order not found</p>
        </div>
      )}
    </div>
  );
}

export default function Orders() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [, navigate] = useLocation();
  const limit = 25;

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

  return (
    <div className="flex flex-col h-full gap-4 p-4 overflow-auto" data-testid="page-orders">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-red-500/15">
              <ShoppingCart className="w-5 h-5 text-red-600" />
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
                        onClick={() => navigate(`/orders/${row.id}`)}
                        data-testid={`row-order-${row.id}`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-red-500/15 shrink-0">
                              <ShoppingCart className="w-3.5 h-3.5 text-red-600" />
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
    </div>
  );
}
