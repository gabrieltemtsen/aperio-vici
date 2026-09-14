import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireCapability, can, Role } from "./lib/auth";
import { roleValidator } from "./schema";

/** Drives every access check in the app shell. Never throws. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;

    const role = (user.role ?? null) as Role | null;
    return {
      _id: user._id,
      name: user.name ?? user.email ?? "Staff",
      email: user.email,
      role,
      active: user.active ?? false,
      capabilities: {
        viewDashboard: can(role, "viewDashboard"),
        manageOrders: can(role, "manageOrders"),
        verifyPayments: can(role, "verifyPayments"),
        manageInventory: can(role, "manageInventory"),
        viewCustomers: can(role, "viewCustomers"),
        useRegister: can(role, "useRegister"),
        manageStaff: can(role, "manageStaff"),
        manageSettings: can(role, "manageSettings"),
      },
    };
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireCapability(ctx, "manageStaff");
    const users = await ctx.db.query("users").collect();
    return users
      .map((u) => ({
        _id: u._id,
        name: u.name ?? "—",
        email: u.email ?? "—",
        role: u.role ?? null,
        active: u.active ?? false,
        createdAt: u.createdAt ?? u._creationTime,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const setRole = mutation({
  args: { userId: v.id("users"), role: roleValidator, active: v.boolean() },
  handler: async (ctx, args) => {
    const admin = await requireCapability(ctx, "manageStaff");
    if (args.userId === admin._id && (args.role !== "admin" || !args.active)) {
      throw new Error("You cannot remove your own admin access. Ask another admin.");
    }
    await ctx.db.patch(args.userId, { role: args.role, active: args.active });
  },
});

export const setName = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in to continue.");
    if (args.name.trim().length < 2) throw new Error("Enter your full name.");
    await ctx.db.patch(userId, { name: args.name.trim() });
  },
});

export const revokeAccess = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const admin = await requireCapability(ctx, "manageStaff");
    if (args.userId === admin._id) throw new Error("You cannot revoke your own access.");
    await ctx.db.patch(args.userId, { active: false });
  },
});

/**
 * Escape hatch for the bootstrap case: run from the CLI if the first account
 * did not pick up the admin role.
 *   npx convex run staff:promoteByEmail '{"email":"you@example.com"}'
 */
export const promoteByEmail = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .unique();
    if (!user) throw new Error(`No account found for ${args.email}.`);
    await ctx.db.patch(user._id, { role: "admin", active: true });
    return `${args.email} is now an admin.`;
  },
});
