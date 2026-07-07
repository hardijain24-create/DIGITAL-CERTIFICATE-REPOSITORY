import { z } from "zod"

// User registration validation
export const RegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long").max(100),
  email: z.string().email("Invalid email address format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/\d/, "Password must contain at least one number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character"),
  role: z.enum(["user", "institution", "admin"]),
})

// User login validation
export const LoginSchema = z.object({
  email: z.string().email("Invalid email address format"),
  password: z.string().min(1, "Password is required"),
})

// Certificate metadata upload validation
export const UploadSchema = z.object({
  certificateName: z.string().min(2, "Certificate name must be at least 2 characters long").max(200),
  issuer: z.string().min(2, "Issuer name must be at least 2 characters long").max(200),
  ownerName: z.string().min(2, "Owner name must be at least 2 characters long").max(100),
  ownerEmail: z.string().email("Invalid owner email format").optional().or(z.literal("")),
  issuerWebsite: z.string().url("Invalid website URL format").optional().or(z.literal("")),
  category: z.enum([
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
  ]),
  description: z.string().max(1000).optional().or(z.literal("")),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Issue date must be in YYYY-MM-DD format"),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expiry date must be in YYYY-MM-DD format").optional().or(z.literal("")),
})

// Verification query validation
export const VerificationSchema = z.object({
  certificateId: z.string().optional().or(z.literal("")),
  hash: z.string().length(64, "SHA-256 hash must be exactly 64 hex characters").optional().or(z.literal("")),
  qrData: z.string().optional().or(z.literal("")),
}).refine(data => data.certificateId || data.hash || data.qrData, {
  message: "Either Certificate ID, Hash, or QR data must be provided for verification",
  path: ["certificateId"]
})

// Certificate details update validation
export const CertificateUpdateSchema = z.object({
  certificateName: z.string().min(2, "Name must be at least 2. characters long").optional(),
  category: z.enum([
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
  ]).optional(),
  description: z.string().max(1000).optional(),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expiry date must be in YYYY-MM-DD format").optional().or(z.literal("")),
})

// User profile update validation
export const ProfileUpdateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long").max(100).optional(),
  email: z.string().email("Invalid email address format").optional(),
  profilePicture: z.string().url("Invalid URL format").optional(),
})

// Password change validation
export const PasswordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters long")
    .regex(/[a-z]/, "New password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "New password must contain at least one uppercase letter")
    .regex(/\d/, "New password must contain at least one number")
    .regex(/[^a-zA-Z0-9]/, "New password must contain at least one special character"),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})
