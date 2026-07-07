import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { User, ActivityLog } from "@/lib/models"
import { LoginSchema } from "@/lib/validations"
import { signJWT } from "@/lib/jwt"
import { getJWTSecret } from "@/lib/env"
import bcrypt from "bcryptjs"

/**
 * POST /api/auth/login
 * Authenticate user, verify with bcrypt, and return secure cookie + token
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Establish database connection
    await connectDB()

    // 2. Parse request body
    const body = await request.json()

    // 3. Validate input with Zod Schema
    const validation = LoginSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          error: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { email, password } = validation.data

    // 4. Query user in MongoDB
    const user = await User.findOne({ email })
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password",
          error: { email: ["Invalid email or password"] }
        },
        { status: 401 }
      )
    }

    // 5. Verify hashed password with bcryptjs
    const isMatch = await bcrypt.compare(password, user.password || "")
    if (!isMatch) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password",
          error: { password: ["Invalid email or password"] }
        },
        { status: 401 }
      )
    }

    // 6. Generate JWT token (get secret from validated env)
    const JWT_SECRET = getJWTSecret()
    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    }
    const token = await signJWT(tokenPayload, JWT_SECRET, 86400) // Valid for 24h

    // 7. Log login action (audit log)
    await ActivityLog.create({
      userId: user._id,
      action: "user_login",
      description: `User successfully logged in: ${user.name} (${user.role})`,
    })

    // 8. Prepare standard API response
    const response = NextResponse.json(
      {
        success: true,
        message: "Login successful",
        data: {
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
          },
          token,
        },
      },
      { status: 200 }
    )

    // 9. Set HttpOnly secure cookie
    response.cookies.set("authToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 86400, // 24 hours
      path: "/",
    })

    return response
  } catch (error) {
    console.error("[DCRS API] Login handler error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Login failed",
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    )
  }
}
