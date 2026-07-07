import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Certificate } from "@/lib/models"
import { verifyJWT } from "@/lib/jwt"
import { getJWTSecret } from "@/lib/env"
import mongoose from "mongoose"
import type { ApiResponse, Certificate as CertificateType } from "@/lib/types"

/**
 * GET /api/certificates/search
 * Search certificates by ID, owner, issuer, category, or hash
 * Query params: q (search term), category, issuer, page, limit
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

    // 2. Extract search parameters
    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q") || ""
    const category = searchParams.get("category")
    const issuer = searchParams.get("issuer")
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")))
    const skip = (page - 1) * limit

    // 3. Build base query (exclude soft-deleted, apply authorization)
    let query: any = { isDeleted: false }

    if (payload.role === "user") {
      query.$or = [{ ownerId: payload.userId }, { ownerEmail: payload.email }]
    } else if (payload.role === "institution") {
      query.$or = [
        { uploadedBy: payload.userId },
        { issuer: { $regex: payload.email.split("@")[0], $options: "i" } }
      ]
    }
    // Admin sees all non-deleted certificates

    // 4. Apply search filters
    if (q) {
      query.$or = [
        { certificateId: { $regex: q, $options: "i" } },
        { certificateName: { $regex: q, $options: "i" } },
        { ownerName: { $regex: q, $options: "i" } },
        { issuer: { $regex: q, $options: "i" } },
        { hash: { $regex: q, $options: "i" } },
      ]
    }

    if (category && category !== "all") {
      query.category = category
    }

    if (issuer) {
      query.issuer = { $regex: issuer, $options: "i" }
    }

    // 5. Execute search with pagination
    const totalCount = await Certificate.countDocuments(query)
    const results = await Certificate.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .select("-__v")

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json(
      {
        success: true,
        message: `Found ${results.length} of ${totalCount} matching certificates`,
        data: results,
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalResults: totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse<CertificateType[]>,
      { status: 200 }
    )
  } catch (error) {
    console.error("[DCRS API] Search error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Error searching certificates",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      } as ApiResponse,
      { status: 500 }
    )
  }
}
