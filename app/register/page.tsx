"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Building,
  UserCheck,
  UserPlus
} from "lucide-react"
import { toast } from "sonner"
import { validatePasswordStrength } from "@/lib/utils"

export default function RegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "user" as "user" | "institution" | "admin",
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Compute password strength properties
  const pwdStrengthResult = validatePasswordStrength(formData.password)
  const strengthScore = pwdStrengthResult.score
  const strengthText = pwdStrengthResult.strength

  // Inline inputs validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = "Full Name is required"
    }
    
    if (!formData.email.trim()) {
      newErrors.email = "Email address is required"
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        newErrors.email = "Invalid email format"
      }
    }
    
    if (!formData.password) {
      newErrors.password = "Password is required"
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long"
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clear previous errors
    setErrors({})

    // 1. Client-side inline validations
    if (!validateForm()) {
      toast.error("Please fix the validation errors before submitting.")
      return
    }

    setIsLoading(true)
    console.log("Submitting registration...")

    try {
      // 2. POST registration request using fetch
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        }),
      })

      console.log("Response received...")
      const data = await response.json()

      if (response.ok) {
        console.log("Registration successful")
        toast.success("🎉 Welcome to DCRS! Registration successful.")
        
        // Store JWT token and user metadata in client storage
        if (data.data) {
          localStorage.setItem("user", JSON.stringify(data.data.user))
          localStorage.setItem("token", data.data.token)
        }

        // Reset Form
        setFormData({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
          role: "user",
        })

        // Redirect to Dashboard
        setTimeout(() => {
          router.push("/dashboard")
        }, 1200)
      } else {
        console.log("Registration failed")
        
        // Handle database or Zod schema errors returned from backend
        if (data.error && typeof data.error === "object") {
          const fieldErrors: Record<string, string> = {}
          Object.entries(data.error).forEach(([key, val]) => {
            if (Array.isArray(val)) {
              fieldErrors[key] = val[0]
            }
          })
          setErrors(fieldErrors)
        }
        
        toast.error(data.message || "Registration failed. Email might already exist.")
      }
    } catch (err) {
      console.error("Network error during registration:", err)
      toast.error("Network connection error. Please verify the backend is running.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row items-stretch justify-center">
      {/* Visual illustration panel (Desktop only) */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-primary via-secondary to-accent relative overflow-hidden items-center justify-center p-12 text-white">
        <div className="absolute inset-0 bg-grid-white/[0.05]" />
        
        {/* Animated Background blobs */}
        <div className="absolute w-[500px] h-[500px] bg-sky-300/20 rounded-full blur-[100px] -top-24 -left-24 animate-pulse" />
        <div className="absolute w-[400px] h-[400px] bg-indigo-500/20 rounded-full blur-[80px] -bottom-24 -right-24" />

        <div className="relative max-w-lg space-y-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <ShieldCheck className="w-20 h-20 mx-auto text-sky-200 animate-bounce" />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-4xl font-extrabold tracking-tight"
          >
            DCRS Repository
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-lg text-white/90"
          >
            Protect and share academic credentials, employment certificates, and professional certifications with SHA-256 military-grade hashing and QR validation code structures.
          </motion.p>
        </div>
      </div>

      {/* Registration Form container */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 md:px-12 bg-transparent relative">
        <div className="w-full max-w-lg glass-premium rounded-3xl p-8 border border-border">
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-3">
              <ShieldCheck className="w-8 h-8 text-primary" />
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">DCRS</span>
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
            <p className="text-sm text-muted-foreground mt-1">Get started with your digital certificate vault</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
                <input
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full bg-white/80 border rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors ${
                    errors.name ? "border-danger focus:border-danger" : "border-border/80"
                  }`}
                  disabled={isLoading}
                />
              </div>
              {errors.name && (
                <p className="text-xs text-danger mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.name}
                </p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full bg-white/80 border rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors ${
                    errors.email ? "border-danger focus:border-danger" : "border-border/80"
                  }`}
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-danger mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full bg-white/80 border rounded-xl pl-12 pr-12 py-3 text-sm focus:outline-none focus:border-primary transition-colors ${
                    errors.password ? "border-danger focus:border-danger" : "border-border/80"
                  }`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              {/* Password strength meter */}
              {formData.password && (
                <div className="mt-2.5 space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-muted-foreground uppercase tracking-wider">Strength:</span>
                    <span className={`uppercase tracking-wider ${
                      strengthText === "strong" ? "text-success" : strengthText === "medium" ? "text-warning" : "text-danger"
                    }`}>{strengthText}</span>
                  </div>
                  <div className="flex gap-1.5">
                    {[1, 2, 3].map((val) => (
                      <div
                        key={val}
                        className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                          strengthScore >= val * 2
                            ? strengthText === "strong"
                              ? "bg-success"
                              : "bg-warning"
                            : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {errors.password && (
                <p className="text-xs text-danger mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.password}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wider">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className={`w-full bg-white/80 border rounded-xl pl-12 pr-12 py-3 text-sm focus:outline-none focus:border-primary transition-colors ${
                    errors.confirmPassword ? "border-danger focus:border-danger" : "border-border/80"
                  }`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
                >
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-danger mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Role Cards Selector */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-2.5 uppercase tracking-wider">Registration Role</label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { value: "user" as const, label: "User", desc: "Student/Owner", icon: UserPlus },
                  { value: "institution" as const, label: "Institution", desc: "Issuer/Verifier", icon: Building },
                  { value: "admin" as const, label: "Admin", desc: "Auditor/Owner", icon: UserCheck },
                ].map((roleOption) => {
                  const Icon = roleOption.icon
                  const isSelected = formData.role === roleOption.value
                  return (
                    <button
                      key={roleOption.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, role: roleOption.value })}
                      className={`p-3 rounded-2xl flex flex-col items-center text-center gap-1 border transition-all cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border/80 bg-white/40 hover:bg-white/80"
                      }`}
                      disabled={isLoading}
                    >
                      <Icon className={`w-5 h-5 ${isSelected ? "text-primary scale-110" : "text-muted-foreground/80"}`} />
                      <span className={`text-xs font-bold ${isSelected ? "text-primary" : "text-foreground"}`}>{roleOption.label}</span>
                      <span className="text-[8px] text-muted-foreground font-semibold leading-none">{roleOption.desc}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-secondary text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-primary/10 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-6"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>Create Account</span>
              )}
            </button>
          </form>

          {/* Sign In Redirect Link */}
          <p className="text-center text-sm text-muted-foreground mt-6 font-semibold">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-bold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
