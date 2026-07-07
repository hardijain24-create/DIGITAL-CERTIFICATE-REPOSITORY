import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse, DashboardStats } from "@/lib/types"

/**
 * GET /api/dashboard
 * Get dashboard analytics and statistics
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
          error: "Invalid or missing token",
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        { status: 401 }
      )
    }

    // TODO: Query MongoDB for real stats
    const stats: DashboardStats = {
      totalCertificates: 15,
      verifiedCertificates: 12,
      pendingCertificates: 2,
      sharedCertificates: 5,
      expiredCertificates: 1,
      totalDownloads: 48,
      totalViews: 156,
      storageUsed: "245.8 MB",
      certificatesByCategory: {
        academic: 5,
        professional: 4,
        internship: 2,
        training: 2,
        government: 1,
        identity: 0,
        license: 1,
        achievement: 0,
        workshop: 0,
        other: 0,
      },
      recentUploads: [],
    }

    return NextResponse.json(
      {
        success: true,
        message: "Dashboard stats retrieved successfully",
        data: stats,
        timestamp: new Date().toISOString(),
      } as ApiResponse<DashboardStats>,
      { status: 200 }
    )
  } catch (error) {
    console.error("[DCRS API] Dashboard error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Error fetching dashboard stats",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      } as ApiResponse,
      { status: 500 }
    )
  }
}
