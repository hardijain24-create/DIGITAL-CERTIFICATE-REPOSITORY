import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { ActivityLog } from "@/lib/models"
import { verifyJWT } from "@/lib/jwt"
import { getJWTSecret } from "@/lib/env"
import mongoose from "mongoose"

/**
 * GET /api/dashboard/activity
 * Get recent system activities for the logged-in user
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const token = request.cookies.get("authToken")?.value || request.headers.get("authorization")?.split(" ")[1]
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const JWT_SECRET = getJWTSecret()
    const payload = await verifyJWT(token, JWT_SECRET)
    if (!payload) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    let query: any = {}
    if (payload.role !== "admin") {
      // Convert payload.userId (STRING) to ObjectId for consistency
      query.userId = new mongoose.Types.ObjectId(payload.userId)
    }

    // Extract pagination parameters
    const { searchParams } = new URL(request.url)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")))
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const skip = (page - 1) * limit

    // Fetch activity logs with pagination
    const totalCount = await ActivityLog.countDocuments(query)
    const logs = await ActivityLog.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip)
      .populate("userId", "name email")
      .populate("certificateId", "certificateId certificateName")

    const totalPages = Math.ceil(totalCount / limit)

    // Group activities by action type for summary
    const actionSummary: Record<string, number> = {}
    logs.forEach(log => {
      actionSummary[log.action] = (actionSummary[log.action] || 0) + 1
    })

    return NextResponse.json({
      success: true,
      message: "Recent activity log feed retrieved successfully",
      data: logs.map(log => ({
        id: log._id.toString(),
        action: log.action,
        description: log.description,
        user: log.userId,
        certificate: log.certificateId,
        timestamp: log.timestamp
      })),
      actionSummary,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalActivities: totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("[DCRS API] GET dashboard activity error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to load dashboard activity feed",
        error: error instanceof Error ? error.message : "Internal Server Error"
      },
      { status: 500 }
    )
  }
}
