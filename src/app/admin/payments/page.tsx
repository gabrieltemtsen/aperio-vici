"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { PageHeader } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { Textarea, Field, NairaInput } from "@/components/ui/field";
import { Panel, Alert, EmptyState, Modal, Skeleton, Badge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { formatNaira, formatPhone, timeAgo, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BadgeCheck, Inbox, Image as ImageIcon, X } from "lucide-react";

export default function PaymentsPage() {
  const queue = useQuery(api.payments.verificationQueue);
  const recent = useQuery(api.payments.recentlyVerified, { limit: 12 });
  const verify = useMutation(api.payments.verify);
  const reject = useMutation(api.payments.reject);
  const { notify } = useToast();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<any | null>(null);
  const [reason, setReason] = useState("");
  const [adjusting, setAdjusting] = useState<any | null>(null);
  const [adjustedAmount, setAdjustedAmount] = useState(0);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function confirmPayment(entry: any, confirmedAmount?: number) {
    setBusyId(entry._id);
    setError(null);
    try {
      const result = await verify({
        paymentId: entry._id,
        confirmedAmount,
      });
      notify(
        result.settled
          ? `${entry.orderNumber} confirmed and ready to pack.`
          : `Part payment recorded. ${formatNaira(result.outstanding)} still outstanding on ${entry.orderNumber}.`,
        "good",
      );
      setAdjusting(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "That did not go through.";
      setError(message);
      notify(message, "bad");
    } finally {
      setBusyId(null);
    }
  }

  async function rejectPayment() {
    if (!rejecting) return;
    setBusyId(rejecting._id);
    try {
      await reject({ paymentId: rejecting._id, reason: reason.trim() });
      notify(`${rejecting.orderNumber} sent back to the customer.`, "info");
      setRejecting(null);
      setReason("");
    } catch (err) {
      notify(err instanceof Error ? err.message : "That did not go through.", "bad");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Verify payments"
        description="Customers who say they have transferred. Match each one to your bank statement before confirming."
      />

      <div className="space-y-6 p-4 sm:p-6">
        {error && <Alert tone="bad">{error}</Alert>}

        {queue === undefined ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        ) : queue.length === 0 ? (
          <Panel>
            <EmptyState
              icon={Inbox}
              title="Nothing waiting"
              description="Every transfer customers have told us about has been checked. New ones land here the moment they are submitted."
              action={
                <Link href="/admin/orders?status=awaiting_payment">
                  <Button variant="secondary">See who has not paid yet</Button>
                </Link>
              }
            />
          </Panel>
        ) : (
          <>
            <p className="text-[14px] text-muted">
              <span className="figure font-medium text-ink">{queue.length}</span>{" "}
              {queue.length === 1 ? "transfer" : "transfers"} to check.
            </p>

            <div className="space-y-4">
              {queue.map((entry) => {
                const mismatch = entry.shortfall > 0 || entry.overpaid > 0;
                return (
                  <Panel key={entry._id} className={cn(mismatch && "border-amber/40")}>
                    <div className="grid gap-5 p-4 sm:p-5 md:grid-cols-[1fr_200px]">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline justify-between gap-3">
                          <div>
                            <Link
                              href={`/admin/orders/${entry.orderId}`}
                              className="ref font-display text-[22px] text-ink hover:text-brass-deep"
                            >
                              {entry.orderNumber}
                            </Link>
                            <p className="text-[13px] text-muted">
                              {entry.order?.customerName}
                              {entry.order?.customerPhone && ` · ${formatPhone(entry.order.customerPhone)}`}
                              {" · "}
                              {timeAgo(entry.createdAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="figure font-display text-[26px] leading-none text-ink">
                              {formatNaira(entry.amount)}
                            </p>
                            <p className="figure text-[12.5px] text-muted">
                              order total {formatNaira(entry.order?.total ?? 0)}
                            </p>
                          </div>
                        </div>

                        {mismatch && (
                          <div className="mt-3">
                            <Alert tone={entry.shortfall > 0 ? "bad" : "warn"}>
                              {entry.shortfall > 0
                                ? `Short by ${formatNaira(entry.shortfall)}. Confirming leaves a balance the customer still owes.`
                                : `Overpaid by ${formatNaira(entry.overpaid)}. Confirm, then arrange a refund or a credit.`}
                            </Alert>
                          </div>
                        )}

                        <dl className="mt-3 grid gap-x-6 text-[13.5px] sm:grid-cols-2">
                          <div className="flex justify-between gap-3 border-b border-rule py-1.5">
                            <dt className="text-muted">Sent by</dt>
                            <dd className="truncate text-ink">{entry.senderName ?? "—"}</dd>
                          </div>
                          <div className="flex justify-between gap-3 border-b border-rule py-1.5">
                            <dt className="text-muted">Bank</dt>
                            <dd className="truncate text-ink">{entry.bankName ?? "—"}</dd>
                          </div>
                          <div className="flex justify-between gap-3 border-b border-rule py-1.5">
                            <dt className="text-muted">Sent at</dt>
                            <dd className="text-ink">{entry.paidAt ? formatDateTime(entry.paidAt) : "—"}</dd>
                          </div>
                          <div className="flex justify-between gap-3 border-b border-rule py-1.5">
                            <dt className="text-muted">Reference</dt>
                            <dd className="figure truncate text-ink">{entry.reference ?? "—"}</dd>
                          </div>
                        </dl>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button
                            variant="brass"
                            loading={busyId === entry._id}
                            onClick={() => confirmPayment(entry)}
                          >
                            <BadgeCheck className="h-4 w-4" />
                            Confirm {formatNaira(entry.amount)}
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setAdjusting(entry);
                              setAdjustedAmount(entry.order?.total ?? entry.amount);
                            }}
                          >
                            Confirm a different amount
                          </Button>
                          <Button
                            variant="ghost"
                            className="text-flag"
                            onClick={() => {
                              setRejecting(entry);
                              setReason("");
                            }}
                          >
                            Cannot find it
                          </Button>
                        </div>
                      </div>

                      {entry.proofUrl ? (
                        <button onClick={() => setLightbox(entry.proofUrl)} className="block text-left">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={entry.proofUrl}
                            alt={`Proof of payment for ${entry.orderNumber}`}
                            className="h-40 w-full rounded-[var(--radius-sheet)] border border-rule object-cover md:h-full"
                          />
                          <span className="mt-1.5 block text-[12.5px] text-muted">Tap to enlarge</span>
                        </button>
                      ) : (
                        <div className="flex flex-col items-center justify-center rounded-[var(--radius-sheet)] border border-dashed border-rule px-4 py-6 text-center">
                          <ImageIcon className="h-5 w-5 text-faint" aria-hidden />
                          <p className="mt-2 text-[13px] text-muted">No screenshot attached</p>
                        </div>
                      )}
                    </div>
                  </Panel>
                );
              })}
            </div>
          </>
        )}

        {recent && recent.length > 0 && (
          <Panel>
            <div className="border-b border-rule px-4 py-3">
              <h2 className="text-[15px] font-medium text-ink">Recently confirmed</h2>
            </div>
            <ul>
              {recent.map((payment) => (
                <li
                  key={payment._id}
                  className="flex items-center justify-between gap-3 border-b border-rule px-4 py-2.5 last:border-0"
                >
                  <div className="min-w-0">
                    <Link href={`/admin/orders/${payment.orderId}`} className="ref text-[14px] text-ink hover:text-brass-deep">
                      {payment.orderNumber}
                    </Link>
                    <p className="text-[12.5px] text-muted">
                      {payment.verifiedByName ?? "Staff"} ·{" "}
                      {payment.verifiedAt ? timeAgo(payment.verifiedAt) : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="figure text-[14px] text-ink">{formatNaira(payment.amount)}</span>
                    <Badge tone="good">Confirmed</Badge>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>

      <Modal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title="Send this back to the customer"
        description={`${rejecting?.orderNumber} goes back to awaiting payment and the customer can try again. Their items stay reserved.`}
      >
        <div className="space-y-4">
          <Field label="What should they be told?" required hint="They see this word for word on their order page.">
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="We cannot find this transfer on our statement. Check the account number you sent to and send us the reference."
              className="min-h-24"
            />
          </Field>
          <div className="flex flex-wrap gap-1.5">
            {[
              "We cannot find this transfer on our statement.",
              "The amount sent does not match the order total.",
              "The screenshot is for a different order.",
            ].map((preset) => (
              <button
                key={preset}
                onClick={() => setReason(preset)}
                className="rounded-[var(--radius-pill)] border border-rule px-2.5 py-1 text-[12.5px] text-muted hover:border-ink hover:text-ink"
              >
                {preset}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setRejecting(null)}>
              Keep it in the queue
            </Button>
            <Button
              variant="danger"
              fullWidth
              loading={busyId === rejecting?._id}
              disabled={reason.trim().length < 4}
              onClick={rejectPayment}
            >
              Send it back
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!adjusting}
        onClose={() => setAdjusting(null)}
        title="Confirm a different amount"
        description="Enter what actually landed in the account, not what the customer typed."
      >
        <div className="space-y-4">
          <Field label="Amount that reached the account" required>
            <NairaInput valueKobo={adjustedAmount} onChangeKobo={setAdjustedAmount} />
          </Field>
          {adjusting?.order && adjustedAmount < adjusting.order.total && (
            <Alert tone="warn">
              This leaves {formatNaira(adjusting.order.total - adjustedAmount)} outstanding. The order
              stays unpaid until the rest arrives.
            </Alert>
          )}
          <Button
            fullWidth
            size="lg"
            loading={busyId === adjusting?._id}
            disabled={adjustedAmount <= 0}
            onClick={() => confirmPayment(adjusting, adjustedAmount)}
          >
            Confirm {formatNaira(adjustedAmount)}
          </Button>
        </div>
      </Modal>

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-deep/80 p-4" onClick={() => setLightbox(null)}>
          <button className="absolute right-4 top-4 rounded p-2 text-white/70 hover:text-white" aria-label="Close">
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Proof of payment" className="max-h-full max-w-full rounded object-contain" />
        </div>
      )}
    </>
  );
}
