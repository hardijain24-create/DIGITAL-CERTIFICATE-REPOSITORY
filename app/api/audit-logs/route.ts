import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { ActivityLog, VerificationLog } from "@/lib/models"
import { verifyJWT } from "@/lib/jwt"
import { getJWTSecret } from "@/lib/env"
import mongoose from "mongoose"

/**
 * GET /api/audit-logs
 * Get comprehensive audit logs (activities and verification attempts)
 * Query params: type ("activity" | "verification" | "all"), limit, page, startDate, endDate
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    // 1. Authenticate user
    const token = request.cookies.get("authToken")?.value || request.headers.get("authorization")?.split(" ")[1]
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Missing token" },
        { status: 401 }
      )
    }

    const JWT_SECRET = getJWTSecret()
    const payload = await verifyJWT(token, JWT_SECRET)
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Invalid token" },
        { status: 401 }
      )
    }

    // Only admin can view all audit logs; users can only view their own
    if (payload.role !== "admin" && payload.role !== "institution") {
      return NextResponse.json(
        { success: false, message: "Forbidden: Insufficient permissions for audit logs" },
        { status: 403 }
      )
    }

    // 2. Extract parameters
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "all" // activity, verification, all
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")))
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const skip = (page - 1) * limit
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // 3. Build date filter
    const dateFilter: any = {}
    if (startDate) {
      dateFilter.$gte = new Date(startDate)
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate)
    }
    const hasDateFilter = Object.keys(dateFilter).length > 0

    // 4. Fetch activity logs
    let activityLogs: any[] = []
    let activityCount = 0

    if (type === "activity" || type === "all") {
      const activityQuery: any = { timestamp: hasDateFilter ? dateFilter : {} }
      if (payload.role !== "admin") {
        // CRITICAL FIX: Convert payload.userId (STRING) to ObjectId
        activityQuery.userId = new mongoose.Types.ObjectId(payload.userId)
      }

      activityCount = await ActivityLog.countDocuments(activityQuery)
      activityLogs = await ActivityLog.find(activityQuery)
        .sort({ timestamp: -1 })
        .limit(type === "all" ? Math.ceil(limit / 2) : limit)
        .skip(type === "all" ? 0 : skip)
        .populate("userId", "name email")
        .populate("certificateId", "certificateId certificateName")
    }

    // 5. Fetch verification logs
    let verificationLogs: any[] = []
    let verificationCount = 0

    if (type === "verification" || type === "all") {
      const verificationQuery: any = { timestamp: hasDateFilter ? dateFilter : {} }
      
      verificationCount = await VerificationLog.countDocuments(verificationQuery)
      verificationLogs = await VerificationLog.find(verificationQuery)
        .sort({ timestamp: -1 })
        .limit(type === "all" ? Math.ceil(limit / 2) : limit)
        .skip(type === "all" ? 0 : skip)
        .populate("certificateId", "certificateId certificateName issuer")
    }

    // 6. Combine and format logs
    let allLogs: any[] = []

    if (type === "activity" || type === "all") {
      allLogs = allLogs.concat(
        activityLogs.map(log => ({
          id: log._id.toString(),
          type: "activity",
          action: log.action,
          description: log.description,
          user: log.userId,
          certificate: log.certificateId,
          timestamp: log.timestamp,
        }))
      )
    }

    if (type === "verification" || type === "all") {
      allLogs = allLogs.concat(
        verificationLogs.map(log => ({
          id: log._id.toString(),
          type: "verification",
          action: "verification",
          description: `Certificate verified with status: ${log.status}`,
          status: log.status,
          method: log.verificationMethod,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          certificate: log.certificateId,
          timestamp: log.timestamp,
        }))
      )
    }

    // 7. Sort combined logs by timestamp
    allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // 8. Apply pagination to combined results
    const paginatedLogs = allLogs.slice(skip, skip + limit)
    const totalCount = allLogs.length
    const totalPages = Math.ceil(totalCount / limit)

    // 9. Generate summary statistics
    const actionSummary: Record<string, number> = {}
    allLogs.forEach(log => {
      const key = log.type === "activity" ? log.action : `verification_${log.status}`
      actionSummary[key] = (actionSummary[key] || 0) + 1
    })

    return NextResponse.json({
      success: true,
      message: `Retrieved ${paginatedLogs.length} audit logs`,
      data: paginatedLogs,
      summary: {
        totalActivityLogs: activityCount,
        totalVerificationLogs: verificationCount,
        actionSummary,
      },
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalLogs: totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[DCRS API] GET audit logs error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch audit logs",
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    )
  }
}
