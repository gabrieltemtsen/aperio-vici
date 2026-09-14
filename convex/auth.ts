import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { MutationCtx } from "./_generated/server";

/**
 * Staff-only authentication. Customers never sign in — they order with a phone
 * number and track orders with an order number, which is how the shop's
 * customers actually behave.
 *
 * Bootstrap: the very first account created becomes the admin. Every account
 * after that is created inactive with no role, and an admin grants access from
 * Settings > Staff. That stops a public Convex deployment from handing out
 * dashboard access to anyone who finds the sign-in page.
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx: MutationCtx, { userId, existingUserId }) {
      if (existingUserId) return;

      const staffCount = (await ctx.db.query("users").take(2)).length;
      const isFirstAccount = staffCount <= 1;

      await ctx.db.patch(userId, {
        role: isFirstAccount ? "admin" : undefined,
        active: isFirstAccount,
        createdAt: Date.now(),
      });
    },
  },
});
