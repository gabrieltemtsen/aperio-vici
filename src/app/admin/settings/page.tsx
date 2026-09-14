"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { PageHeader } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field, NairaInput } from "@/components/ui/field";
import { Panel, PanelHeader, Alert, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { formatNaira } from "@/lib/format";
import { NIGERIAN_STATES, NIGERIAN_BANKS } from "@/lib/nigeria";
import { Plus, Trash2 } from "lucide-react";

type BankAccount = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  active: boolean;
};

export default function SettingsPage() {
  const settings = useQuery(api.settings.get);
  const update = useMutation(api.settings.update);
  const { notify } = useToast();

  const [form, setForm] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settings && !form) {
      setForm({
        storeName: settings.storeName,
        tagline: settings.tagline,
        phone: settings.phone,
        whatsapp: settings.whatsapp,
        email: settings.email,
        address: settings.address,
        pickupInstructions: settings.pickupInstructions,
        bankAccounts: settings.bankAccounts ?? [],
        deliveryFees: settings.deliveryFees ?? [],
        defaultDeliveryFee: settings.defaultDeliveryFee,
        freeDeliveryThreshold: settings.freeDeliveryThreshold ?? 0,
        paymentWindowHours: settings.paymentWindowHours,
      });
    }
  }, [settings, form]);

  if (!form) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  function set(key: string, value: any) {
    setForm((f: any) => ({ ...f, [key]: value }));
  }

  function setAccount(index: number, patch: Partial<BankAccount>) {
    setForm((f: any) => ({
      ...f,
      bankAccounts: f.bankAccounts.map((a: BankAccount, i: number) =>
        i === index ? { ...a, ...patch } : a,
      ),
    }));
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await update({
        storeName: form.storeName.trim(),
        tagline: form.tagline.trim(),
        phone: form.phone.trim(),
        whatsapp: form.whatsapp.replace(/\D/g, ""),
        email: form.email.trim(),
        address: form.address.trim(),
        pickupInstructions: form.pickupInstructions.trim(),
        bankAccounts: form.bankAccounts,
        deliveryFees: form.deliveryFees,
        defaultDeliveryFee: form.defaultDeliveryFee,
        freeDeliveryThreshold: form.freeDeliveryThreshold || undefined,
        paymentWindowHours: Number(form.paymentWindowHours) || 48,
      });
      notify("Settings saved. The storefront is using them now.", "good");
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not save.");
    } finally {
      setBusy(false);
    }
  }

  const unusedStates = NIGERIAN_STATES.filter(
    (state) => !form.deliveryFees.some((f: any) => f.state === state),
  );

  return (
    <>
      <PageHeader
        title="Settings"
        description="The details customers see, and the accounts they pay into."
        action={<Button loading={busy} onClick={save}>Save changes</Button>}
      />

      <div className="max-w-4xl space-y-6 p-4 sm:p-6">
        {error && <Alert tone="bad">{error}</Alert>}

        {form.bankAccounts.filter((a: BankAccount) => a.active).length === 0 && (
          <Alert tone="warn" title="Customers cannot pay you yet">
            With no active account, the order page has nothing to show after checkout. Add at least
            one bank account below.
          </Alert>
        )}

        <Panel>
          <PanelHeader
            title="Bank accounts"
            description="Shown on every order page. Turn one off and it disappears from the storefront without losing the details."
            action={
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  set("bankAccounts", [
                    ...form.bankAccounts,
                    { bankName: "", accountName: form.storeName, accountNumber: "", active: true },
                  ])
                }
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            }
          />
          <div className="space-y-4 px-4 py-4 sm:px-5">
            {form.bankAccounts.length === 0 ? (
              <p className="text-[14px] text-muted">No accounts yet.</p>
            ) : (
              form.bankAccounts.map((account: BankAccount, index: number) => (
                <div key={index} className="rounded-[var(--radius-sheet)] border border-rule p-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Bank">
                      <Select
                        value={account.bankName}
                        onChange={(e) => setAccount(index, { bankName: e.target.value })}
                      >
                        <option value="">Choose a bank</option>
                        {NIGERIAN_BANKS.map((bank) => (
                          <option key={bank} value={bank}>{bank}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Account name">
                      <Input
                        value={account.accountName}
                        onChange={(e) => setAccount(index, { accountName: e.target.value })}
                        placeholder="Aperio Vici Ventures Ltd"
                      />
                    </Field>
                    <Field
                      label="Account number"
                      error={
                        account.accountNumber && !/^\d{10}$/.test(account.accountNumber)
                          ? "Nigerian account numbers are 10 digits."
                          : null
                      }
                    >
                      <Input
                        value={account.accountNumber}
                        onChange={(e) =>
                          setAccount(index, { accountNumber: e.target.value.replace(/\D/g, "").slice(0, 10) })
                        }
                        className="figure"
                        inputMode="numeric"
                      />
                    </Field>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-rule pt-3">
                    <label className="flex cursor-pointer items-center gap-2 text-[13.5px] text-ink">
                      <input
                        type="checkbox"
                        checked={account.active}
                        onChange={(e) => setAccount(index, { active: e.target.checked })}
                        className="h-4 w-4 accent-[var(--color-ink)]"
                      />
                      Show this account to customers
                    </label>
                    <button
                      onClick={() =>
                        set("bankAccounts", form.bankAccounts.filter((_: any, i: number) => i !== index))
                      }
                      className="flex items-center gap-1.5 rounded p-1.5 text-[13px] text-muted hover:text-flag"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Delivery charges"
            description="Set a fee per state. Anywhere you have not listed uses the fallback."
            action={
              unusedStates.length > 0 ? (
                <Select
                  value=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    set("deliveryFees", [
                      ...form.deliveryFees,
                      { state: e.target.value, fee: form.defaultDeliveryFee },
                    ]);
                  }}
                  className="h-8 w-auto text-[13px]"
                  aria-label="Add a state"
                >
                  <option value="">Add a state</option>
                  {unusedStates.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </Select>
              ) : undefined
            }
          />
          <div className="px-4 py-4 sm:px-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Fallback fee" hint="Used for any state you have not set.">
                <NairaInput
                  valueKobo={form.defaultDeliveryFee}
                  onChangeKobo={(v) => set("defaultDeliveryFee", v)}
                />
              </Field>
              <Field
                label="Free delivery above"
                hint="Leave at zero to always charge for delivery."
              >
                <NairaInput
                  valueKobo={form.freeDeliveryThreshold}
                  onChangeKobo={(v) => set("freeDeliveryThreshold", v)}
                />
              </Field>
            </div>

            {form.deliveryFees.length > 0 && (
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {form.deliveryFees.map((entry: any, index: number) => (
                  <div
                    key={entry.state}
                    className="flex items-center gap-2 rounded-[var(--radius-sheet)] border border-rule px-3 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{entry.state}</span>
                    <div className="w-28">
                      <NairaInput
                        valueKobo={entry.fee}
                        onChangeKobo={(v) =>
                          set(
                            "deliveryFees",
                            form.deliveryFees.map((f: any, i: number) =>
                              i === index ? { ...f, fee: v } : f,
                            ),
                          )
                        }
                        className="h-9 text-[13.5px]"
                      />
                    </div>
                    <button
                      onClick={() =>
                        set("deliveryFees", form.deliveryFees.filter((_: any, i: number) => i !== index))
                      }
                      className="rounded p-1 text-muted hover:text-flag"
                      aria-label={`Remove ${entry.state}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="mt-4 text-[13px] text-muted">
              An order to a state you have not listed will be charged{" "}
              <span className="figure text-ink">{formatNaira(form.defaultDeliveryFee)}</span>.
            </p>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="The shop" description="Used across the storefront, receipts and the footer." />
          <div className="grid gap-4 px-4 py-4 sm:grid-cols-2 sm:px-5">
            <Field label="Shop name" required>
              <Input value={form.storeName} onChange={(e) => set("storeName", e.target.value)} />
            </Field>
            <Field label="One-line description" hint="Appears under the heading on the home page.">
              <Input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} />
            </Field>
            <Field label="Phone number">
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="figure" />
            </Field>
            <Field label="WhatsApp number" hint="With the country code, no plus. For example 2348030000000.">
              <Input
                value={form.whatsapp}
                onChange={(e) => set("whatsapp", e.target.value.replace(/\D/g, ""))}
                className="figure"
              />
            </Field>
            <Field label="Email">
              <Input value={form.email} onChange={(e) => set("email", e.target.value)} type="email" />
            </Field>
            <Field label="How long customers have to pay" hint="In hours. Shown on the order page.">
              <Input
                value={String(form.paymentWindowHours)}
                onChange={(e) => set("paymentWindowHours", e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                className="figure"
              />
            </Field>
            <Field label="Shop address" className="sm:col-span-2">
              <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
            </Field>
            <Field
              label="What to tell people collecting in person"
              hint="Opening hours, how long you hold orders, what to bring."
              className="sm:col-span-2"
            >
              <Textarea
                value={form.pickupInstructions}
                onChange={(e) => set("pickupInstructions", e.target.value)}
              />
            </Field>
          </div>
        </Panel>

        <div className="flex justify-end">
          <Button size="lg" loading={busy} onClick={save}>Save changes</Button>
        </div>
      </div>
    </>
  );
}
