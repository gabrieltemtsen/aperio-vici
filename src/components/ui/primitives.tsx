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
        "inline-flex items-center gap-1 rounded-[var(--radius-pill)] border px-2.5 py-0.5 text-[12px] font-medium",
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
    <Tag className={cn("rounded-[var(--radius-sheet)] border border-rule bg-white", className)}>
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
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {Icon && (
        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface text-muted">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      )}
      <p className="font-display text-[19px] text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-[14px] text-muted">{description}</p>
      {action && <div className="mt-4">{action}</div>}
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
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-ink-deep/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-xl bg-white shadow-[var(--shadow-lift)]",
          "sm:rounded-[var(--radius-sheet)]",
          wide ? "sm:max-w-3xl" : "sm:max-w-lg",
        )}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-rule bg-white px-5 py-4">
          <div>
            <h2 className="text-[18px] font-medium text-ink">{title}</h2>
            {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 rounded p-1 text-muted hover:bg-surface hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
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
    info: "bg-surface border-rule-strong text-ink-soft",
    good: "bg-leaf-soft border-leaf/25 text-leaf",
    warn: "bg-amber-soft border-amber/25 text-amber",
    bad: "bg-flag-soft border-flag/25 text-flag",
  };
  return (
    <div className={cn("rounded-[var(--radius-sheet)] border px-4 py-3 text-[14px]", tones[tone])}>
      {title && <p className="font-medium">{title}</p>}
      <div className={cn(title && "mt-0.5", "leading-relaxed")}>{children}</div>
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-12", className)}>
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-rule-strong border-t-ink" />
    </div>
  );
}

/** Skeleton rows sized to the content they stand in for. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-surface-deep", className)} />;
}
