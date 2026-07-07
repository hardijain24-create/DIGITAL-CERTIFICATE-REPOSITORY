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

    // 2. Query certificates based on user role (exclude soft-deleted)
    // CRITICAL FIX: Convert payload.userId (STRING) to ObjectId for MongoDB queries
    let query: any = { isDeleted: false }
    const userObjectId = new mongoose.Types.ObjectId(payload.userId)
    
    if (payload.role === "user") {
      query.$or = [{ ownerId: userObjectId }, { ownerEmail: payload.email }]
    } else if (payload.role === "institution") {
      query.$or = [
        { uploadedBy: userObjectId },
        { issuer: { $regex: payload.email.split("@")[0], $options: "i" } }
      ]
    }
    // Admin role queries all non-deleted certificates

    const certificates = await Certificate.find(query)

    // 3. Compute metrics
    const totalCertificates = certificates.length
    let verifiedCertificates = 0
    let pendingCertificates = 0
    let expiredCertificates = 0
    let sharedCertificates = 0
    let totalDownloads = 0
    let totalViews = 0
    let totalBytes = 0

    const now = new Date()

    certificates.forEach((cert) => {
      if (cert.verificationStatus === "verified") verifiedCertificates++
      else if (cert.verificationStatus === "pending") pendingCertificates++

      const isExpired = cert.expiryDate && new Date(cert.expiryDate) < now
      if (isExpired || cert.verificationStatus === "expired") {
        expiredCertificates++
      }

      if (cert.isShared || (cert.sharedWith && cert.sharedWith.length > 0)) {
        sharedCertificates++
      }

      totalDownloads += cert.downloads || 0
      totalViews += cert.views || 0
      totalBytes += cert.fileSize || 0
    })

    // 4. Get category distribution
    const categoryDistribution = await Certificate.aggregate([
      { $match: query },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])

    // 5. Get verification metrics
    const certIds = certificates.map(c => c._id)
    const verificationStats = await VerificationLog.aggregate([
      { $match: { certificateId: { $in: certIds } } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ])

    const verificationCounts = {
      verified: 0,
      pending: 0,
      revoked: 0,
      expired: 0,
      tampered: 0,
      not_found: 0
    }
    verificationStats.forEach(stat => {
      if (stat._id in verificationCounts) {
        verificationCounts[stat._id as keyof typeof verificationCounts] = stat.count
      }
    })

    // 6. Get issuer distribution
    const issuerDistribution = await Certificate.aggregate([
      { $match: query },
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
