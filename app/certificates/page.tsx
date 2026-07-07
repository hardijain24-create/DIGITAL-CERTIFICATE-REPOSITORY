"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  FileText,
  Search,
  Grid,
  List,
  Eye,
  ShieldAlert,
  Share2,
  Trash2,
  Plus,
  Filter,
  ChevronDown,
  X,
  Calendar,
  CheckCircle,
  Building,
  CalendarDays,
  ExternalLink,
  Lock,
  Unlock,
  AlertTriangle
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import DashboardLayout from "@/components/DashboardLayout"
import { shareCertificate, revokeCertificateShare } from "@/app/actions/share"

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  
  // Advanced filters state
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false)

  // Share Dialog state
  const [sharingCert, setSharingCert] = useState<any | null>(null)
  const [shareEmail, setShareEmail] = useState("")
  const [sharePermission, setSharePermission] = useState<"view" | "download">("view")
  const [shareExpiry, setShareExpiry] = useState("")
  const [isSharingLoading, setIsSharingLoading] = useState(false)

  // Delete Dialog state
  const [deletingCert, setDeletingCert] = useState<any | null>(null)
  const [isDeletingLoading, setIsDeletingLoading] = useState(false)

  // Fetch certificates from the API
  const fetchCertificates = async () => {
    try {
      setIsLoading(true)
      
      // Build query string
      const params = new URLSearchParams()
      if (searchQuery) params.append("certificateName", searchQuery)
      if (selectedCategory && selectedCategory !== "all") params.append("category", selectedCategory)
      if (selectedStatus && selectedStatus !== "all") params.append("status", selectedStatus)
      if (startDate) params.append("startDate", startDate)
      if (endDate) params.append("endDate", endDate)

      const response = await fetch(`/api/certificates?${params.toString()}`)
      const data = await response.json()
      
      if (data.success) {
        setCertificates(data.data)
      } else {
        toast.error(data.message || "Failed to load certificates.")
      }
    } catch (err) {
      console.error("Error fetching certificates:", err)
      toast.error("Network error fetching certificates.")
    } finally {
      setIsLoading(false)
    }
  }

  // Trigger fetch on query change
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchCertificates()
    }, 400)
    return () => clearTimeout(delayDebounce)
  }, [searchQuery, selectedCategory, selectedStatus, startDate, endDate])

  // Handle Share form submit
  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shareEmail.trim()) {
      toast.error("Please enter a valid email address.")
      return
    }

    try {
      setIsSharingLoading(true)
      const res = await shareCertificate({
        certificateId: sharingCert.certificateId,
        sharedWith: shareEmail,
        permission: sharePermission,
        expiryDate: shareExpiry || undefined
      })

      if (res.success) {
        toast.success(res.message || "Certificate shared successfully.")
        setSharingCert(null)
        setShareEmail("")
        setShareExpiry("")
        fetchCertificates() // Refresh details
      } else {
        toast.error(res.error || "Failed to share certificate.")
      }
    } catch (err) {
      toast.error("Error sharing certificate.")
    } finally {
      setIsSharingLoading(false)
    }
  }

  // Handle Delete certificate
  const handleDeleteConfirm = async () => {
    if (!deletingCert) return

    try {
      setIsDeletingLoading(true)
      console.log("[v0] Delete clicked for certificate:", deletingCert.certificateId)
      
      const url = `/api/certificates/${deletingCert.certificateId}`
      console.log("[v0] DELETE request to:", url)
      
      const response = await fetch(url, {
        method: "DELETE"
      })
      
      console.log("[v0] DELETE response status:", response.status)
      const data = await response.json()
      console.log("[v0] DELETE response:", data)

      if (response.ok && data.success) {
        toast.success(data.message || "Certificate deleted successfully.")
        setDeletingCert(null)
        fetchCertificates() // Refresh list
      } else {
        toast.error(data.message || "Failed to delete certificate.")
      }
    } catch (err) {
      console.error("[v0] Delete error:", err)
      toast.error("Network error deleting certificate.")
    } finally {
      setIsDeletingLoading(false)
    }
  }

  // Get visual Emoji icon based on category classification
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "academic": return "🎓"
      case "professional": return "💼"
      case "internship": return "🏢"
      case "training": return "🏋️"
      case "government": return "🏛️"
      case "identity": return "🪪"
      case "license": return "📜"
      case "achievement": return "🏆"
      case "workshop": return "🛠️"
      default: return "📄"
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Certificate Repository</h1>
            <p className="text-sm text-muted-foreground mt-1">Explore, view, share, or manage your secure digital credentials.</p>
          </div>
          <Link
            href="/upload"
            className="bg-primary hover:bg-secondary text-white px-5 py-3 rounded-2xl font-bold shadow-md shadow-primary/10 transition-all flex items-center justify-center gap-2 self-start md:self-auto cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Upload Certificate</span>
          </Link>
        </div>

        {/* Filter Toolbar */}
        <div className="glass rounded-2xl p-4 border border-border/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Search by name, issuer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/50 border border-border/80 rounded-xl pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Advanced Filters Button */}
            <button
              onClick={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                isFilterDrawerOpen ? "bg-primary/5 border-primary text-primary" : "bg-white/50 border-border hover:bg-white/80"
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>

            {/* Grid/List toggles */}
            <div className="flex items-center bg-white/50 border border-border/80 rounded-xl p-1 shrink-0">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === "grid" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Grid className="w-4.5 h-4.5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === "list" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Expandable Advanced Filters drawer */}
        <AnimatePresence>
          {isFilterDrawerOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="glass rounded-2xl p-6 border border-border/80 overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-left">
                {/* Category select */}
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full bg-white/60 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Categories</option>
                    <option value="academic">Academic</option>
                    <option value="professional">Professional</option>
                    <option value="internship">Internship</option>
                    <option value="training">Training</option>
                    <option value="government">Government</option>
                    <option value="identity">Identity</option>
                    <option value="license">License</option>
                    <option value="achievement">Achievement</option>
                    <option value="workshop">Workshop</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Status select */}
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Status</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full bg-white/60 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="verified">Verified</option>
                    <option value="pending">Pending</option>
                    <option value="revoked">Revoked</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Uploaded After</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white/60 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Uploaded Before</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-white/60 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>

              {/* Clear button */}
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => {
                    setSelectedCategory("all")
                    setSelectedStatus("all")
                    setStartDate("")
                    setEndDate("")
                    setSearchQuery("")
                  }}
                  className="text-xs text-danger font-bold hover:underline"
                >
                  Reset all filters
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Repository Grid / List list */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass rounded-2xl border border-border/80 overflow-hidden h-72 flex flex-col justify-between p-6">
                <div className="w-full h-24 shimmer rounded-xl" />
                <div className="space-y-2 mt-4">
                  <div className="w-3/4 h-5 shimmer rounded" />
                  <div className="w-1/2 h-4 shimmer rounded" />
                </div>
                <div className="flex justify-between items-center mt-4">
                  <div className="w-16 h-6 shimmer rounded-full" />
                  <div className="w-16 h-6 shimmer rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : certificates.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {certificates.map((cert) => (
                <div
                  key={cert._id}
                  className="glass-premium rounded-3xl border border-border/80 overflow-hidden flex flex-col justify-between hover:scale-[1.01] hover:shadow-md hover:border-primary/20 transition-all group"
                >
                  {/* Card Header preview color */}
                  <div className="h-28 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center text-5xl group-hover:scale-103 transition-transform duration-300 relative">
                    {getCategoryIcon(cert.category)}

                    {/* Sharing active lock icon */}
                    <div className="absolute top-3 right-3 bg-white/80 p-1.5 rounded-lg border border-border shadow-xs text-xs">
                      {cert.isShared ? (
                        <Unlock className="w-3.5 h-3.5 text-success" title="Sharing Enabled" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-muted-foreground/60" title="Private" />
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between gap-4 text-left">
                    <div>
                      <h3 className="font-bold text-base text-foreground leading-5 truncate">{cert.certificateName}</h3>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 truncate">
                        <Building className="w-3.5 h-3.5 text-primary" />
                        <span>{cert.issuer}</span>
                      </p>
                    </div>

                    {/* Metadata tags */}
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground font-bold">
                      <div className="flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5" />
                        <span>{cert.issueDate}</span>
                      </div>
                      <span className="bg-muted px-2 py-0.5 rounded-full uppercase tracking-wider text-[8px] font-black">
                        {cert.category}
                      </span>
                    </div>

                    {/* Status badge */}
                    <div className="flex items-center justify-between pt-1">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        cert.verificationStatus === "verified"
                          ? "bg-success/15 text-success"
                          : cert.verificationStatus === "revoked"
                            ? "bg-danger/10 text-danger"
                            : cert.verificationStatus === "expired"
                              ? "bg-warning/15 text-warning"
                              : "bg-primary/15 text-primary"
                      }`}>
                        {cert.verificationStatus}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {cert.views || 0} views
                      </span>
                    </div>

                    {/* Action grid */}
                    <div className="grid grid-cols-4 gap-1.5 pt-3.5 border-t border-border/80">
                      <Link
                        href={`/certificates/${cert.certificateId}`}
                        className="p-2 rounded-xl bg-white/40 hover:bg-white border border-border hover:border-primary/20 text-primary transition-all flex items-center justify-center group/btn"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                      </Link>
                      <Link
                        href={`/verify?id=${cert.certificateId}`}
                        className="p-2 rounded-xl bg-white/40 hover:bg-white border border-border hover:border-primary/20 text-success transition-all flex items-center justify-center group/btn"
                        title="Verify Integration"
                      >
                        <CheckCircle className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                      </Link>
                      <button
                        onClick={() => setSharingCert(cert)}
                        className="p-2 rounded-xl bg-white/40 hover:bg-white border border-border hover:border-primary/20 text-indigo-500 transition-all flex items-center justify-center group/btn cursor-pointer"
                        title="Share Vault"
                      >
                        <Share2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                      </button>
                      <button
                        onClick={() => setDeletingCert(cert)}
                        className="p-2 rounded-xl bg-danger/5 hover:bg-danger/10 border border-danger/10 text-danger transition-all flex items-center justify-center group/btn cursor-pointer"
                        title="Delete Metadata"
                      >
                        <Trash2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // List View
            <div className="space-y-3.5">
              {certificates.map((cert) => (
                <div
                  key={cert._id}
                  className="glass-premium rounded-2xl p-4 border border-border/80 hover:border-primary/20 transition-all flex items-center justify-between gap-4 text-left"
                >
                  <div className="flex items-center gap-4 flex-1 truncate">
                    <span className="text-4xl shrink-0">{getCategoryIcon(cert.category)}</span>
                    <div className="truncate">
                      <h3 className="font-bold text-sm text-foreground truncate leading-4">{cert.certificateName}</h3>
                      <p className="text-xs text-muted-foreground truncate leading-3 mt-1">{cert.issuer}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground/80 font-bold mt-2">
                        <span>Issued: {cert.issueDate}</span>
                        <span>•</span>
                        <span className="uppercase">{cert.category}</span>
                        <span>•</span>
                        <span className={`uppercase font-black ${
                          cert.verificationStatus === "verified" ? "text-success" : "text-warning"
                        }`}>{cert.verificationStatus}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Link
                      href={`/certificates/${cert.certificateId}`}
                      className="p-2 rounded-xl hover:bg-white text-primary border border-transparent hover:border-border transition-colors"
                      title="Details"
                    >
                      <Eye className="w-4.5 h-4.5" />
                    </Link>
                    <Link
                      href={`/verify?id=${cert.certificateId}`}
                      className="p-2 rounded-xl hover:bg-white text-success border border-transparent hover:border-border transition-colors"
                      title="Verify"
                    >
                      <CheckCircle className="w-4.5 h-4.5" />
                    </Link>
                    <button
                      onClick={() => setSharingCert(cert)}
                      className="p-2 rounded-xl hover:bg-white text-indigo-500 border border-transparent hover:border-border transition-colors cursor-pointer"
                      title="Share"
                    >
                      <Share2 className="w-4.5 h-4.5" />
                    </button>
                    <button
                      onClick={() => setDeletingCert(cert)}
                      className="p-2 rounded-xl hover:bg-danger/10 text-danger border border-transparent hover:border-border transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Empty state illustration */
          <div className="glass rounded-3xl border border-border/80 text-center py-20 px-6">
            <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/10">
              <FileText className="w-10 h-10 text-primary/70 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-foreground">No Certificates Found</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-2.5">
              We couldn&apos;t find any certificates matching your query. Adjust your search parameters or upload a new certificate document.
            </p>
            <Link
              href="/upload"
              className="inline-flex items-center justify-center bg-primary hover:bg-secondary text-white font-bold px-6 py-3 rounded-2xl shadow-md shadow-primary/10 mt-6 transition-colors"
            >
              Upload Your First Certificate
            </Link>
          </div>
        )}

        {/* Modal: Sharing Certificate Dialog */}
        <AnimatePresence>
          {sharingCert && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="w-full max-w-md glass-premium rounded-3xl p-6 border border-border shadow-2xl relative text-left"
              >
                <button
                  onClick={() => setSharingCert(null)}
                  className="absolute top-4 right-4 p-1.5 hover:bg-muted text-muted-foreground rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-1.5">
                  <Share2 className="w-5 h-5 text-primary" />
                  <span>Share Certificate</span>
                </h3>
                <p className="text-xs text-muted-foreground leading-4 mb-5">
                  Generate secure sharing links and allocate access levels for <b>{sharingCert.certificateName}</b>.
                </p>

                <form onSubmit={handleShareSubmit} className="space-y-4">
                  {/* Share email */}
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wider">Recipient Email</label>
                    <input
                      type="email"
                      placeholder="e.g., manager@employer.com"
                      value={shareEmail}
                      onChange={(e) => setShareEmail(e.target.value)}
                      className="w-full bg-white/80 border border-border/80 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
                      required
                      disabled={isSharingLoading}
                    />
                  </div>

                  {/* Share permission */}
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wider">Permission Access</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: "view" as const, title: "Read Only", desc: "View online viewer" },
                        { value: "download" as const, title: "Download", desc: "View and download file" }
                      ].map((perm) => {
                        const isSelected = sharePermission === perm.value
                        return (
                          <button
                            key={perm.value}
                            type="button"
                            onClick={() => setSharePermission(perm.value)}
                            className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-colors cursor-pointer ${
                              isSelected ? "border-primary bg-primary/5" : "border-border/80 bg-white"
                            }`}
                            disabled={isSharingLoading}
                          >
                            <span className={`text-xs font-bold ${isSelected ? "text-primary" : "text-foreground"}`}>{perm.title}</span>
                            <span className="text-[9px] text-muted-foreground mt-1 leading-none">{perm.desc}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Share Expiry */}
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wider">Share Link Expiry (Optional)</label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="date"
                        value={shareExpiry}
                        onChange={(e) => setShareExpiry(e.target.value)}
                        className="w-full bg-white/80 border border-border/80 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary cursor-pointer"
                        disabled={isSharingLoading}
                      />
                    </div>
                  </div>

                  {/* Submit buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={isSharingLoading}
                      className="flex-1 bg-primary hover:bg-secondary text-white font-bold py-2.5 rounded-xl shadow-md shadow-primary/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSharingLoading ? "Sharing..." : "Share Access"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSharingCert(null)}
                      className="flex-1 bg-white hover:bg-muted text-foreground border border-border font-bold py-2.5 rounded-xl transition-colors cursor-pointer"
                      disabled={isSharingLoading}
                    >
                      Cancel
                    </button>
                  </div>
                </form>

                {/* Show active shares list */}
                {sharingCert.sharedWith && sharingCert.sharedWith.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-border">
                    <h4 className="text-xs font-black text-foreground uppercase tracking-wider mb-2.5">Active Shares</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {sharingCert.sharedWith.map((email: string) => (
                        <div key={email} className="flex justify-between items-center gap-2 bg-muted/30 p-2 rounded-xl border border-border/60">
                          <span className="text-xs font-bold text-muted-foreground truncate">{email}</span>
                          <button
                            onClick={async () => {
                              try {
                                const res = await revokeCertificateShare({ certificateId: sharingCert.certificateId, sharedWith: email })
                                if (res.success) {
                                  toast.success(res.message)
                                  setSharingCert({
                                    ...sharingCert,
                                    sharedWith: sharingCert.sharedWith.filter((em: string) => em !== email)
                                  })
                                  fetchCertificates()
                                } else {
                                  toast.error(res.error)
                                }
                              } catch (e) {
                                toast.error("Error revoking access.")
                              }
                            }}
                            className="text-[10px] text-danger hover:underline font-bold cursor-pointer"
                          >
                            Revoke
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal: Delete Confirmation Dialog */}
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
                  Are you sure you want to permanently delete <b>{deletingCert.certificateName}</b>? This action will remove the records from MongoDB and delete the file asset from Cloudinary. <b>This cannot be undone.</b>
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={isDeletingLoading}
                    className="flex-1 bg-danger hover:bg-red-600 text-white font-bold py-2.5 rounded-xl shadow-md shadow-danger/10 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isDeletingLoading ? "Deleting..." : "Yes, Delete"}
                  </button>
                  <button
                    onClick={() => setDeletingCert(null)}
                    className="flex-1 bg-white hover:bg-muted text-foreground border border-border font-bold py-2.5 rounded-xl transition-colors cursor-pointer"
                    disabled={isDeletingLoading}
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
