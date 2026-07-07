/**
 * Cloudinary Integration Utilities
 * Handles file uploads, deletions, and management for DCRS
 */

import { v2 as cloudinary } from "cloudinary"

// Cloudinary folder structure
export const CLOUDINARY_FOLDERS = {
  certificates: "digital_certificate_repository/certificates",
  qrCodes: "digital_certificate_repository/qr_codes",
  profilePictures: "digital_certificate_repository/profile_pictures",
} as const

// Allowed file types
export const ALLOWED_MIME_TYPES = {
  pdf: "application/pdf",
  png: "image/png",
  jpeg: "image/jpeg",
  jpg: "image/jpg",
}

export const ALLOWED_EXTENSIONS = ["pdf", "png", "jpg", "jpeg"]

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  certificate: 10 * 1024 * 1024, // 10 MB
  profilePicture: 5 * 1024 * 1024, // 5 MB
  default: 10 * 1024 * 1024, // 10 MB
}

// Blocked extensions (security)
export const BLOCKED_EXTENSIONS = [
  "exe",
  "bat",
  "cmd",
  "com",
  "sh",
  "py",
  "js",
  "msi",
  "dll",
  "zip",
  "rar",
  "7z",
]

interface CloudinaryConfig {
  cloud_name: string
  api_key: string
  api_secret: string
}

/**
 * Initialize Cloudinary with environment variables
 */
export function initializeCloudinary(): void {
  const cloud_name = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const api_key = process.env.CLOUDINARY_API_KEY
  const api_secret = process.env.CLOUDINARY_API_SECRET

  if (!cloud_name || !api_key || !api_secret) {
    throw new Error(
      "Missing Cloudinary environment variables. Please set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET"
    )
  }

  cloudinary.config({
    cloud_name,
    api_key,
    api_secret,
  })
}

/**
 * Validate file before upload
 */
export function validateFile(
  file: File,
  maxSize: number = FILE_SIZE_LIMITS.certificate
): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024)
    return {
      valid: false,
      error: `File size exceeds maximum limit of ${maxSizeMB}MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`,
    }
  }

  // Check MIME type
  if (!Object.values(ALLOWED_MIME_TYPES).includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type: ${file.type}. Only PDF and images (PNG, JPG, JPEG) are allowed.`,
    }
  }

  // Check file extension
  const fileName = file.name.toLowerCase()
  const fileExtension = fileName.split(".").pop() || ""

  if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
    return {
      valid: false,
      error: `Invalid file extension: .${fileExtension}. Only PDF and image files are allowed.`,
    }
  }

  if (BLOCKED_EXTENSIONS.includes(fileExtension)) {
    return {
      valid: false,
      error: `File type .${fileExtension} is not permitted for security reasons.`,
    }
  }

  return { valid: true }
}

/**
 * Upload file to Cloudinary
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  fileName: string,
  folder: string,
  resourceType: "auto" | "image" | "raw" | "video" = "auto"
): Promise<{ secure_url: string; public_id: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        public_id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        quality: "auto",
        fetch_format: "auto",
      },
      (error, result) => {
        if (error) {
          reject(new Error(`Cloudinary upload failed: ${error.message}`))
        } else if (result) {
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
          })
        } else {
          reject(new Error("Cloudinary upload returned no result"))
        }
      }
    )

    uploadStream.end(buffer)
  })
}

/**
 * Delete file from Cloudinary
 */
export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  try {
    const result = await cloudinary.uploader.destroy(publicId)
    return result.result === "ok"
  } catch (error) {
    console.error(`Failed to delete Cloudinary file ${publicId}:`, error)
    return false
  }
}

/**
 * Delete multiple files from Cloudinary
 */
export async function deleteMultipleFromCloudinary(publicIds: string[]): Promise<{ deleted: number; failed: number }> {
  let deleted = 0
  let failed = 0

  for (const publicId of publicIds) {
    const success = await deleteFromCloudinary(publicId)
    if (success) {
      deleted++
    } else {
      failed++
    }
  }

  return { deleted, failed }
}

/**
 * Get file size from Cloudinary
 */
export async function getCloudinaryFileSize(publicId: string): Promise<number> {
  try {
    const resource = await cloudinary.api.resource(publicId)
    return resource.bytes || 0
  } catch (error) {
    console.error(`Failed to get file size for ${publicId}:`, error)
    return 0
  }
}

/**
 * Generate secure URL for file with expiration
 */
export function generateSecureUrl(
  publicId: string,
  expirySeconds: number = 3600 // 1 hour default
): string {
  const timestamp = Math.floor(Date.now() / 1000) + expirySeconds
  const signature = cloudinary.utils.compute_hex_hash(
    `public_id=${publicId}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`
  )

  return `${cloudinary.url(publicId, {
    secure: true,
    timestamp,
    signature,
  })}`
}

/**
 * List all files in a Cloudinary folder
 */
export async function listFilesInFolder(folder: string): Promise<any[]> {
  try {
    const result = await cloudinary.api.resources({
      type: "upload",
      prefix: folder,
      max_results: 500,
    })
    return result.resources || []
  } catch (error) {
    console.error(`Failed to list files in folder ${folder}:`, error)
    return []
  }
}

/**
 * Delete all files in a folder
 */
export async function deleteFolderContents(folder: string): Promise<number> {
  try {
    const files = await listFilesInFolder(folder)
    let deletedCount = 0

    for (const file of files) {
      const success = await deleteFromCloudinary(file.public_id)
      if (success) {
        deletedCount++
      }
    }

    // Delete the folder itself
    await cloudinary.api.delete_folder(folder)

    return deletedCount
  } catch (error) {
    console.error(`Failed to delete folder ${folder}:`, error)
    return 0
  }
}

/**
 * Get Cloudinary statistics
 */
export async function getStorageStats(): Promise<any> {
  try {
    const usage = await cloudinary.api.usage()
    return {
      storage_used_bytes: usage.storage || 0,
      storage_limit_bytes: usage.storage_limit || 0,
      credits_used: usage.credits_used || 0,
      credits_limit: usage.credits_limit || 0,
      transformations_used: usage.transformations_used || 0,
    }
  } catch (error) {
    console.error("Failed to get Cloudinary statistics:", error)
    return null
  }
}
