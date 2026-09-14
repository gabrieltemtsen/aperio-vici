import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "../_generated/dataModel";
import { QueryCtx, MutationCtx } from "../_generated/server";

export type Role = "admin" | "manager" | "cashier";

/** Who can see what. Cashiers are deliberately limited to the walk-in counter. */
const CAN: Record<string, Role[]> = {
  viewDashboard: ["admin", "manager"],
  manageOrders: ["admin", "manager"],
  verifyPayments: ["admin", "manager"],
  manageInventory: ["admin", "manager"],
  viewCustomers: ["admin", "manager"],
  useRegister: ["admin", "manager", "cashier"],
  manageStaff: ["admin"],
  manageSettings: ["admin"],
};

export type Capability = keyof typeof CAN;

export async function currentUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users"> | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  return await ctx.db.get(userId);
}

/**
 * Throws unless the signed-in account is active and holds the capability.
 * Every mutation that touches money, stock or customer data goes through this.
 */
export async function requireCapability(
  ctx: QueryCtx | MutationCtx,
  capability: Capability,
): Promise<Doc<"users">> {
  const user = await currentUser(ctx);
  if (!user) throw new Error("Sign in to continue.");
  if (!user.active || !user.role) {
    throw new Error("This account has not been granted access yet.");
  }
  if (!CAN[capability].includes(user.role)) {
    throw new Error("Your role does not allow that.");
  }
  return user;
}

export async function requireStaff(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">> {
  const user = await currentUser(ctx);
  if (!user || !user.active || !user.role) {
    throw new Error("Sign in to continue.");
  }
  return user;
}

/** Returns null instead of throwing — for queries that render an empty state. */
export async function optionalStaff(
  ctx: QueryCtx | MutationCtx,
  capability: Capability,
): Promise<Doc<"users"> | null> {
  const user = await currentUser(ctx);
  if (!user || !user.active || !user.role) return null;
  if (!CAN[capability].includes(user.role)) return null;
  return user;
}

export function can(role: Role | undefined | null, capability: Capability): boolean {
  if (!role) return false;
  return CAN[capability].includes(role);
}

export type StaffId = Id<"users">;
