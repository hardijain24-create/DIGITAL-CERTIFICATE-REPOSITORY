import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { User, ActivityLog } from "@/lib/models"
import { RegisterSchema } from "@/lib/validations"
import { signJWT } from "@/lib/jwt"
import { getJWTSecret } from "@/lib/env"
import bcrypt from "bcryptjs"

/**
 * POST /api/auth/register
 * Register a new user in MongoDB Atlas
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Establish database connection
    await connectDB()
    
    // 2. Parse request body
    const body = await request.json()

    // 3. Validate input with Zod Schema
    const validation = RegisterSchema.safeParse(body)
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

    const { name, email, password, role } = validation.data

    // 4. Verify user doesn't already exist
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "An account already exists with this email.",
          error: { email: ["An account already exists with this email."] }
        },
        { status: 409 }
      )
    }

    // 5. Hash password with bcryptjs
    const hashedPassword = await bcrypt.hash(password, 10)

    // 6. Create user in MongoDB
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
    })

    // 7. Generate JWT token (get secret from validated env)
    const JWT_SECRET = getJWTSecret()
    const tokenPayload = {
      userId: newUser._id.toString(),
      email: newUser.email,
      role: newUser.role,
    }
    const token = await signJWT(tokenPayload, JWT_SECRET, 86400) // Valid for 24h

    // 8. Log the activity (audit log)
    await ActivityLog.create({
      userId: newUser._id,
      action: "user_register",
      description: `New user account created: ${name} (${role})`,
    })

    // 9. Prepare standard API response
    const response = NextResponse.json(
      {
        success: true,
        message: "Registration successful",
        data: {
          user: {
            id: newUser._id.toString(),
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
          },
          token,
        },
      },
      { status: 201 }
    )

    // 10. Set JWT token in secure HttpOnly cookie
    response.cookies.set("authToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 86400, // 24 hours
      path: "/",
    })

    return response
  } catch (error) {
    console.error("[DCRS API] Registration handler error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Registration failed",
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    )
  }
}
