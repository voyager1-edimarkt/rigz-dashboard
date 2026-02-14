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
  ArrowLeft, Receipt, Package, User, DollarSign,
  Calendar, Clock, AlertCircle, Mail, Phone,
  MapPin, Hash, CreditCard, CircleDot, CircleCheck, XCircle,
} from "lucide-react";

const stateLabels: Record<string, string> = {
  draft: "Draft", posted: "Posted", cancel: "Cancelled",
};
const stateVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline", posted: "default", cancel: "destructive",
};
const paymentLabels: Record<string, string> = {
  not_paid: "Not Paid", in_payment: "In Payment", paid: "Paid",
  partial: "Partial", reversed: "Reversed",
};
const paymentVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  not_paid: "destructive", in_payment: "secondary", paid: "default",
  partial: "outline", reversed: "destructive",
};

interface BillDetailData {
  bill: any;
  lines: any[];
  partner: any;
}

export default function OdooBillDetail({ billId }: { billId: number }) {
  const [, navigate] = useLocation();

  const { data, isLoading, error } = useQuery<BillDetailData>({
    queryKey: ["/api/odoo/bills", billId],
    enabled: !!billId,
  });

  if (isLoading) {
    return (
      <div className="h-full overflow-auto p-4 space-y-4" data-testid="page-odoo-bill-loading">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !data?.bill) {
    return (
      <div className="h-full overflow-auto p-4" data-testid="page-odoo-bill-error">
        <Button variant="ghost" onClick={() => navigate("/purchase-flow")} data-testid="button-back">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to POs & Bills
        </Button>
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-2">
            <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
            <p className="text-destructive font-medium">Failed to load bill</p>
          </div>
        </div>
      </div>
    );
  }

  const { bill, lines, partner } = data;
  const vendorName = Array.isArray(bill.partner_id) ? bill.partner_id[1] : "Unknown";
  const amountPaid = bill.amount_total - bill.amount_residual;

  return (
    <div className="h-full overflow-auto p-4 space-y-4" data-testid="page-odoo-bill-detail">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" onClick={() => navigate("/purchase-flow")} data-testid="button-back">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5" />
          <h1 className="text-xl font-semibold" data-testid="text-bill-name">
            {bill.name || "Draft"}
            {bill.ref && (
              <span className="text-sm font-normal text-muted-foreground ml-1.5" data-testid="text-bill-ref">({bill.ref})</span>
            )}
          </h1>
        </div>
        <Badge variant={stateVariants[bill.state] || "outline"} data-testid="badge-bill-state">
          {stateLabels[bill.state] || bill.state}
        </Badge>
        <Badge variant={paymentVariants[bill.payment_state] || "outline"} data-testid="badge-payment-state">
          {paymentLabels[bill.payment_state] || bill.payment_state}
        </Badge>
      </div>

      {bill.invoice_origin && (
        <p className="text-sm text-muted-foreground" data-testid="text-source">
          Source: {bill.invoice_origin}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-bill-total">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="w-4 h-4" /> Bill Total
            </div>
            <p className="text-2xl font-bold font-mono">${bill.amount_total?.toFixed(2)}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
              <span>Untaxed: ${bill.amount_untaxed?.toFixed(2)}</span>
              <span>Tax: ${bill.amount_tax?.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-payment">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <CreditCard className="w-4 h-4" /> Payment
            </div>
            <p className="text-2xl font-bold font-mono">${amountPaid.toFixed(2)}</p>
            <div className="flex items-center gap-2 mt-1 text-xs flex-wrap">
              {bill.amount_residual > 0.01 ? (
                <span className="text-destructive font-medium">Outstanding: ${bill.amount_residual?.toFixed(2)}</span>
              ) : bill.state === "posted" ? (
                <span className="text-green-600 dark:text-green-400 font-medium">Fully Paid</span>
              ) : (
                <span className="text-muted-foreground">{stateLabels[bill.state] || bill.state}</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-line-count">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Package className="w-4 h-4" /> Line Items
            </div>
            <p className="text-2xl font-bold">{lines.length}</p>
          </CardContent>
        </Card>

        <Card data-testid="card-dates">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Calendar className="w-4 h-4" /> Dates
            </div>
            <p className="text-sm mt-1"><span className="text-muted-foreground">Bill Date:</span> {bill.invoice_date ? new Date(bill.invoice_date).toLocaleDateString() : "-"}</p>
            <p className="text-sm"><span className="text-muted-foreground">Due Date:</span> {bill.invoice_date_due ? new Date(bill.invoice_date_due).toLocaleDateString() : "-"}</p>
            <p className="text-sm"><span className="text-muted-foreground">Created:</span> {bill.create_date ? new Date(bill.create_date).toLocaleDateString() : "-"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {lines.length > 0 && (
            <Card data-testid="card-bill-lines">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="w-4 h-4" /> Line Items ({lines.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product / Description</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Discount</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((line: any) => (
                        <TableRow key={line.id} data-testid={`row-line-${line.id}`}>
                          <TableCell>
                            <div>
                              <span className="font-medium">{Array.isArray(line.product_id) ? line.product_id[1] : (line.name || "N/A")}</span>
                              {line.name && Array.isArray(line.product_id) && line.name !== line.product_id[1] && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{line.name}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {Array.isArray(line.account_id) ? line.account_id[1] : "-"}
                          </TableCell>
                          <TableCell className="text-right font-mono">{line.quantity}</TableCell>
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
                  <span className="font-mono font-semibold">${bill.amount_untaxed?.toFixed(2)}</span>
                  <span className="text-muted-foreground">Tax:</span>
                  <span className="font-mono">${bill.amount_tax?.toFixed(2)}</span>
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-mono font-bold text-base">${bill.amount_total?.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card data-testid="card-vendor">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="w-4 h-4" /> Vendor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="font-semibold" data-testid="text-vendor-name">{vendorName}</p>
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
              <BillTimeline bill={bill} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function BillTimeline({ bill }: { bill: any }) {
  const events: { date: string; icon: typeof CircleDot; color: string; title: string; detail: string }[] = [];

  if (bill.create_date) {
    events.push({ date: bill.create_date, icon: CircleDot, color: "text-primary", title: "Bill Created", detail: bill.name || "Draft" });
  }
  if (bill.state === "posted" && bill.invoice_date) {
    events.push({ date: bill.invoice_date, icon: CircleCheck, color: "text-blue-500 dark:text-blue-400", title: "Bill Posted", detail: `Total: $${bill.amount_total?.toFixed(2)}` });
  }
  if (bill.state === "cancel" && bill.write_date) {
    events.push({ date: bill.write_date, icon: XCircle, color: "text-destructive", title: "Bill Cancelled", detail: "" });
  }
  if (bill.state === "posted" && bill.payment_state === "paid" && bill.write_date) {
    events.push({ date: bill.write_date, icon: CircleCheck, color: "text-green-600 dark:text-green-400", title: "Payment Made", detail: `$${bill.amount_total?.toFixed(2)}` });
  } else if (bill.state === "posted" && bill.payment_state === "partial" && bill.write_date) {
    events.push({ date: bill.write_date, icon: CircleDot, color: "text-amber-500 dark:text-amber-400", title: "Partial Payment", detail: `Paid: $${(bill.amount_total - bill.amount_residual)?.toFixed(2)}` });
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
      {events.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No events</p>}
    </div>
  );
}
