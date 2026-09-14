"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { PageHeader } from "@/components/admin/shell";
import { BookCover } from "@/components/shop/book-cover";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field, NairaInput } from "@/components/ui/field";
import { Panel, Alert, EmptyState, Modal, Skeleton, Badge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { formatNaira } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Plus, Search, Library, Upload, X, Eye, EyeOff, Archive } from "lucide-react";

type StockFilter = "all" | "low" | "out" | "unpublished";

const BLANK = {
  title: "",
  kind: "book" as "book" | "gift",
  description: "",
  categoryId: "" as string,
  author: "",
  publisher: "",
  isbn: "",
  format: "paperback" as "paperback" | "hardcover" | "boxset",
  pages: "",
  language: "English",
  publishedYear: "",
  price: 0,
  compareAtPrice: 0,
  costPrice: 0,
  stock: 0,
  lowStockThreshold: 5,
  imageStorageIds: [] as Id<"_storage">[],
  imageUrls: [] as string[],
  tags: "",
  published: true,
  featured: false,
};

function InventoryContent() {
  const params = useSearchParams();
  const { notify } = useToast();

  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<"book" | "gift" | undefined>();
  const [stockFilter, setStockFilter] = useState<StockFilter>(
    (params.get("stock") as StockFilter) ?? "all",
  );

  const products = useQuery(api.products.adminList, {
    search: search.trim() || undefined,
    kind,
    stockFilter,
  });
  const categories = useQuery(api.categories.list, {});

  const create = useMutation(api.products.create);
  const update = useMutation(api.products.update);
  const setPublished = useMutation(api.products.setPublished);
  const archive = useMutation(api.products.archive);
  const adjustStock = useMutation(api.products.adjustStock);
  const generateUploadUrl = useMutation(api.products.generateUploadUrl);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"products"> | null>(null);
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);

  const [stockTarget, setStockTarget] = useState<any | null>(null);
  const [stockDelta, setStockDelta] = useState(0);
  const [stockReason, setStockReason] = useState<"restock" | "correction" | "return" | "damage">("restock");
  const [stockNote, setStockNote] = useState("");

  useEffect(() => {
    if (formOpen && !editingId && categories?.length && !form.categoryId) {
      setForm((f) => ({ ...f, categoryId: categories[0]._id }));
    }
  }, [formOpen, editingId, categories, form.categoryId]);

  function openNew() {
    setEditingId(null);
    setForm({ ...BLANK, categoryId: categories?.[0]?._id ?? "" });
    setPreviews([]);
    setError(null);
    setFormOpen(true);
  }

  function openEdit(product: any) {
    setEditingId(product._id);
    setForm({
      title: product.title,
      kind: product.kind,
      description: product.description,
      categoryId: product.categoryId,
      author: product.author ?? "",
      publisher: product.publisher ?? "",
      isbn: product.isbn ?? "",
      format: product.format ?? "paperback",
      pages: product.pages ? String(product.pages) : "",
      language: product.language ?? "English",
      publishedYear: product.publishedYear ? String(product.publishedYear) : "",
      price: product.price,
      compareAtPrice: product.compareAtPrice ?? 0,
      costPrice: product.costPrice ?? 0,
      stock: product.stock,
      lowStockThreshold: product.lowStockThreshold,
      imageStorageIds: product.imageStorageIds,
      imageUrls: product.imageUrls,
      tags: product.tags.join(", "),
      published: product.published,
      featured: product.featured,
    });
    setPreviews(product.images ?? []);
    setError(null);
    setFormOpen(true);
  }

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error("upload failed");
      const { storageId } = await response.json();
      setForm((f) => ({ ...f, imageStorageIds: [...f.imageStorageIds, storageId] }));
      setPreviews((p) => [...p, URL.createObjectURL(file)]);
    } catch {
      notify("That image did not upload. Try a smaller file.", "bad");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setBusy(true);
    setError(null);

    const payload = {
      title: form.title.trim(),
      kind: form.kind,
      description: form.description.trim(),
      categoryId: form.categoryId as Id<"categories">,
      author: form.kind === "book" && form.author.trim() ? form.author.trim() : undefined,
      publisher: form.publisher.trim() || undefined,
      isbn: form.isbn.trim() || undefined,
      format: form.kind === "book" ? form.format : undefined,
      pages: form.pages ? Number(form.pages) : undefined,
      language: form.kind === "book" ? form.language.trim() || undefined : undefined,
      publishedYear: form.publishedYear ? Number(form.publishedYear) : undefined,
      price: form.price,
      compareAtPrice: form.compareAtPrice || undefined,
      costPrice: form.costPrice || undefined,
      stock: Number(form.stock),
      lowStockThreshold: Number(form.lowStockThreshold),
      imageStorageIds: form.imageStorageIds,
      imageUrls: form.imageUrls,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      published: form.published,
      featured: form.featured,
    };

    try {
      if (editingId) {
        await update({ id: editingId, ...payload });
        notify(`${payload.title} updated.`, "good");
      } else {
        await create(payload);
        notify(`${payload.title} is on the shelves.`, "good");
      }
      setFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not save.");
    } finally {
      setBusy(false);
    }
  }

  const formValid =
    form.title.trim().length > 1 && form.description.trim().length > 5 && form.price > 0 && form.categoryId;

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Everything on the shelves, what it costs and how much is left."
        action={
          <Button onClick={openNew} disabled={!categories?.length}>
            <Plus className="h-4 w-4" />
            Add a product
          </Button>
        }
      />

      <div className="space-y-4 p-4 sm:p-6">
        {categories?.length === 0 && (
          <Alert tone="warn" title="No categories yet">
            Products need a shelf to sit on. Run the seed script, or add categories from the Convex
            dashboard, before you create your first product.
          </Alert>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title"
              className="h-10 pl-9 text-[14px]"
              aria-label="Search inventory"
            />
          </div>

          <Select
            value={kind ?? ""}
            onChange={(e) => setKind((e.target.value || undefined) as any)}
            className="h-10 w-auto text-[13.5px]"
            aria-label="Filter by type"
          >
            <option value="">Books and gifts</option>
            <option value="book">Books</option>
            <option value="gift">Gifts</option>
          </Select>

          <div className="flex rounded-[var(--radius-control)] border border-rule bg-white p-0.5">
            {([
              { value: "all", label: "All" },
              { value: "low", label: "Low" },
              { value: "out", label: "Out" },
              { value: "unpublished", label: "Hidden" },
            ] as const).map((option) => (
              <button
                key={option.value}
                onClick={() => setStockFilter(option.value)}
                className={cn(
                  "rounded-[4px] px-3 py-1.5 text-[13px] transition-colors",
                  stockFilter === option.value ? "bg-ink text-white" : "text-muted hover:text-ink",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <Panel className="overflow-hidden">
          {products === undefined ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <EmptyState
              icon={Library}
              title={search ? `Nothing matches “${search}”` : "No products here"}
              description={
                stockFilter === "low"
                  ? "Nothing is below its reorder level. That is a good place to be."
                  : "Add your first product and it will appear on the storefront right away."
              }
              action={categories?.length ? <Button onClick={openNew}>Add a product</Button> : undefined}
            />
          ) : (
            <div className="scroll-x">
              <table className="w-full min-w-[820px] text-[14px]">
                <thead>
                  <tr className="border-b border-rule bg-surface text-left text-[12.5px] text-muted">
                    <th className="px-4 py-2.5 font-medium">Product</th>
                    <th className="px-3 py-2.5 font-medium">Shelf</th>
                    <th className="px-3 py-2.5 text-right font-medium">Price</th>
                    <th className="px-3 py-2.5 text-right font-medium">Margin</th>
                    <th className="px-3 py-2.5 text-right font-medium">Stock</th>
                    <th className="px-3 py-2.5 text-right font-medium">Sold</th>
                    <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const margin =
                      product.costPrice && product.costPrice > 0
                        ? Math.round(((product.price - product.costPrice) / product.price) * 100)
                        : null;
                    return (
                      <tr key={product._id} className="border-b border-rule last:border-0 hover:bg-surface">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <span className="h-12 w-8 shrink-0 overflow-hidden rounded-[2px] border border-rule">
                              <BookCover
                                title={product.title}
                                kind={product.kind}
                                imageUrl={product.coverImage}
                                compact
                              />
                            </span>
                            <span className="min-w-0">
                              <button
                                onClick={() => openEdit(product)}
                                className="block max-w-[260px] truncate text-left text-ink hover:text-brass-deep"
                              >
                                {product.title}
                              </button>
                              <span className="flex items-center gap-1.5">
                                <span className="ref text-[11.5px] text-faint">{product.sku}</span>
                                {!product.published && <Badge tone="neutral">Hidden</Badge>}
                                {product.featured && <Badge tone="warn">Featured</Badge>}
                              </span>
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-muted">{product.categoryName}</td>
                        <td className="figure px-3 py-2.5 text-right text-ink">
                          {formatNaira(product.price)}
                        </td>
                        <td className="figure px-3 py-2.5 text-right text-muted">
                          {margin === null ? "—" : `${margin}%`}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            onClick={() => {
                              setStockTarget(product);
                              setStockDelta(0);
                              setStockReason("restock");
                              setStockNote("");
                            }}
                            className={cn(
                              "figure rounded-[var(--radius-pill)] px-2 py-0.5 text-[13px] font-medium",
                              product.stock <= 0
                                ? "bg-flag-soft text-flag"
                                : product.stock <= product.lowStockThreshold
                                  ? "bg-amber-soft text-amber"
                                  : "text-ink hover:bg-surface-deep",
                            )}
                          >
                            {product.stock}
                          </button>
                        </td>
                        <td className="figure px-3 py-2.5 text-right text-muted">{product.unitsSold}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() =>
                                setPublished({ id: product._id, published: !product.published })
                              }
                              className="rounded p-1.5 text-muted hover:bg-surface-deep hover:text-ink"
                              aria-label={product.published ? "Hide from the shop" : "Show in the shop"}
                              title={product.published ? "Hide from the shop" : "Show in the shop"}
                            >
                              {product.published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Archive ${product.title}? It comes off the shop but stays on past orders.`)) {
                                  void archive({ id: product._id }).then(() =>
                                    notify(`${product.title} archived.`, "info"),
                                  );
                                }
                              }}
                              className="rounded p-1.5 text-muted hover:bg-flag-soft hover:text-flag"
                              aria-label="Archive"
                              title="Archive"
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? "Edit product" : "Add a product"}
        description={
          editingId
            ? "Changes show on the storefront straight away."
            : "It goes live as soon as you save, unless you untick Show in the shop."
        }
        wide
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="What is it?" required className="sm:col-span-2">
              <div className="flex gap-2">
                {(["book", "gift"] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => setForm((f) => ({ ...f, kind: option }))}
                    className={cn(
                      "flex-1 rounded-[var(--radius-control)] border px-4 py-2.5 text-[14px] transition",
                      form.kind === option
                        ? "border-ink bg-surface font-medium text-ink"
                        : "border-rule text-muted hover:border-rule-strong",
                    )}
                  >
                    {option === "book" ? "A book" : "A gift or stationery"}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Title" required className="sm:col-span-2">
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={form.kind === "book" ? "Things Fall Apart" : "Leather Hardcover Journal, A5"}
              />
            </Field>

            {form.kind === "book" && (
              <>
                <Field label="Author">
                  <Input
                    value={form.author}
                    onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
                    placeholder="Chinua Achebe"
                  />
                </Field>
                <Field label="Publisher">
                  <Input
                    value={form.publisher}
                    onChange={(e) => setForm((f) => ({ ...f, publisher: e.target.value }))}
                    placeholder="Heinemann"
                  />
                </Field>
                <Field label="ISBN" hint="Lets the counter find it by barcode.">
                  <Input
                    value={form.isbn}
                    onChange={(e) => setForm((f) => ({ ...f, isbn: e.target.value }))}
                    className="figure"
                    placeholder="9780435905255"
                  />
                </Field>
                <Field label="Format">
                  <Select
                    value={form.format}
                    onChange={(e) => setForm((f) => ({ ...f, format: e.target.value as any }))}
                  >
                    <option value="paperback">Paperback</option>
                    <option value="hardcover">Hardcover</option>
                    <option value="boxset">Box set</option>
                  </Select>
                </Field>
                <Field label="Pages">
                  <Input
                    value={form.pages}
                    onChange={(e) => setForm((f) => ({ ...f, pages: e.target.value.replace(/\D/g, "") }))}
                    inputMode="numeric"
                    className="figure"
                  />
                </Field>
                <Field label="Year published">
                  <Input
                    value={form.publishedYear}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, publishedYear: e.target.value.replace(/\D/g, "").slice(0, 4) }))
                    }
                    inputMode="numeric"
                    className="figure"
                  />
                </Field>
              </>
            )}

            <Field label="Shelf" required>
              <Select
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              >
                <option value="">Choose a shelf</option>
                {categories?.map((category) => (
                  <option key={category._id} value={category._id}>{category.name}</option>
                ))}
              </Select>
            </Field>

            <Field label="Tags" hint="Comma separated. Customers can search these.">
              <Input
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                placeholder="classic, nigerian, school reading"
              />
            </Field>

            <Field
              label="Description"
              required
              hint="Write how you would describe it to a customer at the counter."
              className="sm:col-span-2"
            >
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="min-h-28"
              />
            </Field>
          </div>

          <div className="border-t border-rule pt-5">
            <h3 className="text-[14px] font-semibold text-ink">Money</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <Field label="Selling price" required>
                <NairaInput valueKobo={form.price} onChangeKobo={(v) => setForm((f) => ({ ...f, price: v }))} />
              </Field>
              <Field label="Was" hint="Shows as a strike-through.">
                <NairaInput
                  valueKobo={form.compareAtPrice}
                  onChangeKobo={(v) => setForm((f) => ({ ...f, compareAtPrice: v }))}
                />
              </Field>
              <Field label="What it cost you" hint="Private. Drives margin reporting.">
                <NairaInput
                  valueKobo={form.costPrice}
                  onChangeKobo={(v) => setForm((f) => ({ ...f, costPrice: v }))}
                />
              </Field>
            </div>
            {form.price > 0 && form.costPrice > 0 && (
              <p className="mt-2 text-[13px] text-muted">
                Margin:{" "}
                <span className="figure text-ink">
                  {formatNaira(form.price - form.costPrice)} (
                  {Math.round(((form.price - form.costPrice) / form.price) * 100)}%)
                </span>
              </p>
            )}
          </div>

          <div className="border-t border-rule pt-5">
            <h3 className="text-[14px] font-semibold text-ink">Stock</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field
                label={editingId ? "Stock on hand" : "Opening stock"}
                required
                hint={editingId ? "Editing this logs a correction." : undefined}
              >
                <Input
                  value={String(form.stock)}
                  onChange={(e) => setForm((f) => ({ ...f, stock: Number(e.target.value.replace(/\D/g, "")) || 0 }))}
                  inputMode="numeric"
                  className="figure"
                />
              </Field>
              <Field label="Tell me when it drops to" hint="Shows on the dashboard as running low.">
                <Input
                  value={String(form.lowStockThreshold)}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lowStockThreshold: Number(e.target.value.replace(/\D/g, "")) || 0 }))
                  }
                  inputMode="numeric"
                  className="figure"
                />
              </Field>
            </div>
          </div>

          <div className="border-t border-rule pt-5">
            <h3 className="text-[14px] font-semibold text-ink">Cover image</h3>
            <p className="mt-1 text-[13px] text-muted">
              Optional. Without one we typeset a cover from the title, which looks fine on the shelf.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {previews.map((preview, i) => (
                <div key={i} className="relative h-24 w-16 overflow-hidden rounded-[2px] border border-rule">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => {
                      setPreviews((p) => p.filter((_, index) => index !== i));
                      setForm((f) => ({
                        ...f,
                        imageStorageIds: f.imageStorageIds.filter((_, index) => index !== i),
                      }));
                    }}
                    className="absolute right-0.5 top-0.5 rounded-full bg-ink/80 p-0.5 text-white"
                    aria-label="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="flex h-24 w-16 cursor-pointer flex-col items-center justify-center rounded-[2px] border border-dashed border-rule-strong text-muted hover:border-ink hover:text-ink">
                {uploading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-rule-strong border-t-ink" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadImage(file);
                  }}
                />
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-5 border-t border-rule pt-5">
            <label className="flex cursor-pointer items-center gap-2 text-[14px] text-ink">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
                className="h-4 w-4 accent-[var(--color-ink)]"
              />
              Show in the shop
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-[14px] text-ink">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
                className="h-4 w-4 accent-[var(--color-ink)]"
              />
              Put it on the front table
            </label>
          </div>

          {error && <Alert tone="bad">{error}</Alert>}

          <div className="flex gap-2 border-t border-rule pt-4">
            <Button variant="secondary" fullWidth onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button fullWidth loading={busy} disabled={!formValid} onClick={save}>
              {editingId ? "Save changes" : "Add to the shelves"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!stockTarget}
        onClose={() => setStockTarget(null)}
        title="Adjust stock"
        description={stockTarget ? `${stockTarget.title} — ${stockTarget.stock} on hand` : ""}
      >
        <div className="space-y-4">
          <Field label="How many are moving?" required hint="Use a negative number to take stock out.">
            <Input
              value={stockDelta === 0 ? "" : String(stockDelta)}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9-]/g, "");
                setStockDelta(Number(raw) || 0);
              }}
              inputMode="numeric"
              className="figure"
              placeholder="20"
            />
          </Field>

          <Field label="Why?" required>
            <Select value={stockReason} onChange={(e) => setStockReason(e.target.value as any)}>
              <option value="restock">New stock arrived</option>
              <option value="correction">Counted it, the number was wrong</option>
              <option value="return">Customer returned it</option>
              <option value="damage">Damaged or lost</option>
            </Select>
          </Field>

          <Field label="Note" hint="Optional. Supplier, invoice number, whatever helps later.">
            <Input value={stockNote} onChange={(e) => setStockNote(e.target.value)} />
          </Field>

          {stockTarget && stockDelta !== 0 && (
            <Alert tone={stockTarget.stock + stockDelta < 0 ? "bad" : "info"}>
              {stockTarget.stock + stockDelta < 0
                ? `You only have ${stockTarget.stock}. You cannot take out ${Math.abs(stockDelta)}.`
                : `${stockTarget.title} goes from ${stockTarget.stock} to ${stockTarget.stock + stockDelta}.`}
            </Alert>
          )}

          <Button
            fullWidth
            size="lg"
            loading={busy}
            disabled={stockDelta === 0 || (stockTarget && stockTarget.stock + stockDelta < 0)}
            onClick={async () => {
              setBusy(true);
              try {
                await adjustStock({
                  id: stockTarget._id,
                  delta: stockDelta,
                  reason: stockReason,
                  note: stockNote.trim() || undefined,
                });
                notify(`${stockTarget.title} now has ${stockTarget.stock + stockDelta} on hand.`, "good");
                setStockTarget(null);
              } catch (err) {
                notify(err instanceof Error ? err.message : "That did not save.", "bad");
              } finally {
                setBusy(false);
              }
            }}
          >
            Save the adjustment
          </Button>
        </div>
      </Modal>
    </>
  );
}

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<div className="p-6"><Skeleton className="h-10 w-48" /></div>}>
      <InventoryContent />
    </Suspense>
  );
}
