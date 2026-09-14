"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { PageHeader } from "@/components/admin/shell";
import { StatusPill, ChannelPill } from "@/components/admin/order-status";
import { BookCover } from "@/components/shop/book-cover";
import { Button } from "@/components/ui/button";
import { Textarea, Select, Field, NairaInput, Input } from "@/components/ui/field";
import { Panel, PanelHeader, Alert, Modal, Skeleton, Badge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { formatNaira, formatPhone, formatDateTime } from "@/lib/format";
import { ORDER_STATUS, type OrderStatus } from "@/lib/status";
import { cn } from "@/lib/utils";
import { ArrowLeft, Phone, MessageCircle, Printer, BadgeCheck } from "lucide-react";

/** Only the moves that make sense from where the order currently is. */
const NEXT_MOVES: Record<string, { status: OrderStatus; label: string; primary?: boolean }[]> = {
  awaiting_payment: [{ status: "cancelled", label: "Cancel order" }],
  payment_review: [{ status: "cancelled", label: "Cancel order" }],
  paid: [
    { status: "processing", label: "Start packing", primary: true },
    { status: "cancelled", label: "Cancel order" },
  ],
  processing: [
    { status: "ready", label: "Mark as packed", primary: true },
    { status: "cancelled", label: "Cancel order" },
  ],
  ready: [
    { status: "dispatched", label: "Hand to dispatch", primary: true },
    { status: "completed", label: "Customer collected it" },
    { status: "cancelled", label: "Cancel order" },
  ],
  dispatched: [
    { status: "completed", label: "Mark as delivered", primary: true },
    { status: "cancelled", label: "Cancel order" },
  ],
  completed: [],
  cancelled: [],
};

export default function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { notify } = useToast();

  const data = useQuery(api.orders.adminGet, { id: id as Id<"orders"> });
  const advance = useMutation(api.orders.advanceStatus);
  const addNote = useMutation(api.orders.addStaffNote);
  const verify = useMutation(api.payments.verify);
  const recordManual = useMutation(api.payments.recordManualPayment);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState<{ status: OrderStatus; label: string } | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualAmount, setManualAmount] = useState(0);
  const [manualMethod, setManualMethod] = useState<"bank_transfer" | "cash" | "pos_terminal">("bank_transfer");
  const [manualRef, setManualRef] = useState("");

  if (data === undefined) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="p-6">
        <Alert tone="bad" title="That order is gone">
          It may have been removed. Go back to the order list and search for the customer.
        </Alert>
      </div>
    );
  }

  const { order, payments, customer } = data;
  const moves = NEXT_MOVES[order.status] ?? [];
  const outstanding = Math.max(0, order.total - order.amountPaid);
  const pendingPayment = payments.find((p) => p.status === "submitted");

  async function run(fn: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      notify(success, "good");
      setConfirm(null);
      setManualOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "That did not work.";
      setError(message);
      notify(message, "bad");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title={order.orderNumber}
        description={`Placed ${formatDateTime(order.createdAt)}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={order.status} />
            <ChannelPill channel={order.channel} />
            <Button variant="ghost" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
        }
      />

      <div className="p-4 sm:p-6">
        <Link
          href="/admin/orders"
          className="mb-4 inline-flex items-center gap-1.5 text-[13.5px] text-muted hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          All orders
        </Link>

        {error && (
          <div className="mb-4">
            <Alert tone="bad">{error}</Alert>
          </div>
        )}

        {/* The verification desk is inlined here so a manager can finish an
            order without bouncing to the payments queue and back. */}
        {pendingPayment && (
          <div className="mb-6">
            <Panel className="border-brass/50">
              <PanelHeader
                title="This customer says they have paid"
                description="Check it against your bank statement before you confirm."
              />
              <div className="grid gap-5 px-4 py-4 sm:px-5 md:grid-cols-[1fr_220px]">
                <div>
                  <dl className="grid gap-x-6 gap-y-2 text-[14px] sm:grid-cols-2">
                    <div className="flex justify-between gap-3 border-b border-rule py-1.5">
                      <dt className="text-muted">They say they sent</dt>
                      <dd className="figure font-semibold text-ink">{formatNaira(pendingPayment.amount)}</dd>
                    </div>
                    <div className="flex justify-between gap-3 border-b border-rule py-1.5">
                      <dt className="text-muted">Order total</dt>
                      <dd className="figure text-ink">{formatNaira(order.total)}</dd>
                    </div>
                    <div className="flex justify-between gap-3 border-b border-rule py-1.5">
                      <dt className="text-muted">Sender</dt>
                      <dd className="text-ink">{pendingPayment.senderName ?? "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-3 border-b border-rule py-1.5">
                      <dt className="text-muted">Bank</dt>
                      <dd className="text-ink">{pendingPayment.bankName ?? "—"}</dd>
                    </div>
                    {pendingPayment.reference && (
                      <div className="flex justify-between gap-3 border-b border-rule py-1.5 sm:col-span-2">
                        <dt className="text-muted">Reference</dt>
                        <dd className="figure text-ink">{pendingPayment.reference}</dd>
                      </div>
                    )}
                  </dl>

                  {pendingPayment.amount !== order.total && (
                    <div className="mt-3">
                      <Alert tone={pendingPayment.amount < order.total ? "bad" : "warn"}>
                        {pendingPayment.amount < order.total
                          ? `Short by ${formatNaira(order.total - pendingPayment.amount)}. Confirming will leave a balance on the order.`
                          : `They sent ${formatNaira(pendingPayment.amount - order.total)} more than the total.`}
                      </Alert>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="brass"
                      loading={busy}
                      onClick={() =>
                        run(
                          () => verify({ paymentId: pendingPayment._id }),
                          "Payment confirmed. The order is ready to pack.",
                        )
                      }
                    >
                      <BadgeCheck className="h-4 w-4" />
                      Confirm this payment
                    </Button>
                    <Link href="/admin/payments">
                      <Button variant="secondary">Open the full queue</Button>
                    </Link>
                  </div>
                </div>

                {pendingPayment.proofUrl ? (
                  <a href={pendingPayment.proofUrl} target="_blank" rel="noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pendingPayment.proofUrl}
                      alt="Proof of payment"
                      className="w-full rounded-[var(--radius-sheet)] border border-rule object-cover"
                    />
                    <span className="mt-1.5 block text-[12.5px] text-muted">
                      Tap to open the screenshot
                    </span>
                  </a>
                ) : (
                  <div className="rounded-[var(--radius-sheet)] border border-dashed border-rule px-4 py-6 text-center text-[13px] text-muted">
                    No screenshot was attached.
                  </div>
                )}
              </div>
            </Panel>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <Panel>
              <PanelHeader title={`${order.items.length} ${order.items.length === 1 ? "item" : "items"}`} />
              {order.items.map((item) => (
                <div key={item.productId} className="flex gap-3 border-b border-rule px-4 py-3 last:border-0">
                  <span className="h-16 w-11 shrink-0 overflow-hidden rounded-[2px] border border-rule">
                    <BookCover title={item.title} kind="book" imageUrl={item.imageUrl} compact />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14.5px] text-ink">{item.title}</span>
                    {item.author && <span className="block text-[13px] text-muted">{item.author}</span>}
                    {item.sku && <span className="ref block text-[12px] text-faint">{item.sku}</span>}
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="figure block text-[14px] text-ink">
                      {item.quantity} × {formatNaira(item.unitPrice)}
                    </span>
                    <span className="figure block text-[14px] font-medium text-ink">
                      {formatNaira(item.lineTotal)}
                    </span>
                  </span>
                </div>
              ))}

              <div className="space-y-1.5 border-t border-rule bg-surface px-4 py-3 text-[14px]">
                <div className="flex justify-between"><span className="text-muted">Subtotal</span><span className="figure">{formatNaira(order.subtotal)}</span></div>
                {order.deliveryFee > 0 && (
                  <div className="flex justify-between"><span className="text-muted">Delivery</span><span className="figure">{formatNaira(order.deliveryFee)}</span></div>
                )}
                {order.discount > 0 && (
                  <div className="flex justify-between text-leaf"><span>Discount</span><span className="figure">−{formatNaira(order.discount)}</span></div>
                )}
                <div className="flex justify-between border-t border-rule pt-2 font-medium"><span>Total</span><span className="figure">{formatNaira(order.total)}</span></div>
                <div className="flex justify-between"><span className="text-muted">Received</span><span className="figure text-leaf">{formatNaira(order.amountPaid)}</span></div>
                {outstanding > 0 && (
                  <div className="flex justify-between font-medium text-flag"><span>Outstanding</span><span className="figure">{formatNaira(outstanding)}</span></div>
                )}
              </div>
            </Panel>

            <Panel>
              <PanelHeader
                title="Payments"
                action={
                  outstanding > 0 ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setManualAmount(outstanding);
                        setManualOpen(true);
                      }}
                    >
                      Record a payment
                    </Button>
                  ) : undefined
                }
              />
              {payments.length === 0 ? (
                <p className="px-4 py-5 text-[14px] text-muted">
                  Nothing received yet. The customer has the account details on their order page.
                </p>
              ) : (
                <ul>
                  {payments.map((payment) => (
                    <li key={payment._id} className="flex items-start justify-between gap-3 border-b border-rule px-4 py-3 last:border-0">
                      <div className="min-w-0">
                        <p className="figure text-[15px] font-medium text-ink">{formatNaira(payment.amount)}</p>
                        <p className="text-[13px] capitalize text-muted">
                          {payment.method.replace("_", " ")}
                          {payment.senderName && ` from ${payment.senderName}`}
                        </p>
                        <p className="text-[12.5px] text-faint">
                          {formatDateTime(payment.createdAt)}
                          {payment.verifiedByName && ` · confirmed by ${payment.verifiedByName}`}
                        </p>
                        {payment.rejectionReason && (
                          <p className="text-[12.5px] text-flag">{payment.rejectionReason}</p>
                        )}
                      </div>
                      <Badge
                        tone={
                          payment.status === "verified" ? "good" : payment.status === "rejected" ? "bad" : "warn"
                        }
                      >
                        {payment.status === "verified"
                          ? "Confirmed"
                          : payment.status === "rejected"
                            ? "Rejected"
                            : "Waiting"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel>
              <PanelHeader title="History" />
              <ol className="px-4 py-4">
                {[...order.timeline].reverse().map((entry, i) => (
                  <li key={i} className="flex gap-3 pb-4 last:pb-0">
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", i === 0 ? "bg-brass" : "bg-rule-strong")} aria-hidden />
                    <div>
                      <p className="text-[14px] text-ink">
                        {ORDER_STATUS[entry.status as OrderStatus]?.label ?? entry.status}
                      </p>
                      {entry.note && <p className="text-[13px] text-muted">{entry.note}</p>}
                      <p className="text-[12.5px] text-faint">
                        {formatDateTime(entry.at)}
                        {entry.byName && ` · ${entry.byName}`}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>
          </div>

          <div className="space-y-6">
            {moves.length > 0 && (
              <Panel>
                <PanelHeader title="What happens next" />
                <div className="space-y-2 px-4 py-4">
                  {moves.map((move) => (
                    <Button
                      key={move.status}
                      fullWidth
                      variant={move.primary ? "primary" : move.status === "cancelled" ? "secondary" : "secondary"}
                      onClick={() => setConfirm(move)}
                      className={move.status === "cancelled" ? "text-flag" : undefined}
                    >
                      {move.label}
                    </Button>
                  ))}
                  {order.status === "payment_review" && (
                    <p className="pt-1 text-[13px] text-muted">
                      Confirm the payment above and this order moves on by itself.
                    </p>
                  )}
                  {order.status === "awaiting_payment" && (
                    <p className="pt-1 text-[13px] text-muted">
                      Waiting on the customer. Record a payment yourself if they paid at the shop.
                    </p>
                  )}
                </div>
              </Panel>
            )}

            <Panel>
              <PanelHeader title="Customer" />
              <div className="space-y-3 px-4 py-4 text-[14px]">
                <p className="font-medium text-ink">{order.customerName}</p>
                {order.customerPhone && (
                  <div className="flex flex-wrap gap-2">
                    <a href={`tel:${order.customerPhone}`} className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border border-rule px-2.5 py-1.5 text-[13px] text-ink-soft hover:border-ink">
                      <Phone className="h-3.5 w-3.5" aria-hidden />
                      {formatPhone(order.customerPhone)}
                    </a>
                    <a
                      href={`https://wa.me/234${order.customerPhone.slice(1)}?text=${encodeURIComponent(
                        `Hello ${order.customerName}, this is Aperio Vici about order ${order.orderNumber}.`,
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border border-rule px-2.5 py-1.5 text-[13px] text-ink-soft hover:border-ink"
                    >
                      <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                      WhatsApp
                    </a>
                  </div>
                )}
                {order.customerEmail && <p className="text-muted">{order.customerEmail}</p>}

                {customer && (
                  <p className="border-t border-rule pt-3 text-[13px] text-muted">
                    <span className="figure">{customer.totalOrders}</span>{" "}
                    {customer.totalOrders === 1 ? "order" : "orders"} so far, worth{" "}
                    <span className="figure">{formatNaira(customer.totalSpent)}</span>.{" "}
                    <Link href="/admin/customers" className="text-brass-deep hover:underline">
                      See their history
                    </Link>
                  </p>
                )}
              </div>
            </Panel>

            <Panel>
              <PanelHeader title={order.fulfilment === "delivery" ? "Deliver to" : "Collecting from the shop"} />
              <div className="px-4 py-4 text-[14px] leading-relaxed">
                {order.address ? (
                  <address className="not-italic text-ink-soft">
                    {order.address.street}
                    <br />
                    {order.address.city}, {order.address.state}
                    {order.address.landmark && (
                      <>
                        <br />
                        <span className="text-muted">{order.address.landmark}</span>
                      </>
                    )}
                  </address>
                ) : (
                  <p className="text-muted">The customer is collecting this from the shop.</p>
                )}
                {order.customerNote && (
                  <div className="mt-3 rounded-[var(--radius-sheet)] bg-brass-soft px-3 py-2">
                    <p className="text-[12.5px] text-brass-deep">Note from the customer</p>
                    <p className="mt-0.5 text-[13.5px] text-ink">{order.customerNote}</p>
                  </div>
                )}
              </div>
            </Panel>

            <Panel>
              <PanelHeader title="Internal note" description="Only staff see this." />
              <div className="space-y-2 px-4 py-4">
                {order.staffNote && (
                  <p className="rounded-[var(--radius-sheet)] bg-surface px-3 py-2 text-[13.5px] text-ink-soft">
                    {order.staffNote}
                  </p>
                )}
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Rider will collect at 4pm."
                  className="min-h-20 text-[14px]"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={note.trim().length < 2}
                  loading={busy}
                  onClick={() =>
                    run(async () => {
                      await addNote({ id: order._id, note: note.trim() });
                      setNote("");
                    }, "Note saved to the order.")
                  }
                >
                  Save note
                </Button>
              </div>
            </Panel>
          </div>
        </div>
      </div>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.label ?? ""}
        description={
          confirm?.status === "cancelled"
            ? "Cancelling puts every item back on the shelves. This cannot be undone."
            : `This moves ${order.orderNumber} on and tells the customer.`
        }
      >
        <div className="space-y-4">
          <Field label="Add a note" hint="Optional. The customer sees this on their order page.">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                confirm?.status === "cancelled"
                  ? "Customer asked to cancel."
                  : "Handed to the rider at 4pm."
              }
              className="min-h-20"
            />
          </Field>
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setConfirm(null)}>
              Keep it as it is
            </Button>
            <Button
              fullWidth
              variant={confirm?.status === "cancelled" ? "danger" : "primary"}
              loading={busy}
              onClick={() =>
                confirm &&
                run(async () => {
                  await advance({ id: order._id, status: confirm.status, note: note.trim() || undefined });
                  setNote("");
                  if (confirm.status === "cancelled") router.refresh();
                }, `${order.orderNumber} is now ${ORDER_STATUS[confirm.status].label.toLowerCase()}.`)
              }
            >
              {confirm?.label}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        title="Record a payment"
        description="Use this when money arrived outside the app — cash at the counter, a transfer you already saw, or a card on the POS."
      >
        <div className="space-y-4">
          <Field label="Amount received" required>
            <NairaInput valueKobo={manualAmount} onChangeKobo={setManualAmount} />
          </Field>
          <Field label="How did it come in?" required>
            <Select value={manualMethod} onChange={(e) => setManualMethod(e.target.value as any)}>
              <option value="bank_transfer">Bank transfer</option>
              <option value="cash">Cash</option>
              <option value="pos_terminal">Card on the POS terminal</option>
            </Select>
          </Field>
          <Field label="Reference" hint="Optional. The transfer reference or POS receipt number.">
            <Input value={manualRef} onChange={(e) => setManualRef(e.target.value)} className="figure" />
          </Field>
          <Button
            fullWidth
            size="lg"
            loading={busy}
            disabled={manualAmount <= 0}
            onClick={() =>
              run(
                () =>
                  recordManual({
                    orderId: order._id,
                    amount: manualAmount,
                    method: manualMethod,
                    reference: manualRef.trim() || undefined,
                  }),
                `${formatNaira(manualAmount)} recorded against ${order.orderNumber}.`,
              )
            }
          >
            Record {formatNaira(manualAmount)}
          </Button>
        </div>
      </Modal>
    </>
  );
}
