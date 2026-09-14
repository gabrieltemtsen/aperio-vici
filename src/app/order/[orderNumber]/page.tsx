"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { SiteHeader } from "@/components/shop/site-header";
import { BookCover } from "@/components/shop/book-cover";
import { Button } from "@/components/ui/button";
import { Input, Select, Field, NairaInput } from "@/components/ui/field";
import { Alert, EmptyState, Modal, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { formatNaira, formatDateTime } from "@/lib/format";
import { NIGERIAN_BANKS } from "@/lib/nigeria";
import { ORDER_STATUS, STATUS_TONE_CLASS, type OrderStatus } from "@/lib/status";
import { cn } from "@/lib/utils";
import { Copy, Check, Upload, FileSearch, MessageCircle, Landmark, Shield } from "lucide-react";

function CopyField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 border-b border-rule/60 py-3 last:border-0">
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-muted">{label}</p>
        <p className={cn("truncate text-[15px] text-ink", mono && "ref")}>{value}</p>
      </div>
      <button
        onClick={() => {
          navigator.clipboard?.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
        className={cn(
          "shrink-0 rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold transition-all",
          copied
            ? "border-leaf bg-leaf-soft text-leaf"
            : "border-rule/80 text-ink-soft hover:border-ink hover:text-ink hover:shadow-[var(--shadow-xs)]",
        )}
        aria-label={`Copy ${label}`}
      >
        {copied ? (
          <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Copied</span>
        ) : (
          <span className="flex items-center gap-1"><Copy className="h-3.5 w-3.5" /> Copy</span>
        )}
      </button>
    </div>
  );
}

export default function OrderPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = use(params);
  const data = useQuery(api.orders.getByNumber, { orderNumber });
  const submitProof = useMutation(api.payments.submitTransferProof);
  const generateUploadUrl = useMutation(api.payments.generateProofUploadUrl);
  const { notify } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [senderName, setSenderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (data === undefined) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-[900px] px-4 py-12 sm:px-6">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="mt-6 h-48 w-full" />
        </main>
      </>
    );
  }

  if (data === null) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-[900px] px-4 py-20 sm:px-6">
          <EmptyState
            icon={FileSearch}
            title="No order with that number"
            description="Check the number in your confirmation message. If it still does not work, call the shop and we will find it."
            action={<Link href="/track"><Button variant="secondary">Track a different order</Button></Link>}
          />
        </main>
      </>
    );
  }

  const { order, bankAccounts, hasSubmittedPayment, rejectionReason, whatsapp } = data;
  const status = ORDER_STATUS[order.status as OrderStatus];
  const outstanding = Math.max(0, order.total - order.amountPaid);
  const needsPayment = order.paymentStatus !== "verified" && order.status !== "cancelled";

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let proofStorageId: any;
      if (file) {
        const uploadUrl = await generateUploadUrl();
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!response.ok) throw new Error("The screenshot did not upload. Try a smaller image.");
        proofStorageId = (await response.json()).storageId;
      }

      await submitProof({
        orderNumber: order.orderNumber,
        amount: amount || order.total,
        senderName: senderName.trim(),
        bankName: bankName || undefined,
        reference: reference.trim() || undefined,
        proofStorageId,
      });

      setFormOpen(false);
      setFile(null);
      notify("Sent. We will confirm it against our statement.", "good");
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not go through. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SiteHeader />

      <main className="mx-auto max-w-[900px] px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex flex-wrap items-start justify-between gap-4 rise">
          <div>
            <p className="text-[13px] font-medium uppercase tracking-wider text-muted">Order</p>
            <h1 className="ref font-display text-[36px] leading-none text-ink sm:text-[44px]">
              {order.orderNumber}
            </h1>
            <p className="mt-2.5 text-[14px] text-muted">
              Placed {formatDateTime(order.createdAt)} for {order.customerName}
            </p>
          </div>
          <span
            className={cn(
              "rounded-full border px-4 py-2 text-[13px] font-bold shadow-[var(--shadow-xs)]",
              STATUS_TONE_CLASS[status.tone],
            )}
          >
            {status.customerLabel}
          </span>
        </div>

        <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-ink-soft rise-delay-1">
          {status.customerDetail}
        </p>

        {rejectionReason && order.status === "awaiting_payment" && (
          <div className="mt-5 rise-delay-2">
            <Alert tone="bad" title="We could not confirm your last transfer">
              {rejectionReason} Send the details again once it is sorted, or call the shop.
            </Alert>
          </div>
        )}

        {needsPayment && (
          <section className="mt-8 rise-delay-2">
            {/* Transfer instruction card — the most important element */}
            <div className="overflow-hidden rounded-2xl border-2 border-brass shadow-[var(--shadow-card)]">
              {/* Amount header */}
              <div className="flex flex-wrap items-baseline justify-between gap-3 bg-gradient-to-r from-brass-soft to-brass-glow px-6 py-5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brass/15">
                    <Landmark className="h-4.5 w-4.5 text-brass-deep" aria-hidden />
                  </div>
                  <h2 className="text-[16px] font-bold text-ink">Transfer this exact amount</h2>
                </div>
                <span className="figure font-display text-[32px] leading-none text-ink font-bold">
                  {formatNaira(outstanding)}
                </span>
              </div>

              <div className="px-6 py-5">
                {/* Narration callout */}
                <div className="mb-5 rounded-xl border border-brass/30 bg-gradient-to-r from-amber-soft/50 to-brass-soft/30 p-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-bold text-[14px] text-ink">Transfer Narration / Reference</p>
                      <p className="text-[13px] text-muted mt-0.5">Put this exact code in your bank app narration:</p>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(order.orderNumber);
                        notify(`Copied narration: ${order.orderNumber}`, "good");
                      }}
                      className="shrink-0 rounded-xl border-2 border-brass bg-white px-4 py-2 text-[14px] font-bold text-ink transition-all hover:bg-brass hover:text-white active:scale-95 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-glow-brass)] btn-press"
                    >
                      <span className="ref">{order.orderNumber}</span> · Copy
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 text-[13px] text-leaf mb-5 font-semibold bg-leaf-soft/50 rounded-lg px-3.5 py-2.5">
                  <Shield className="h-4 w-4" />
                  <span>Your items are held in store while payment clears.</span>
                </div>

                {bankAccounts.length === 0 ? (
                  <Alert tone="warn" title="No account is set up yet">
                    Call the shop for account details. An admin needs to add bank accounts in
                    Settings before this shows automatically.
                  </Alert>
                ) : (
                  <div>
                    <p className="text-[13px] font-bold uppercase tracking-wider text-muted mb-3">Available Bank Accounts</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {bankAccounts.map((account) => (
                        <div
                          key={account.accountNumber}
                          className="rounded-xl border border-rule/60 bg-white p-4 shadow-[var(--shadow-card)] transition-all hover:border-brass/50 hover:shadow-[var(--shadow-book)]"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-[14px] font-bold text-ink">{account.bankName}</p>
                            <span className="text-[10px] uppercase font-bold text-leaf bg-leaf-soft px-2 py-0.5 rounded-full">Verified</span>
                          </div>
                          <CopyField label="Account number" value={account.accountNumber} mono />
                          <CopyField label="Account name" value={account.accountName} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button size="lg" variant="brass" onClick={() => { setAmount(outstanding); setFormOpen(true); }} className="gradient-shine">
                    I have sent the money
                  </Button>
                  {whatsapp && (
                    <a
                      href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(
                        `Hello, I am asking about order ${order.orderNumber}.`,
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button size="lg" variant="secondary">
                        <MessageCircle className="h-4 w-4" />
                        Message the shop
                      </Button>
                    </a>
                  )}
                </div>

                {hasSubmittedPayment && (
                  <p className="mt-4 text-[13.5px] text-muted rounded-lg bg-surface/50 px-3.5 py-2.5">
                    You have already sent us your transfer details. We are checking them — there is
                    nothing else for you to do.
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="mt-10 grid gap-8 md:grid-cols-[1fr_300px] rise-delay-3">
          <div>
            <h2 className="text-[15px] font-bold text-ink">What you ordered</h2>
            <div className="mt-3 rounded-xl border border-rule/60 shadow-[var(--shadow-card)] overflow-hidden">
              {order.items.map((item) => (
                <div key={item.productId} className="flex gap-3.5 border-b border-rule/60 px-4 py-3.5 last:border-0">
                  <span className="h-16 w-11 shrink-0 overflow-hidden rounded-lg border border-rule/60 shadow-[var(--shadow-xs)]">
                    <BookCover title={item.title} kind="book" imageUrl={item.imageUrl} compact />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14.5px] font-medium text-ink">{item.title}</span>
                    {item.author && <span className="block text-[13px] text-muted">{item.author}</span>}
                    <span className="figure block text-[13px] text-muted">
                      {item.quantity} × {formatNaira(item.unitPrice)}
                    </span>
                  </span>
                  <span className="figure shrink-0 text-[14px] font-bold text-ink">
                    {formatNaira(item.lineTotal)}
                  </span>
                </div>
              ))}

              <div className="space-y-2 border-t border-rule bg-gradient-to-b from-surface/50 to-white px-4 py-4 text-[14px]">
                <div className="flex justify-between">
                  <span className="text-muted">Subtotal</span>
                  <span className="figure font-medium">{formatNaira(order.subtotal)}</span>
                </div>
                {order.deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted">Delivery</span>
                    <span className="figure font-medium">{formatNaira(order.deliveryFee)}</span>
                  </div>
                )}
                {order.discount > 0 && (
                  <div className="flex justify-between text-leaf">
                    <span>Discount</span>
                    <span className="figure font-medium">−{formatNaira(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-rule pt-2.5 font-bold">
                  <span>Total</span>
                  <span className="figure">{formatNaira(order.total)}</span>
                </div>
                {order.amountPaid > 0 && order.amountPaid < order.total && (
                  <div className="flex justify-between text-amber font-medium">
                    <span>Received so far</span>
                    <span className="figure">{formatNaira(order.amountPaid)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-7">
            <div>
              <h2 className="text-[15px] font-bold text-ink">
                {order.fulfilment === "delivery" ? "Delivering to" : "Collecting from the shop"}
              </h2>
              {order.address ? (
                <address className="mt-2.5 rounded-xl border border-rule/60 bg-surface/30 p-4 text-[14px] not-italic leading-relaxed text-muted shadow-[var(--shadow-xs)]">
                  <span className="font-medium text-ink">{order.customerName}</span>
                  <br />
                  {order.address.street}
                  <br />
                  {order.address.city}, {order.address.state}
                  {order.address.landmark && (
                    <>
                      <br />
                      <span className="text-faint">{order.address.landmark}</span>
                    </>
                  )}
                  <br />
                  <span className="figure font-medium">{order.customerPhone}</span>
                </address>
              ) : (
                <p className="mt-2 rounded-xl border border-rule/60 bg-surface/30 p-4 text-[14px] leading-relaxed text-muted shadow-[var(--shadow-xs)]">
                  {data.pickupInstructions}
                </p>
              )}
            </div>

            <div>
              <h2 className="text-[15px] font-bold text-ink">Progress</h2>
              <ol className="mt-4 space-y-0">
                {[...order.timeline].reverse().map((entry, i) => (
                  <li key={i} className={cn("timeline-step pb-5", i === 0 && "timeline-active")}>
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-ink">
                        {ORDER_STATUS[entry.status as OrderStatus]?.customerLabel ?? entry.status}
                      </p>
                      {entry.note && <p className="text-[13px] text-muted mt-0.5">{entry.note}</p>}
                      <p className="text-[12.5px] text-faint mt-0.5">{formatDateTime(entry.at)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <p className="mt-12 rounded-xl border border-rule/60 bg-surface/30 p-4 text-[13.5px] text-muted shadow-[var(--shadow-xs)]">
          Save this page. You can come back to it any time at{" "}
          <Link href="/track" className="text-brass-deep font-semibold underline-offset-4 hover:underline">
            the tracking page
          </Link>{" "}
          with your order number and the last four digits of your phone number.
        </p>
      </main>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Tell us about your transfer"
        description="This queues your order for our team to confirm against the bank statement."
      >
        <form onSubmit={send} className="space-y-4">
          <Field label="Amount you sent" required hint="It should match the total on this order.">
            <NairaInput valueKobo={amount} onChangeKobo={setAmount} />
          </Field>

          <Field
            label="Name on the account you sent from"
            required
            hint="If someone else paid for you, put their name here."
          >
            <Input
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Adaeze Okonkwo"
            />
          </Field>

          <Field label="Which bank did you send from?">
            <Select value={bankName} onChange={(e) => setBankName(e.target.value)}>
              <option value="">Choose a bank</option>
              {NIGERIAN_BANKS.map((bank) => (
                <option key={bank} value={bank}>{bank}</option>
              ))}
            </Select>
          </Field>

          <Field label="Transaction reference" hint="Optional. The long code on your transfer receipt.">
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="000013250912143..."
              className="figure"
            />
          </Field>

          <Field label="Screenshot of the transfer" hint="Optional, but it gets your order confirmed faster.">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-rule-strong px-4 py-4 transition-all hover:border-brass hover:bg-brass/5">
              <Upload className="h-5 w-5 text-muted" aria-hidden />
              <span className="text-[14px] text-muted">
                {file ? file.name : "Choose an image"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </Field>

          {error && <Alert tone="bad">{error}</Alert>}

          <div className="flex gap-2 pt-2">
            <Button type="submit" loading={busy} fullWidth size="lg" variant="brass" className="gradient-shine">
              Send for confirmation
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
