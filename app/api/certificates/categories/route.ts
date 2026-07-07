import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/lib/types"

/**
 * GET /api/certificates/categories
 * Get all certificate categories
 */
export async function GET(request: NextRequest) {
  try {
    const categories = [
      { value: "academic", label: "Academic", description: "Educational certificates and degrees" },
      { value: "professional", label: "Professional", description: "Professional certifications" },
      { value: "internship", label: "Internship", description: "Internship certificates" },
      { value: "training", label: "Training", description: "Training completion certificates" },
      { value: "government", label: "Government", description: "Government-issued documents" },
      { value: "identity", label: "Identity", description: "Identity documents" },
      { value: "license", label: "License", description: "Professional licenses" },
      { value: "achievement", label: "Achievement", description: "Achievement awards" },
      { value: "workshop", label: "Workshop", description: "Workshop completion" },
      { value: "other", label: "Other", description: "Other certificates" },
    ]

    return NextResponse.json(
      {
        success: true,
        message: "Categories retrieved successfully",
        data: categories,
        timestamp: new Date().toISOString(),
      } as ApiResponse,
      { status: 200 }
    )
  } catch (error) {
    console.error("[DCRS API] Categories error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Error fetching categories",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      } as ApiResponse,
      { status: 500 }
    )
  }
}
