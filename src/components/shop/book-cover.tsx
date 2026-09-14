"use client";

import { cn } from "@/lib/utils";

/**
 * Most of a real bookshop's stock arrives without usable cover art, so the
 * fallback has to be good enough to ship rather than a grey box with an icon.
 * Each title gets a stable, typeset cover derived from its own characters —
 * the same book always looks the same, and a shelf of them looks like a shelf.
 */

const CLOTHS = [
  { bg: "#10203A", ink: "#F3EEE2", rule: "#C08A2E" }, // navy, brass
  { bg: "#3E2A21", ink: "#F0E6D8", rule: "#C9A227" }, // chocolate
  { bg: "#1F4038", ink: "#E8F0E9", rule: "#D4B483" }, // deep green
  { bg: "#5A1F24", ink: "#F5E7E2", rule: "#DDB892" }, // oxblood
  { bg: "#2B2D42", ink: "#EDEDF2", rule: "#B8B8D1" }, // slate violet
  { bg: "#0F3B4C", ink: "#E4F0F2", rule: "#E9C46A" }, // teal
  { bg: "#4A3B12", ink: "#F4EDD8", rule: "#E0C060" }, // olive
  { bg: "#6B3A2A", ink: "#F7EAE0", rule: "#E6B89C" }, // brick
];

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function clothFor(title: string) {
  return CLOTHS[hash(title) % CLOTHS.length];
}

export function BookCover({
  title,
  author,
  kind = "book",
  imageUrl,
  className,
  compact,
}: {
  title: string;
  author?: string;
  kind?: "book" | "gift";
  imageUrl?: string | null;
  className?: string;
  compact?: boolean;
}) {
  if (imageUrl) {
    return (
      // Plain img: covers come from Convex storage with signed, changing URLs.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={title}
        loading="lazy"
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }

  const cloth = clothFor(title);
  const initials = title
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  if (kind === "gift") {
    return (
      <div
        className={cn("cover-fallback h-full w-full items-center justify-center p-4", className)}
        style={{ background: cloth.bg, color: cloth.ink }}
        aria-hidden
      >
        <div className="flex h-full w-full items-center justify-center">
          <div
            className="flex aspect-square w-[62%] items-center justify-center rounded-full border"
            style={{ borderColor: cloth.rule }}
          >
            <span
              className="font-display leading-none"
              style={{ fontSize: compact ? "1.1rem" : "1.6rem", color: cloth.rule }}
            >
              {initials || "AV"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("cover-fallback h-full w-full p-3 sm:p-4", className)}
      style={{ background: cloth.bg, color: cloth.ink }}
      aria-hidden
    >
      <div className="h-px w-8" style={{ background: cloth.rule }} />
      <div className="flex-1 pt-3">
        <p
          className={cn(
            "font-display leading-[1.12] tracking-[-0.01em]",
            compact ? "text-[13px]" : "text-[15px] sm:text-[17px]",
          )}
          style={{ textWrap: "balance" }}
        >
          {title.length > 58 ? title.slice(0, 56) + "…" : title}
        </p>
      </div>
      {author && !compact && (
        <p className="text-[11px] opacity-70" style={{ letterSpacing: "0.02em" }}>
          {author}
        </p>
      )}
      <div className="mt-2 h-px w-full opacity-25" style={{ background: cloth.rule }} />
    </div>
  );
}

/** Vertical spine for the hero shelf. Height varies with title length, as it does on a shelf. */
export function BookSpine({
  title,
  author,
  index,
}: {
  title: string;
  author?: string;
  index: number;
}) {
  const cloth = clothFor(title);
  const heights = [178, 205, 192, 220, 186, 210, 198, 228];
  const widths = [30, 38, 26, 44, 34, 30, 40, 28];

  return (
    <span
      className="spine flex items-center justify-center px-1 py-3"
      style={{
        background: cloth.bg,
        color: cloth.ink,
        height: heights[index % heights.length],
        width: widths[index % widths.length],
      }}
    >
      <span
        className="font-display text-[12px] leading-none tracking-tight"
        style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
      >
        {title.length > 26 ? title.slice(0, 24) + "…" : title}
        {author && <span className="opacity-60"> · {author.split(" ").pop()}</span>}
      </span>
    </span>
  );
}
