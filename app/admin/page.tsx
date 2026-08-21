"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Users,
  FileText,
  ShieldCheck,
  Database,
  Trash2,
  Clock,
  UserCheck,
  Search,
  Filter,
  X,
  AlertTriangle,
  Building,
  User as UserIcon,
  CalendarDays
} from "lucide-react"
import { toast } from "sonner"
import DashboardLayout from "@/components/DashboardLayout"

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<"users" | "certificates" | "audit">("users")
  const [stats, setStats] = useState<any>(null)
  const [usersList, setUsersList] = useState<any[]>([])
  const [certsList, setCertsList] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Search/Filter states
  const [searchQuery, setSearchQuery] = useState("")

  // Delete User state
  const [deletingUser, setDeletingUser] = useState<any | null>(null)
  const [isDeletingUserLoading, setIsDeletingUserLoading] = useState(false)

  // Delete Certificate state
  const [deletingCert, setDeletingCert] = useState<any | null>(null)
  const [isDeletingCertLoading, setIsDeletingCertLoading] = useState(false)

  // Fetch admin stats, users, certs, and logs
  const fetchAdminData = async () => {
    try {
      setIsLoading(true)
      
      // 1. Stats
      const statsRes = await fetch("/api/admin/stats")
      const statsData = await statsRes.json()
      if (statsData.success) setStats(statsData.data)

      // 2. Users
      const usersRes = await fetch("/api/admin/users")
      const usersData = await usersRes.json()
      if (usersData.success) setUsersList(usersData.data)

      // 3. Certificates
      const certsRes = await fetch("/api/certificates")
      const certsData = await certsRes.json()
      if (certsData.success) setCertsList(certsData.data)

      // 4. Audit logs
      const auditRes = await fetch("/api/activity-logs?limit=50")
      const auditData = await auditRes.json()
      if (auditData.success) setAuditLogs(auditData.data)

    } catch (e) {
      console.error("Error loading admin details:", e)
      toast.error("Failed to load admin dashboard records.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAdminData()
  }, [])

  // Handle Delete user account
  const handleDeleteUserConfirm = async () => {
    if (!deletingUser) return

    try {
      setIsDeletingUserLoading(true)
      const response = await fetch(`/api/admin/users?id=${deletingUser._id}`, {
        method: "DELETE"
      })
      const data = await response.json()

      if (response.ok && data.success) {
        toast.success(data.message || "User account deleted successfully.")
        setDeletingUser(null)
        fetchAdminData() // Reload
      } else {
        toast.error(data.message || "Failed to delete user.")
      }
    } catch (err) {
      toast.error("Network error deleting user account.")
    } finally {
      setIsDeletingUserLoading(false)
    }
  }

  // Handle Delete certificate
  const handleDeleteCertConfirm = async () => {
    if (!deletingCert) return

    try {
      setIsDeletingCertLoading(true)
      const response = await fetch(`/api/certificates/${deletingCert.certificateId}`, {
        method: "DELETE"
      })
      const data = await response.json()

      if (response.ok && data.success) {
        toast.success(data.message || "Certificate deleted.")
        setDeletingCert(null)
        fetchAdminData() // Reload
      } else {
        toast.error(data.message || "Failed to delete certificate.")
      }
    } catch (err) {
      toast.error("Network error deleting certificate.")
    } finally {
      setIsDeletingCertLoading(false)
    }
  }

  // Search filters
  const filteredUsers = usersList.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredCerts = certsList.filter(
    (c) =>
      c.certificateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.issuer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.ownerName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredAudit = auditLogs.filter(
    (l) =>
      l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <DashboardLayout>
      <div className="space-y-6 text-left">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Admin Console Panel</h1>
          <p className="text-sm text-muted-foreground mt-1">Audit DCRS system usage, explore server transaction trails, and configure user accounts.</p>
        </div>

        {/* Stats Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass rounded-2xl p-5 border border-border h-24 shimmer" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Users */}
            <div className="glass-premium rounded-2xl p-5 border border-border/80 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">System Users</p>
                <p className="text-2xl font-black mt-1.5">{stats?.totalUsers || 0}</p>
                <p className="text-[9px] text-muted-foreground mt-1">
                  U: {stats?.usersBreakdown.user || 0} | Inst: {stats?.usersBreakdown.institution || 0}
                </p>
              </div>
              <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                <Users className="w-6 h-6" />
              </div>
            </div>

            {/* Total Certificates */}
            <div className="glass-premium rounded-2xl p-5 border border-border/80 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Certificates</p>
                <p className="text-2xl font-black mt-1.5">{stats?.totalCertificates || 0}</p>
                <p className="text-[9px] text-muted-foreground mt-1">Registered digital metadata</p>
              </div>
              <div className="p-3 bg-success/10 rounded-2xl text-success">
                <FileText className="w-6 h-6" />
              </div>
            </div>

            {/* Total Verifications */}
            <div className="glass-premium rounded-2xl p-5 border border-border/80 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Audits Checked</p>
                <p className="text-2xl font-black mt-1.5">{stats?.totalVerifications || 0}</p>
                <p className="text-[9px] text-muted-foreground mt-1">Total validation logs</p>
              </div>
              <div className="p-3 bg-accent/15 rounded-2xl text-indigo-500">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>

            {/* Storage Volume */}
            <div className="glass-premium rounded-2xl p-5 border border-border/80 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Storage Volume</p>
                <p className="text-2xl font-black mt-1.5 truncate max-w-[140px]">{stats?.storageUsed || "0 Bytes"}</p>
                <p className="text-[9px] text-muted-foreground mt-1">Cloud file volume</p>
              </div>
              <div className="p-3 bg-secondary/15 rounded-2xl text-secondary">
                <Database className="w-6 h-6" />
              </div>
            </div>
          </div>
        )}

        {/* Tab Controls & Search filter toolbar */}
        <div className="glass rounded-2xl p-4 border border-border/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex bg-slate-100 rounded-xl p-1 shrink-0">
            {[
              { id: "users" as const, label: "Users List", icon: Users },
              { id: "certificates" as const, label: "Certificates", icon: FileText },
              { id: "audit" as const, label: "Audit Trails", icon: Clock },
            ].map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id)
                    setSearchQuery("")
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    isActive ? "bg-white text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* Search filter input */}
          <div className="flex-1 max-w-sm relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground/60" />
            <input
              type="text"
              placeholder={`Search active ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/50 border border-border/80 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Tab contents */}
        <div className="glass rounded-3xl border border-border/80 overflow-hidden">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-full h-12 shimmer rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              
              {/* TAB 1: USERS LIST */}
              {activeTab === "users" && (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-border/80 text-muted-foreground font-black uppercase tracking-wider">
                      <th className="p-4 pl-6">Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Joined Date</th>
                      <th className="p-4 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((item) => (
                        <tr key={item._id} className="border-b border-border/40 hover:bg-slate-50/50 transition-colors font-medium">
                          <td className="p-4 pl-6 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                              {item.name.charAt(0)}
                            </div>
                            <span className="font-bold text-foreground">{item.name}</span>
                          </td>
                          <td className="p-4 text-muted-foreground">{item.email}</td>
                          <td className="p-4">
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              item.role === "admin"
                                ? "bg-danger/10 text-danger"
                                : item.role === "institution"
                                  ? "bg-accent/15 text-indigo-500"
                                  : "bg-success/15 text-success"
                            }`}>
                              {item.role}
                            </span>
                          </td>
                          <td className="p-4 text-muted-foreground">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-4 pr-6 text-right">
                            <button
                              onClick={() => setDeletingUser(item)}
                              className="p-1.5 hover:bg-danger/10 text-muted-foreground hover:text-danger rounded-lg transition-colors cursor-pointer"
                              title="Delete Account"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-muted-foreground font-semibold">No registered users matched the search parameter.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* TAB 2: CERTIFICATES REGISTRY */}
              {activeTab === "certificates" && (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-border/80 text-muted-foreground font-black uppercase tracking-wider">
                      <th className="p-4 pl-6">Certificate</th>
                      <th className="p-4">Owner Name</th>
                      <th className="p-4">Issuer</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Upload Date</th>
                      <th className="p-4 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCerts.length > 0 ? (
                      filteredCerts.map((item) => (
                        <tr key={item._id} className="border-b border-border/40 hover:bg-slate-50/50 transition-colors font-medium">
                          <td className="p-4 pl-6">
                            <div className="font-bold text-foreground truncate max-w-[200px]" title={item.certificateName}>
                              {item.certificateName}
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono leading-none">{item.certificateId}</span>
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-foreground">{item.ownerName}</div>
                            <span className="text-[10px] text-muted-foreground leading-none">{item.ownerEmail}</span>
                          </td>
                          <td className="p-4 text-muted-foreground">{item.issuer}</td>
                          <td className="p-4">
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              item.verificationStatus === "verified"
                                ? "bg-success/15 text-success"
                                : "bg-warning/15 text-warning"
                            }`}>
                              {item.verificationStatus}
                            </span>
                          </td>
                          <td className="p-4 text-muted-foreground">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-4 pr-6 text-right space-x-1 flex items-center justify-end h-16">
                            <Link
                              href={`/certificates/${item.certificateId}`}
                              className="p-1.5 hover:bg-primary/5 text-muted-foreground hover:text-primary rounded-lg transition-colors inline-block"
                              title="Details"
                            >
                              <FileText className="w-4.5 h-4.5" />
                            </Link>
                            <button
                              onClick={() => setDeletingCert(item)}
                              className="p-1.5 hover:bg-danger/10 text-muted-foreground hover:text-danger rounded-lg transition-colors cursor-pointer"
                              title="Delete Document"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-muted-foreground font-semibold">No registered certificates matched the search parameter.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* TAB 3: SYSTEM AUDIT LOGS */}
              {activeTab === "audit" && (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-border/80 text-muted-foreground font-black uppercase tracking-wider">
                      <th className="p-4 pl-6">Timestamp</th>
                      <th className="p-4">Action</th>
                      <th className="p-4">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAudit.length > 0 ? (
                      filteredAudit.map((item) => (
                        <tr key={item.id} className="border-b border-border/40 hover:bg-slate-50/50 transition-colors font-medium">
                          <td className="p-4 pl-6 text-muted-foreground whitespace-nowrap">
                            {new Date(item.timestamp).toLocaleString()}
                          </td>
                          <td className="p-4">
                            <span className="bg-muted px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[8px] font-black text-foreground">
                              {item.action}
                            </span>
                          </td>
                          <td className="p-4 text-foreground/80 leading-4">{item.description}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="p-12 text-center text-muted-foreground font-semibold">No system audit activities matched the search query.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

            </div>
          )}
        </div>

        {/* Modal: Delete User Dialog */}
        <AnimatePresence>
          {deletingUser && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="w-full max-w-sm glass-premium rounded-3xl p-6 border border-border shadow-2xl relative text-left"
              >
                <div className="w-12 h-12 bg-danger/10 rounded-full flex items-center justify-center mb-4 text-danger">
                  <AlertTriangle className="w-6 h-6 animate-pulse" />
                </div>

                <h3 className="text-lg font-bold text-foreground mb-1.5">Delete User Account</h3>
                <p className="text-xs text-muted-foreground leading-4 mb-6">
                  Are you sure you want to permanently delete user account <b>{deletingUser.name}</b> ({deletingUser.email})? This action will remove all database credentials. <b>This cannot be undone.</b>
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteUserConfirm}
                    disabled={isDeletingUserLoading}
                    className="flex-1 bg-danger hover:bg-red-600 text-white font-bold py-2.5 rounded-xl shadow-md shadow-danger/10 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isDeletingUserLoading ? "Deleting..." : "Yes, Delete"}
                  </button>
                  <button
                    onClick={() => setDeletingUser(null)}
                    className="flex-1 bg-white hover:bg-muted text-foreground border border-border font-bold py-2.5 rounded-xl transition-colors cursor-pointer"
                    disabled={isDeletingUserLoading}
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal: Delete Certificate Dialog */}
        <AnimatePresence>
          {deletingCert && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="w-full max-w-sm glass-premium rounded-3xl p-6 border border-border shadow-2xl relative text-left"
              >
                <div className="w-12 h-12 bg-danger/10 rounded-full flex items-center justify-center mb-4 text-danger">
                  <AlertTriangle className="w-6 h-6 animate-pulse" />
                </div>

                <h3 className="text-lg font-bold text-foreground mb-1.5">Delete Certificate</h3>
                <p className="text-xs text-muted-foreground leading-4 mb-6">
                  Are you sure you want to permanently delete <b>{deletingCert.certificateName}</b>? This action will remove the record from MongoDB Atlas and delete the file asset from Cloudinary. <b>This cannot be undone.</b>
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteCertConfirm}
                    disabled={isDeletingCertLoading}
                    className="flex-1 bg-danger hover:bg-red-600 text-white font-bold py-2.5 rounded-xl shadow-md shadow-danger/10 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isDeletingCertLoading ? "Deleting..." : "Yes, Delete"}
                  </button>
                  <button
                    onClick={() => setDeletingCert(null)}
                    className="flex-1 bg-white hover:bg-muted text-foreground border border-border font-bold py-2.5 rounded-xl transition-colors cursor-pointer"
                    disabled={isDeletingCertLoading}
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  )
}
