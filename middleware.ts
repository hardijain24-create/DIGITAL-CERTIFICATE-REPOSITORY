import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyJWT } from "./lib/jwt"

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("authToken")?.value
  const { pathname } = request.nextUrl

  // Verify JWT
  let payload = null
  if (token) {
    try {
      const JWT_SECRET = process.env.JWT_SECRET
      if (JWT_SECRET) {
        payload = await verifyJWT(token, JWT_SECRET)
      }
    } catch (error) {
      // Invalid token, treat as unauthenticated
      payload = null
    }
  }

  const isAuthenticated = !!payload

  // Public authentication routes (Login/Register)
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register")

  // Admin routes
  const isAdminPage = pathname.startsWith("/admin")

  // If user is logged in and trying to access login/register, redirect to dashboard
  if (isAuthenticated && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // If user is NOT logged in and trying to access protected routes, redirect to login
  if (!isAuthenticated && !isAuthPage && pathname !== "/") {
    // Exclude root landing page
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // If user is trying to access admin dashboard, ensure their role is "admin"
  if (isAuthenticated && isAdminPage && payload?.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

// Config to specify matching paths
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/certificates/:path*",
    "/upload/:path*",
    "/profile/:path*",
    "/admin/:path*",
    "/login",
    "/register",
  ],
}
