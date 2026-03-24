import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAdminToken } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect /admin/* routes (except /admin/login)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const token = req.cookies.get("admin_token")?.value;

    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }

    const session = await verifyAdminToken(token);
    if (!session) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }

    // Kitchen role can only access /admin/orders and /kitchen
    if (
      session.role === "kitchen" &&
      !pathname.startsWith("/admin/orders") &&
      !pathname.startsWith("/kitchen") &&
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
