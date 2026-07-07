import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse, Certificate } from "@/lib/types"

/**
 * GET /api/certificates/search?q=<query>
 * Search certificates by name, issuer, or owner
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
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

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")?.toLowerCase() || ""
    const limit = parseInt(searchParams.get("limit") || "20", 10)

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

    // TODO: Query MongoDB with text search
    const results: Certificate[] = []

    return NextResponse.json(
      {
        success: true,
        message: `Found ${results.length} matching certificates`,
        data: results,
        timestamp: new Date().toISOString(),
      } as ApiResponse<Certificate[]>,
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
