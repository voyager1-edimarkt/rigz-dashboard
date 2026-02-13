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
  ClipboardList,
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
  AlertCircle,
  Send,
  Receipt,
  Building2,
  History,
  ArrowRight,
  Inbox,
  Send as SendIcon,
  Zap,
  Eye,
  Copy,
  Check,
  Code,
  LayoutList,
  Store,
  Mail,
  Globe,
  Phone,
  Tag,
  Layers,
  Box,
  Filter,
  ArrowUpDown,
  LayoutDashboard,
  ArrowLeft,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useState, useRef } from "react";
import { useLocation } from "wouter";
import type {
  PurchaseOrderRow,
  PurchaseOrderDetail,
  PurchaseOrderListResult,
  PurchaseOrderStats,
  PurchaseOrderDataRow,
} from "@shared/schema";

const STATUS_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  PO_RECEIVED: { icon: ClipboardList, color: "bg-red-500/15 text-red-700 border-red-200", label: "PO Received" },
  PO_SENT: { icon: Send, color: "bg-indigo-500/15 text-indigo-700 border-indigo-200", label: "PO Sent" },
  PO_SEND_RECEIPT: { icon: Receipt, color: "bg-teal-500/15 text-teal-700 border-teal-200", label: "PO Send Receipt" },
  BILL_SENT: { icon: Send, color: "bg-orange-500/15 text-orange-700 border-orange-200", label: "Bill Sent" },
  INVOICE_RECEIVED: { icon: CheckCircle2, color: "bg-emerald-500/15 text-emerald-700 border-emerald-200", label: "Invoice Received" },
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

interface TabDef {
  id: string;
  label: string;
  icon: any;
  color: string;
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

  const items = data.items || [];
  const invoices = data.invoices;

