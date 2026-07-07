import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Certificate, VerificationLog, ActivityLog } from "@/lib/models"
import { verifyJWT } from "@/lib/jwt"
import { getJWTSecret } from "@/lib/env"
import { formatFileSize } from "@/lib/utils"
import mongoose from "mongoose"

/**
 * GET /api/dashboard/stats
 * Aggregate dashboard analytics metrics from MongoDB
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    // 1. Authenticate user
    const token = request.cookies.get("authToken")?.value || request.headers.get("authorization")?.split(" ")[1]
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const JWT_SECRET = getJWTSecret()
    const payload = await verifyJWT(token, JWT_SECRET)
    if (!payload) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    // 2. Build base match query - USE uploadedBy as source of truth
    const userObjectId = new mongoose.Types.ObjectId(payload.userId)
    let matchQuery: any = { uploadedBy: userObjectId, isDeleted: false }
    if (payload.role === "admin") {
      matchQuery = { isDeleted: false }
    }

    // 3. Aggregate all metrics directly from MongoDB
    const statsResult = await Certificate.aggregate([
      { $match: matchQuery },
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
          revokedCount: {
            $sum: { $cond: [{ $eq: ["$verificationStatus", "revoked"] }, 1, 0] }
          },
          sharedCertificates: {
            $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ["$sharedWith", []] } }, 0] }, 1, 0] }
          },
          totalDownloads: { $sum: { $ifNull: ["$downloads", 0] } },
          totalViews: { $sum: { $ifNull: ["$views", 0] } },
          totalBytes: { $sum: { $ifNull: ["$fileSize", 0] } }
        }
      }
    ])

    const certStats = statsResult[0] || {
      totalCertificates: 0,
      verifiedCertificates: 0,
      pendingCertificates: 0,
      expiredCertificates: 0,
      revokedCount: 0,
      sharedCertificates: 0,
      totalDownloads: 0,
      totalViews: 0,
      totalBytes: 0
    }

    const {
      totalCertificates,
      verifiedCertificates,
      pendingCertificates,
      expiredCertificates,
      revokedCount,
      sharedCertificates,
      totalDownloads,
      totalViews,
      totalBytes
    } = certStats

    // 4. Get category distribution
    const categoryDistribution = await Certificate.aggregate([
      { $match: matchQuery },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])

    // 5. Get issuer distribution
    const issuerDistribution = await Certificate.aggregate([
      { $match: matchQuery },
      { $group: { _id: "$issuer", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ])



    return NextResponse.json({
      success: true,
      message: "Dashboard statistics successfully aggregated",
      data: {
        certificates: {
          total: totalCertificates,
          verified: verifiedCertificates,
          pending: pendingCertificates,
          expired: expiredCertificates,
          shared: sharedCertificates,
          revokedCount: certificates.filter(c => c.verificationStatus === "revoked").length,
        },
        engagement: {
          totalViews,
          totalDownloads,
          totalShares: sharedCertificates,
          averageViews: totalCertificates > 0 ? (totalViews / totalCertificates).toFixed(2) : 0,
          averageDownloads: totalCertificates > 0 ? (totalDownloads / totalCertificates).toFixed(2) : 0,
        },
        storage: {
          totalBytes: totalBytes,
          totalMB: (totalBytes / (1024 * 1024)).toFixed(2),
          formatted: formatFileSize(totalBytes),
          averageCertificateSize: totalCertificates > 0 ? (totalBytes / totalCertificates / 1024).toFixed(2) : 0,
        },
        verification: verificationCounts,
        categories: categoryDistribution.map(cat => ({
          name: cat._id,
          count: cat.count
        })),
        issuers: issuerDistribution.map(issuer => ({
          name: issuer._id,
          count: issuer.count
        })),
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("[DCRS API] GET dashboard stats error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to load dashboard statistics",
        error: error instanceof Error ? error.message : "Internal Server Error"
      },
      { status: 500 }
    )
  }
}
