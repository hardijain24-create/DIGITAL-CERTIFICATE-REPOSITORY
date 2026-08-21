"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  FileText,
  CheckCircle,
  Share2,
  AlertTriangle,
  Eye,
  Download,
  Database,
  TrendingUp,
  Clock,
  Plus,
  Shield,
  Search,
  ExternalLink
} from "lucide-react"
import Link from "next/link"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts"
import DashboardLayout from "@/components/DashboardLayout"

// Helper component for animated counting effect
function AnimatedCounter({ value, duration = 1 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let start = 0
    const end = value
    if (start === end) {
      setCount(end)
      return
    }

    const totalMiliseconds = duration * 1000
    const incrementTime = Math.max(Math.floor(totalMiliseconds / end), 20)
    
    const timer = setInterval(() => {
      start += Math.ceil(end / (totalMiliseconds / incrementTime))
      if (start >= end) {
        clearInterval(timer)
        setCount(end)
      } else {
        setCount(start)
      }
    }, incrementTime)

    return () => clearInterval(timer)
  }, [value, duration])

  return <span>{count}</span>
}

export default function DashboardPage() {
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [charts, setCharts] = useState<any>(null)
  const [activities, setActivities] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch Dashboard data on mount
  useEffect(() => {
    // Read user profile
    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }

    const fetchDashboardData = async () => {
      try {
        setIsLoading(true)

        // 1. Fetch Stats
        const statsRes = await fetch("/api/dashboard/stats", { cache: "no-store" })
        const statsData = await statsRes.json()

        // 2. Fetch Charts
        const chartsRes = await fetch("/api/dashboard/charts", { cache: "no-store" })
        const chartsData = await chartsRes.json()

        // 3. Fetch Activity feed
        const activityRes = await fetch("/api/dashboard/activity", { cache: "no-store" })
        const activityData = await activityRes.json()

        if (statsData.success) setStats(statsData.data)
        if (chartsData.success) setCharts(chartsData.data)
        if (activityData.success) setActivities(activityData.data)
      } catch (err) {
        console.error("Error loading dashboard data:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  // Animation variants
  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  }

  const animItem = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  }

  // Colors for Pie Charts
  const COLORS = ["#6C63FF", "#8A7CFF", "#7DD3FC", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#3B82F6", "#64748B"]

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Welcome back, <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent font-extrabold">{user?.name || "User"}</span>!
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Here is a summary of your digital certificate repository activities.</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <span className="text-xs bg-primary/10 text-primary font-bold px-3 py-1.5 rounded-full border border-primary/20 uppercase tracking-wider">
              Role: {user?.role || "USER"}
            </span>
          </motion.div>
        </div>

        {/* Stats Cards Section */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass rounded-2xl p-6 border border-border/80 h-32 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="w-16 h-4 shimmer rounded" />
                  <div className="w-8 h-8 shimmer rounded-lg" />
                </div>
                <div className="w-12 h-8 shimmer rounded mt-2" />
              </div>
            ))}
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {/* Total Certificates */}
            <motion.div variants={animItem} className="glass-premium rounded-2xl p-6 border border-border/80 hover:scale-[1.02] hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Certificates</p>
                <div className="p-1.5 bg-primary/10 rounded-xl">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-extrabold mt-3 text-foreground">
                <AnimatedCounter value={stats?.totalCertificates || 0} />
              </p>
              <div className="text-[10px] text-muted-foreground font-bold mt-2 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-success" />
                <span>Secure vaults active</span>
              </div>
            </motion.div>

            {/* Verified Certificates */}
            <motion.div variants={animItem} className="glass-premium rounded-2xl p-6 border border-border/80 hover:scale-[1.02] hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Verified</p>
                <div className="p-1.5 bg-success/10 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-success" />
                </div>
              </div>
              <p className="text-3xl font-extrabold mt-3 text-success">
                <AnimatedCounter value={stats?.verifiedCertificates || 0} />
              </p>
              <div className="text-[10px] text-muted-foreground font-bold mt-2">
                <span>Authenticity validated</span>
              </div>
            </motion.div>

            {/* Shared Certificates */}
            <motion.div variants={animItem} className="glass-premium rounded-2xl p-6 border border-border/80 hover:scale-[1.02] hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Shared</p>
                <div className="p-1.5 bg-accent/15 rounded-xl">
                  <Share2 className="w-5 h-5 text-indigo-500" />
                </div>
              </div>
              <p className="text-3xl font-extrabold mt-3 text-foreground">
                <AnimatedCounter value={stats?.sharedCertificates || 0} />
              </p>
              <div className="text-[10px] text-muted-foreground font-bold mt-2">
                <span>Active external access</span>
              </div>
            </motion.div>

            {/* Storage / Volume Used */}
            <motion.div variants={animItem} className="glass-premium rounded-2xl p-6 border border-border/80 hover:scale-[1.02] hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Storage Used</p>
                <div className="p-1.5 bg-secondary/15 rounded-xl">
                  <Database className="w-5 h-5 text-secondary" />
                </div>
              </div>
              <p className="text-xl font-extrabold mt-4 text-foreground truncate">
                {stats?.storageUsed || "0 Bytes"}
              </p>
              <div className="text-[10px] text-muted-foreground font-bold mt-2">
                <span>Cloudinary secure vault</span>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Detailed Analytics Metrics */}
        {!isLoading && stats && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-3 gap-6"
          >
            {/* Expired Certificates */}
            <div className="glass rounded-xl p-4 border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/10 text-warning rounded-lg">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase">Expired</p>
                  <p className="text-lg font-bold">{stats.expiredCertificates}</p>
                </div>
              </div>
            </div>

            {/* Total Views */}
            <div className="glass rounded-xl p-4 border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase">Total Views</p>
                  <p className="text-lg font-bold">{stats.totalViews}</p>
                </div>
              </div>
            </div>

            {/* Total Downloads */}
            <div className="glass rounded-xl p-4 border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 text-success rounded-lg">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase">Downloads</p>
                  <p className="text-lg font-bold">{stats.totalDownloads}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Charts & Actions Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly uploads Line Chart */}
          <div className="lg:col-span-2 glass rounded-2xl p-6 border border-border/80 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground mb-1">Monthly Upload History</h2>
              <p className="text-xs text-muted-foreground mb-4">Total certificate upload volume over the last 6 months</p>
            </div>
            
            <div className="h-64 w-full">
              {isLoading ? (
                <div className="h-full w-full shimmer rounded-xl" />
              ) : charts && charts.monthlyUploads.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={charts.monthlyUploads}>
                    <defs>
                      <linearGradient id="colorUploads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(255, 255, 255, 0.95)",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                        fontSize: "12px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="uploads"
                      stroke="var(--primary)"
                      strokeWidth={3}
                      dot={{ fill: "var(--primary)", stroke: "#ffffff", strokeWidth: 2, r: 6 }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground bg-white/20 rounded-xl border border-dashed border-border/80">
                  <FileText className="w-12 h-12 mb-2 text-muted-foreground/40" />
                  <p className="text-xs font-semibold">No monthly upload activities registered yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* Categories distribution Pie Chart */}
          <div className="glass rounded-2xl p-6 border border-border/80 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground mb-1">Categories</h2>
              <p className="text-xs text-muted-foreground mb-4">Distribution by certificate classification</p>
            </div>

            <div className="h-64 w-full flex items-center justify-center relative">
              {isLoading ? (
                <div className="h-full w-full shimmer rounded-xl" />
              ) : charts && charts.categories.some((c: any) => c.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.categories.filter((c: any) => c.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {charts.categories.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "rgba(255, 255, 255, 0.95)",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        fontSize: "11px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground bg-white/20 rounded-xl border border-dashed border-border/80">
                  <Database className="w-12 h-12 mb-2 text-muted-foreground/40" />
                  <p className="text-xs font-semibold">No categorizations mapped.</p>
                </div>
              )}

              {/* Center description text */}
              {!isLoading && charts && charts.categories.some((c: any) => c.value > 0) && (
                <div className="absolute text-center">
                  <p className="text-2xl font-black text-foreground">{stats?.totalCertificates || 0}</p>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Total</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activities & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity Timeline Feed */}
          <div className="lg:col-span-2 glass rounded-2xl p-6 border border-border/80 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary animate-pulse" />
                Audit Trail Activities
              </h2>
              <p className="text-xs text-muted-foreground mb-4">Complete log history of your actions in the DCRS system</p>
            </div>

            <div className="space-y-4 max-h-72 overflow-y-auto pr-2 mt-2">
              {isLoading ? (
                [1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4 items-start pb-4 border-b border-border/40 last:border-0">
                    <div className="w-10 h-10 rounded-full shimmer" />
                    <div className="flex-1 space-y-2">
                      <div className="w-32 h-4 shimmer rounded" />
                      <div className="w-16 h-3 shimmer rounded" />
                    </div>
                  </div>
                ))
              ) : activities.length > 0 ? (
                activities.map((act) => {
                  let badgeColor = "bg-primary/10 text-primary"
                  if (act.action === "certificate_uploaded") badgeColor = "bg-success/15 text-success"
                  if (act.action === "certificate_verified") badgeColor = "bg-accent/15 text-indigo-500"
                  if (act.action === "certificate_deleted") badgeColor = "bg-danger/10 text-danger"
                  
                  return (
                    <div key={act.id} className="flex gap-4 items-start pb-4 border-b border-border/40 last:border-0 hover:bg-white/10 p-1.5 rounded-xl transition-colors">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${badgeColor} shrink-0`}>
                        {act.action.split("_")[1]?.substring(0, 2).toUpperCase() || "AC"}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground leading-4">{act.description}</p>
                        <span className="text-[10px] text-muted-foreground/60 font-semibold block mt-1">
                          {new Date(act.timestamp).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <Clock className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs font-semibold">No recent activity logs recorded in the system.</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="glass rounded-2xl p-6 border border-border/80 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground mb-1">Quick Tasks</h2>
              <p className="text-xs text-muted-foreground mb-4">Immediate system shortcuts</p>
            </div>

            <div className="space-y-3.5 mt-2">
              {[
                { label: "Upload Certificate", desc: "Add metadata & stream file", href: "/upload", icon: Plus, bg: "bg-primary/5 text-primary hover:bg-primary/10 border-primary/20" },
                { label: "Verify Integrity", desc: "Scan QR or check file hashes", href: "/verify", icon: Shield, bg: "bg-success/5 text-success hover:bg-success/10 border-success/20" },
                { label: "Search Registry", desc: "Filter repository files", href: "/certificates", icon: Search, bg: "bg-accent/10 text-indigo-500 hover:bg-accent/20 border-accent/20" },
              ].map((act, i) => {
                const Icon = act.icon
                return (
                  <Link
                    key={i}
                    href={act.href}
                    className={`flex items-start gap-4 p-3.5 rounded-2xl border transition-all ${act.bg} hover:translate-x-0.5`}
                  >
                    <div className="p-2 bg-white rounded-xl shadow-xs shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold leading-none">{act.label}</p>
                      <p className="text-[10px] font-semibold text-muted-foreground mt-1.5 leading-none">{act.desc}</p>
                    </div>
                  </Link>
                )
              })}
            </div>

            <div className="mt-6 text-center">
              <Link href="/profile" className="text-xs text-primary hover:underline font-bold flex items-center justify-center gap-1.5">
                <span>View Profile Settings</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
