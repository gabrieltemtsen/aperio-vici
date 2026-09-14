"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@convex/_generated/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/primitives";
import {
  LayoutDashboard,
  Receipt,
  BadgeCheck,
  Library,
  Users,
  UserCog,
  Settings,
  Store,
  Menu,
  X,
  LogOut,
  ExternalLink,
} from "lucide-react";

type Capability =
  | "viewDashboard"
  | "manageOrders"
  | "verifyPayments"
  | "manageInventory"
  | "viewCustomers"
  | "useRegister"
  | "manageStaff"
  | "manageSettings";

const NAV: {
  href: string;
  label: string;
  icon: React.ElementType;
  capability: Capability;
  badge?: "paymentReview" | "processing";
}[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, capability: "viewDashboard" },
  { href: "/admin/orders", label: "Orders", icon: Receipt, capability: "manageOrders", badge: "processing" },
  { href: "/admin/payments", label: "Verify payments", icon: BadgeCheck, capability: "verifyPayments", badge: "paymentReview" },
  { href: "/admin/products", label: "Inventory", icon: Library, capability: "manageInventory" },
  { href: "/admin/customers", label: "Customers", icon: Users, capability: "viewCustomers" },
  { href: "/pos", label: "Walk-in register", icon: Store, capability: "useRegister" },
  { href: "/admin/staff", label: "Staff", icon: UserCog, capability: "manageStaff" },
  { href: "/admin/settings", label: "Settings", icon: Settings, capability: "manageSettings" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuthActions();
  const me = useQuery(api.staff.me);
  const [navOpen, setNavOpen] = useState(false);

  const counts = useQuery(
    api.orders.pipelineCounts,
    me?.capabilities.manageOrders ? {} : "skip",
  );

  if (me === undefined) return <Spinner className="min-h-screen" />;

  // Signed in but not yet given a role: a real state, not an error.
  if (me === null || !me.active || !me.role) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="font-display text-[28px] text-ink">Your account is waiting for access</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            You are signed in{me?.email ? ` as ${me.email}` : ""}, but an admin has not given you a
            role yet. Ask whoever runs the shop to open Staff in the dashboard and assign you one.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="secondary" onClick={() => router.push("/")}>Back to the shop</Button>
            <Button onClick={() => void signOut().then(() => router.push("/signin"))}>Sign out</Button>
          </div>
        </div>
      </div>
    );
  }

  const visible = NAV.filter((item) => me.capabilities[item.capability]);

  const sidebar = (
    <div className="flex h-full flex-col bg-ink-deep text-white/70">
      <div className="flex h-16 items-center justify-between px-5">
        <Link href="/admin" className="font-display text-[20px] text-white">
          Aperio<span className="text-brass"> Vici</span>
        </Link>
        <button className="rounded p-1 text-white/60 lg:hidden" onClick={() => setNavOpen(false)} aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-3">
        {visible.map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          const badgeCount =
            item.badge === "paymentReview"
              ? counts?.paymentReview
              : item.badge === "processing"
                ? (counts?.paid ?? 0) + (counts?.processing ?? 0)
                : 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setNavOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-[14px] transition-colors",
                active ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white",
              )}
            >
              <item.icon className={cn("h-4 w-4 shrink-0", active && "text-brass")} aria-hidden />
              <span className="flex-1">{item.label}</span>
              {!!badgeCount && badgeCount > 0 && (
                <span className="figure rounded-full bg-brass px-1.5 text-[11px] font-semibold text-ink-deep">
                  {badgeCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-3 py-3">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-[13.5px] hover:bg-white/5 hover:text-white"
        >
          <ExternalLink className="h-4 w-4" aria-hidden />
          View the shop
        </Link>

        <div className="mt-2 flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brass text-[13px] font-semibold text-ink-deep">
            {me.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] text-white">{me.name}</span>
            <span className="block text-[12px] capitalize text-white/45">{me.role}</span>
          </span>
          <button
            onClick={() => void signOut().then(() => router.push("/signin"))}
            className="rounded p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="hidden w-[248px] shrink-0 lg:block">
        <div className="fixed inset-y-0 w-[248px]">{sidebar}</div>
      </aside>

      {navOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-deep/50" onClick={() => setNavOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 w-[264px]">{sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-rule bg-white px-4 lg:hidden">
          <button onClick={() => setNavOpen(true)} className="-ml-1 rounded p-2 text-ink" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-display text-[18px] text-ink">
            Aperio<span className="text-brass"> Vici</span>
          </span>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule bg-white px-4 py-5 sm:px-6 sm:py-6">
      <div>
        <h1 className="font-display text-[26px] leading-tight text-ink sm:text-[30px]">{title}</h1>
        {description && <p className="mt-1 text-[14px] text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
