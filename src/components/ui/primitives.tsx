"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export function Badge({
  children,
  className,
  tone = "neutral",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "neutral" | "good" | "warn" | "bad" | "ink";
}) {
  const tones = {
    neutral: "bg-surface text-muted border-rule",
    good: "bg-leaf-soft text-leaf border-leaf/25",
    warn: "bg-amber-soft text-amber border-amber/25",
    bad: "bg-flag-soft text-flag border-flag/25",
    ink: "bg-ink text-white border-ink",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border px-2.5 py-0.5 text-[12.5px] font-semibold tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Panel({
  children,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}) {
  return (
    <Tag className={cn("rounded-[var(--radius-sheet)] border border-rule bg-white shadow-[var(--shadow-card)]", className)}>
      {children}
    </Tag>
  );
}

export function PanelHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-rule px-4 py-3 sm:px-5">
      <div className="min-w-0">
        <h2 className="text-[16px] font-medium text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Empty states point at the next action rather than apologising. */
export function EmptyState({
  title,
  description,
  action,
  icon: Icon,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center rise">
      {Icon && (
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-surface to-surface-deep text-muted shadow-[var(--shadow-card)]">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
      )}
      <p className="font-display text-[20px] text-ink">{title}</p>
      <p className="mt-1.5 max-w-sm text-[14.5px] leading-relaxed text-muted">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center animate-in fade-in duration-200">
      <div
        className="absolute inset-0 bg-ink-deep/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative z-10 max-h-[92vh] w-full overflow-y-auto bg-white shadow-[var(--shadow-lift)]",
          "rounded-t-2xl sm:rounded-xl",
          "scale-in",
          wide ? "sm:max-w-3xl" : "sm:max-w-lg",
        )}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-rule bg-white/95 backdrop-blur-sm px-5 py-4 rounded-t-2xl sm:rounded-t-xl">
          <div>
            <h2 className="text-[18px] font-semibold text-ink">{title}</h2>
            {description && <p className="mt-0.5 text-[13.5px] text-muted">{description}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 rounded-lg p-1.5 text-muted transition hover:bg-surface hover:text-ink active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "good" | "warn" | "bad";
  title?: string;
  children: React.ReactNode;
}) {
  const tones = {
    info: "bg-surface border-rule-strong text-ink-soft border-l-ink-mid",
    good: "bg-leaf-soft border-leaf/25 text-leaf border-l-leaf",
    warn: "bg-amber-soft border-amber/25 text-amber border-l-amber",
    bad: "bg-flag-soft border-flag/25 text-flag border-l-flag",
  };
  return (
    <div className={cn("rounded-[var(--radius-sheet)] border border-l-[3px] px-4 py-3 text-[14px]", tones[tone])}>
      {title && <p className="font-semibold">{title}</p>}
      <div className={cn(title && "mt-0.5", "leading-relaxed")}>{children}</div>
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-12", className)}>
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-rule-strong border-t-brass" />
    </div>
  );
}

/** Skeleton shimmer — sweeping gradient instead of basic pulse. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton-shimmer rounded-[var(--radius-sheet)]", className)} />;
}
