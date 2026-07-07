import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { User, ActivityLog } from "@/lib/models"
import { ProfileUpdateSchema, PasswordChangeSchema } from "@/lib/validations"
import { verifyJWT } from "@/lib/jwt"
import { getJWTSecret } from "@/lib/env"
import bcrypt from "bcryptjs"

/**
 * GET /api/auth/profile
 * Retrieve authenticated user's profile information
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    // 1. Authenticate user
    const token = request.cookies.get("authToken")?.value || request.headers.get("authorization")?.split(" ")[1]
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized: Missing token" }, { status: 401 })
    }

    const JWT_SECRET = getJWTSecret()
    const payload = await verifyJWT(token, JWT_SECRET)
    if (!payload) {
      return NextResponse.json({ success: false, message: "Unauthorized: Invalid token" }, { status: 401 })
    }

    // 2. Fetch user from database
    const user = await User.findById(payload.userId).select("-password")
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: "Profile retrieved successfully",
      data: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    })
  } catch (error) {
    console.error("[DCRS API] GET profile error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch profile",
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/auth/profile
 * Update user's profile information (name, email, profile picture)
 */
export async function PATCH(request: NextRequest) {
  try {
    await connectDB()

    // 1. Authenticate user
    const token = request.cookies.get("authToken")?.value || request.headers.get("authorization")?.split(" ")[1]
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized: Missing token" }, { status: 401 })
    }

    const JWT_SECRET = getJWTSecret()
    const payload = await verifyJWT(token, JWT_SECRET)
    if (!payload) {
      return NextResponse.json({ success: false, message: "Unauthorized: Invalid token" }, { status: 401 })
    }

    // 2. Parse and validate request body
    const body = await request.json()
    const validation = ProfileUpdateSchema.safeParse(body)
    
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

    // 3. Check if email already exists (if being updated)
    if (validation.data.email) {
      const existingUser = await User.findOne({
        email: validation.data.email,
        _id: { $ne: payload.userId }, // Exclude current user
      })
      if (existingUser) {
        return NextResponse.json(
          {
            success: false,
            message: "Email already in use",
            error: { email: ["This email is already associated with another account"] },
          },
          { status: 409 }
        )
      }
    }

    // 4. Update user in database
    const updatedUser = await User.findByIdAndUpdate(
      payload.userId,
      {
        ...(validation.data.name && { name: validation.data.name }),
        ...(validation.data.email && { email: validation.data.email }),
        ...(validation.data.profilePicture && { profilePicture: validation.data.profilePicture }),
      },
      { new: true }
    ).select("-password")

    if (!updatedUser) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
    }

    // 5. Log activity
    const updates = []
    if (validation.data.name) updates.push("name")
    if (validation.data.email) updates.push("email")
    if (validation.data.profilePicture) updates.push("profile picture")

    await ActivityLog.create({
      userId: payload.userId,
      action: "profile_updated",
      description: `User profile updated: ${updates.join(", ")}`,
    })

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        id: updatedUser._id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        profilePicture: updatedUser.profilePicture,
        updatedAt: updatedUser.updatedAt,
      },
    })
  } catch (error) {
    console.error("[DCRS API] PATCH profile error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update profile",
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/auth/profile/change-password
 * Change user's password with verification of current password
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB()

    // 1. Authenticate user
    const token = request.cookies.get("authToken")?.value || request.headers.get("authorization")?.split(" ")[1]
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized: Missing token" }, { status: 401 })
    }

    const JWT_SECRET = getJWTSecret()
    const payload = await verifyJWT(token, JWT_SECRET)
    if (!payload) {
      return NextResponse.json({ success: false, message: "Unauthorized: Invalid token" }, { status: 401 })
    }

    // 2. Parse and validate request body
    const body = await request.json()
    const validation = PasswordChangeSchema.safeParse(body)
    
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

    const { currentPassword, newPassword } = validation.data

    // 3. Fetch user and verify current password
    const user = await User.findById(payload.userId)
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password || "")
    if (!isPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          message: "Current password is incorrect",
          error: { currentPassword: ["Current password does not match"] },
        },
        { status: 401 }
      )
    }

    // 4. Hash and update new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    user.password = hashedPassword
    await user.save()

    return NextResponse.json({
      success: true,
      message: "Password changed successfully",
      data: {
        email: user.email,
        changedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("[DCRS API] POST password change error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to change password",
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    )
  }
}
