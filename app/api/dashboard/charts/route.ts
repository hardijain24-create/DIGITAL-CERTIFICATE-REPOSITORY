import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Certificate } from "@/lib/models"
import { verifyJWT } from "@/lib/jwt"
import { getJWTSecret } from "@/lib/env"
import mongoose from "mongoose"

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

    // 2. Build base match query - USE uploadedBy as source of truth
    const userObjectId = new mongoose.Types.ObjectId(payload.userId)
    let matchQuery: any = { uploadedBy: userObjectId, isDeleted: false }
    if (payload.role === "admin") {
      matchQuery = { isDeleted: false }
    }

    // 3. Aggregate categories and monthly data using MongoDB pipeline
    const chartsData = await Certificate.aggregate([
      { $match: matchQuery },
      {
        $facet: {
          categories: [
            {
              $group: {
                _id: "$category",
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } }
          ],
          monthlyData: [
            {
              $group: {
                _id: {
                  year: { $year: "$createdAt" },
                  month: { $month: "$createdAt" }
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
          ]
        }
      }
    ])

    const chartResult = chartsData[0] || { categories: [], monthlyData: [] }
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    // Format monthly data for Recharts
    const chartMonthlyData = chartResult.monthlyData.map((item: any) => {
      const monthLabel = `${monthNames[item._id.month - 1]} ${item._id.year.toString().substring(2)}`
      return {
        month: monthLabel,
        uploads: item.count
      }
    })

    // Format category data
    const chartCategoryData = chartResult.categories.map((cat: any) => ({
      name: (cat._id || "other").charAt(0).toUpperCase() + (cat._id || "other").slice(1),
      value: cat.count
    }))

    return NextResponse.json({
      success: true,
      message: "Dashboard chart data successfully aggregated",
      data: {
        categories: chartCategoryData,
        monthlyUploads: chartMonthlyData,
      },
      timestamp: new Date().toISOString()
    })
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
