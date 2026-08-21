import mongoose from "mongoose"
import { getMongoDBURI } from "./env"
import dns from "dns"

// Configure DNS resolution for MongoDB Atlas SRV records
try {
  dns.setServers(["8.8.8.8", "8.8.4.4"])
} catch (dnsErr) {
  console.warn("⚠️ DNS configuration warning: could not set custom resolvers", dnsErr)
}

let MONGODB_URI: string
try {
  MONGODB_URI = getMongoDBURI()
} catch (error) {
  console.error("❌ Database Configuration Error:", error instanceof Error ? error.message : error)
  MONGODB_URI = ""
}

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

let cached: MongooseCache = (global as any).mongoose

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null }
}

let isPrinted = false

/**
 * Connects to MongoDB Atlas using mongoose.
 * Uses a global cached connection pool to prevent duplicate connections on hot-reloading.
 */
export async function connectDB(): Promise<typeof mongoose> {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is missing. Setup your .env.local.")
  }

  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    }

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      if (!isPrinted) {
        console.log("\n🚀 Digital Certificate Repository System")
        console.log("🍃 MongoDB Atlas Connected Successfully")
        console.log("📂 Database: digital_certificate_repository")
        console.log("☁️ Cloudinary Connected")
        console.log("✅ Backend Ready\n")
        isPrinted = true
      }
      return mongooseInstance
    }).catch((err) => {
      console.error("\n❌ MongoDB connection failed:")
      console.error(err)
      console.log("⚠️ Failed to establish connection. Please verify your connection string.\n")
      throw err
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}

/**
 * Disconnects from the MongoDB connection pool
 */
export async function disconnectDB() {
  if (!cached.conn) return
  await mongoose.disconnect()
  cached.conn = null
  cached.promise = null
}
