"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/primitives";

export default function SignInPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    formData.set("flow", flow);

    try {
      await signIn("password", formData);
      router.push("/admin");
    } catch {
      setError(
        flow === "signIn"
          ? "That email and password do not match an account."
          : "We could not create that account. The email may already be registered, or the password is too short.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* The brand panel is the only decoration here; the form stays plain. */}
      <div className="hidden w-[42%] flex-col justify-between bg-ink p-10 text-white lg:flex">
        <Link href="/" className="font-display text-[24px]">
          Aperio<span className="text-brass"> Vici</span>
        </Link>
        <div>
          <p className="font-display text-[32px] leading-[1.15]">
            The counter, the shelves and the bank statement, in one place.
          </p>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/60">
            Verify transfers, pack orders, ring up walk-in sales and watch stock, without leaving the
            dashboard.
          </p>
        </div>
        <p className="text-[13px] text-white/40">Staff access only</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <Link href="/" className="font-display text-[22px] text-ink lg:hidden">
            Aperio<span className="text-brass"> Vici</span>
          </Link>

          <h1 className="mt-8 font-display text-[30px] leading-tight text-ink lg:mt-0">
            {flow === "signIn" ? "Sign in to the dashboard" : "Create a staff account"}
          </h1>
          <p className="mt-2 text-[14.5px] text-muted">
            {flow === "signIn"
              ? "Use the email your manager set you up with."
              : "New accounts have no access until an admin grants a role."}
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            {flow === "signUp" && (
              <Field label="Your name" required htmlFor="name">
                <Input id="name" name="name" placeholder="Chidi Nwosu" autoComplete="name" required />
              </Field>
            )}

            <Field label="Email" required htmlFor="email">
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@aperiovici.ng"
                autoComplete="email"
                required
              />
            </Field>

            <Field
              label="Password"
              required
              htmlFor="password"
              hint={flow === "signUp" ? "At least eight characters." : undefined}
            >
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={flow === "signIn" ? "current-password" : "new-password"}
                minLength={8}
                required
              />
            </Field>

            {error && <Alert tone="bad">{error}</Alert>}

            <Button type="submit" size="lg" fullWidth loading={busy}>
              {flow === "signIn" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-[14px] text-muted">
            {flow === "signIn" ? "No account yet?" : "Already set up?"}{" "}
            <button
              onClick={() => {
                setFlow(flow === "signIn" ? "signUp" : "signIn");
                setError(null);
              }}
              className="text-brass-deep underline underline-offset-4"
            >
              {flow === "signIn" ? "Create one" : "Sign in instead"}
            </button>
          </p>

          <Link href="/" className="mt-8 block text-[13.5px] text-muted hover:text-ink">
            Back to the shop
          </Link>
        </div>
      </div>
    </div>
  );
}
