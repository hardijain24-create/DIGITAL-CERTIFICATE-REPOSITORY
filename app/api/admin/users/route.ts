import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { User, ActivityLog } from "@/lib/models"
import { verifyJWT } from "@/lib/jwt"

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key_dcrs_2026_premium_saas_generation"

/**
 * GET /api/admin/users
 * Retrieve all registered users (Admins only)
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const token = request.cookies.get("authToken")?.value || request.headers.get("authorization")?.split(" ")[1]
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyJWT(token, JWT_SECRET)
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ success: false, message: "Forbidden: Admins only" }, { status: 403 })
    }

    // Retrieve users, excluding passwords
    const users = await User.find({}, "-password").sort({ createdAt: -1 })

    return NextResponse.json({
      success: true,
      message: `Retrieved ${users.length} users`,
      data: users,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("[DCRS API] GET admin users error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch users",
        error: error instanceof Error ? error.message : "Internal Server Error"
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/users
 * Delete a user account from DCRS (Admins only)
 */
export async function DELETE(request: NextRequest) {
  try {
    await connectDB()

    const token = request.cookies.get("authToken")?.value || request.headers.get("authorization")?.split(" ")[1]
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyJWT(token, JWT_SECRET)
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userIdToDelete = searchParams.get("id")

    if (!userIdToDelete) {
      return NextResponse.json({ success: false, message: "Missing user ID parameter" }, { status: 400 })
    }

    // Prevent deleting yourself
    if (userIdToDelete === payload.userId) {
      return NextResponse.json({ success: false, message: "Conflict: You cannot delete your own admin account." }, { status: 409 })
    }

    const user = await User.findById(userIdToDelete)
    if (!user) {
      return NextResponse.json({ success: false, message: "User account not found" }, { status: 404 })
    }

    // Delete user
    await User.deleteOne({ _id: userIdToDelete })

    // Log action
    await ActivityLog.create({
      userId: payload.userId,
      action: "certificate_deleted", // Fallback standard delete action
      description: `Admin deleted user account: ${user.name} (${user.email})`
    })

    return NextResponse.json({
      success: true,
      message: `User account ${user.email} successfully deleted.`
    })
  } catch (error) {
    console.error("[DCRS API] DELETE admin user error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete user",
        error: error instanceof Error ? error.message : "Internal Server Error"
      },
      { status: 500 }
    )
  }
}
