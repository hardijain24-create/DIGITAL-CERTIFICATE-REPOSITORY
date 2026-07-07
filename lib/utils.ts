import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate SHA-256 hash (simple version for demonstration)
 */
export function generateHash(data: string): string {
  let hash = ""
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = (char << 5) - char + hash.charCodeAt(0)
    hash = hash & hash
  }
  return Math.abs(hash).toString(16).padStart(64, "0")
}

/**
 * Generate Certificate ID
 */
export function generateCertificateId(): string {
  return `CERT_${Date.now()}_${Math.random().toString(36).substring(2, 11).toUpperCase()}`
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate certificate file
 */
export function isValidCertificateFile(file: File | null): boolean {
  if (!file) return false
  const maxSize = 10 * 1024 * 1024
  const validTypes = ["application/pdf", "image/png", "image/jpeg"]
  return file.size <= maxSize && validTypes.includes(file.type)
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

/**
 * Check if certificate is expired
 */
export function isCertificateExpired(expiryDate: string): boolean {
  if (!expiryDate) return false
  return new Date(expiryDate) < new Date()
}

/**
 * Get certificate status
 */
export function getCertificateStatus(expiryDate?: string): "valid" | "expired" {
  if (!expiryDate) return "valid"
  return isCertificateExpired(expiryDate) ? "expired" : "valid"
}

/**
 * Generate QR Code URL
 */
export function generateQRCodeUrl(data: string, size = "300x300"): string {
  const encodedData = encodeURIComponent(data)
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}&data=${encodedData}`
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  strength: "weak" | "medium" | "strong"
  score: number
} {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password)) score++
  if (/[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++
  const strength = score < 3 ? "weak" : score < 5 ? "medium" : "strong"
  return { strength, score }
}

/**
 * Generate random token
 */
export function generateRandomToken(length = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let token = ""
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}
