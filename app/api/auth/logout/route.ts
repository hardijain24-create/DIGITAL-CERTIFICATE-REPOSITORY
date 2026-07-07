import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { ActivityLog } from "@/lib/models"
import { verifyJWT } from "@/lib/jwt"
import { getJWTSecret } from "@/lib/env"

/**
 * POST /api/auth/logout
 * Clears the user's authentication cookie and logs the logout event
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("authToken")?.value
    
    // Log logout if token exists and is valid
    if (token) {
      const JWT_SECRET = getJWTSecret()
      const payload = await verifyJWT(token, JWT_SECRET)
      if (payload) {
        await connectDB()
        await ActivityLog.create({
          userId: payload.userId,
          action: "user_logout",
          description: `User logged out: ${payload.email}`,
        })
      }
    }

    const response = NextResponse.json(
      {
        success: true,
        message: "Logout successful",
        data: {},
      },
      { status: 200 }
    )

    // Clear the authToken cookie by setting its maxAge to 0
    response.cookies.set("authToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0,
      path: "/",
    })

    return response
  } catch (error) {
    console.error("[DCRS API] Logout error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Logout failed",
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    )
  }
}
