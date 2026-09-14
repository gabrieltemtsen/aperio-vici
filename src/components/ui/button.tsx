"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "brass";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-ink text-white shadow-[var(--shadow-drop)] hover:bg-ink-mid active:bg-ink-deep disabled:bg-rule-strong disabled:text-white disabled:shadow-none",
  brass:
    "gradient-brass text-white shadow-[var(--shadow-drop)] hover:brightness-110 active:brightness-95 disabled:bg-rule-strong disabled:text-white disabled:shadow-none",
  secondary:
    "bg-white text-ink border border-rule-strong shadow-[var(--shadow-xs)] hover:border-ink hover:bg-surface hover:shadow-[var(--shadow-drop)] disabled:text-faint disabled:border-rule disabled:shadow-none",
  ghost: "bg-transparent text-ink hover:bg-surface disabled:text-faint",
  danger: "bg-flag text-white shadow-[var(--shadow-drop)] hover:brightness-110 disabled:bg-rule-strong disabled:shadow-none",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3.5 text-[13px] gap-1.5",
  md: "h-10 px-4.5 text-[14px] gap-2",
  lg: "h-12 px-7 text-[15px] gap-2.5",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

/** For anchors and Links that should look like buttons but stay real links. */
export function buttonStyles(opts?: {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  className?: string;
}) {
  return cn(
    "inline-flex items-center justify-center rounded-[var(--radius-control)] font-semibold",
    "btn-press transition-all duration-[var(--duration-fast)] select-none whitespace-nowrap",
    VARIANTS[opts?.variant ?? "primary"],
    SIZES[opts?.size ?? "md"],
    opts?.fullWidth && "w-full",
    opts?.className,
  );
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", loading, fullWidth, children, disabled, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded-[var(--radius-control)] font-semibold",
        "btn-press transition-all duration-[var(--duration-fast)] disabled:cursor-not-allowed select-none whitespace-nowrap",
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
