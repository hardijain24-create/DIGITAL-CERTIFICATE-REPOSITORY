/**
 * DCRS Production-Ready Database Types & Schemas
 * Enterprise-Grade Digital Certificate Repository System
 */

/* ============= USER ROLES ============= */
export type UserRole = "user" | "institution" | "admin"

/* ============= CERTIFICATE CATEGORIES ============= */
export type CertificateCategory =
  | "academic"
  | "professional"
  | "internship"
  | "training"
  | "government"
  | "identity"
  | "license"
  | "achievement"
  | "workshop"
  | "other"

/* ============= VERIFICATION STATUS ============= */
export type VerificationStatus = "verified" | "pending" | "revoked" | "expired"

/* ============= PERMISSION TYPES ============= */
export type SharePermission = "view" | "download"

/* ============= VERIFICATION METHODS ============= */
export type VerificationMethod = "qr_code" | "certificate_id" | "sha256_hash"

/* ============= USER DOCUMENT ============= */
export interface User {
  _id?: string
  id?: string
  name: string
  email: string
  password?: string // Hashed with bcrypt
  role: UserRole
  profilePicture?: string
  createdAt: Date
  updatedAt: Date
}

/* ============= CERTIFICATE DOCUMENT ============= */
export interface Certificate {
  _id?: string
  id?: string
  certificateId: string // Unique identifier
  certificateName: string
  ownerId: string
  ownerName: string
  ownerEmail?: string

  issuer: string
  issuerWebsite?: string

  category: CertificateCategory
  description?: string

  issueDate: string
  expiryDate?: string

  fileUrl: string // Cloudinary URL
  publicId: string // Cloudinary public ID
  fileType: "pdf" | "image"
  fileSize: number

  qrCode: string // QR code image URL
  hash: string // SHA-256 hash

  verificationStatus: VerificationStatus
  uploadedBy: string // User ID who uploaded

  isShared: boolean
  sharedWith?: string[] // User IDs

  analytics?: {
    downloads: number
    views: number
    shares: number
    verificationCount: number
  }

  createdAt: Date
  updatedAt: Date
}

/* ============= SHARE DOCUMENT ============= */
export interface Share {
  _id?: string
  certificateId: string
  ownerId: string
  sharedWith: string // Single user email or ID
  permission: SharePermission
  expiryDate?: Date
  createdAt: Date
  updatedAt: Date
}

/* ============= VERIFICATION LOG ============= */
export interface VerificationLog {
  _id?: string
  certificateId: string
  verifiedBy: string // User ID
  verificationMethod: VerificationMethod
  status: VerificationStatus
  ipAddress?: string
  userAgent?: string
  timestamp: Date
}

/* ============= ACTIVITY LOG ============= */
export interface ActivityLog {
  _id?: string
  userId: string
  action:
    | "user_login"
    | "user_logout"
    | "certificate_uploaded"
    | "certificate_downloaded"
    | "certificate_shared"
    | "certificate_verified"
    | "certificate_deleted"
    | "certificate_revoked"
  description: string
  certificateId?: string
  ipAddress?: string
  timestamp: Date
}

/* ============= DASHBOARD STATS ============= */
export interface DashboardStats {
  totalCertificates: number
  verifiedCertificates: number
  pendingCertificates: number
  sharedCertificates: number
  expiredCertificates: number
  totalDownloads: number
  totalViews: number
  storageUsed: string
  certificatesByCategory: Record<CertificateCategory, number>
  recentUploads: Certificate[]
}

/* ============= API RESPONSE TYPE ============= */
export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  error?: string | Record<string, any>
  timestamp: string
}

/* ============= AUTH TOKEN PAYLOAD ============= */
export interface TokenPayload {
  userId: string
  email: string
  role: UserRole
  iat?: number
  exp?: number
}

/* ============= FILE UPLOAD TYPE ============= */
export interface FileUpload {
  fieldname: string
  originalname: string
  encoding: string
  mimetype: string
  size: number
  buffer?: Buffer
  path?: string
}

/* ============= SEARCH FILTERS ============= */
export interface CertificateSearchFilters {
  category?: CertificateCategory
  issuer?: string
  status?: VerificationStatus
  owner?: string
  certificateName?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

/* ============= NOTIFICATION TYPE ============= */
export interface Notification {
  _id?: string
  userId: string
  type: "upload_success" | "verification_complete" | "certificate_shared" | "certificate_expired"
  title: string
  message: string
  read: boolean
  createdAt: Date
}
