import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Certificate, ShareLog, ActivityLog } from "@/lib/models"
import { verifyJWT } from "@/lib/jwt"
import { getJWTSecret } from "@/lib/env"
import { generateRandomToken } from "@/lib/utils"
import type { ApiResponse, Share } from "@/lib/types"
import crypto from "crypto"
import mongoose from "mongoose"

/**
 * POST /api/certificates/share
 * Share a certificate with another user or generate public share link
 * Body: certificateId, sharedWith? (email), permission? ("view" | "download"), expiryDate?
 */
export async function POST(request: NextRequest) {
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

    // 2. Validate request body
    const body = await request.json()
    const { certificateId, sharedWith, permission = "view", expiryDate, isPublic = false } = body

    if (!certificateId) {
      return NextResponse.json(
        { success: false, message: "Validation error: certificateId is required" },
        { status: 400 }
      )
    }

    // 3. Verify certificate exists and user owns it
    // CRITICAL FIX: certificateId is STRING custom ID, not MongoDB ObjectId
    // Query by custom certificateId field, not _id
    const certificate = await Certificate.findOne({ certificateId, isDeleted: false })
    if (!certificate) {
      return NextResponse.json(
        { success: false, message: "Certificate not found" },
        { status: 404 }
      )
    }

    // Check ownership - compare ObjectId to ObjectId
    const userObjectId = new mongoose.Types.ObjectId(payload.userId)
    const hasAccess = 
      certificate.uploadedBy.toString() === userObjectId.toString() ||
      certificate.ownerEmail === payload.email

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, message: "Forbidden: You do not own this certificate" },
        { status: 403 }
      )
    }

    // 4. Validate permission
    const validPermissions = ["view", "download", "share"]
    if (permission && !validPermissions.includes(permission)) {
      return NextResponse.json(
        { success: false, message: `Invalid permission: must be one of ${validPermissions.join(", ")}` },
        { status: 400 }
      )
    }

    // 5. Generate share token
    const shareToken = crypto.randomBytes(32).toString("hex")
    const origin = new URL(request.url).origin
    const shareLink = `${origin}/shared/${shareToken}`

    // 6. Create share log entry
    // CRITICAL FIX: Store userObjectId as ObjectId, not string
    const shareLog = await ShareLog.create({
      certificateId: certificate._id,
      sharedBy: userObjectId,
      sharedByEmail: payload.email,
      sharedWith: sharedWith || null,
      permission,
      shareToken,
      shareLink,
      isPublic,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      accessCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // 7. Log activity
    // CRITICAL FIX: Store userObjectId as ObjectId
    await ActivityLog.create({
      userId: userObjectId,
      action: "certificate_shared",
      description: `Shared certificate ${certificate.certificateName} with ${sharedWith || "public"}`,
      certificateId: certificate._id,
      timestamp: new Date(),
    })

    // 8. Update certificate share count
    certificate.sharesCount = (certificate.sharesCount || 0) + 1
    if (!certificate.sharedWith) certificate.sharedWith = []
    if (sharedWith && !certificate.sharedWith.includes(sharedWith)) {
      certificate.sharedWith.push(sharedWith)
    }
    await certificate.save()

    return NextResponse.json({
      success: true,
      message: "Certificate shared successfully",
      data: {
        shareId: shareLog._id.toString(),
        certificateId: certificate._id.toString(),
        shareToken,
        shareLink,
        permission,
        isPublic,
        expiryDate: shareLog.expiryDate,
      },
      timestamp: new Date().toISOString(),
    }, { status: 201 })
  } catch (error) {
    console.error("[DCRS API] Share error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to share certificate",
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/certificates/share
 * Get list of shares created by current user or shared with them
 * Query params: type ("created" | "received" | "all"), limit, page
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

    // 2. Extract pagination and filter parameters
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "created" // created, received, all
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")))
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const skip = (page - 1) * limit

    // 3. Build query based on type
    let query: any = {}
    if (type === "created") {
      query.sharedBy = payload.userId
    } else if (type === "received") {
      query.sharedWith = payload.email
    }
    // if type === "all", empty query shows both

    // 4. Fetch shares with pagination
    const totalCount = await ShareLog.countDocuments(query)
    const shares = await ShareLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate("certificateId", "certificateId certificateName category")

    const totalPages = Math.ceil(totalCount / limit)

    // 5. Format response
    const shareData = shares.map(share => ({
      id: share._id.toString(),
      certificateId: share.certificateId,
      sharedBy: share.sharedByEmail,
      sharedWith: share.sharedWith,
      permission: share.permission,
      shareLink: share.shareLink,
      isPublic: share.isPublic,
      accessCount: share.accessCount,
      expiryDate: share.expiryDate,
      isExpired: share.expiryDate ? new Date(share.expiryDate) < new Date() : false,
      createdAt: share.createdAt,
    }))

    return NextResponse.json({
      success: true,
      message: `Retrieved ${shares.length} shares`,
      data: shareData,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalShares: totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[DCRS API] Get shares error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch shares",
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    )
  }
}
