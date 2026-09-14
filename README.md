# Aperio Vici — Bookshops and Gifts

A complete shop for a Nigerian bookseller: a public storefront where customers
search and order, a bank-transfer payment flow an admin verifies by hand, a
walk-in register for the counter, and a dashboard that reports on both channels
together.

Built with **Next.js 15 (App Router)**, **Convex** for the database, live queries
and file storage, **Convex Auth** for staff accounts, and **Tailwind CSS v4**.

---

## Running it

You need Node 18.18 or newer.

```bash
npm install
npx convex dev          # first run: creates the deployment, writes .env.local
```

Leave `npx convex dev` running. In a second terminal:

```bash
npm run seed            # 8 categories, 22 products, default settings
npm run dev             # Next.js and Convex together on :3000
```

`npm run dev` runs both processes, so day to day that one command is enough.

### The first account is the owner

Go to `/signin` and create an account. **The first account ever created becomes
an admin automatically.** Every account after that arrives with no role and no
access until an admin grants one from **Settings → Staff**.

If you ever lock yourself out:

```bash
npx convex run staff:promoteByEmail '{"email":"you@example.com"}'
```

---

## How money moves

Every amount in the database is an **integer number of kobo**. ₦2,500 is stored
as `250000`. Nothing is ever a float, so nothing drifts. `formatNaira()` is the
only thing that turns kobo into something a person reads.

### Online orders

1. Customer fills the basket and checks out. No payment is taken online.
2. The order is created as `awaiting_payment`, **stock is committed immediately**
   so two people cannot buy the last copy, and the customer lands on a page
   showing the exact amount and your account numbers.
3. The customer transfers the money and taps *I have sent the money*, optionally
   attaching a screenshot. The order becomes `payment_review`.
4. Staff open **Verify payments**, compare against the bank statement, and
   confirm or send it back. Confirming moves the order to `paid`.
5. From there: `processing` → `ready` → `dispatched` → `completed`.

An order cannot reach `processing` until a payment is verified. Cancelling at any
point puts the stock back on the shelves.

Part payments work. Confirming ₦5,000 against a ₦8,000 order records the money,
leaves ₦3,000 outstanding and keeps the order unpaid until the rest lands.

### Counter sales

`/pos` is the register. Search or scan, ring up, take cash, card or transfer, and
the change is calculated for you. The sale is created already paid and stock
comes off immediately. A cashier's ticket lives in memory only, so a half-finished
sale never carries over to the next customer or the next shift.

---

## Who can do what

| | Admin | Manager | Cashier |
|---|---|---|---|
| Dashboard | ✓ | ✓ | |
| Orders and payments | ✓ | ✓ | |
| Inventory | ✓ | ✓ | |
| Customers | ✓ | ✓ | |
| Walk-in register | ✓ | ✓ | ✓ |
| Staff and settings | ✓ | | |

Roles are enforced in the Convex functions themselves, not just in the interface,
so a cashier calling an admin function directly is still refused.

---

## Layout

```
convex/
  schema.ts        tables, indexes, shared validators
  auth.ts          staff sign-in; first account becomes admin
  lib/auth.ts      the capability map and role checks
  lib/format.ts    kobo, naira, Nigerian phone normalisation
  lib/ids.ts       order numbers (AV-XXXX) and SKUs
  products.ts      storefront listing, search, admin CRUD, stock
  orders.ts        quoting, online orders, walk-in sales, status moves
  payments.ts      proof submission, the verification queue, manual payments
  analytics.ts     dashboard figures and the cashier's shift total
  settings.ts      bank accounts, delivery fees, shop details
  staff.ts         roles and access
  seed.ts          idempotent starting data

src/app/
  page.tsx                  home — a shelf of live inventory with search in it
  shop/ product/ checkout/  the storefront
  order/[orderNumber]/      transfer instructions and proof upload
  track/                    order number + last 4 phone digits
  admin/                    dashboard, orders, payments, inventory,
                            customers, staff, settings
  pos/                      the walk-in register
```

### Order numbers

`AV-K3PQ`. The alphabet deliberately excludes `B`, `I`, `O`, `S`, `Z`, `0`, `1`,
`2`, `5` and `8`, because these numbers get read aloud on the phone and squinted
at in WhatsApp screenshots. There is no pair that can be confused.

---

## Things worth knowing

**Product images are optional.** Without one, the cover is typeset from the title
using a palette picked deterministically from a hash of it, so the shelf never
shows grey boxes and the same book always looks the same.

**`convex/_generated` is hand-written in this repo** so it typechecks before you
have a deployment. `npx convex dev` overwrites it with the real thing on first
run. That is expected.

**Delivery fees are per state**, with a fallback for anywhere you have not listed
and an optional free-delivery threshold. All of it is in Settings.

**Nothing is ever hard deleted.** Archiving a product takes it off the shop but
leaves it intact on every past order.

## Before going live

- Set your real bank accounts in Settings. The order page has nothing to show
  without at least one active account.
- Set the shop phone, WhatsApp number and address.
- Replace the seeded products with real inventory, or archive them.
- Run `npx convex deploy` and set `NEXT_PUBLIC_CONVEX_URL` on your host.

```bash
npm run build       # production build
npm run typecheck   # types only
```
