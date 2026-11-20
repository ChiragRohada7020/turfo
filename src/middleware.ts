import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Redirect authenticated users away from auth pages
    if (path.startsWith("/auth/") && token) {
      const callbackUrl = req.nextUrl.searchParams.get("callbackUrl") || "/dashboard"
      return NextResponse.redirect(new URL(callbackUrl, req.url))
    }

    // Role-based access control
    if (path.startsWith("/dashboard")) {
      if (!token) {
        return NextResponse.redirect(new URL(`/auth/login?callbackUrl=${path}`, req.url))
      }

      // Owner-only routes
      if (
        path.startsWith("/dashboard/facilities") ||
        path.startsWith("/dashboard/payouts") ||
        path.startsWith("/dashboard/analytics") ||
        path.startsWith("/dashboard/promotions") ||
        path.startsWith("/dashboard/campaigns") ||
        path.startsWith("/dashboard/verify")
      ) {
        if (token.role !== "OWNER" && token.role !== "ADMIN") {
          return NextResponse.redirect(new URL("/dashboard?error=unauthorized", req.url))
        }
      }

      // Player-only routes (owners/admins should not access player-only areas)
      if (path.startsWith("/dashboard/open-games") || path.startsWith("/find-players")) {
        if (token.role !== "PLAYER" && token.role !== "ADMIN") {
          return NextResponse.redirect(new URL("/dashboard?error=unauthorized", req.url))
        }
      }



      // Admin-only routes
      if (path.startsWith("/admin")) {
        if (token.role !== "ADMIN") {
          return NextResponse.redirect(new URL("/dashboard?error=unauthorized", req.url))
        }
      }
    }

    // Locked owner features
    const lockedOwnerPaths = [
      "/dashboard/payouts",
      "/dashboard/analytics",
      "/dashboard/promotions",
      "/dashboard/campaigns",
      "/offers",
    ]
    if (token?.role === "OWNER" && lockedOwnerPaths.some((p) => path === p || path.startsWith(p + "/"))) {
      return NextResponse.redirect(new URL("/dashboard?error=locked", req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname
        
        // Public routes that don't require authentication
        const publicRoutes = [
          "/",
          "/search",
          "/facility/",
          "/api/auth/",
          "/api/health",
          "/api/webhooks/",
        ]

        if (publicRoutes.some((route) => path.startsWith(route))) {
          return true
        }

        // Auth routes - allow both authenticated and unauthenticated
        if (path.startsWith("/auth/")) {
          return true
        }

        // All other routes require authentication
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/offers",
    "/offers/:path*",
    "/admin/:path*",
    "/auth/:path*",
    "/api/:path*",
  ],
}