/**
 * Security utilities for DCRS application
 * Includes rate limiting, input validation, sanitization, and CORS handling
 */

import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 100

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

/**
 * Check if request exceeds rate limit
 */
export function checkRateLimit(identifier: string, maxRequests = RATE_LIMIT_MAX_REQUESTS): boolean {
  const now = Date.now()
  const record = rateLimitStore.get(identifier)

  if (!record || now > record.resetTime) {
    // Create new record
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    })
    return true
  }

  if (record.count >= maxRequests) {
    return false
  }

  record.count++
  return true
}

/**
 * Get rate limit remaining for identifier
 */
export function getRateLimitRemaining(identifier: string): number {
  const record = rateLimitStore.get(identifier)
  if (!record || Date.now() > record.resetTime) {
    return RATE_LIMIT_MAX_REQUESTS
  }
  return Math.max(0, RATE_LIMIT_MAX_REQUESTS - record.count)
}

/**
 * Clean expired rate limit entries (call periodically)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  if (!input) return ""
  return input
    .replace(/[<>]/g, "") // Remove angle brackets
    .replace(/["']/g, "") // Remove quotes
    .trim()
    .substring(0, 1000) // Limit length
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 255
}

/**
 * Validate URL format
 */
export function isValidURL(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length = 32): string {
  return crypto.randomBytes(length).toString("hex")
}

/**
 * Create CORS headers
 */
export function createCORSHeaders(origin?: string): Record<string, string> {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
    "http://localhost:3000",
    "http://localhost:3001",
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "",
  ].filter(Boolean)

  const corsOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0]

  return {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  }
}

/**
 * Create security headers
 */
export function createSecurityHeaders(): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https:",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  }
}

/**
 * Apply security middleware to response
 */
export function applySecurityHeaders(response: NextResponse, origin?: string): NextResponse {
  const corsHeaders = createCORSHeaders(origin)
  const securityHeaders = createSecurityHeaders()

  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  return response
}

/**
 * Hash string using SHA-256
 */
export async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
}

/**
 * Verify HMAC signature
 */
export async function verifyHMAC(data: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"])
  const signatureBuffer = Buffer.from(signature, "hex")
  const dataBuffer = encoder.encode(data)

  return crypto.subtle.verify("HMAC", key, signatureBuffer, dataBuffer)
}

/**
 * Extract IP address from request
 */
export function extractIPAddress(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }

  const clientIP = request.headers.get("x-client-ip")
  if (clientIP) {
    return clientIP
  }

  return "unknown"
}

/**
 * Log security event
 */
export function logSecurityEvent(event: {
  type: "rate_limit_exceeded" | "invalid_token" | "unauthorized_access" | "suspicious_activity"
  identifier: string
  details?: Record<string, any>
}): void {
  console.warn(`[SECURITY] ${event.type} for ${event.identifier}`, event.details || "")
}
