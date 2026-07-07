"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  ShieldCheck,
  Search,
  Hash,
  Upload,
  CheckCircle,
  XCircle,
  Building,
  User,
  Calendar,
  AlertTriangle,
  Clock,
  ArrowRight,
  FileText
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import DashboardLayout from "@/components/DashboardLayout"

// Outer component with Suspense wrapper to handle SearchParams securely in Next.js
export default function VerifyPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="w-full h-96 shimmer rounded-3xl" />
      </DashboardLayout>
    }>
      <VerifyPageContent />
    </Suspense>
  )
}

function VerifyPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const queryId = searchParams.get("id") || ""

  const [verificationMode, setVerificationMode] = useState<"id" | "upload" | null>(null)
  const [certificateId, setCertificateId] = useState(queryId)
  const [isVerifying, setIsVerifying] = useState(false)
  
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const [result, setResult] = useState<null | {
    status: "verified" | "pending" | "revoked" | "expired" | "tampered" | "not_found"
    message: string
    certificate?: {
      certificateId: string
      certificateName: string
      ownerName: string
      ownerEmail?: string
      issuer: string
      issueDate: string
      expiryDate?: string
      category: string
      hash: string
    }
  }>(null)

  // Trigger automatic verification on mount if queryId is present
  useEffect(() => {
    if (queryId) {
      setVerificationMode("id")
      setCertificateId(queryId)
      triggerVerify({ idParam: queryId })
    }
  }, [queryId])

  // Process text-based verification (ID or Hash)
  const handleTextVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!certificateId.trim()) {
      toast.error("Please enter a Certificate ID or SHA-256 Hash.")
      return
    }
    triggerVerify({ textParam: certificateId.trim() })
  }

  // Handle file drop upload verification
  const handleFileDropVerify = (e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files.length > 0) {
      setUploadedFile(files[0])
      triggerFileVerify(files[0])
    }
  }

  // Handle browse file verification
  const handleFileSelectVerify = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadedFile(e.target.files[0])
      triggerFileVerify(e.target.files[0])
    }
  }

  // Trigger POST API call for ID / Hash verify
  const triggerVerify = async (params: { idParam?: string; textParam?: string }) => {
    const query = params.idParam || params.textParam || certificateId
    if (!query) return

    setIsVerifying(true)
    setResult(null)

    try {
      const isHash = query.length === 64
      const bodyPayload = isHash ? { hash: query } : { certificateId: query }

      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload)
      })

      const data = await response.json()
      
      setResult({
        status: data.data.status,
        message: data.message,
        certificate: data.data.certificate
      })

      if (data.success) {
        toast.success("Certificate validated successfully.")
      } else {
        toast.error(data.message || "Certificate could not be verified.")
      }
    } catch (err) {
      console.error("Verification query error:", err)
      toast.error("Network error executing validation query.")
    } finally {
      setIsVerifying(false)
    }
  }

  // Trigger POST API call for File upload verify
  const triggerFileVerify = async (file: File) => {
    setIsVerifying(true)
    setResult(null)

    try {
      const uploadData = new FormData()
      uploadData.append("file", file)
      
      // If we also have a text ID in the input box, include it to check for tampering
      if (certificateId.trim()) {
        uploadData.append("certificateId", certificateId.trim())
      }

      const response = await fetch("/api/verify", {
        method: "POST",
        body: uploadData
      })

      const data = await response.json()

      setResult({
        status: data.data.status,
        message: data.message,
        certificate: data.data.certificate
      })

      if (data.success) {
        toast.success("File verified successfully!")
      } else {
        toast.error(data.message || "File validation failed.")
      }
    } catch (err) {
      console.error("File verify error:", err)
      toast.error("Network error verifying file.")
    } finally {
      setIsVerifying(false)
    }
  }

  // Get color configurations based on verification status
  const getStatusConfigs = (status: string) => {
    switch (status) {
      case "verified":
        return {
          title: "Certificate Verified!",
          bannerBg: "from-success/20 to-success/10",
          iconColor: "text-success",
          iconBg: "bg-success/20",
          badgeColor: "bg-success text-white"
        }
      case "pending":
        return {
          title: "Verification Pending",
          bannerBg: "from-primary/20 to-primary/10",
          iconColor: "text-primary",
          iconBg: "bg-primary/20",
          badgeColor: "bg-primary text-white"
        }
      case "revoked":
        return {
          title: "Certificate Revoked!",
          bannerBg: "from-slate-500/20 to-slate-500/10",
          iconColor: "text-slate-600",
          iconBg: "bg-slate-600/20",
          badgeColor: "bg-slate-600 text-white"
        }
      case "expired":
        return {
          title: "Certificate Expired!",
          bannerBg: "from-warning/20 to-warning/10",
          iconColor: "text-warning",
          iconBg: "bg-warning/20",
          badgeColor: "bg-warning text-white"
        }
      case "tampered":
        return {
          title: "Security Alert: Tampered!",
          bannerBg: "from-danger/25 to-danger/15",
          iconColor: "text-danger",
          iconBg: "bg-danger/20",
          badgeColor: "bg-danger text-white animate-pulse"
        }
      default:
        return {
          title: "Certificate Not Registered",
          bannerBg: "from-muted/40 to-muted/20",
          iconColor: "text-muted-foreground",
          iconBg: "bg-muted-foreground/20",
          badgeColor: "bg-muted-foreground text-white"
        }
    }
  }

  const statusStyle = result ? getStatusConfigs(result.status) : null

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-left">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Verify Certificate</h1>
          <p className="text-sm text-muted-foreground mt-1">Audit certificate authenticity, check SHA-256 integrity, or verify status logs.</p>
        </div>

        {/* Mode selector */}
        {verificationMode === null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="grid md:grid-cols-2 gap-6"
          >
            {/* By ID / Hash */}
            <button
              onClick={() => setVerificationMode("id")}
              className="glass rounded-3xl p-8 border border-border/80 text-center hover:border-primary/30 hover:scale-[1.01] transition-all group cursor-pointer"
            >
              <Hash className="w-16 h-16 text-primary mx-auto mb-4 group-hover:scale-105 transition-transform" />
              <h2 className="text-xl font-bold text-foreground">Verify by ID / Hash</h2>
              <p className="text-xs text-muted-foreground mt-1.5 leading-4">Verify using the Certificate ID or full cryptographic SHA-256 hash string.</p>
            </button>

            {/* By File Upload */}
            <button
              onClick={() => setVerificationMode("upload")}
              className="glass rounded-3xl p-8 border border-border/80 text-center hover:border-primary/30 hover:scale-[1.01] transition-all group cursor-pointer"
            >
              <Upload className="w-16 h-16 text-primary mx-auto mb-4 group-hover:scale-105 transition-transform" />
              <h2 className="text-xl font-bold text-foreground">Verify by Document File</h2>
              <p className="text-xs text-muted-foreground mt-1.5 leading-4">Upload the certificate document (PDF/Image) to auto-verify SHA-256 file hashes.</p>
            </button>
          </motion.div>
        )}

        {/* ID / Hash Form Input Box */}
        {verificationMode === "id" && !result && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-3xl p-6 md:p-8 border border-border/80 text-left"
          >
            <button
              onClick={() => {
                setVerificationMode(null)
                setCertificateId("")
              }}
              className="text-xs text-primary hover:underline font-bold mb-6 flex items-center gap-1 cursor-pointer"
            >
              ← Back to verification choices
            </button>

            <form onSubmit={handleTextVerifySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">Certificate ID or SHA-256 Hash</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
                  <input
                    type="text"
                    placeholder="Enter certificate ID (CERT_...) or 64-character hash..."
                    value={certificateId}
                    onChange={(e) => setCertificateId(e.target.value)}
                    className="w-full bg-white/60 border border-border/80 rounded-xl pl-12 pr-4 py-3.5 text-sm focus:outline-none focus:border-primary"
                    required
                    disabled={isVerifying}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full bg-primary hover:bg-secondary text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/10 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isVerifying ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Auditing Registry...</span>
                  </>
                ) : (
                  <span>Verify Authenticity</span>
                )}
              </button>
            </form>
          </motion.div>
        )}

        {/* File Drop verification box */}
        {verificationMode === "upload" && !result && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-3xl p-6 md:p-8 border border-border/80 text-left"
          >
            <button
              onClick={() => {
                setVerificationMode(null)
                setUploadedFile(null)
              }}
              className="text-xs text-primary hover:underline font-bold mb-6 flex items-center gap-1 cursor-pointer"
            >
              ← Back to verification choices
            </button>

            {isVerifying ? (
              <div className="py-12 text-center space-y-4">
                <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                <p className="text-sm font-bold text-primary animate-pulse">Computing SHA-256 file hash & auditing registry...</p>
              </div>
            ) : (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDropVerify}
                className="border-2 border-dashed border-primary/30 rounded-2xl p-12 text-center hover:bg-white/40 transition-colors cursor-pointer"
              >
                <Upload className="w-12 h-12 text-primary mx-auto mb-4 animate-bounce" />
                <h3 className="font-bold text-sm text-foreground">Drag and drop certificate file here</h3>
                <p className="text-xs text-muted-foreground mt-1">Supports PDF, PNG, JPG documents up to 10MB</p>
                
                <label className="mt-4 cursor-pointer inline-block">
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileSelectVerify} className="hidden" />
                  <span className="bg-primary hover:bg-secondary text-white px-5 py-2 rounded-xl text-xs font-bold transition-colors">
                    Browse Files
                  </span>
                </label>
              </div>
            )}
          </motion.div>
        )}

        {/* Verification Result Output */}
        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 text-left"
          >
            {/* Status Card Banner */}
            <div className="glass rounded-3xl border border-border/80 overflow-hidden">
              <div className={`bg-gradient-to-r ${statusStyle?.bannerBg} p-8 text-center`}>
                <div className="flex justify-center mb-4">
                  <div className={`w-16 h-16 ${statusStyle?.iconBg} rounded-full flex items-center justify-center ${statusStyle?.iconColor}`}>
                    <ShieldCheck className="w-9 h-9" />
                  </div>
                </div>
                <h2 className={`text-2xl font-black ${statusStyle?.iconColor}`}>{statusStyle?.title}</h2>
                <p className="text-sm text-muted-foreground font-semibold mt-1.5 max-w-md mx-auto">{result.message}</p>
              </div>
            </div>

            {/* Document Details (if verified or found) */}
            {result.certificate && (
              <div className="glass rounded-3xl p-6 md:p-8 border border-border/85 space-y-4">
                <h3 className="text-base font-bold text-foreground pb-3 border-b border-border/80 flex justify-between items-center">
                  <span>Certificate Metadata</span>
                  <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full ${statusStyle?.badgeColor}`}>
                    {result.status}
                  </span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Certificate Name</p>
                      <p className="text-foreground mt-0.5">{result.certificate.certificateName}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Building className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Issuer</p>
                      <p className="text-foreground mt-0.5">{result.certificate.issuer}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Recipient Owner</p>
                      <p className="text-foreground mt-0.5">{result.certificate.ownerName}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Issue Date</p>
                      <p className="text-foreground mt-0.5">{result.certificate.issueDate}</p>
                    </div>
                  </div>
                </div>

                {/* Hash audit */}
                <div className="pt-4 border-t border-border/80 space-y-1.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">SHA-256 Cryptographic Hash</span>
                  <div className="bg-white/50 p-2.5 border border-border rounded-xl font-mono text-[10px] break-all text-foreground">
                    {result.certificate.hash}
                  </div>
                </div>
              </div>
            )}

            {/* Back action buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setResult(null)
                  setVerificationMode(null)
                  setUploadedFile(null)
                  setCertificateId("")
                }}
                className="flex-1 bg-primary hover:bg-secondary text-white font-bold py-3.5 rounded-xl shadow-md shadow-primary/10 transition-colors text-center text-sm cursor-pointer"
              >
                Verify Another
              </button>
              <Link
                href="/certificates"
                className="flex-1 bg-white hover:bg-muted text-foreground border border-border font-bold py-3.5 rounded-xl transition-colors text-center text-sm"
              >
                View Repository
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  )
}
