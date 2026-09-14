import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isStaffRoute = createRouteMatcher(["/admin(.*)", "/pos(.*)"]);
const isSignInRoute = createRouteMatcher(["/signin"]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const authenticated = await convexAuth.isAuthenticated();

  if (isStaffRoute(request) && !authenticated) {
    return nextjsMiddlewareRedirect(request, "/signin");
  }
  if (isSignInRoute(request) && authenticated) {
    return nextjsMiddlewareRedirect(request, "/admin");
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
