"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Mail, Lock, Eye, EyeOff, ShieldCheck, AlertCircle } from "lucide-react"
import { toast } from "sonner"

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Form input validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        newErrors.email = "Invalid email format"
      }
    }

    if (!formData.password) {
      newErrors.password = "Password is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    if (!validateForm()) {
      toast.error("Please fill in all required fields.")
      return
    }

    setIsLoading(true)
    console.log("Submitting login...")

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        console.log("Login successful")
        toast.success("Welcome back to DCRS! Redirecting...")
        
        // Save user info in localStorage for client state
        if (data.data) {
          localStorage.setItem("user", JSON.stringify(data.data.user))
          localStorage.setItem("token", data.data.token)
        }

        setTimeout(() => {
          router.push("/dashboard")
        }, 800)
      } else {
        console.log("Login failed")
        if (data.error && typeof data.error === "object") {
          const fieldErrors: Record<string, string> = {}
          Object.entries(data.error).forEach(([key, val]) => {
            if (Array.isArray(val)) {
              fieldErrors[key] = val[0]
            }
          })
          setErrors(fieldErrors)
        }
        toast.error(data.message || "Invalid email or password.")
      }
    } catch (err) {
      console.error("Network error during login:", err)
      toast.error("Connection failure. Check your server settings.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row items-stretch justify-center">
      {/* Sidebar Visual Panel (Desktop only) */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-primary via-secondary to-accent relative overflow-hidden items-center justify-center p-12 text-white">
        <div className="absolute inset-0 bg-grid-white/[0.05]" />
        
        {/* Floating animated blobs */}
        <div className="absolute w-[500px] h-[500px] bg-sky-300/20 rounded-full blur-[100px] -top-24 -left-24 animate-pulse" />
        <div className="absolute w-[400px] h-[400px] bg-indigo-500/20 rounded-full blur-[80px] -bottom-24 -right-24" />

        <div className="relative max-w-lg space-y-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <ShieldCheck className="w-20 h-20 mx-auto text-sky-200" />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-4xl font-extrabold tracking-tight"
          >
            Secure Certificate Vault
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-lg text-white/90"
          >
            Access your verified certificates, view sharing analytics, verify third-party credentials, and control access permissions from a unified security dashboard.
          </motion.p>
        </div>
      </div>

      {/* Login Form Container */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 md:px-12 bg-transparent relative">
        <div className="w-full max-w-md glass-premium rounded-3xl p-8 border border-border">
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-3">
              <ShieldCheck className="w-8 h-8 text-primary" />
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">DCRS</span>
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Welcome Back</h1>
            <p className="text-sm text-muted-foreground mt-1">Please sign in to access your certificates</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
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
              {errors.password && (
                <p className="text-xs text-danger mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.password}
                </p>
              )}
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
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          {/* Registration Redirect Link */}
          <p className="text-center text-sm text-muted-foreground mt-6 font-semibold">
            Don&apos;t have an account yet?{" "}
            <Link href="/register" className="text-primary font-bold hover:underline">
              Create One
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
