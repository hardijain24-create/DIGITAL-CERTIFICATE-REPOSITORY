import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Certificate, User, VerificationLog } from "@/lib/models"
import { verifyJWT } from "@/lib/jwt"
import { getJWTSecret } from "@/lib/env"
import { formatFileSize } from "@/lib/utils"
import type { ApiResponse, DashboardStats } from "@/lib/types"

/**
 * GET /api/dashboard
 * Get dashboard analytics and statistics with real MongoDB data
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    // 1. Authenticate user
    const token = request.cookies.get("authToken")?.value || request.headers.get("authorization")?.split(" ")[1]
    if (!token) {
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

    const JWT_SECRET = getJWTSecret()
    const payload = await verifyJWT(token, JWT_SECRET)
    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
          error: "Invalid token",
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        { status: 401 }
      )
    }

    console.log("[v0] Dashboard Query - User:", payload.userId, payload.email, payload.role)

    // 2. Build base match query - USE uploadedBy as source of truth
    const mongoose = require("mongoose")
    const userObjectId = new mongoose.Types.ObjectId(payload.userId)
    
    let matchQuery: any = { uploadedBy: userObjectId, isDeleted: false }
    if (payload.role === "admin") {
      matchQuery = { isDeleted: false }
    }

    // 3. Aggregate all metrics in a single pipeline for consistency
    const aggregationPipeline = [
      { $match: matchQuery },
      {
        $facet: {
          totalStats: [
            {
              $group: {
                _id: null,
                totalCertificates: { $sum: 1 },
                verifiedCertificates: {
                  $sum: { $cond: [{ $eq: ["$verificationStatus", "verified"] }, 1, 0] }
                },
                pendingCertificates: {
                  $sum: { $cond: [{ $eq: ["$verificationStatus", "pending"] }, 1, 0] }
                },
                expiredCertificates: {
                  $sum: { $cond: [{ $eq: ["$verificationStatus", "expired"] }, 1, 0] }
                },
                sharedCertificates: {
                  $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ["$sharedWith", []] } }, 0] }, 1, 0] }
                },
                totalDownloads: { $sum: { $ifNull: ["$downloads", 0] } },
                totalViews: { $sum: { $ifNull: ["$views", 0] } },
                totalBytes: { $sum: { $ifNull: ["$fileSize", 0] } }
              }
            }
          ],
          categories: [
            {
              $group: {
                _id: "$category",
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } }
          ],
          recentUploads: [
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            {
              $project: {
                _id: 1,
                certificateId: 1,
                certificateName: 1,
                ownerName: 1,
                issuer: 1,
                category: 1,
                fileSize: 1,
                createdAt: 1,
                updatedAt: 1
              }
            }
          ]
        }
      }
    ]

    const results = await Certificate.aggregate(aggregationPipeline)
    const facetResult = results[0] || {}
    
    const stats = facetResult.totalStats?.[0] || {
      totalCertificates: 0,
      verifiedCertificates: 0,
      pendingCertificates: 0,
      expiredCertificates: 0,
      sharedCertificates: 0,
      totalDownloads: 0,
      totalViews: 0,
      totalBytes: 0
    }

    const certificatesByCategory: Record<string, number> = {}
    facetResult.categories?.forEach((cat: any) => {
      certificatesByCategory[cat._id || "other"] = cat.count
    })

    const totalCertificates = stats.totalCertificates
    const verifiedCertificates = stats.verifiedCertificates
    const pendingCertificates = stats.pendingCertificates
    const expiredCertificates = stats.expiredCertificates
    const sharedCertificates = stats.sharedCertificates
    const totalDownloads = stats.totalDownloads
    const totalViews = stats.totalViews
    const totalBytes = stats.totalBytes
    const recentUploads = facetResult.recentUploads || []

    // 4. Get total users (admin only)
    let totalUsers = 0
    if (payload.role === "admin") {
      totalUsers = await User.countDocuments()
    }

    // 5. Get verification metrics based on aggregation results
    const verificationStats = await VerificationLog.aggregate([
      { $match: { certificateId: { $in: recentUploads.map((c: any) => c._id) } } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ])

    let verificationSuccessRate = 0
    if (verificationStats.length > 0) {
      const verified = verificationStats.find(s => s._id === "verified")?.count || 0
      const total = verificationStats.reduce((sum, s) => sum + s.count, 0)
      verificationSuccessRate = total > 0 ? Math.round((verified / total) * 100) : 0
    }

    // 6. Build response
    const dashboardStats: DashboardStats = {
      totalCertificates,
      verifiedCertificates,
      pendingCertificates,
      sharedCertificates,
      expiredCertificates,
      totalDownloads,
      totalViews,
      storageUsed: formatFileSize(totalBytes),
      certificatesByCategory,
      recentUploads: recentUploads.map(cert => ({
        _id: cert._id?.toString(),
        id: cert._id?.toString(),
        certificateId: cert.certificateId,
        certificateName: cert.certificateName,
        ownerId: cert.ownerId,
        ownerName: cert.ownerName,
        issuer: cert.issuer,
        category: cert.category,
        fileSize: cert.fileSize,
        createdAt: cert.createdAt,
        updatedAt: cert.updatedAt,
      })) as any,
    }

    return NextResponse.json(
      {
        success: true,
        message: "Dashboard stats retrieved successfully",
        data: {
          ...dashboardStats,
          verificationSuccessRate,
          totalUsers: payload.role === "admin" ? totalUsers : undefined,
        },
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
