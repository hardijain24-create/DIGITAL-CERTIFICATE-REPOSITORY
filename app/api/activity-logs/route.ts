import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { ActivityLog } from "@/lib/models"
import { verifyJWT } from "@/lib/jwt"

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key_dcrs_2026_premium_saas_generation"

/**
 * GET /api/activity-logs
 * Fetch audit logs from MongoDB Atlas
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
    if (!payload) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    // 2. Extract query filters
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100)
    const offset = parseInt(searchParams.get("offset") || "0", 10)

    // 3. Admin users can view all audit logs, other roles can only see their own logs
    let query: any = {}
    if (payload.role !== "admin") {
      query.userId = payload.userId
    }

    if (action) {
      query.action = action
    }

    // 4. Fetch from database
    const total = await ActivityLog.countDocuments(query)
    const logs = await ActivityLog.find(query)
      .sort({ timestamp: -1 })
      .skip(offset)
      .limit(limit)

    return NextResponse.json({
      success: true,
      message: `Successfully retrieved ${logs.length} activity logs`,
      data: logs,
      total,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("[DCRS API] GET activity-logs error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch activity logs",
        error: error instanceof Error ? error.message : "Internal Server Error"
      },
      { status: 500 }
    )
  }
}
