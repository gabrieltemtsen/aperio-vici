"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/primitives";

export function Stat({
  label,
  value,
  detail,
  change,
  loading,
  tone = "default",
}: {
  label: string;
  value: string;
  detail?: string;
  change?: number | null;
  loading?: boolean;
  tone?: "default" | "brass" | "alert";
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-sheet)] border bg-white px-4 py-4",
        tone === "brass" ? "border-brass/40" : tone === "alert" ? "border-flag/30" : "border-rule",
      )}
    >
      <p className="text-[13px] text-muted">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-28" />
      ) : (
        <p
          className={cn(
            "figure mt-1 font-display text-[27px] leading-none",
            tone === "alert" ? "text-flag" : "text-ink",
          )}
        >
          {value}
        </p>
      )}
      <div className="mt-1.5 flex items-center gap-2 text-[12.5px]">
        {typeof change === "number" && (
          <span className={change >= 0 ? "text-leaf" : "text-flag"}>
            {change >= 0 ? "+" : ""}
            {change}%
          </span>
        )}
        {detail && <span className="text-muted">{detail}</span>}
      </div>
    </div>
  );
}

/** Bar chart drawn with divs — no chart library for seven bars. */
export function RevenueBars({
  series,
  formatValue,
}: {
  series: { date: string; revenue: number; orders: number }[];
  formatValue: (kobo: number) => string;
}) {
  const peak = Math.max(...series.map((d) => d.revenue), 1);

  return (
    <div className="flex h-44 items-end gap-[3px]" role="img" aria-label="Daily revenue">
      {series.map((day) => {
        const height = Math.max(2, (day.revenue / peak) * 100);
        return (
          <div key={day.date} className="group relative flex-1">
            <div
              className={cn(
                "w-full rounded-t-[2px] transition-colors",
                day.revenue > 0 ? "bg-ink group-hover:bg-brass" : "bg-surface-deep",
              )}
              style={{ height: `${height}%` }}
            />
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink-deep px-2 py-1 text-[11.5px] text-white group-hover:block">
              <span className="figure">{formatValue(day.revenue)}</span>
              <span className="text-white/50"> · {day.orders} orders</span>
              <br />
              <span className="text-white/50">
                {new Date(day.date).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
