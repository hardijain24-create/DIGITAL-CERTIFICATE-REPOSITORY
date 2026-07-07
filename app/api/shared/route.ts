import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Certificate, ShareLog } from "@/lib/models"

/**
 * GET /api/shared?token=shareToken
 * Access a publicly shared or restricted certificate without authentication
 * Query params: token (required), action ("view" | "download")
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    // 1. Extract share token
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")
    const action = searchParams.get("action") || "view"

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Validation error: token parameter is required" },
        { status: 400 }
      )
    }

    // 2. Find share record
    const share = await ShareLog.findOne({ shareToken: token, expiryDate: { $gte: new Date() } })
      .populate("certificateId")

    if (!share) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired share token" },
        { status: 404 }
      )
    }

    // 3. Verify certificate exists
    const certificate = share.certificateId as any
    if (!certificate || certificate.isDeleted) {
      return NextResponse.json(
        { success: false, message: "Certificate not found or has been deleted" },
        { status: 404 }
      )
    }

    // 4. Check permission
    if (action === "download" && share.permission !== "download") {
      return NextResponse.json(
        { success: false, message: "Forbidden: Download permission not granted for this share" },
        { status: 403 }
      )
    }

    // 5. Increment access count
    share.accessCount = (share.accessCount || 0) + 1
    await share.save()

    // 6. Log certificate view/download
    if (action === "view") {
      certificate.views = (certificate.views || 0) + 1
    } else if (action === "download") {
      certificate.downloads = (certificate.downloads || 0) + 1
    }
    await certificate.save()

    // 7. Get client IP and user agent
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    // 8. Return certificate data based on permission
    return NextResponse.json({
      success: true,
      message: "Certificate accessed successfully",
      data: {
        certificate: {
          id: certificate._id.toString(),
          certificateId: certificate.certificateId,
          certificateName: certificate.certificateName,
          category: certificate.category,
          description: certificate.description,
          ownerName: certificate.ownerName,
          issuer: certificate.issuer,
          issueDate: certificate.issueDate,
          expiryDate: certificate.expiryDate,
          fileType: certificate.fileType,
          fileSize: certificate.fileSize,
          cloudinaryUrl: action === "download" ? certificate.cloudinaryUrl : undefined,
        },
        share: {
          id: share._id.toString(),
          permission: share.permission,
          accessCount: share.accessCount,
          expiryDate: share.expiryDate,
          createdAt: share.createdAt,
        },
      },
      accessLog: {
        ipAddress,
        userAgent,
        action,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[DCRS API] GET shared certificate error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to access shared certificate",
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/shared/revoke
 * Revoke a share (only by the original sharer)
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Validation error: token is required" },
        { status: 400 }
      )
    }

    // Find and delete share record
    const share = await ShareLog.findOneAndDelete({ shareToken: token })

    if (!share) {
      return NextResponse.json(
        { success: false, message: "Share not found or already revoked" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Share revoked successfully",
      data: {
        shareId: share._id.toString(),
        revokedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[DCRS API] POST revoke share error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to revoke share",
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    )
  }
}
