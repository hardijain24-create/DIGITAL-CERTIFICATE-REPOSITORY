import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Certificate, VerificationLog, ActivityLog } from "@/lib/models"
import { verifyJWT } from "@/lib/jwt"
import { getJWTSecret } from "@/lib/env"
import { parseQRCodeData, generateVerificationToken, verifyCertificateChecksum } from "@/lib/qrcode"
import crypto from "crypto"

/**
 * POST /api/verify
 * Verify a certificate by ID, SHA-256 Hash, or File Upload
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    let certificateId = ""
    let hash = ""
    let fileBuffer: Buffer | null = null

    // 1. Determine request format (JSON or FormData file upload)
    const contentType = request.headers.get("content-type") || ""
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      const file = formData.get("file") as File
      certificateId = (formData.get("certificateId") as string) || ""

      if (file) {
        const arrayBuffer = await file.arrayBuffer()
        fileBuffer = Buffer.from(arrayBuffer)
        // Compute SHA-256 hash of the uploaded file
        hash = crypto.createHash("sha256").update(fileBuffer).digest("hex")
      }
    } else {
      const body = await request.json()
      certificateId = body.certificateId || ""
      hash = body.hash || ""
    }

    if (!certificateId && !hash) {
      return NextResponse.json(
        {
          success: false,
          message: "Provide a Certificate ID, SHA-256 Hash, or upload a certificate file.",
          error: "Missing search criteria"
        },
        { status: 400 }
      )
    }

    let cert = null
    let status: "verified" | "pending" | "revoked" | "expired" | "tampered" | "not_found" = "not_found"
    let description = ""

    // 2. Lookup & verify matching criteria
    if (hash) {
      // Try to find certificate by its hash
      cert = await Certificate.findOne({ hash, isDeleted: false })

      if (cert) {
        // If a Certificate ID was also provided, it must match
        if (certificateId && cert.certificateId !== certificateId) {
          status = "tampered"
          description = "Security Alert: File hash is valid but Certificate ID does not match. Possible document tampering."
        } else {
          // Determine verification status based on multiple checks
          const isExpired = cert.expiryDate && new Date(cert.expiryDate) < new Date()
          
          if (cert.isDeleted) {
            status = "not_found"
            description = "Not Found: This certificate has been removed from the repository."
          } else if (cert.verificationStatus === "revoked") {
            status = "revoked"
            description = "Revoked: This certificate has been officially revoked by the issuer."
          } else if (isExpired || cert.verificationStatus === "expired") {
            status = "expired"
            description = "Expired: The validity period for this certificate has expired."
          } else if (cert.verificationStatus === "pending") {
            status = "pending"
            description = "Pending: Certificate authenticity is pending issuer verification."
          } else if (cert.verificationStatus === "verified") {
            status = "verified"
            description = "Verified: Certificate is authentic, active, and has not expired."
          } else {
            status = "verified"
            description = "Verified: Certificate is authentic and active."
          }
        }
      } else {
        // Hash not found. If an ID was provided, see if ID is registered (meaning the file was modified)
        if (certificateId) {
          const certById = await Certificate.findOne({ certificateId, isDeleted: false })
          if (certById) {
            status = "tampered"
            description = "Tampered: Certificate ID exists, but the file content has been altered (hash mismatch)."
            cert = certById
          } else {
            status = "not_found"
            description = "Not Found: No registered certificate matches the provided ID and hash."
          }
        } else {
          status = "not_found"
          description = "Not Found: No registered certificate matches this file hash."
        }
      }
    } else if (certificateId) {
      // Find solely by Certificate ID
      cert = await Certificate.findOne({ certificateId, isDeleted: false })

      if (cert) {
        const isExpired = cert.expiryDate && new Date(cert.expiryDate) < new Date()
        
        if (cert.verificationStatus === "revoked") {
          status = "revoked"
          description = "Revoked: This certificate has been officially revoked by the issuer."
        } else if (isExpired || cert.verificationStatus === "expired") {
          status = "expired"
          description = "Expired: This certificate is no longer valid."
        } else if (cert.verificationStatus === "pending") {
          status = "pending"
          description = "Pending: Certificate is pending verification review."
        } else if (cert.verificationStatus === "verified") {
          status = "verified"
          description = "Verified: Certificate ID is valid and active."
        } else {
          status = "verified"
          description = "Verified: Certificate ID is valid and active."
        }
      } else {
        status = "not_found"
        description = "Not Found: No certificate matching this ID was found in the repository."
      }
    }

    // 3. Resolve verifying user details
    const authCookie = request.cookies.get("authToken")?.value
    let verifiedBy = undefined
    let verifiedByName = "Guest Auditor"

    if (authCookie) {
      const JWT_SECRET = getJWTSecret()
      const payload = await verifyJWT(authCookie, JWT_SECRET)
      if (payload) {
        verifiedBy = payload.userId
        verifiedByName = payload.email
      }
    }

    // 4. Save verification logs in database
    if (cert) {
      // Increment verification analytics
      cert.verificationCount = (cert.verificationCount || 0) + 1
      await cert.save()

      await VerificationLog.create({
        certificateId: cert._id,
        verifiedBy,
        verifiedByName,
        verificationMethod: hash ? "sha256_hash" : "certificate_id",
        status,
        ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
        userAgent: request.headers.get("user-agent") || "Browser",
      })

      if (verifiedBy) {
        await ActivityLog.create({
          userId: verifiedBy,
          action: "certificate_verified",
          description: `Verified certificate "${cert.certificateName}" - Status: ${status}`,
          certificateId: cert._id,
        })
      }
    }

    // Generate response with comprehensive verification data
    const response = {
      success: status === "verified",
      status,
      message: description,
      verificationToken: generateVerificationToken(),
      timestamp: new Date().toISOString(),
      data: cert ? {
        certificate: {
          id: cert._id.toString(),
          certificateId: cert.certificateId,
          certificateName: cert.certificateName,
          category: cert.category,
          description: cert.description,
        },
        issuer: {
          name: cert.issuer,
          website: cert.issuerWebsite,
        },
        owner: {
          name: cert.ownerName,
          email: cert.ownerEmail,
        },
        dates: {
          issuedAt: cert.issueDate,
          expiresAt: cert.expiryDate,
          uploadedAt: cert.createdAt,
        },
        verification: {
          hash: cert.hash,
          status: cert.verificationStatus,
          verificationCount: cert.verificationCount,
          fileType: cert.fileType,
          fileSize: cert.fileSize,
        },
        engagement: {
          views: cert.views,
          downloads: cert.downloads,
          shares: cert.sharesCount,
        },
      } : null,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.log("[DCRS API] POST verification handler error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Verification failed",
        error: error instanceof Error ? error.message : "Internal Server Error"
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/verify
 * Retrieve verification history logs for a certificate
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const certificateId = searchParams.get("certificateId")
    
    if (!certificateId) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing certificateId query parameter.",
          data: { history: [] },
          history: []
        },
        { status: 400 }
      )
    }
    
    const queryCond: any = {}
    const { default: mongoose } = await import("mongoose")
    if (mongoose.Types.ObjectId.isValid(certificateId)) {
      queryCond.certificateId = new mongoose.Types.ObjectId(certificateId)
    } else {
      // If it's a certificateId string, lookup the certificate first to find its ObjectId
      const cert = await Certificate.findOne({ certificateId, isDeleted: false })
      if (cert) {
        queryCond.certificateId = cert._id
      } else {
        return NextResponse.json({
          success: true,
          data: { history: [] },
          history: []
        })
      }
    }
    
    const logs = await VerificationLog.find(queryCond)
      .sort({ createdAt: -1 })
      .lean()
      
    // Transform logs to serialize dates and IDs consistently
    const serializedLogs = logs.map((log: any) => ({
      id: log._id.toString(),
      verifiedAt: log.createdAt ? log.createdAt.toISOString() : new Date().toISOString(),
      verifiedByName: log.verifiedByName || "Guest Auditor",
      verificationMethod: log.verificationMethod || "certificate_id",
      status: log.status || "verified",
      ipAddress: log.ipAddress || "127.0.0.1",
    }))

    return NextResponse.json({
      success: true,
      data: {
        history: serializedLogs
      },
      history: serializedLogs
    })
  } catch (error) {
    console.error("[DCRS API] GET verification history error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch verification history",
        data: { history: [] },
        history: [],
        error: error instanceof Error ? error.message : "Internal Server Error"
      },
      { status: 500 }
    )
  }
}
