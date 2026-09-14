"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const CONTROL =
  "w-full rounded-[var(--radius-control)] border border-rule-strong bg-white px-3 text-[15px] text-ink " +
  "placeholder:text-faint transition-colors hover:border-muted focus:border-ink focus:outline-none " +
  "focus:ring-2 focus:ring-brass/35 disabled:bg-surface disabled:text-muted";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(CONTROL, "h-11", className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(CONTROL, "py-2.5 min-h-24 leading-relaxed", className)} {...props} />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn(CONTROL, "h-11 pr-8 appearance-none cursor-pointer", className)} {...props}>
    {children}
  </select>
));
Select.displayName = "Select";

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-ink-soft">
        {label}
        {required && <span className="text-flag ml-0.5">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-[12.5px] text-flag">{error}</p>
      ) : hint ? (
        <p className="text-[12.5px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/** Money input that speaks naira and stores kobo. */
export function NairaInput({
  valueKobo,
  onChangeKobo,
  ...props
}: {
  valueKobo: number;
  onChangeKobo: (kobo: number) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">₦</span>
      <Input
        inputMode="decimal"
        className="pl-7 figure"
        value={valueKobo ? String(valueKobo / 100) : ""}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9.]/g, "");
          const naira = parseFloat(raw);
          onChangeKobo(Number.isFinite(naira) ? Math.round(naira * 100) : 0);
        }}
        {...props}
      />
    </div>
  );
}
