import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, ShoppingCart, Package, FileText, User, DollarSign,
  Calendar, Clock, CheckCircle2, XCircle, AlertCircle, Mail, Phone,
  MapPin, Hash, Truck, CreditCard, CircleDot, CircleCheck, Circle,
} from "lucide-react";

const orderStateLabels: Record<string, string> = {
  draft: "Quotation", sent: "Quotation Sent", sale: "Sales Order",
  done: "Locked", cancel: "Cancelled",
};
const orderStateVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline", sent: "secondary", sale: "default", done: "secondary", cancel: "destructive",
};
const invoiceStateLabels: Record<string, string> = {
  draft: "Draft", posted: "Posted", cancel: "Cancelled",
};
const invoiceStateVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline", posted: "default", cancel: "destructive",
};
const paymentLabels: Record<string, string> = {
  not_paid: "Not Paid", in_payment: "In Payment", paid: "Paid",
  partial: "Partial", reversed: "Reversed", invoicing_legacy: "Legacy",
};
const paymentVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  not_paid: "destructive", in_payment: "secondary", paid: "default",
  partial: "outline", reversed: "destructive", invoicing_legacy: "outline",
};
const invoiceStatusLabels: Record<string, string> = {
  upselling: "Upselling", invoiced: "Fully Invoiced", "to invoice": "To Invoice", no: "Nothing to Invoice",
};
const deliveryStatusLabels: Record<string, string> = {
  full: "Fully Delivered", partial: "Partially Delivered", pending: "Pending", no: "Nothing to Deliver",
};

interface OrderDetailData {
  order: any;
  orderLines: any[];
  invoices: any[];
  partner: any;
}

