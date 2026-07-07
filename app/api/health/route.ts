import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { v2 as cloudinary } from "cloudinary"
import { isProduction } from "@/lib/env"

/**
 * GET /api/health
 * Comprehensive health check endpoint for monitoring system status
 */
export async function GET() {
  const startTime = Date.now()
  const checks: Record<string, any> = {}

  try {
    // 1. Check Environment Variables
    const requiredEnvVars = [
      "MONGODB_URI",
      "JWT_SECRET",
      "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
      "CLOUDINARY_API_KEY",
      "CLOUDINARY_API_SECRET",
    ]
    
    checks.environment = {
      status: "configured",
      required_vars_set: requiredEnvVars.filter(v => process.env[v]).length,
      total_required: requiredEnvVars.length,
      all_set: requiredEnvVars.every(v => process.env[v]),
    }

    if (!checks.environment.all_set) {
      return NextResponse.json(
        {
          status: "unhealthy",
          timestamp: new Date().toISOString(),
          message: "Missing required environment variables",
          checks,
        },
        { status: 503 }
      )
    }

    // 2. Check MongoDB Connection
    try {
      await connectDB()
      checks.database = {
        status: "connected",
        type: "MongoDB Atlas",
        database: "digital_certificate_repository",
      }
    } catch (error) {
      checks.database = {
        status: "disconnected",
        error: error instanceof Error ? error.message : "Connection failed",
      }
    }

    // 3. Check Cloudinary Configuration
    try {
      cloudinary.config({
        cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      })
      
      // Validate by checking if config exists
      const config = cloudinary.config()
      checks.storage = {
        status: config.cloud_name ? "configured" : "missing",
        provider: "Cloudinary",
        cloud_name: config.cloud_name || "not set",
      }
    } catch (error) {
      checks.storage = {
        status: "error",
        error: error instanceof Error ? error.message : "Configuration error",
      }
    }

    // 4. Check Node Environment
    checks.environment_mode = {
      mode: process.env.NODE_ENV || "development",
      production: isProduction(),
    }

    // 5. Check API Status
    checks.api = {
      status: "operational",
      version: "1.0.0",
      uptime_ms: process.uptime() * 1000,
    }

    const responseTime = Date.now() - startTime

    // Determine overall health
    const isHealthy =
      checks.database.status === "connected" &&
      checks.storage.status === "configured" &&
      checks.environment.all_set

    return NextResponse.json(
      {
        status: isHealthy ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        response_time_ms: responseTime,
        version: "1.0.0",
        system: "Digital Certificate Repository System (DCRS)",
        checks,
        message: isHealthy
          ? "DCRS API is fully operational"
          : "DCRS API is running but some components are not available",
      },
      { status: isHealthy ? 200 : 503 }
    )
  } catch (error) {
    const responseTime = Date.now() - startTime
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        response_time_ms: responseTime,
        error: error instanceof Error ? error.message : "Unknown error",
        checks,
      },
      { status: 503 }
    )
  }
}