  if (invoices && Array.isArray(invoices) && invoices.length > 0) {
    return (
      <div className="space-y-4">
        {invoices.map((inv: any, idx: number) => (
          <div key={idx} className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {inv.poNumber && (
                <div className="rounded-lg border border-border/50 p-2.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">PO Number</p>
                  <p className="text-sm font-medium font-mono mt-0.5">{inv.poNumber}</p>
                </div>
              )}
              {inv.date && (
                <div className="rounded-lg border border-border/50 p-2.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Date</p>
                  <p className="text-sm font-medium mt-0.5">{inv.date}</p>
                </div>
              )}
              {inv.shipmentDate && (
                <div className="rounded-lg border border-border/50 p-2.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Ship Date</p>
                  <p className="text-sm font-medium mt-0.5">{inv.shipmentDate}</p>
                </div>
              )}
              {inv.grossAmount && (
                <div className="rounded-lg border border-border/50 p-2.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Gross Amount</p>
                  <p className="text-sm font-medium mt-0.5 text-red-600">{formatCurrency(inv.grossAmount)}</p>
                </div>
              )}
            </div>
            {inv.shipTo?.name && (
              <div className="rounded-lg border border-border/50 p-3 space-y-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <Truck className="w-3.5 h-3.5 text-emerald-500" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ship To</p>
                </div>
                <p className="text-sm font-medium">{inv.shipTo.name}</p>
                {inv.shipTo.street && (
                  <p className="text-xs text-muted-foreground">
                    {[inv.shipTo.street?.trim(), inv.shipTo.city, inv.shipTo.state, inv.shipTo.zip].filter(Boolean).join(", ")}
                  </p>
                )}
              </div>
            )}
            {inv.trackingNumber && (
              <div className="flex items-center gap-2 flex-wrap">
                <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                <Badge variant="secondary" className="text-xs font-mono">{inv.trackingNumber}</Badge>
              </div>
            )}
            {inv.items && inv.items.length > 0 && (
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
                    {inv.items.map((line: any, li: number) => {
                      const qty = parseFloat(line.acceptedQuantity || line.requestedQuantity || line.qty || "0") || 0;
                      const price = parseFloat(line.price || line.unitPrice || "0") || 0;
                      const total = parseFloat(line.totalAmount || "0") || qty * price;
                      return (
                        <TableRow key={li}>
                          <TableCell className="text-xs font-mono text-red-600">{line.sku || "-"}</TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">{line.itemDesc || line.description || "-"}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{qty}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums text-muted-foreground">{formatCurrency(price)}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums font-semibold">{formatCurrency(total)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        ))}
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
        {data.vendor && (
          <div className="rounded-lg border border-border/50 p-2.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Vendor</p>
            <p className="text-sm font-medium mt-0.5">{data.vendor}</p>
          </div>
        )}
        {data.status && (
          <div className="rounded-lg border border-border/50 p-2.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Status</p>
            <p className="text-sm font-medium mt-0.5">{data.status}</p>
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
                  const sku = item.sku || "-";
                  const desc = item.description || "-";
                  const qty = item.qty || 0;
                  const price = item.price || 0;
                  const total = qty * price;
                  return (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-mono text-red-600">{sku}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{desc}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{qty}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums text-muted-foreground">{formatCurrency(price)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums font-semibold">{formatCurrency(total)}</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-muted/30 border-t-2">
                  <TableCell colSpan={4} className="text-xs font-bold text-right uppercase tracking-wider">Total</TableCell>
                  <TableCell className="text-sm text-right font-bold tabular-nums text-red-600">
                    {formatCurrency(items.reduce((s: number, it: any) => s + (it.qty || 0) * (it.price || 0), 0))}
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

function PurchaseOrderHistoryTimeline({ poId }: { poId: number }) {
  const { data: history, isLoading } = useQuery<PurchaseOrderDataRow[]>({
    queryKey: ['/api/purchase-orders', poId, 'history'],
    enabled: !!poId,
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
    <div className="relative" data-testid="po-history-timeline">
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

function POTimeline({ steps }: { steps: { label: string; date: string | null; completed: boolean }[] }) {
  return (
    <div className="flex items-center w-full overflow-x-auto" data-testid="po-timeline">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center flex-1 min-w-0">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-3 h-3 rounded-full ${step.completed ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
            <p className={`text-[10px] font-medium text-center ${step.completed ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</p>
            {step.date && <p className="text-[9px] text-muted-foreground">{step.date}</p>}
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 ${step.completed ? 'bg-emerald-500' : 'bg-muted-foreground/20'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export function PurchaseOrderDetailPage({ poId }: { poId: number }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [, navigate] = useLocation();
  const [skuFilter, setSkuFilter] = useState("");
  const [sortByPrice, setSortByPrice] = useState(false);

  const { data: po, isLoading } = useQuery<PurchaseOrderDetail>({
    queryKey: ['/api/purchase-orders', poId],
    enabled: !!poId,
  });

  const content = safeParseJson(po?.content);
  const invoiceContent = safeParseJson(po?.invoiceContent);

  const contentItems = content?.items || [];
  const invoiceData = invoiceContent?.invoices || [];
  const hasInvoices = invoiceData.length > 0;

  const statusCfg = po ? getStatusConfig(po.status) : null;
  const StatusIcon = statusCfg?.icon || AlertCircle;

  const totalAmount = contentItems.reduce((s: number, it: any) => {
    const qty = parseFloat(it.qty || "0") || 0;
    const price = parseFloat(it.price || "0") || 0;
    return s + qty * price;
  }, 0);
  const totalQty = contentItems.reduce((s: number, it: any) => s + (parseFloat(it.qty || "0") || 0), 0);

  const vendorAddress = content?.vendorAddress;

  const timelineSteps = [
    { label: "Created", date: po ? formatDate(po.createdAt) : null, completed: !!po },
    { label: "PO Generated", date: content?.poDate ? formatDate(content.poDate) : null, completed: !!content?.poDate },
    { label: "Shipped", date: content?.shipDate ? formatDate(content.shipDate) : null, completed: !!content?.shipDate },
    { label: "Invoiced", date: hasInvoices && invoiceData[0]?.date ? formatDate(invoiceData[0].date) : null, completed: hasInvoices },
  ];

  const filteredItems = contentItems.filter((item: any) => {
    if (!skuFilter) return true;
    const term = skuFilter.toLowerCase();
    const sku = (item.sku || "").toLowerCase();
    const desc = (item.description || "").toLowerCase();
    const vendorSku = (item.vendorSku || "").toLowerCase();
    return sku.includes(term) || desc.includes(term) || vendorSku.includes(term);
  });
  const sortedItems = sortByPrice
    ? [...filteredItems].sort((a: any, b: any) => (parseFloat(b.price || "0") || 0) - (parseFloat(a.price || "0") || 0))
    : filteredItems;

  const tabs: TabDef[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard, color: "bg-red-500/15 text-red-700" },
    { id: "details", label: "PO Details", icon: ClipboardList, color: "bg-blue-500/15 text-blue-700" },
    ...(contentItems.length > 0 ? [{ id: "items", label: `Line Items (${contentItems.length})`, icon: Package, color: "bg-amber-500/15 text-amber-700" }] : []),
    ...(hasInvoices ? [{ id: "invoices", label: "Invoices", icon: Receipt, color: "bg-emerald-500/15 text-emerald-700" }] : []),
    { id: "activity", label: "Activity Log", icon: History, color: "bg-violet-500/15 text-violet-700" },
  ];

  return (
    <div className="flex flex-col h-full overflow-auto" data-testid="page-po-detail">
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
      ) : po ? (
        <div className="pb-6">
          <div className="px-6 pt-5 pb-0">
            <div className="flex items-center gap-3 pb-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/purchase-orders")} data-testid="button-back-po">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-500 shrink-0">
                <ClipboardList className="w-4.5 h-4.5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-semibold" data-testid="text-detail-po-number">
                  PO #{po.poNumber}
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
                  <span className="text-sm text-muted-foreground">{po.vendor}</span>
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
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Status</p>
                          <p className="text-sm font-semibold mt-0.5">{statusCfg?.label || po.status}</p>
                          {po.statusMessage && <p className="text-xs text-muted-foreground mt-0.5 truncate">{po.statusMessage}</p>}
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
                          <p className="text-sm font-semibold mt-0.5">{po.poNumber}</p>
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
                          <p className="text-sm font-semibold mt-0.5">{po.vendor}</p>
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
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Total Amount</p>
                          <p className="text-sm font-semibold mt-0.5">{formatCurrency(totalAmount)}</p>
                          {contentItems.length > 0 && <p className="text-xs text-muted-foreground mt-0.5">{contentItems.length} items</p>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card data-testid="card-overview-order-date">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-cyan-500/15 shrink-0">
                          <Calendar className="w-4 h-4 text-cyan-700" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Order Date</p>
                          <p className="text-sm font-semibold mt-0.5">{formatDate(po.orderDate)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card data-testid="card-overview-ship-date">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-purple-500/15 shrink-0">
                          <Truck className="w-4 h-4 text-purple-700" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Ship Date</p>
                          <p className="text-sm font-semibold mt-0.5">{content?.shipDate ? formatDate(content.shipDate) : "-"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardContent className="p-4">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">PO Timeline</p>
                    <POTimeline steps={timelineSteps} />
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 space-y-3">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Metadata</p>
                    <DetailRow icon={Hash} label="PO Number" value={po.poNumber} testId="text-overview-po-num" />
                    <DetailRow icon={Hash} label="CRM ID" value={po.crmId} testId="text-overview-crm-id" />
                    <DetailRow icon={Building2} label="Vendor" value={po.vendor} />
                    <DetailRow icon={Calendar} label="Created At" value={formatDateTime(po.createdAt)} />
                    <DetailRow icon={Calendar} label="Updated At" value={formatDateTime(po.updatedAt)} />
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "details" && (
              <div className="space-y-6" data-testid="tab-content-details">
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">PO Information</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-5 space-y-4">
                        <DetailRow icon={Hash} label="PO ID" value={String(po.id)} testId="text-detail-id" />
                        <DetailRow icon={Hash} label="PO Number" value={po.poNumber} testId="text-detail-po-num" />
                        <DetailRow icon={Hash} label="Index" value={String(po.index)} />
                        <DetailRow icon={Hash} label="CRM ID" value={po.crmId} />
                        <DetailRow icon={Calendar} label="PO Date" value={content?.poDate ? formatDateTime(content.poDate) : "-"} />
                        <DetailRow icon={Truck} label="Ship Date" value={content?.shipDate ? formatDate(content.shipDate) : "-"} />
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
                        <DetailRow icon={AlertCircle} label="Status Message" value={po.statusMessage} testId="text-detail-status-msg" />
                        <DetailRow icon={Building2} label="Vendor" value={po.vendor} />
                        <DetailRow icon={Calendar} label="Created At" value={formatDateTime(po.createdAt)} />
                        <DetailRow icon={Calendar} label="Updated At" value={formatDateTime(po.updatedAt)} />
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {vendorAddress && (
                  <div>
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Vendor Address</p>
                    <Card>
                      <CardContent className="p-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                          <DetailRow icon={Building2} label="Name" value={vendorAddress.name} />
                          <DetailRow icon={MapPin} label="Street" value={vendorAddress.street} />
                          <DetailRow icon={MapPin} label="City" value={vendorAddress.city} />
                          <DetailRow icon={MapPin} label="State" value={vendorAddress.state} />
                          <DetailRow icon={MapPin} label="Zip" value={vendorAddress.zip} />
                          <DetailRow icon={Globe} label="Country" value={vendorAddress.country} />
                          <DetailRow icon={Mail} label="Email" value={vendorAddress.email} />
                          <DetailRow icon={Phone} label="Phone" value={vendorAddress.phone} />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}

            {activeTab === "items" && (
              <div className="space-y-4" data-testid="tab-content-items">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <StatMini icon={Package} label="Total Items" value={String(contentItems.length)} color="bg-amber-500/10 text-amber-700" />
                  <StatMini icon={DollarSign} label="Total Amount" value={formatCurrency(totalAmount)} color="bg-emerald-500/10 text-emerald-700" />
                  <StatMini icon={Layers} label="Total Qty" value={String(totalQty)} color="bg-blue-500/10 text-blue-700" />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Filter by SKU, description, or vendor SKU..."
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
                            <TableHead className="text-xs">SKU</TableHead>
                            <TableHead className="text-xs min-w-[200px]">Description</TableHead>
                            <TableHead className="text-xs">Vendor SKU</TableHead>
                            <TableHead className="text-xs">Barcode</TableHead>
                            <TableHead className="text-xs text-right">Qty</TableHead>
                            <TableHead className="text-xs text-right">Price</TableHead>
                            <TableHead className="text-xs text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedItems.map((item: any, idx: number) => {
                            const qty = parseFloat(item.qty || "0") || 0;
                            const price = parseFloat(item.price || "0") || 0;
                            const itemTotal = qty * price;
                            const desc = (item.description || "-").replace(/<[^>]*>/g, "");
                            return (
                              <TableRow key={idx} className="hover:bg-muted/20" data-testid={`row-line-item-${idx}`}>
                                <TableCell className="text-xs font-mono text-red-600">{item.sku || "-"}</TableCell>
                                <TableCell className="text-xs max-w-[220px] truncate">{desc}</TableCell>
                                <TableCell className="text-xs font-mono">{item.vendorSku || "-"}</TableCell>
                                <TableCell className="text-xs font-mono">{item.barcode || "-"}</TableCell>
                                <TableCell className="text-xs text-right tabular-nums">{qty}</TableCell>
                                <TableCell className="text-xs text-right tabular-nums text-muted-foreground">{formatCurrency(price)}</TableCell>
                                <TableCell className="text-xs text-right tabular-nums font-semibold">{formatCurrency(itemTotal)}</TableCell>
                              </TableRow>
                            );
                          })}
                          <TableRow className="bg-muted/30 border-t-2">
                            <TableCell colSpan={6} className="text-xs font-bold text-right uppercase tracking-wider">Grand Total</TableCell>
                            <TableCell className="text-sm text-right font-bold tabular-nums text-red-600">{formatCurrency(totalAmount)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "invoices" && hasInvoices && (
              <div className="space-y-6" data-testid="tab-content-invoices">
                {invoiceData.map((inv: any, invIdx: number) => (
                  <div key={invIdx} className="space-y-4">
                    {invoiceData.length > 1 && (
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Invoice #{invIdx + 1}</p>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <InfoCard icon={FileText} label="PO Number" value={inv.poNumber} accent="bg-teal-500/10" testId={`text-invoice-po-${invIdx}`} />
                      <InfoCard icon={Calendar} label="Invoice Date" value={formatDate(inv.date)} accent="bg-teal-500/10" />
                      {inv.shipmentDate && <InfoCard icon={Truck} label="Shipment Date" value={formatDate(inv.shipmentDate)} accent="bg-teal-500/10" />}
                      {inv.grossAmount && <InfoCard icon={DollarSign} label="Gross Amount" value={formatCurrency(inv.grossAmount)} accent="bg-emerald-500/10" testId={`text-invoice-gross-${invIdx}`} />}
                    </div>

                    {inv.carrierSCAC && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                        <Badge variant="secondary" className="text-xs">{inv.carrierSCAC}</Badge>
                        {inv.trackingNumber && (
                          <Badge variant="secondary" className="text-xs font-mono" data-testid={`badge-tracking-${invIdx}`}>{inv.trackingNumber}</Badge>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {inv.shipTo?.name && (
                        <div className="rounded-lg border border-border/50 p-3 space-y-1">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Truck className="w-3.5 h-3.5 text-emerald-500" />
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ship To</p>
                          </div>
                          <p className="text-sm font-medium">{inv.shipTo.name}</p>
                          {inv.shipTo.street && (
                            <p className="text-xs text-muted-foreground">
                              {[inv.shipTo.street?.trim(), inv.shipTo.city, inv.shipTo.state, inv.shipTo.zip].filter(Boolean).join(", ")}
                            </p>
                          )}
                        </div>
                      )}
                      {inv.billTo?.name && (
                        <div className="rounded-lg border border-border/50 p-3 space-y-1">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Building2 className="w-3.5 h-3.5 text-blue-500" />
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Bill To</p>
                          </div>
                          <p className="text-sm font-medium">{inv.billTo.name}</p>
                          {inv.billTo.street && (
                            <p className="text-xs text-muted-foreground">
                              {[inv.billTo.street?.trim(), inv.billTo.city, inv.billTo.state, inv.billTo.zip].filter(Boolean).join(", ")}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {inv.items && inv.items.length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Invoice Line Items</p>
                        <div className="rounded-lg border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/40">
                                <TableHead className="text-[10px] font-bold uppercase tracking-wider">#</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase tracking-wider">SKU</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Description</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Req Qty</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Acc Qty</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Price</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase tracking-wider">UOM</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {inv.items.map((line: any, li: number) => {
                                const lineTotal = parseFloat(line.totalAmount || "0") || 0;
                                return (
                                  <TableRow key={li} className="hover:bg-muted/20" data-testid={`row-invoice-item-${invIdx}-${li}`}>
                                    <TableCell className="text-xs">{line.itemNo || li + 1}</TableCell>
                                    <TableCell className="text-xs font-mono text-red-600">{line.sku || "-"}</TableCell>
                                    <TableCell className="text-xs max-w-[200px] truncate">{line.itemDesc || "-"}</TableCell>
                                    <TableCell className="text-xs text-right tabular-nums">{line.requestedQuantity || "-"}</TableCell>
                                    <TableCell className="text-xs text-right tabular-nums">{line.acceptedQuantity || "-"}</TableCell>
                                    <TableCell className="text-xs text-right tabular-nums text-muted-foreground">{formatCurrency(line.price)}</TableCell>
                                    <TableCell className="text-xs">{line.uom || "-"}</TableCell>
                                    <TableCell className="text-xs text-right tabular-nums font-semibold">{formatCurrency(lineTotal)}</TableCell>
                                  </TableRow>
                                );
                              })}
                              <TableRow className="bg-muted/30 border-t-2">
                                <TableCell colSpan={7} className="text-xs font-bold text-right uppercase tracking-wider">Total</TableCell>
                                <TableCell className="text-sm text-right font-bold tabular-nums text-red-600">
                                  {formatCurrency(inv.grossAmount || inv.items.reduce((s: number, it: any) => s + (parseFloat(it.totalAmount || "0") || 0), 0))}
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    {invIdx < invoiceData.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            )}

            {activeTab === "activity" && (
              <div data-testid="tab-content-activity">
                <PurchaseOrderHistoryTimeline poId={poId} />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-40 gap-2">
          <ClipboardList className="w-8 h-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Purchase order not found</p>
        </div>
      )}
    </div>
  );
}

export default function PurchaseOrders() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [, navigate] = useLocation();
  const limit = 25;

  const queryParams = new URLSearchParams();
  queryParams.set("limit", String(limit));
  queryParams.set("offset", String(page * limit));
  if (search) queryParams.set("search", search);
  if (statusFilter) queryParams.set("status", statusFilter);
  if (vendorFilter) queryParams.set("vendor", vendorFilter);

  const listUrl = `/api/purchase-orders?${queryParams.toString()}`;

  const { data: poList, isLoading: listLoading } = useQuery<PurchaseOrderListResult>({
    queryKey: [listUrl],
  });

  const { data: stats } = useQuery<PurchaseOrderStats>({
    queryKey: ['/api/purchase-orders/stats'],
  });

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(0);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ predicate: (query) => {
      const key = query.queryKey[0];
      return typeof key === "string" && key.startsWith("/api/purchase-orders");
    }});
  };

  const totalRows = poList?.total ?? 0;
  const totalPages = Math.ceil(totalRows / limit);

  const topVendor = stats?.byVendor?.[0];

  return (
    <div className="flex flex-col h-full gap-4 p-4 overflow-auto" data-testid="page-purchase-orders">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-md bg-red-500/15">
            <ClipboardList className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold" data-testid="text-po-title">Purchase Orders</h1>
            <p className="text-sm text-muted-foreground">Browse and manage all purchase order records</p>
          </div>
        </div>
        <Button size="icon" variant="ghost" onClick={handleRefresh} data-testid="button-refresh-po">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card data-testid="card-stat-total">
            <CardContent className="p-3 text-center">
              <Package className="w-4 h-4 text-red-600 mx-auto mb-1" />
              <p className="text-lg font-bold">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total POs</p>
            </CardContent>
          </Card>
          {stats.byStatus.map((s) => {
            const cfg = getStatusConfig(s.status);
            const Icon = cfg.icon;
            return (
              <Card key={s.status} data-testid={`card-stat-${s.status}`}>
                <CardContent className="p-3 text-center">
                  <Icon className="w-4 h-4 mx-auto mb-1" />
                  <p className="text-lg font-bold">{s.cnt}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{cfg.label}</p>
                </CardContent>
              </Card>
            );
          })}
          {topVendor && (
            <Card data-testid="card-stat-top-vendor">
              <CardContent className="p-3 text-center">
                <Building2 className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                <p className="text-lg font-bold">{topVendor.cnt}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{topVendor.vendor}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">All Purchase Orders</CardTitle>
              <Badge variant="secondary" data-testid="badge-po-count">{totalRows.toLocaleString()}</Badge>
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
                placeholder="Search by PO number or CRM ID..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-8"
                data-testid="input-search-po"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setPage(0); }}>
              <SelectTrigger className="w-[160px]" data-testid="select-po-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PO_RECEIVED">PO Received</SelectItem>
                <SelectItem value="PO_SENT">PO Sent</SelectItem>
                <SelectItem value="PO_SEND_RECEIPT">PO Send Receipt</SelectItem>
                <SelectItem value="BILL_SENT">Bill Sent</SelectItem>
              </SelectContent>
            </Select>
            <Select value={vendorFilter} onValueChange={(v) => { setVendorFilter(v === "all" ? "" : v); setPage(0); }}>
              <SelectTrigger className="w-[160px]" data-testid="select-po-vendor">
                <SelectValue placeholder="Vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {stats?.byVendor?.map((v) => (
                  <SelectItem key={v.vendor} value={v.vendor}>{v.vendor} ({v.cnt})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleSearch} data-testid="button-search-po">
              <Search className="w-3.5 h-3.5 mr-1.5" />
              Search
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 min-h-0 overflow-auto">
          {listLoading ? (
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
          ) : poList && poList.rows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[140px]">PO Number</TableHead>
                  <TableHead className="min-w-[100px]">Vendor</TableHead>
                  <TableHead className="min-w-[120px]">Status</TableHead>
                  <TableHead className="min-w-[110px]">Order Date</TableHead>
                  <TableHead className="min-w-[80px]">CRM ID</TableHead>
                  <TableHead className="min-w-[140px]">Status Message</TableHead>
                  <TableHead className="min-w-[110px]">Created</TableHead>
                  <TableHead className="min-w-[110px]">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {poList.rows.map((row) => {
                  const cfg = getStatusConfig(row.status);
                  const RowStatusIcon = cfg.icon;
                  return (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/purchase-orders/${row.id}`)}
                      data-testid={`row-po-${row.id}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-red-500/15 shrink-0">
                            <ClipboardList className="w-3.5 h-3.5 text-red-600" />
                          </div>
                          <span className="text-sm font-medium font-mono" data-testid={`text-po-num-${row.id}`}>
                            {row.poNumber}
                          </span>
                        </div>
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
                        <span className="text-xs text-muted-foreground">{formatDate(row.orderDate)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-mono text-muted-foreground">{row.crmId || "-"}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground truncate block max-w-[200px]">{row.statusMessage || "-"}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">{formatDate(row.createdAt)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">{formatDate(row.updatedAt)}</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <ClipboardList className="w-8 h-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No purchase orders found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
