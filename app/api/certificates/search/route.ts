import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Certificate as CertificateModel } from "@/lib/models"
import { verifyJWT } from "@/lib/jwt"
import { getJWTSecret } from "@/lib/env"
import type { ApiResponse } from "@/lib/types"

/**
 * GET /api/certificates/search?q=<query>
 * Search certificates by name, issuer, or owner
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

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q") || ""
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))

    if (!query || query.length < 2) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid search query",
          error: "Query must be at least 2 characters long",
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        { status: 400 }
      )
    }

    // 2. Build base query with access controls
    let searchCriteria: any = { isDeleted: false }

    if (payload.role === "user") {
      searchCriteria.$or = [
        { ownerId: payload.userId },
        { ownerEmail: payload.email }
      ]
    } else if (payload.role === "institution") {
      searchCriteria.$or = [
        { uploadedBy: payload.userId },
        { issuer: { $regex: payload.email.split("@")[0], $options: "i" } }
      ]
    }

    // 3. Add search regex queries safely
    const searchRegex = { $regex: query, $options: "i" }
    const matchConditions = [
      { certificateName: searchRegex },
      { certificateId: searchRegex },
      { issuer: searchRegex },
      { ownerName: searchRegex }
    ]

    if (searchCriteria.$or) {
      // Must satisfy permissions AND search conditions
      searchCriteria = {
        $and: [
          { $or: searchCriteria.$or },
          { $or: matchConditions }
        ],
        isDeleted: false
      }
    } else {
      searchCriteria.$or = matchConditions
    }

    // 4. Query MongoDB
    const results = await CertificateModel.find(searchCriteria).limit(limit).exec()

    return NextResponse.json(
      {
        success: true,
        message: `Found ${results.length} matching certificates`,
        data: results,
        timestamp: new Date().toISOString(),
      },
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
