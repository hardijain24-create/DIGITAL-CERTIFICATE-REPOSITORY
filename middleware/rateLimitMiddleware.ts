/**
 * Rate limiting middleware for API routes
 */

import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit, getRateLimitRemaining, extractIPAddress, logSecurityEvent } from "@/lib/security"

export async function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  maxRequests = 100
) {
  return async (request: NextRequest) => {
    // Extract identifier (IP address or user ID)
    const identifier = extractIPAddress(request)

    // Check rate limit
    if (!checkRateLimit(identifier, maxRequests)) {
      logSecurityEvent({
        type: "rate_limit_exceeded",
        identifier,
        details: { endpoint: request.nextUrl.pathname },
      })

      const response = NextResponse.json(
        {
          success: false,
          message: "Rate limit exceeded. Please try again later.",
          retryAfter: 900, // 15 minutes
        },
        { status: 429 }
      )

      response.headers.set("Retry-After", "900")
      response.headers.set("X-RateLimit-Remaining", "0")
      return response
    }

    // Add rate limit headers to response
    const response = await handler(request)
    const remaining = getRateLimitRemaining(identifier)
    response.headers.set("X-RateLimit-Remaining", remaining.toString())
    response.headers.set("X-RateLimit-Limit", maxRequests.toString())

    return response
  }
}
