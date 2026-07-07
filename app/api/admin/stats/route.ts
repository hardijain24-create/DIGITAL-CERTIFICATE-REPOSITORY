import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { User, Certificate, VerificationLog } from "@/lib/models"
import { verifyJWT } from "@/lib/jwt"
import { formatFileSize } from "@/lib/utils"

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key_dcrs_2026_premium_saas_generation"

/**
 * GET /api/admin/stats
 * Aggregate system-wide analytics for Admin Dashboard
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    // 1. Authenticate user
    const token = request.cookies.get("authToken")?.value || request.headers.get("authorization")?.split(" ")[1]
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyJWT(token, JWT_SECRET)
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ success: false, message: "Forbidden: Admins only" }, { status: 403 })
    }

    // 2. Aggregate counts
    const totalUsers = await User.countDocuments()
    const studentUsers = await User.countDocuments({ role: "user" })
    const institutionUsers = await User.countDocuments({ role: "institution" })
    const adminUsers = await User.countDocuments({ role: "admin" })
    
    const totalCertificates = await Certificate.countDocuments()
    const totalVerifications = await VerificationLog.countDocuments()

    // 3. Aggregate total storage size
    const certificates = await Certificate.find({}, "fileSize")
    const totalBytes = certificates.reduce((sum, c) => sum + (c.fileSize || 0), 0)

    return NextResponse.json({
      success: true,
      message: "System statistics aggregated successfully",
      data: {
        totalUsers,
        usersBreakdown: {
          user: studentUsers,
          institution: institutionUsers,
          admin: adminUsers
        },
        totalCertificates,
        totalVerifications,
        storageUsed: formatFileSize(totalBytes),
        storageBytes: totalBytes
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("[DCRS API] GET admin stats error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to load system stats",
        error: error instanceof Error ? error.message : "Internal Server Error"
      },
      { status: 500 }
    )
  }
}
