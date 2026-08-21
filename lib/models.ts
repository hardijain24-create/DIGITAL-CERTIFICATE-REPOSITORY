import mongoose, { Schema, Document, Model } from "mongoose"

// User Document Interface
export interface IUser extends Document {
  name: string
  email: string
  password?: string
  role: "user" | "institution" | "admin"
  profilePicture?: string
  createdAt: Date
  updatedAt: Date
}

// User Schema
const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["user", "institution", "admin"],
      default: "user",
      required: true,
    },
    profilePicture: { type: String, default: "" },
  },
  { timestamps: true }
)

// Certificate Document Interface
export interface ICertificate extends Document {
  certificateId: string
  certificateName: string
  ownerId: mongoose.Types.ObjectId
  ownerName: string
  ownerEmail?: string
  issuer: string
  issuerWebsite?: string
  category:
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
  description?: string
  fileUrl: string
  publicId: string
  fileType: "pdf" | "image"
  fileSize: number
  qrCode: string
  hash: string
  issueDate?: Date
  expiryDate?: Date
  verificationStatus: "verified" | "pending" | "revoked" | "expired"
  uploadedBy: mongoose.Types.ObjectId
  isShared: boolean
  sharedWith: string[] // List of emails shared with
  views: number
  downloads: number
  sharesCount: number
  verificationCount: number
  isDeleted: boolean
  deletedAt?: Date
  deletedBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

// Certificate Schema
const CertificateSchema = new Schema<ICertificate>(
  {
    certificateId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    certificateName: { type: String, required: true, trim: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ownerName: { type: String, required: true, trim: true },
    ownerEmail: { type: String, lowercase: true, trim: true },
    issuer: { type: String, required: true, trim: true },
    issuerWebsite: { type: String, default: "" },
    category: {
      type: String,
      enum: [
        "academic",
        "professional",
        "internship",
        "training",
        "government",
        "identity",
        "license",
        "achievement",
        "workshop",
        "other",
      ],
      required: true,
    },
    description: { type: String, default: "" },
    fileUrl: { type: String, required: true },
    publicId: { type: String, required: true },
    fileType: { type: String, enum: ["pdf", "image"], default: "pdf", required: true },
    fileSize: { type: Number, required: true },
    qrCode: { type: String, required: true },
    hash: { type: String, required: true, unique: true, index: true },
    issueDate: { type: Date },
    expiryDate: { type: Date },
    verificationStatus: {
      type: String,
      enum: ["verified", "pending", "revoked", "expired"],
      default: "pending",
      required: true,
    },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isShared: { type: Boolean, default: false },
    sharedWith: [{ type: String, lowercase: true, trim: true }],
    views: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },
    verificationCount: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
)

// Share Document Interface
export interface IShare extends Document {
  certificateId: mongoose.Types.ObjectId
  ownerId: mongoose.Types.ObjectId
  sharedWith: string // email address
  permission: "view" | "download"
  expiryDate?: Date
  createdAt: Date
  updatedAt: Date
}

// Share Schema
const ShareSchema = new Schema<IShare>(
  {
    certificateId: { type: Schema.Types.ObjectId, ref: "Certificate", required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sharedWith: { type: String, required: true, lowercase: true, trim: true, index: true },
    permission: { type: String, enum: ["view", "download"], default: "view", required: true },
    expiryDate: { type: Date },
  },
  { timestamps: true }
)

// Verification Log Document Interface
export interface IVerificationLog extends Document {
  certificateId: mongoose.Types.ObjectId
  verifiedBy?: mongoose.Types.ObjectId
  verifiedByName: string
  verificationMethod: "qr_code" | "certificate_id" | "sha256_hash"
  status: "verified" | "pending" | "revoked" | "expired" | "tampered" | "not_found"
  ipAddress?: string
  userAgent?: string
  timestamp: Date
}

// Verification Log Schema
const VerificationLogSchema = new Schema<IVerificationLog>({
  certificateId: { type: Schema.Types.ObjectId, ref: "Certificate", required: true, index: true },
  verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
  verifiedByName: { type: String, default: "Guest" },
  verificationMethod: {
    type: String,
    enum: ["qr_code", "certificate_id", "sha256_hash"],
    required: true,
  },
  status: {
    type: String,
    enum: ["verified", "pending", "revoked", "expired", "tampered", "not_found"],
    required: true,
  },
  ipAddress: { type: String, default: "" },
  userAgent: { type: String, default: "" },
  timestamp: { type: Date, default: Date.now },
})

// Share Log Document Interface (for tracking share events)
export interface IShareLog extends Document {
  certificateId: mongoose.Types.ObjectId
  sharedBy: mongoose.Types.ObjectId
  sharedByEmail: string
  sharedWith: string | null // email or null for public shares
  permission: "view" | "download" | "share"
  shareToken: string
  shareLink: string
  isPublic: boolean
  expiryDate?: Date
  accessCount: number
  createdAt: Date
  updatedAt: Date
}

// Activity Log Document Interface
export interface IActivityLog extends Document {
  userId: mongoose.Types.ObjectId
  action:
    | "user_login"
    | "user_logout"
    | "user_register"
    | "certificate_uploaded"
    | "certificate_downloaded"
    | "certificate_shared"
    | "certificate_verified"
    | "certificate_deleted"
  description: string
  certificateId?: mongoose.Types.ObjectId
  ipAddress?: string
  timestamp: Date
}

// Share Log Schema
const ShareLogSchema = new Schema<IShareLog>(
  {
    certificateId: { type: Schema.Types.ObjectId, ref: "Certificate", required: true, index: true },
    sharedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sharedByEmail: { type: String, required: true, lowercase: true, trim: true },
    sharedWith: { type: String, lowercase: true, trim: true, index: true, default: null },
    permission: {
      type: String,
      enum: ["view", "download", "share"],
      default: "view",
      required: true,
    },
    shareToken: { type: String, required: true, unique: true, index: true },
    shareLink: { type: String, required: true },
    isPublic: { type: Boolean, default: false },
    expiryDate: { type: Date },
    accessCount: { type: Number, default: 0 },
  },
  { timestamps: true }
)

// Activity Log Schema
const ActivityLogSchema = new Schema<IActivityLog>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  action: {
    type: String,
    enum: [
      "user_login",
      "user_logout",
      "user_register",
      "certificate_uploaded",
      "certificate_downloaded",
      "certificate_shared",
      "certificate_verified",
      "certificate_deleted",
    ],
    required: true,
  },
  description: { type: String, required: true },
  certificateId: { type: Schema.Types.ObjectId, ref: "Certificate" },
  ipAddress: { type: String, default: "" },
  timestamp: { type: Date, default: Date.now },
})

// Export Models
export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema)
export const Certificate: Model<ICertificate> =
  mongoose.models.Certificate || mongoose.model<ICertificate>("Certificate", CertificateSchema)
export const Share: Model<IShare> = mongoose.models.Share || mongoose.model<IShare>("Share", ShareSchema)
export const ShareLog: Model<IShareLog> =
  mongoose.models.ShareLog || mongoose.model<IShareLog>("ShareLog", ShareLogSchema)
export const VerificationLog: Model<IVerificationLog> =
  mongoose.models.VerificationLog || mongoose.model<IVerificationLog>("VerificationLog", VerificationLogSchema)
export const ActivityLog: Model<IActivityLog> =
  mongoose.models.ActivityLog || mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema)
