"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  User,
  Mail,
  Shield,
  Key,
  Database,
  Eye,
  Download,
  FileText,
  Save,
  CheckCircle,
  Building,
  UserCheck
} from "lucide-react"
import { toast } from "sonner"
import DashboardLayout from "@/components/DashboardLayout"
import { updateProfile } from "@/app/actions/profile"

export default function ProfilePage() {
  const [user, setUser] = useState<{ name: string; email: string; role: string; profilePicture?: string } | null>(null)
  const [nameInput, setNameInput] = useState("")
  const [stats, setStats] = useState<any>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch profile settings and statistics
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setIsLoading(true)
        const stored = localStorage.getItem("user")
        if (stored) {
          const parsed = JSON.parse(stored)
          setUser(parsed)
          setNameInput(parsed.name)
        }

        // Fetch stats for the user
        const response = await fetch("/api/dashboard/stats")
        const data = await response.json()
        if (data.success) {
          setStats(data.data)
        }
      } catch (err) {
        console.error("Error fetching profile details:", err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchProfileData()
  }, [])

  // Handle profile update submit
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nameInput.trim()) {
      toast.error("Full name cannot be empty.")
      return
    }

    try {
      setIsUpdating(true)
      const res = await updateProfile({ name: nameInput })

      if (res.success && res.data) {
        toast.success(res.message || "Profile updated successfully.")
        
        // Update user in localStorage
        const updatedUser = { ...user, name: res.data.name, profilePicture: res.data.profilePicture } as any
        setUser(updatedUser)
        localStorage.setItem("user", JSON.stringify(updatedUser))
      } else {
        toast.error(res.error || "Failed to update profile.")
      }
    } catch (err) {
      toast.error("Error saving profile details.")
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-left">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Account Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your account profile settings, security properties, and review usage metrics.</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 glass rounded-3xl h-80 shimmer" />
            <div className="glass rounded-3xl h-80 shimmer" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {/* Left: Settings Forms */}
            <div className="md:col-span-2 space-y-6">
              
              {/* Profile Details form */}
              <div className="glass-premium rounded-3xl p-6 border border-border/80 space-y-4">
                <h3 className="text-base font-bold text-foreground pb-2 border-b border-border/80 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  <span>Personal Details</span>
                </h3>

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  {/* Email (Readonly) */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wider">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground/50" />
                      <input
                        type="email"
                        value={user?.email || ""}
                        className="w-full bg-slate-100/50 border border-border/80 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none text-muted-foreground"
                        disabled
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">Contact your system administrator to change registered email addresses.</p>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wider">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground/60" />
                      <input
                        type="text"
                        placeholder="Your full name..."
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        className="w-full bg-white/60 border border-border/80 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary"
                        required
                        disabled={isUpdating}
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="bg-primary hover:bg-secondary text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-primary/10 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isUpdating ? "Saving changes..." : "Save Profile Details"}</span>
                  </button>
                </form>
              </div>

              {/* Security info */}
              <div className="glass-premium rounded-3xl p-6 border border-border/80 space-y-4">
                <h3 className="text-base font-bold text-foreground pb-2 border-b border-border/80 flex items-center gap-2">
                  <Key className="w-5 h-5 text-primary" />
                  <span>Security Information</span>
                </h3>

                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-foreground">Password Details</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Secure password configured with bcryptjs encryption.</p>
                    </div>
                    <button
                      onClick={() => toast.info("Password updates should be requested via system admin.")}
                      className="border border-border hover:bg-muted text-foreground px-4 py-1.5 rounded-xl font-bold text-[10px] cursor-pointer"
                    >
                      Update Password
                    </button>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-3 border-t border-border/40">
                    <div>
                      <p className="font-bold text-foreground">Session Status</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Secure HttpOnly cookie session active.</p>
                    </div>
                    <span className="bg-success/15 text-success font-black px-2.5 py-1 rounded-full text-[9px] uppercase tracking-wider">
                      Active
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right: User statistics summary */}
            <div className="space-y-6">
              
              {/* Profile Avatar Card */}
              <div className="glass-premium rounded-3xl p-6 border border-border/80 text-center space-y-4">
                <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-extrabold text-3xl mx-auto shadow-lg shadow-primary/20">
                  {user?.name.charAt(0) || "U"}
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground leading-none">{user?.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-none">{user?.email}</p>
                </div>
                
                <span className="inline-block bg-primary/10 text-primary font-black px-3 py-1 rounded-full text-[10px] border border-primary/20 uppercase tracking-wider">
                  Role: {user?.role}
                </span>
              </div>

              {/* Stats Card */}
              <div className="glass-premium rounded-3xl p-6 border border-border/80 space-y-4">
                <h3 className="text-sm font-bold text-foreground pb-2 border-b border-border/80 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-primary" />
                  <span>My Repository Statistics</span>
                </h3>

                <div className="space-y-3.5 text-xs font-semibold">
                  {/* Total uploads */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="w-4 h-4 text-primary" />
                      <span>Total Uploads</span>
                    </div>
                    <span className="text-sm font-black">{stats?.totalCertificates || 0}</span>
                  </div>

                  {/* Total views */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Eye className="w-4 h-4 text-primary" />
                      <span>Document Views</span>
                    </div>
                    <span className="text-sm font-black">{stats?.totalViews || 0}</span>
                  </div>

                  {/* Total downloads */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Download className="w-4 h-4 text-primary" />
                      <span>Downloads</span>
                    </div>
                    <span className="text-sm font-black">{stats?.totalDownloads || 0}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
