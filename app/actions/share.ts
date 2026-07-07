"use server"

import { connectDB } from "@/lib/db"
import { Certificate, Share, ActivityLog } from "@/lib/models"
import { verifyJWT } from "@/lib/jwt"
import { cookies } from "next/headers"
import mongoose, { Types } from "mongoose"

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key_dcrs_2026_premium_saas_generation"

/**
 * Server Action: Share certificate with another email
 */
export async function shareCertificate(data: {
  certificateId: string
  sharedWith: string
  permission: "view" | "download"
  expiryDate?: string
}) {
  try {
    await connectDB()
    const cookieStore = cookies()
    const token = (await cookieStore).get("authToken")?.value

    if (!token) {
      return { success: false, error: "Unauthorized: Please log in." }
    }

    const payload = await verifyJWT(token, JWT_SECRET)
    if (!payload) {
      return { success: false, error: "Unauthorized: Invalid session." }
    }

    const emailToShareWith = data.sharedWith.trim().toLowerCase()
    
    // 1. Locate certificate
    const isObjectId = mongoose.isValidObjectId(data.certificateId)
    const cert = await Certificate.findOne(
      isObjectId
        ? { $or: [{ _id: data.certificateId }, { certificateId: data.certificateId }] }
        : { certificateId: data.certificateId }
    )

    if (!cert) {
      return { success: false, error: "Certificate not found." }
    }

    // 2. Validate ownership/permissions
    if (cert.ownerId.toString() !== payload.userId && cert.uploadedBy.toString() !== payload.userId) {
      return { success: false, error: "Forbidden: You do not own this certificate." }
    }

    // 3. Prevent sharing with yourself
    if (cert.ownerEmail === emailToShareWith || payload.email === emailToShareWith) {
      return { success: false, error: "You cannot share a certificate with yourself." }
    }

    // 4. Create or update Share record
    // CRITICAL FIX: Convert payload.userId (STRING) to ObjectId for storage
    await Share.findOneAndUpdate(
      { certificateId: cert._id, sharedWith: emailToShareWith },
      {
        ownerId: new Types.ObjectId(payload.userId),
        permission: data.permission,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      },
      { upsert: true, new: true }
    )

    // 5. Update shared status on Certificate
    if (!cert.sharedWith.includes(emailToShareWith)) {
      cert.sharedWith.push(emailToShareWith)
    }
    cert.isShared = true
    cert.sharesCount = (cert.sharesCount || 0) + 1
    await cert.save()

    // 6. Log activity
    // CRITICAL FIX: Convert payload.userId (STRING) to ObjectId for storage
    await ActivityLog.create({
      userId: new Types.ObjectId(payload.userId),
      action: "certificate_shared",
      description: `Shared certificate "${cert.certificateName}" with ${emailToShareWith} (${data.permission})`,
      certificateId: cert._id,
    })

    return {
      success: true,
      message: `Certificate successfully shared with ${emailToShareWith}`,
    }
  } catch (error) {
    console.error("Share certificate Server Action error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Internal Server Error",
    }
  }
}

/**
 * Server Action: Revoke active share
 */
export async function revokeCertificateShare(data: {
  certificateId: string
  sharedWith: string
}) {
  try {
    await connectDB()
    const cookieStore = cookies()
    const token = (await cookieStore).get("authToken")?.value

    if (!token) {
      return { success: false, error: "Unauthorized: Please log in." }
    }

    const payload = await verifyJWT(token, JWT_SECRET)
    if (!payload) {
      return { success: false, error: "Unauthorized: Invalid session." }
    }

    const emailToRevoke = data.sharedWith.trim().toLowerCase()

    // 1. Locate certificate
    const isObjectId = mongoose.isValidObjectId(data.certificateId)
    const cert = await Certificate.findOne(
      isObjectId
        ? { $or: [{ _id: data.certificateId }, { certificateId: data.certificateId }] }
        : { certificateId: data.certificateId }
    )

    if (!cert) {
      return { success: false, error: "Certificate not found." }
    }

    // 2. Validate ownership
    if (cert.ownerId.toString() !== payload.userId && cert.uploadedBy.toString() !== payload.userId) {
      return { success: false, error: "Forbidden: You do not own this certificate." }
    }

    // 3. Delete Share record
    await Share.deleteOne({ certificateId: cert._id, sharedWith: emailToRevoke })

    // 4. Update shared list on Certificate
    cert.sharedWith = cert.sharedWith.filter((email) => email !== emailToRevoke)
    if (cert.sharedWith.length === 0) {
      cert.isShared = false
    }
    await cert.save()

    // 5. Log activity
    // CRITICAL FIX: Convert payload.userId (STRING) to ObjectId for storage
    await ActivityLog.create({
      userId: new Types.ObjectId(payload.userId),
      action: "certificate_shared", // Log as sharing modification activity
      description: `Revoked sharing access for certificate "${cert.certificateName}" from ${emailToRevoke}`,
      certificateId: cert._id,
    })

    return {
      success: true,
      message: `Access successfully revoked for ${emailToRevoke}`,
    }
  } catch (error) {
    console.error("Revoke share Server Action error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Internal Server Error",
    }
  }
}
