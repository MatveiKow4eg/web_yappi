import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAdminToken } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminRoute = pathname.startsWith("/admin");
  const isKitchenRoute = pathname.startsWith("/kitchen");
  const isAdminLogin = pathname === "/admin/login";
  const isKitchenLogin = pathname === "/kitchen/login";

  // Protect /admin/* and /kitchen/* routes, except their login pages.
  if ((isAdminRoute && !isAdminLogin) || (isKitchenRoute && !isKitchenLogin)) {
    const token = req.cookies.get("admin_token")?.value;

    if (!token) {
      return NextResponse.redirect(new URL(isKitchenRoute ? "/kitchen/login" : "/admin/login", req.url));
    }

    const session = await verifyAdminToken(token);
    if (!session) {
      return NextResponse.redirect(new URL(isKitchenRoute ? "/kitchen/login" : "/admin/login", req.url));
    }

    // Kitchen role can only access /kitchen and a limited admin area.
    if (
      session.role === "kitchen" &&
      isAdminRoute &&
      !pathname.startsWith("/admin/orders") &&
      pathname !== "/admin"
    ) {
      return NextResponse.redirect(new URL("/admin/orders", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/kitchen/:path*"],
};
