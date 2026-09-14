"use client";

import { ORDER_STATUS, STATUS_TONE_CLASS, type OrderStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

export function StatusPill({
  status,
  className,
}: {
  status: OrderStatus | string;
  className?: string;
}) {
  const meta = ORDER_STATUS[status as OrderStatus];
  if (!meta) return null;
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-[var(--radius-pill)] border px-2.5 py-0.5 text-[12px] font-medium",
        STATUS_TONE_CLASS[meta.tone],
        className,
      )}
    >
      {meta.label}
    </span>
  );
}

export function ChannelPill({ channel }: { channel: "online" | "walk_in" }) {
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-[2px] px-1.5 py-0.5 text-[11px] font-medium",
        channel === "online" ? "bg-surface text-muted" : "bg-ink text-white",
      )}
    >
      {channel === "online" ? "Online" : "Counter"}
    </span>
  );
}
