"use server"

import { connectDB } from "@/lib/db"
import { User, ActivityLog } from "@/lib/models"
import { verifyJWT } from "@/lib/jwt"
import { cookies } from "next/headers"

import bcrypt from "bcryptjs"
import { PasswordChangeSchema } from "@/lib/validations"

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key_dcrs_2026_premium_saas_generation"

/**
 * Server Action: Update authenticated user profile details
 */
export async function updateProfile(formData: { name: string; profilePicture?: string }) {
  try {
    await connectDB()
    const cookieStore = cookies()
    const token = (await cookieStore).get("authToken")?.value

    if (!token) {
      return { success: false, error: "Unauthorized: Please log in." }
    }

    const payload = await verifyJWT(token, JWT_SECRET)
    if (!payload) {
      return { success: false, error: "Unauthorized: Invalid session." }
    }

    const user = await User.findById(payload.userId)
    if (!user) {
      return { success: false, error: "User not found." }
    }

    user.name = formData.name
    if (formData.profilePicture !== undefined) {
      user.profilePicture = formData.profilePicture
    }

    await user.save()

    // Log audit activity
    await ActivityLog.create({
      userId: user._id,
      action: "user_login", // Fallback standard action type
      description: `User updated personal profile details: ${user.name}`,
    })

    return {
      success: true,
      message: "Profile updated successfully",
      data: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
      },
    }
  } catch (error) {
    console.error("Profile update action error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Internal Server Error",
    }
  }
}

/**
 * Server Action: Change password securely
 */
export async function changePassword(formData: any) {
  try {
    await connectDB()
    const cookieStore = cookies()
    const token = (await cookieStore).get("authToken")?.value

    if (!token) {
      return { success: false, error: "Unauthorized: Please log in." }
    }

    const payload = await verifyJWT(token, JWT_SECRET)
    if (!payload) {
      return { success: false, error: "Unauthorized: Invalid session." }
    }

    // Validation
    const validation = PasswordChangeSchema.safeParse(formData)
    if (!validation.success) {
      return {
        success: false,
        error: "Validation failed.",
        fieldErrors: validation.error.flatten().fieldErrors,
      }
    }

    const { currentPassword, newPassword } = validation.data
    const user = await User.findById(payload.userId)
    if (!user) {
      return { success: false, error: "User not found." }
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password || "")
    if (!isPasswordValid) {
      return { success: false, error: "Current password is incorrect." }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    user.password = hashedPassword
    await user.save()

    // Log audit activity
    await ActivityLog.create({
      userId: user._id,
      action: "user_login",
      description: `User changed security password: ${user.email}`,
    })

    return {
      success: true,
      message: "Password changed successfully",
    }
  } catch (error) {
    console.error("Change password action error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Internal Server Error",
    }
  }
}
