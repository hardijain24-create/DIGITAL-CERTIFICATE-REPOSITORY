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

    // 2. Build query based on user role (exclude soft-deleted)
    let query: any = { isDeleted: false }
    if (payload.role === "user") {
      query.$or = [{ ownerId: payload.userId }, { ownerEmail: payload.email }]
    } else if (payload.role === "institution") {
      query.$or = [
        { uploadedBy: payload.userId },
        { issuer: { $regex: payload.email.split("@")[0], $options: "i" } }
      ]
    }
    // Admin role queries all non-deleted certificates

    // 3. Fetch certificates
    const certificates = await Certificate.find(query)

    // 4. Calculate metrics
    const totalCertificates = certificates.length
    let verifiedCertificates = 0
    let pendingCertificates = 0
    let expiredCertificates = 0
    let sharedCertificates = 0
    let totalDownloads = 0
    let totalViews = 0
    let totalBytes = 0

    const now = new Date()
    const certificatesByCategory: Record<string, number> = {
      academic: 0,
      professional: 0,
      internship: 0,
      training: 0,
      government: 0,
      identity: 0,
      license: 0,
      achievement: 0,
      workshop: 0,
      other: 0,
    }

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

      if (certificatesByCategory[cert.category] !== undefined) {
        certificatesByCategory[cert.category]++
      } else {
        certificatesByCategory[cert.category] = 1
      }
    })

    // 5. Get total users (admin only)
    let totalUsers = 0
    if (payload.role === "admin") {
      totalUsers = await User.countDocuments()
    }

    // 6. Get recent uploads (5 most recent)
    const recentUploads = await Certificate.find(query)
      .sort({ createdAt: -1 })
      .limit(5)
      .select("certificateId certificateName ownerId ownerName issuer category fileSize createdAt")

    // 7. Get verification metrics
    const verificationStats = await VerificationLog.aggregate([
      { $match: { certificateId: { $in: certificates.map(c => c._id) } } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ])

    let verificationSuccessRate = 0
    if (verificationStats.length > 0) {
      const verified = verificationStats.find(s => s._id === "verified")?.count || 0
      const total = verificationStats.reduce((sum, s) => sum + s.count, 0)
      verificationSuccessRate = total > 0 ? Math.round((verified / total) * 100) : 0
    }

    // 8. Build response
    const stats: DashboardStats = {
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
          ...stats,
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
