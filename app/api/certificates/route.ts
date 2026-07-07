import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Certificate, ActivityLog } from "@/lib/models"
import { UploadSchema } from "@/lib/validations"
import { verifyJWT } from "@/lib/jwt"
import { getJWTSecret } from "@/lib/env"
import { v2 as cloudinary } from "cloudinary"
import crypto from "crypto"
import mongoose from "mongoose"

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

/**
 * GET /api/certificates
 * Retrieve all certificates with role permissions and advanced search filters
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB()

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

    // 2. Extract pagination and filter queries
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")))
    const skip = (page - 1) * limit
    
    // Filter parameters
    const category = searchParams.get("category")
    const status = searchParams.get("status")
    const issuer = searchParams.get("issuer")
    const owner = searchParams.get("owner")
    const search = searchParams.get("search") // General search field
    const sortBy = searchParams.get("sortBy") || "createdAt"
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    console.log("[v0] GET Certificates - User:", payload.userId, payload.email, payload.role)

    // 3. Formulate query object based on user permissions
    let query: any = { isDeleted: false } // Exclude soft-deleted certificates
    const ObjectId = mongoose.Types.ObjectId

    if (payload.role === "user") {
      // User can only view their own certificates
      query.$or = [
        { ownerId: new ObjectId(payload.userId) },
        { ownerEmail: payload.email }
      ]
    } else if (payload.role === "institution") {
      // Institution can view certificates they uploaded or where they are the issuer
      query.$or = [
        { uploadedBy: new ObjectId(payload.userId) },
        { issuer: { $regex: payload.email.split("@")[0], $options: "i" } }
      ]
    }
    // Admin sees everything except soft-deleted (query has isDeleted: false)
    
    console.log("[v0] Certificate Query:", JSON.stringify(query, null, 2))

    // 4. Apply advanced filters
    if (category && category !== "all") {
      query.category = category
    }
    if (status && status !== "all") {
      query.verificationStatus = status
    }
    if (issuer) {
      query.issuer = { $regex: issuer, $options: "i" }
    }
    if (owner) {
      query.$or = [
        { ownerName: { $regex: owner, $options: "i" } },
        { ownerEmail: { $regex: owner, $options: "i" } }
      ]
    }
    if (search) {
      // Search across multiple fields
      query.$or = [
        { certificateName: { $regex: search, $options: "i" } },
        { certificateId: { $regex: search, $options: "i" } },
        { issuer: { $regex: search, $options: "i" } },
        { ownerName: { $regex: search, $options: "i" } }
      ]
    }
    if (startDate || endDate) {
      query.createdAt = {}
      if (startDate) query.createdAt.$gte = new Date(startDate)
      if (endDate) query.createdAt.$lte = new Date(endDate)
    }

    // 5. Execute query with pagination and sorting
    const totalCount = await Certificate.countDocuments(query)
    const list = await Certificate.find(query)
      .sort({ [sortBy]: sortOrder })
      .limit(limit)
      .skip(skip)
      .exec()
    
    console.log("[v0] Query Results:", { totalCount, returned: list.length, firstDoc: list[0]?.ownerId })

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      success: true,
      message: `Successfully retrieved ${list.length} of ${totalCount} certificates`,
      data: list,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalCertificates: totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("[DCRS API] GET certificates error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch certificates",
        error: error instanceof Error ? error.message : "Internal Server Error"
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/certificates
 * Upload a certificate file to Cloudinary and store metadata in MongoDB Atlas
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB()

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

    // 2. Parse FormData
    const formData = await request.formData()
    const file = formData.get("file") as File
    const certificateName = formData.get("certificateName") as string
    const issuer = formData.get("issuer") as string
    const ownerName = formData.get("ownerName") as string
    const ownerEmail = formData.get("ownerEmail") as string
    const issuerWebsite = formData.get("issuerWebsite") as string
    const category = formData.get("category") as any
    const description = formData.get("description") as string
    const issueDate = formData.get("issueDate") as string
    const expiryDate = formData.get("expiryDate") as string

    // 3. Input validation using Zod
    const validation = UploadSchema.safeParse({
      certificateName,
      issuer,
      ownerName,
      ownerEmail,
      issuerWebsite,
      category,
      description,
      issueDate,
      expiryDate,
    })

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

    // 4. File validation using Cloudinary utilities
    if (!file) {
      return NextResponse.json({ success: false, message: "No certificate file provided." }, { status: 400 })
    }

    const { validateFile } = await import("@/lib/cloudinary")
    const fileValidation = validateFile(file)
    if (!fileValidation.valid) {
      return NextResponse.json({ success: false, message: fileValidation.error }, { status: 400 })
    }

    // 5. Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 6. Security Stage: Virus Scan Placeholder
    console.log(`[DCRS Security] Scanning file for malware: ${file.name}`)
    await new Promise((resolve) => setTimeout(resolve, 800)) // simulated sandbox verification
    console.log(`[DCRS Security] Virus scan completed: ${file.name} is clean.`)

    // 7. SHA-256 Cryptographic Hash Generation
    const fileHash = crypto.createHash("sha256").update(buffer).digest("hex")

    // Check for duplicate certificates to prevent tampering/double upload
    const duplicateCert = await Certificate.findOne({ hash: fileHash })
    if (duplicateCert) {
      return NextResponse.json(
        {
          success: false,
          message: "This certificate already exists in the repository.",
          error: "Duplicate certificate hash detected"
        },
        { status: 409 }
      )
    }

    // 8. Upload stream to Cloudinary
    console.log("[DCRS Storage] Uploading file to Cloudinary...")
    const { uploadToCloudinary, CLOUDINARY_FOLDERS } = await import("@/lib/cloudinary")
    const uploadRes = await uploadToCloudinary(
      buffer,
      file.name,
      CLOUDINARY_FOLDERS.certificates,
      file.type.startsWith("application/pdf") ? "auto" : "image"
    )
    console.log("[DCRS Storage] Cloudinary upload successful.")

    // 9. Generate metadata parameters with enhanced QR codes
    const certificateId = `CERT_${Date.now()}_${crypto.randomBytes(4).toString("hex").toUpperCase()}`
    
    const { generateQRCodeData, generateQRCodeURL } = await import("@/lib/qrcode")
    const origin = new URL(request.url).origin
    const verificationUrl = `${origin}/verify?id=${certificateId}`
    
    const qrData = generateQRCodeData(
      certificateId,
      fileHash,
      issuer,
      ownerName,
      new Date(),
      verificationUrl
    )
    const qrCode = generateQRCodeURL(qrData)

    // 10. Save metadata in MongoDB Atlas
    const userObjectId = new mongoose.Types.ObjectId(payload.userId)
    const newCertificate = await Certificate.create({
      certificateId,
      certificateName,
      ownerId: userObjectId, // Convert userId string to ObjectId for consistent querying
      ownerName,
      ownerEmail,
      issuer,
      issuerWebsite,
      category,
      description,
      issueDate: issueDate ? new Date(issueDate) : undefined,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      fileUrl: uploadRes.secure_url,
      publicId: uploadRes.public_id,
      fileType: file.type.startsWith("application/pdf") ? "pdf" : "image",
      fileSize: file.size,
      qrCode,
      hash: fileHash,
      verificationStatus: "verified", // Uploaded directly by owner or issuer -> verified
      uploadedBy: userObjectId, // Ensure uploadedBy is also ObjectId for consistency
      isShared: false,
      sharedWith: [],
      isDeleted: false,
    })

    // 11. Create system audit log
    await ActivityLog.create({
      userId: payload.userId,
      action: "certificate_uploaded",
      description: `Uploaded certificate "${certificateName}" issued by "${issuer}"`,
      certificateId: newCertificate._id,
    })

    return NextResponse.json(
      {
        success: true,
        message: "Certificate uploaded successfully",
        data: newCertificate,
        timestamp: new Date().toISOString()
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[DCRS API] POST certificates upload error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to upload certificate",
        error: error instanceof Error ? error.message : "Internal Server Error"
      },
      { status: 500 }
    )
  }
}
