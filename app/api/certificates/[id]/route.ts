import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Certificate, ActivityLog } from "@/lib/models"
import { verifyJWT } from "@/lib/jwt"
import { getJWTSecret } from "@/lib/env"
import { CertificateUpdateSchema } from "@/lib/validations"
import { deleteFromCloudinary } from "@/lib/cloudinary"
import mongoose from "mongoose"
import { Types } from "mongoose"

/**
 * GET /api/certificates/[id]
 * Retrieve a specific certificate by its unique Certificate ID or MongoDB ObjectId
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB()
    const { id } = await params

    // 1. Authenticate user
    const token = request.cookies.get("authToken")?.value || request.headers.get("authorization")?.split(" ")[1]
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized: Missing token" }, { status: 401 })
    }

    const JWT_SECRET = getJWTSecret()
    const payload = await verifyJWT(token, JWT_SECRET)
    if (!payload) {
      return NextResponse.json({ success: false, message: "Unauthorized: Invalid token" }, { status: 401 })
    }

    // 2. Query certificate (check both mongoose ObjectId and custom certificateId)
    const isObjectId = mongoose.isValidObjectId(id)
    const cert = await Certificate.findOne(
      isObjectId ? { $or: [{ _id: id }, { certificateId: id }] } : { certificateId: id }
    )

    if (!cert) {
      return NextResponse.json({ success: false, message: "Certificate not found" }, { status: 404 })
    }

    // 3. Verify user has access permissions
    // Owner, Uploader, Admin, or if the user's email is in sharedWith list
    const hasAccess =
      payload.role === "admin" ||
      cert.ownerId.toString() === payload.userId ||
      cert.uploadedBy.toString() === payload.userId ||
      cert.sharedWith.includes(payload.email) ||
      cert.ownerEmail === payload.email

    if (!hasAccess) {
      return NextResponse.json({ success: false, message: "Forbidden: You do not have access to this certificate" }, { status: 403 })
    }

    // Increment view count
    cert.views = (cert.views || 0) + 1
    await cert.save()

    return NextResponse.json({
      success: true,
      data: cert
    })
  } catch (error) {
    console.error("[DCRS API] GET certificate details error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch certificate",
        error: error instanceof Error ? error.message : "Internal Server Error"
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/certificates/[id]
 * Update certificate details (description, category, expiryDate)
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB()
    const { id } = await params
    const body = await request.json()

    // 1. Authenticate user
    const token = request.cookies.get("authToken")?.value || request.headers.get("authorization")?.split(" ")[1]
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized: Missing token" }, { status: 401 })
    }

    const JWT_SECRET = getJWTSecret()
    const payload = await verifyJWT(token, JWT_SECRET)
    if (!payload) {
      return NextResponse.json({ success: false, message: "Unauthorized: Invalid token" }, { status: 401 })
    }

    // 2. Validate inputs
    const validation = CertificateUpdateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          error: validation.error.flatten().fieldErrors
        },
        { status: 400 }
      )
    }

    // 3. Find certificate
    const isObjectId = mongoose.isValidObjectId(id)
    const cert = await Certificate.findOne(
      isObjectId ? { $or: [{ _id: id }, { certificateId: id }] } : { certificateId: id }
    )

    if (!cert) {
      return NextResponse.json({ success: false, message: "Certificate not found" }, { status: 404 })
    }

    // 4. Verify owner or admin status
    const canUpdate =
      payload.role === "admin" ||
      cert.ownerId.toString() === payload.userId ||
      cert.uploadedBy.toString() === payload.userId

    if (!canUpdate) {
      return NextResponse.json({ success: false, message: "Forbidden: You are not authorized to update this certificate" }, { status: 403 })
    }

    // 5. Update fields
    const { certificateName, category, description, expiryDate } = validation.data
    if (certificateName) cert.certificateName = certificateName
    if (category) cert.category = category
    if (description !== undefined) cert.description = description
    if (expiryDate !== undefined) cert.expiryDate = expiryDate

    await cert.save()

    return NextResponse.json({
      success: true,
      message: "Certificate updated successfully",
      data: cert
    })
  } catch (error) {
    console.error("[DCRS API] PUT certificate error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update certificate",
        error: error instanceof Error ? error.message : "Internal Server Error"
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/certificates/[id]
 * Delete certificate from database and delete underlying media asset from Cloudinary
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB()
    const { id } = await params

    // 1. Authenticate user
    const token = request.cookies.get("authToken")?.value || request.headers.get("authorization")?.split(" ")[1]
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized: Missing token" }, { status: 401 })
    }

    const JWT_SECRET = getJWTSecret()
    const payload = await verifyJWT(token, JWT_SECRET)
    if (!payload) {
      return NextResponse.json({ success: false, message: "Unauthorized: Invalid token" }, { status: 401 })
    }

    // 2. Find certificate
    const isObjectId = mongoose.isValidObjectId(id)
    const cert = await Certificate.findOne(
      isObjectId ? { $or: [{ _id: id }, { certificateId: id }] } : { certificateId: id }
    )

    if (!cert) {
      return NextResponse.json({ success: false, message: "Certificate not found" }, { status: 404 })
    }

    // 3. Authorization check
    // Admins can delete anything; Users/Institutions can delete certificates they own/uploaded
    const canDelete =
      payload.role === "admin" ||
      cert.ownerId.toString() === payload.userId ||
      cert.uploadedBy.toString() === payload.userId

    if (!canDelete) {
      return NextResponse.json({ success: false, message: "Forbidden: You are not authorized to delete this certificate" }, { status: 403 })
    }

    // 4. Soft delete: Mark as deleted instead of removing from database
    cert.isDeleted = true
    cert.deletedAt = new Date()
    cert.deletedBy = new Types.ObjectId(payload.userId)
    await cert.save()

    // 5. Remove file asset from Cloudinary (actual storage cleanup)
    if (cert.publicId) {
      console.log(`[DCRS Storage] Deleting Cloudinary asset: ${cert.publicId}`)
      await deleteFromCloudinary(cert.publicId)
    }

    // 6. Log the audit activity
    await ActivityLog.create({
      userId: payload.userId,
      action: "certificate_deleted",
      description: `Deleted certificate "${cert.certificateName}" (Certificate ID: ${cert.certificateId})`,
      certificateId: cert._id,
    })

    return NextResponse.json({
      success: true,
      message: `Certificate ${cert.certificateId} has been successfully deleted.`,
      data: {
        certificateId: cert.certificateId,
        deletedAt: cert.deletedAt,
      }
    })
  } catch (error) {
    console.error("[DCRS API] DELETE certificate error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete certificate",
        error: error instanceof Error ? error.message : "Internal Server Error"
      },
      { status: 500 }
    )
  }
}
