"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { SiteHeader } from "@/components/shop/site-header";
import { BookCover } from "@/components/shop/book-cover";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/field";
import { Alert, EmptyState } from "@/components/ui/primitives";
import { useCart, cartSubtotal } from "@/lib/cart-store";
import { formatNaira, isValidPhone } from "@/lib/format";
import { NIGERIAN_STATES } from "@/lib/nigeria";
import { cn } from "@/lib/utils";
import { ShoppingBag, Truck, Store, Lock, Check, ChevronRight } from "lucide-react";

const STEPS = [
  { label: "Basket", done: true },
  { label: "Details", active: true },
  { label: "Payment" },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, clear } = useCart();
  const placeOrder = useMutation(api.orders.placeOnlineOrder);

  const [fulfilment, setFulfilment] = useState<"delivery" | "pickup">("delivery");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [landmark, setLandmark] = useState("");
  const [note, setNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const settings = useQuery(api.settings.get);
  const quote = useQuery(
    api.orders.quote,
    lines.length > 0
      ? {
          cart: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
          fulfilment,
          state: state || undefined,
        }
      : "skip",
  );

  const subtotal = quote?.subtotal ?? cartSubtotal(lines);
  const deliveryFee = quote?.deliveryFee ?? 0;
  const total = quote?.total ?? subtotal;

  const fieldErrors = {
    name: name.trim().length < 2 ? "Enter the name this order is for." : null,
    phone: !isValidPhone(phone) ? "We need a working Nigerian number, like 0803 123 4567." : null,
    street: fulfilment === "delivery" && street.trim().length < 5 ? "Enter the street address." : null,
    city: fulfilment === "delivery" && city.trim().length < 2 ? "Enter the town or city." : null,
    state: fulfilment === "delivery" && !state ? "Pick your state." : null,
  };
  const isValid = Object.values(fieldErrors).every((e) => e === null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ name: true, phone: true, street: true, city: true, state: true });
    if (!isValid) return;

    setSubmitting(true);
    setError(null);
    try {
      const result = await placeOrder({
        cart: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerEmail: email.trim() || undefined,
        fulfilment,
        address:
          fulfilment === "delivery"
            ? {
                street: street.trim(),
                city: city.trim(),
                state,
                landmark: landmark.trim() || undefined,
              }
            : undefined,
        customerNote: note.trim() || undefined,
      });
      clear();
      router.push(`/order/${result.orderNumber}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not place that order. Try again.");
      setSubmitting(false);
    }
  }

  if (lines.length === 0) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6">
          <EmptyState
            icon={ShoppingBag}
            title="There is nothing to check out"
            description="Your basket is empty. Add a book or a gift and come back here."
            action={
              <Link href="/shop">
                <Button>Browse the shop</Button>
              </Link>
            }
          />
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader />

      <main className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6 sm:py-12">
        {/* Progress Steps */}
        <div className="mb-10 flex items-center justify-center gap-2 rise">
          {STEPS.map((step, i) => (
            <div key={step.label} className="flex items-center gap-2">
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold transition-all",
                step.done ? "bg-leaf text-white" :
                step.active ? "gradient-brass text-white shadow-[var(--shadow-glow-brass)]" :
                "bg-surface-deep text-faint",
              )}>
                {step.done ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn(
                "text-[13px] font-semibold",
                step.active ? "text-ink" : step.done ? "text-leaf" : "text-faint",
              )}>
                {step.label}
              </span>
              {i < STEPS.length - 1 && (
                <ChevronRight className="h-4 w-4 text-rule-strong mx-1" />
              )}
            </div>
          ))}
        </div>

        <h1 className="font-display text-[30px] leading-tight text-ink sm:text-[38px] rise-delay-1">Checkout</h1>
        <p className="mt-2.5 max-w-xl text-[15px] text-muted rise-delay-2">
          We do not take card details here. You place the order, we show you our account, and you
          transfer the total.
        </p>

        <form onSubmit={submit} className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px] lg:gap-12 rise-delay-3">
          <div className="space-y-10">
            <section className="rounded-xl border border-rule/60 bg-white p-6 shadow-[var(--shadow-card)]">
              <h2 className="font-display text-[21px] text-ink">Who is this order for?</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field
                  label="Full name"
                  required
                  htmlFor="name"
                  error={touched.name ? fieldErrors.name : null}
                  className="sm:col-span-2"
                >
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                    placeholder="Adaeze Okonkwo"
                    autoComplete="name"
                  />
                </Field>

                <Field
                  label="Phone number"
                  required
                  htmlFor="phone"
                  hint="We use this to reach you about the order, and to confirm your payment."
                  error={touched.phone ? fieldErrors.phone : null}
                >
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                    placeholder="0803 123 4567"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </Field>

                <Field label="Email" htmlFor="email" hint="Optional. For a written receipt.">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </Field>
              </div>
            </section>

            <section className="rounded-xl border border-rule/60 bg-white p-6 shadow-[var(--shadow-card)]">
              <h2 className="font-display text-[21px] text-ink">How should we get it to you?</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  {
                    value: "delivery" as const,
                    icon: Truck,
                    title: "Deliver to me",
                    body: "Anywhere in Nigeria. Fee depends on your state.",
                  },
                  {
                    value: "pickup" as const,
                    icon: Store,
                    title: "I will collect it",
                    body: settings?.address ?? "Pick up from the shop, free.",
                  },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFulfilment(option.value)}
                    className={cn(
                      "flex gap-3.5 rounded-xl border-2 p-4 text-left transition-all duration-200",
                      fulfilment === option.value
                        ? "border-brass bg-brass/5 shadow-[var(--shadow-card)]"
                        : "border-rule/60 hover:border-rule-strong hover:shadow-[var(--shadow-xs)]",
                    )}
                  >
                    <div className={cn(
                      "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                      fulfilment === option.value ? "bg-brass/15 text-brass-deep" : "bg-surface text-muted",
                    )}>
                      <option.icon className="h-5 w-5" aria-hidden />
                    </div>
                    <span>
                      <span className="block text-[15px] font-semibold text-ink">{option.title}</span>
                      <span className="mt-0.5 block text-[13px] leading-snug text-muted">
                        {option.body}
                      </span>
                    </span>
                  </button>
                ))}
              </div>

              {fulfilment === "delivery" ? (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Street address"
                    required
                    htmlFor="street"
                    error={touched.street ? fieldErrors.street : null}
                    className="sm:col-span-2"
                  >
                    <Input
                      id="street"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, street: true }))}
                      placeholder="14 Aminu Kano Crescent, Wuse II"
                      autoComplete="street-address"
                    />
                  </Field>

                  <Field label="Town or city" required htmlFor="city" error={touched.city ? fieldErrors.city : null}>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, city: true }))}
                      placeholder="Abuja"
                      autoComplete="address-level2"
                    />
                  </Field>

                  <Field label="State" required htmlFor="state" error={touched.state ? fieldErrors.state : null}>
                    <Select
                      id="state"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, state: true }))}
                    >
                      <option value="">Choose your state</option>
                      {NIGERIAN_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </Select>
                  </Field>

                  <Field
                    label="Landmark"
                    htmlFor="landmark"
                    hint="Optional, but it helps the rider find you."
                    className="sm:col-span-2"
                  >
                    <Input
                      id="landmark"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="Opposite the filling station, blue gate"
                    />
                  </Field>
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-rule/60 bg-surface/50 p-5">
                  <p className="text-[14.5px] leading-relaxed text-ink-soft">
                    {settings?.pickupInstructions ??
                      "Bring your order number when you come to collect."}
                  </p>
                  {settings?.address && (
                    <p className="mt-2 text-[14px] text-muted">{settings.address}</p>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-rule/60 bg-white p-6 shadow-[var(--shadow-card)]">
              <Field
                label="Anything we should know?"
                htmlFor="note"
                hint="Gift wrapping, a message for the card, a delivery window."
              >
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Please wrap it — it is for a graduation."
                />
              </Field>
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-xl border border-rule/60 bg-white shadow-[var(--shadow-card)] overflow-hidden">
              <div className="border-b border-rule bg-gradient-to-r from-surface/60 to-white px-5 py-4">
                <h2 className="text-[16px] font-bold text-ink">Your order</h2>
              </div>

              <div className="max-h-72 overflow-y-auto px-5">
                {lines.map((line) => (
                  <div key={line.productId} className="flex gap-3.5 border-b border-rule/60 py-3.5 last:border-0">
                    <span className="h-16 w-11 shrink-0 overflow-hidden rounded-lg border border-rule/60 shadow-[var(--shadow-xs)]">
                      <BookCover title={line.title} kind={line.kind} imageUrl={line.imageUrl} compact />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-ink">{line.title}</span>
                      <span className="figure block text-[12.5px] text-muted">
                        {line.quantity} × {formatNaira(line.price)}
                      </span>
                    </span>
                    <span className="figure shrink-0 text-[14px] font-semibold text-ink">
                      {formatNaira(line.price * line.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-2.5 border-t border-rule px-5 py-4 text-[14px]">
                <div className="flex justify-between">
                  <span className="text-muted">Subtotal</span>
                  <span className="figure font-medium text-ink">{formatNaira(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">
                    {fulfilment === "pickup" ? "Pickup" : state ? `Delivery to ${state}` : "Delivery"}
                  </span>
                  <span className="figure font-medium text-ink">
                    {fulfilment === "pickup"
                      ? "Free"
                      : !state
                        ? "Pick a state"
                        : deliveryFee === 0
                          ? "Free"
                          : formatNaira(deliveryFee)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between border-t border-rule pt-3">
                  <span className="font-bold text-ink">Total to transfer</span>
                  <span className="figure font-display text-[26px] font-bold text-ink">{formatNaira(total)}</span>
                </div>
              </div>

              {quote && quote.unavailable.length > 0 && (
                <div className="px-5 pb-4">
                  <Alert tone="bad" title="Some items ran out">
                    {quote.unavailable.join(", ")} no longer has enough stock. Reduce the quantity in
                    your basket before you continue.
                  </Alert>
                </div>
              )}

              {error && (
                <div className="px-5 pb-4">
                  <Alert tone="bad">{error}</Alert>
                </div>
              )}

              <div className="border-t border-rule px-5 py-5">
                <Button
                  type="submit"
                  size="lg"
                  fullWidth
                  variant="brass"
                  loading={submitting}
                  disabled={!!quote && quote.unavailable.length > 0}
                  className="gradient-shine"
                >
                  <Lock className="h-4 w-4" />
                  Place order
                </Button>
                <p className="mt-3.5 flex items-start gap-2 text-[12.5px] leading-snug text-muted">
                  <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  Placing the order holds your items. You will see our account details next, and the
                  order is confirmed once we see your transfer.
                </p>
              </div>
            </div>
          </aside>
        </form>
      </main>
    </>
  );
}