export default function OdooOrderDetail({ orderId }: { orderId: number }) {
  const [, navigate] = useLocation();

  const { data, isLoading, error } = useQuery<OrderDetailData>({
    queryKey: ["/api/odoo/sale-orders", orderId, "timeline"],
    enabled: !!orderId,
  });

  if (isLoading) {
    return (
      <div className="h-full overflow-auto p-4 space-y-4" data-testid="page-odoo-order-loading">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !data?.order) {
    return (
      <div className="h-full overflow-auto p-4" data-testid="page-odoo-order-error">
        <Button variant="ghost" onClick={() => navigate("/sales-flow")} data-testid="button-back-to-sales">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Sales Flow
        </Button>
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-2">
            <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
            <p className="text-destructive font-medium">Failed to load order details</p>
            <p className="text-sm text-muted-foreground">Order ID: {orderId}</p>
          </div>
        </div>
      </div>
    );
  }

  const { order, orderLines, invoices, partner } = data;
  const customerName = Array.isArray(order.partner_id) ? order.partner_id[1] : "Unknown";

  const postedInvoices = invoices.filter((inv: any) => inv.state === "posted");
  const totalPaid = postedInvoices.reduce((sum: number, inv: any) =>
    sum + (inv.amount_total - inv.amount_residual), 0);
  const totalOutstanding = postedInvoices.reduce((sum: number, inv: any) =>
    sum + inv.amount_residual, 0);

  return (
    <div className="h-full overflow-auto p-4 space-y-4" data-testid="page-odoo-order-detail">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" onClick={() => navigate("/sales-flow")} data-testid="button-back-to-sales">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          <h1 className="text-xl font-semibold" data-testid="text-order-name">{order.name}</h1>
        </div>
        <Badge variant={orderStateVariants[order.state] || "outline"} data-testid="badge-order-state">
          {orderStateLabels[order.state] || order.state}
        </Badge>
        {order.invoice_status && (
          <Badge variant="outline" data-testid="badge-invoice-status">
            {invoiceStatusLabels[order.invoice_status] || order.invoice_status}
          </Badge>
        )}
      </div>

      {order.client_order_ref && (
        <p className="text-sm text-muted-foreground" data-testid="text-customer-ref">
          Ref: {order.client_order_ref}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-order-total">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="w-4 h-4" /> Order Total
            </div>
            <p className="text-2xl font-bold font-mono">${order.amount_total?.toFixed(2)}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
              <span>Untaxed: ${order.amount_untaxed?.toFixed(2)}</span>
              <span>Tax: ${order.amount_tax?.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-payment-status">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <CreditCard className="w-4 h-4" /> Payment
            </div>
            <p className="text-2xl font-bold font-mono">${totalPaid.toFixed(2)}</p>
            <div className="flex items-center gap-2 mt-1 text-xs flex-wrap">
              {totalOutstanding > 0.01 ? (
                <span className="text-destructive font-medium">Outstanding: ${totalOutstanding.toFixed(2)}</span>
              ) : (
                <span className="text-green-600 dark:text-green-400 font-medium">Fully Paid</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-line-items">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Package className="w-4 h-4" /> Line Items
            </div>
            <p className="text-2xl font-bold">{orderLines.length}</p>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
              <span>{invoices.length} invoice{invoices.length !== 1 ? "s" : ""}</span>
              {order.delivery_status && (
                <span>{deliveryStatusLabels[order.delivery_status] || order.delivery_status}</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-dates">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Calendar className="w-4 h-4" /> Dates
            </div>
            <p className="text-sm mt-1"><span className="text-muted-foreground">Order:</span> {order.date_order ? new Date(order.date_order).toLocaleDateString() : "-"}</p>
            <p className="text-sm"><span className="text-muted-foreground">Created:</span> {order.create_date ? new Date(order.create_date).toLocaleDateString() : "-"}</p>
            {order.commitment_date && (
              <p className="text-sm"><span className="text-muted-foreground">Commitment:</span> {new Date(order.commitment_date).toLocaleDateString()}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {orderLines.length > 0 && (
            <Card data-testid="card-order-lines">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="w-4 h-4" /> Line Items ({orderLines.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty Ordered</TableHead>
                        <TableHead className="text-right">Qty Delivered</TableHead>
                        <TableHead className="text-right">Qty Invoiced</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Discount</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderLines.map((line: any) => (
                        <TableRow key={line.id} data-testid={`row-line-${line.id}`}>
                          <TableCell>
                            <div>
                              <span className="font-medium">{Array.isArray(line.product_id) ? line.product_id[1] : "N/A"}</span>
                              {line.name && line.name !== (Array.isArray(line.product_id) ? line.product_id[1] : "") && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{line.name}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">{line.product_uom_qty}</TableCell>
                          <TableCell className="text-right font-mono">
                            <span className={line.qty_delivered < line.product_uom_qty ? "text-amber-600 dark:text-amber-400" : ""}>
                              {line.qty_delivered}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            <span className={line.qty_invoiced < line.product_uom_qty ? "text-amber-600 dark:text-amber-400" : ""}>
                              {line.qty_invoiced}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono">${line.price_unit?.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono">
                            {line.discount > 0 ? `${line.discount}%` : "-"}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">${line.price_subtotal?.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex items-center justify-end gap-4 p-3 border-t text-sm flex-wrap">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-mono font-semibold">${order.amount_untaxed?.toFixed(2)}</span>
                  <span className="text-muted-foreground">Tax:</span>
                  <span className="font-mono">${order.amount_tax?.toFixed(2)}</span>
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-mono font-bold text-base">${order.amount_total?.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {invoices.length > 0 && (
            <Card data-testid="card-invoices">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="w-4 h-4" /> Invoices ({invoices.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Outstanding</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((inv: any) => (
                        <TableRow key={inv.id} data-testid={`row-invoice-${inv.id}`}>
                          <TableCell className="font-medium">{inv.name || "Draft"}</TableCell>
                          <TableCell className="text-sm">{inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString() : "-"}</TableCell>
                          <TableCell className="text-sm">{inv.invoice_date_due ? new Date(inv.invoice_date_due).toLocaleDateString() : "-"}</TableCell>
                          <TableCell>
                            <Badge variant={invoiceStateVariants[inv.state] || "outline"}>
                              {invoiceStateLabels[inv.state] || inv.state}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={paymentVariants[inv.payment_state] || "outline"}>
                              {paymentLabels[inv.payment_state] || inv.payment_state}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">${inv.amount_total?.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono">
                            {inv.amount_residual > 0 ? (
                              <span className="text-destructive">${inv.amount_residual?.toFixed(2)}</span>
                            ) : (
                              <span className="text-green-600 dark:text-green-400">$0.00</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card data-testid="card-customer">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="w-4 h-4" /> Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="font-semibold" data-testid="text-customer-name">{customerName}</p>
              {partner && (
                <>
                  {partner.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{partner.email}</span>
                    </div>
                  )}
                  {(partner.phone || partner.mobile) && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{partner.phone || partner.mobile}</span>
                    </div>
                  )}
                  {(partner.street || partner.city) && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                      <div>
                        {partner.street && <p>{partner.street}</p>}
                        {partner.street2 && <p>{partner.street2}</p>}
                        <p>
                          {[partner.city, Array.isArray(partner.state_id) ? partner.state_id[1] : null, partner.zip]
                            .filter(Boolean).join(", ")}
                        </p>
                        {Array.isArray(partner.country_id) && <p>{partner.country_id[1]}</p>}
                      </div>
                    </div>
                  )}
                  {partner.vat && (
                    <div className="flex items-center gap-2 text-sm">
                      <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>VAT: {partner.vat}</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-timeline">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="w-4 h-4" /> Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TimelineView order={order} invoices={invoices} />
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}

function TimelineView({ order, invoices }: { order: any; invoices: any[] }) {
  const events: { date: string; icon: typeof CircleDot; color: string; title: string; detail: string }[] = [];

  if (order.create_date) {
    events.push({
      date: order.create_date,
      icon: CircleDot,
      color: "text-primary",
      title: "Order Created",
      detail: order.name,
    });
  }

  if ((order.state === "sale" || order.state === "done") && (order.date_order || order.create_date)) {
    events.push({
      date: order.date_order || order.create_date,
      icon: CircleCheck,
      color: "text-green-600 dark:text-green-400",
      title: "Order Confirmed",
      detail: `Total: $${order.amount_total?.toFixed(2)}`,
    });
  }

  if (order.state === "cancel" && order.write_date) {
    events.push({
      date: order.write_date,
      icon: XCircle,
      color: "text-destructive",
      title: "Order Cancelled",
      detail: "",
    });
  }

  for (const inv of invoices) {
    if (inv.create_date) {
      events.push({
        date: inv.create_date,
        icon: inv.state === "posted" ? CircleDot : inv.state === "cancel" ? XCircle : Circle,
        color: inv.state === "cancel" ? "text-destructive" : "text-blue-500 dark:text-blue-400",
        title: `Invoice ${inv.name || "Draft"}`,
        detail: `${invoiceStateLabels[inv.state] || inv.state} - $${inv.amount_total?.toFixed(2)}`,
      });
    }

    if (inv.state === "posted" && inv.payment_state === "paid" && inv.write_date) {
      events.push({
        date: inv.write_date,
        icon: CheckCircle2,
        color: "text-green-600 dark:text-green-400",
        title: "Payment Received",
        detail: `$${inv.amount_total?.toFixed(2)}`,
      });
    } else if (inv.state === "posted" && inv.payment_state === "partial" && inv.write_date) {
      events.push({
        date: inv.write_date,
        icon: CircleDot,
        color: "text-amber-500 dark:text-amber-400",
        title: "Partial Payment",
        detail: `Paid: $${(inv.amount_total - inv.amount_residual)?.toFixed(2)} / $${inv.amount_total?.toFixed(2)}`,
      });
    }
  }

  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="relative pl-5">
      <div className="absolute left-[9px] top-1 bottom-1 w-px bg-border" />
      {events.map((evt, idx) => {
        const Icon = evt.icon;
        return (
          <div key={idx} className="relative pb-5 last:pb-0" data-testid={`timeline-event-${idx}`}>
            <div className="absolute left-[-13px] top-0.5 w-5 h-5 rounded-full bg-background flex items-center justify-center">
              <Icon className={`w-4 h-4 ${evt.color}`} />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{evt.title}</p>
              {evt.detail && <p className="text-xs text-muted-foreground">{evt.detail}</p>}
              <p className="text-xs text-muted-foreground mt-0.5">{new Date(evt.date).toLocaleString()}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
