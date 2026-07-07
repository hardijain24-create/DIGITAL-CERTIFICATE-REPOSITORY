/**
 * Environment Variable Validation and Loading
 * Ensures all required environment variables are set before the application starts
 */

const requiredEnvVars = [
  "MONGODB_URI",
  "JWT_SECRET",
  "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
]

const optionalEnvVars = [
  "NODE_ENV",
]

interface ValidatedEnv {
  MONGODB_URI: string
  JWT_SECRET: string
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: string
  CLOUDINARY_API_KEY: string
  CLOUDINARY_API_SECRET: string
  NODE_ENV: string
}

/**
 * Validates that all required environment variables are set
 * Called during application initialization
 */
export function validateEnvironment(): ValidatedEnv {
  const missing: string[] = []
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar)
    }
  }

  if (missing.length > 0) {
    const errorMessage = `
❌ Missing required environment variables:
${missing.map(v => `   - ${v}`).join("\n")}

Please add these variables to your .env.local or deployment environment.

Required Variables:
- MONGODB_URI: Your MongoDB Atlas connection string
- JWT_SECRET: A secure random string for JWT signing (min 32 characters)
- NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: Your Cloudinary cloud name
- CLOUDINARY_API_KEY: Your Cloudinary API key
- CLOUDINARY_API_SECRET: Your Cloudinary API secret

Example .env.local:
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/digital_certificate_repository
JWT_SECRET=$(openssl rand -base64 32)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
    `
    throw new Error(errorMessage)
  }

  return {
    MONGODB_URI: process.env.MONGODB_URI!,
    JWT_SECRET: process.env.JWT_SECRET!,
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY!,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET!,
    NODE_ENV: process.env.NODE_ENV || "development",
  }
}

/**
 * Get JWT secret from environment (throws if not set)
 */
export function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set. Please configure it in your environment.")
  }
  return secret
}

/**
 * Get MongoDB URI from environment (throws if not set)
 */
export function getMongoDBURI(): string {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not set. Please configure it in your environment.")
  }
  return uri
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production"
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development"
}
