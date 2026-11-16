import { MutationCtx } from "../_generated/server";

const ALPHABET = "ACDEFGHJKLMNPQRTUVWXY349"; // no 0/O/1/I/S/5/B/8 — these get misread on WhatsApp

/**
 * Order numbers double as the bank-transfer narration, so a customer has to be
 * able to type them from a screenshot without ambiguity. Sequence is atomic via
 * the counters table; the suffix makes two adjacent orders look different at a
 * glance so staff don't mix them up.
 */
export async function nextOrderNumber(ctx: MutationCtx): Promise<string> {
  const counter = await ctx.db
    .query("counters")
    .withIndex("by_key", (q) => q.eq("key", "orderNumber"))
    .unique();

  let sequence: number;
  if (counter) {
    sequence = counter.value + 1;
    await ctx.db.patch(counter._id, { value: sequence });
  } else {
    sequence = 1001;
    await ctx.db.insert("counters", { key: "orderNumber", value: sequence });
  }

  let base36 = "";
  let n = sequence;
  while (n > 0) {
    base36 = ALPHABET[n % ALPHABET.length] + base36;
    n = Math.floor(n / ALPHABET.length);
  }
  return `AV-${base36.padStart(4, ALPHABET[0])}`;
}

const SKU_PREFIX: Record<string, string> = {
  book: "BK",
  gift: "GF",
  ebook: "EB",
  stationery: "ST",
  card: "CD",
};

export async function nextSku(
  ctx: MutationCtx,
  kind: "book" | "gift" | "ebook" | "stationery" | "card",
): Promise<string> {
  const key = `sku_${kind}`;
  const counter = await ctx.db
    .query("counters")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();

  let sequence: number;
  if (counter) {
    sequence = counter.value + 1;
    await ctx.db.patch(counter._id, { value: sequence });
  } else {
    sequence = 1;
    await ctx.db.insert("counters", { key, value: sequence });
  }
  return `${SKU_PREFIX[kind] ?? "XX"}-${String(sequence).padStart(5, "0")}`;
}
