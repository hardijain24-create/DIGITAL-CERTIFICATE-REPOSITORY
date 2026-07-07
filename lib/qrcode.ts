/**
 * QR Code Generation and Verification Utilities
 * Handles QR code creation and verification data encoding
 */

import crypto from "crypto"

interface QRCodeData {
  certificateId: string
  hash: string
  issuer: string
  owner: string
  issuedAt: string
  verificationUrl: string
}

/**
 * Generate QR code data payload
 * Creates a structured string containing all verification information
 */
export function generateQRCodeData(
  certificateId: string,
  hash: string,
  issuer: string,
  owner: string,
  issuedAt: Date,
  verificationUrl: string
): string {
  const data: QRCodeData = {
    certificateId,
    hash,
    issuer,
    owner,
    issuedAt: issuedAt.toISOString(),
    verificationUrl,
  }

  return JSON.stringify(data)
}

/**
 * Parse QR code data payload
 * Extracts verification information from QR code
 */
export function parseQRCodeData(qrData: string): QRCodeData | null {
  try {
    return JSON.parse(qrData) as QRCodeData
  } catch {
    return null
  }
}

/**
 * Generate QR code URL using QR Server API
 * Returns a direct link to QR code image
 */
export function generateQRCodeURL(
  data: string,
  size: number = 300,
  errorCorrection: "L" | "M" | "Q" | "H" = "M"
): string {
  const encodedData = encodeURIComponent(data)
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&ecc=${errorCorrection}&data=${encodedData}`
}

/**
 * Generate verification token (unique per verification attempt)
 * Used to track verification events
 */
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

/**
 * Generate secure verification link
 * Creates a sharable link for certificate verification
 */
export function generateVerificationLink(
  certificateId: string,
  hash: string,
  baseUrl: string
): string {
  const params = new URLSearchParams({
    id: certificateId,
    hash,
  })

  return `${baseUrl}/verify?${params.toString()}`
}

/**
 * Validate QR code data structure
 */
export function validateQRCodeData(data: QRCodeData): boolean {
  return !!(
    data.certificateId &&
    data.hash &&
    data.issuer &&
    data.owner &&
    data.issuedAt &&
    data.verificationUrl
  )
}

/**
 * Generate checksum for certificate data
 * Used for additional verification layer
 */
export function generateCertificateChecksum(
  certificateId: string,
  hash: string,
  issuer: string,
  owner: string
): string {
  const data = `${certificateId}|${hash}|${issuer}|${owner}`
  return crypto.createHash("sha256").update(data).digest("hex")
}

/**
 * Verify certificate checksum
 */
export function verifyCertificateChecksum(
  certificateId: string,
  hash: string,
  issuer: string,
  owner: string,
  checksum: string
): boolean {
  const computed = generateCertificateChecksum(certificateId, hash, issuer, owner)
  return computed === checksum
}
