import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Certificate } from "@/lib/models"
import { verifyJWT } from "@/lib/jwt"
import { getJWTSecret } from "@/lib/env"

/**
 * GET /api/dashboard/charts
 * Aggregate monthly certificate uploads and categorizations for chart rendering
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    // 1. Authenticate user
    const token = request.cookies.get("authToken")?.value || request.headers.get("authorization")?.split(" ")[1]
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const JWT_SECRET = getJWTSecret()
    const payload = await verifyJWT(token, JWT_SECRET)
    if (!payload) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    // 2. Fetch certificates based on user role (exclude soft-deleted)
    let query: any = { isDeleted: false }
    if (payload.role === "user") {
      query.$or = [{ ownerId: payload.userId }, { ownerEmail: payload.email }]
    } else if (payload.role === "institution") {
      query.$or = [
        { uploadedBy: payload.userId },
        { issuer: { $regex: payload.email.split("@")[0], $options: "i" } }
      ]
    }
    // Admin role fetches all certificates

    const certificates = await Certificate.find(query)

    // 3. Aggregate categories data
    const categoriesCount: Record<string, number> = {
      academic: 0,
      professional: 0,
      internship: 0,
      training: 0,
      government: 0,
      identity: 0,
      license: 0,
      achievement: 0,
      workshop: 0,
      other: 0,
    }

    // 4. Aggregate monthly uploads data (past 6 months)
    const monthlyUploads: Record<string, number> = {}
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    
    // Initialize past 6 months with 0
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthLabel = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`
      monthlyUploads[monthLabel] = 0
    }

    certificates.forEach((cert) => {
      // Category count
      if (categoriesCount[cert.category] !== undefined) {
        categoriesCount[cert.category]++
      } else {
        categoriesCount[cert.category] = 1
      }

      // Monthly uploads
      const certDate = new Date(cert.createdAt)
      const monthLabel = `${monthNames[certDate.getMonth()]} ${certDate.getFullYear().toString().substring(2)}`
      
      // Only record if it matches one of our active 6 months
      if (monthlyUploads[monthLabel] !== undefined) {
        monthlyUploads[monthLabel]++
      }
    })

    // Format monthly data for Recharts
    const chartMonthlyData = Object.entries(monthlyUploads).map(([month, count]) => ({
      month,
      uploads: count,
    }))

    // Format category data
    const chartCategoryData = Object.entries(categoriesCount).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }))

    return NextResponse.json(
      {
        success: true,
        message: "Dashboard chart data successfully aggregated",
        data: {
          categories: chartCategoryData,
          monthlyUploads: chartMonthlyData,
        },
        timestamp: new Date().toISOString()
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        }
      }
    )
  } catch (error) {
    console.error("[DCRS API] GET dashboard charts error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to load dashboard chart data",
        error: error instanceof Error ? error.message : "Internal Server Error"
      },
      { status: 500 }
    )
  }
}
