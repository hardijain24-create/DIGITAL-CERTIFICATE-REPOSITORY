"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  Calendar,
  Building,
  Globe,
  Tag,
  FileText,
  FileCode,
  QrCode,
  Copy,
  CheckCircle,
  AlertTriangle,
  Clock,
  Printer,
  Download,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Share2,
  Trash2,
  Trash
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import DashboardLayout from "@/components/DashboardLayout"
import { shareCertificate } from "@/app/actions/share"

export default function CertificateDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [cert, setCert] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Viewer controls state
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)

  // Share overlay state
  const [shareEmail, setShareEmail] = useState("")
  const [sharePermission, setSharePermission] = useState<"view" | "download">("view")
  const [isSharing, setIsSharing] = useState(false)

  // Fetch certificate details & logs
  const fetchDetails = async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/certificates/${id}`)
      const data = await res.json()

      if (data.success) {
        setCert(data.data)
        
        // Fetch verification logs history
        const logsRes = await fetch(`/api/verify?certificateId=${encodeURIComponent(data.data._id)}`)
        if (logsRes.ok) {
          const text = await logsRes.text()
          if (text.trim()) {
            try {
              const logsData = JSON.parse(text)
              if (logsData.success) {
                setHistory(logsData.data?.history || logsData.history || [])
              } else {
                setHistory([])
              }
            } catch (error) {
              console.error("Failed to parse verification history:", error)
              setHistory([])
            }
          } else {
            setHistory([])
          }
        } else {
          console.warn("Verification history request failed:", logsRes.status)
          setHistory([])
        }
      } else {
        toast.error(data.message || "Failed to load certificate details.")
        router.push("/certificates")
      }
    } catch (err) {
      console.error("Error loading details:", err)
      toast.error("Network error loading certificate.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      fetchDetails()
    }
  }, [id])

  // Copy cryptographic hash
  const handleCopyHash = () => {
    if (!cert) return
    navigator.clipboard.writeText(cert.hash)
    toast.success("Cryptographic SHA-256 hash copied to clipboard.")
  }

  // Copy Certificate ID
  const handleCopyId = () => {
    if (!cert) return
    navigator.clipboard.writeText(cert.certificateId)
    toast.success("Certificate ID copied to clipboard.")
  }

  // Handle Share form
  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shareEmail.trim()) {
      toast.error("Please enter a valid email address.")
      return
    }

    try {
      setIsSharing(true)
      const res = await shareCertificate({
        certificateId: cert.certificateId,
        sharedWith: shareEmail,
        permission: sharePermission
      })

      if (res.success) {
        toast.success(res.message || "Certificate shared successfully.")
        setShareEmail("")
        fetchDetails() // Reload details
      } else {
        toast.error(res.error || "Failed to share.")
      }
    } catch (err) {
      toast.error("Error sharing certificate.")
    } finally {
      setIsSharing(false)
    }
  }

  // Print PDF Trigger
  const handlePrint = () => {
    if (!cert) return
    const printWindow = window.open(cert.fileUrl, "_blank")
    if (printWindow) {
      printWindow.focus()
      printWindow.print()
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back navigation */}
        <Link
          href="/certificates"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Repository</span>
        </Link>

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass rounded-3xl h-[550px] shimmer" />
            <div className="glass rounded-3xl h-[550px] shimmer" />
          </div>
        ) : cert ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
            
            {/* Left: Document Viewer */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="glass-premium rounded-3xl p-4 border border-border/80 flex flex-col justify-between h-[600px]">
                
                {/* Viewer controls bar */}
                <div className="flex justify-between items-center pb-3 border-b border-border/80 text-xs font-semibold text-muted-foreground">
                  <span>Vault Document Preview ({cert.fileType.toUpperCase()})</span>
                  
                  <div className="flex items-center gap-2 bg-white/50 border border-border/80 rounded-xl p-1 shrink-0">
                    <button
                      onClick={() => setZoom(Math.max(50, zoom - 10))}
                      className="p-1 hover:bg-primary/5 hover:text-primary rounded-lg transition-colors cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="px-1 text-[10px]">{zoom}%</span>
                    <button
                      onClick={() => setZoom(Math.min(200, zoom + 10))}
                      className="p-1 hover:bg-primary/5 hover:text-primary rounded-lg transition-colors cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    
                    <div className="w-px h-4 bg-border/80 mx-1" />

                    <button
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="p-1 hover:bg-primary/5 hover:text-primary rounded-lg transition-colors cursor-pointer"
                      title="Rotate Document"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>

                    <div className="w-px h-4 bg-border/80 mx-1" />

                    <button
                      onClick={handlePrint}
                      className="p-1 hover:bg-primary/5 hover:text-primary rounded-lg transition-colors cursor-pointer"
                      title="Print Document"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    
                    <a
                      href={cert.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-primary/5 hover:text-primary rounded-lg transition-colors"
                      title="Download Original"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Viewer Box */}
                <div className="flex-1 bg-slate-900/5 rounded-2xl border border-border/50 mt-4 overflow-auto flex items-center justify-center relative p-4">
                  <div
                    style={{
                      transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                      transition: "transform 0.2s ease-in-out",
                      width: "100%",
                      height: "100%"
                    }}
                    className="flex items-center justify-center"
                  >
                    {cert.fileType === "pdf" ? (
                      <iframe
                        src={`${cert.fileUrl}#toolbar=0&navpanes=0`}
                        className="w-full h-full border-0 rounded-xl bg-white shadow-sm"
                      />
                    ) : (
                      <img
                        src={cert.fileUrl}
                        alt={cert.certificateName}
                        className="max-w-full max-h-full object-contain rounded-xl shadow-md"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Details, QR Code, Verification Timeline */}
            <div className="space-y-6">
              
              {/* Metadata Card */}
              <div className="glass-premium rounded-3xl p-6 border border-border/80 space-y-4">
                <div className="flex items-start justify-between">
                  <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                    cert.verificationStatus === "verified"
                      ? "bg-success/15 text-success"
                      : "bg-warning/15 text-warning"
                  }`}>
                    {cert.verificationStatus}
                  </span>
                  <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold text-[8px]">
                    {cert.category}
                  </span>
                </div>

                <div>
                  <h2 className="text-xl font-bold text-foreground leading-6">{cert.certificateName}</h2>
                  <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5" />
                    <span>Issued by: <b>{cert.issuer}</b></span>
                  </p>
                  {cert.issuerWebsite && (
                    <a
                      href={cert.issuerWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-primary hover:underline flex items-center gap-1 mt-1 font-semibold"
                    >
                      <Globe className="w-3 h-3" />
                      <span>{cert.issuerWebsite}</span>
                    </a>
                  )}
                </div>

                <div className="space-y-2 border-t border-border/80 pt-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Recipient Name</span>
                    <span className="font-bold">{cert.ownerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Issue Date</span>
                    <span className="font-semibold">{cert.issueDate}</span>
                  </div>
                  {cert.expiryDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expiry Date</span>
                      <span className="font-semibold">{cert.expiryDate}</span>
                    </div>
                  )}
                </div>

                {cert.description && (
                  <div className="border-t border-border/80 pt-4">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Description</p>
                    <p className="text-xs leading-4 text-foreground/80">{cert.description}</p>
                  </div>
                )}
              </div>

              {/* Crypto Proofs Card */}
              <div className="glass-premium rounded-3xl p-6 border border-border/80 space-y-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-primary" />
                  <span>Security Audit Proofs</span>
                </h3>

                {/* Certificate ID */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-muted-foreground uppercase tracking-wider">Certificate ID</span>
                    <button
                      onClick={handleCopyId}
                      className="text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </button>
                  </div>
                  <div className="bg-white/50 p-2 border border-border rounded-xl font-mono text-[10px] text-foreground break-all select-all">
                    {cert.certificateId}
                  </div>
                </div>

                {/* SHA-256 Hash */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-muted-foreground uppercase tracking-wider">SHA-256 File Hash</span>
                    <button
                      onClick={handleCopyHash}
                      className="text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </button>
                  </div>
                  <div className="bg-white/50 p-2 border border-border rounded-xl font-mono text-[10px] text-foreground break-all select-all">
                    {cert.hash}
                  </div>
                </div>

                {/* QR Code preview */}
                <div className="flex items-center gap-4 bg-primary/5 p-3 rounded-2xl border border-primary/10">
                  <img
                    src={cert.qrCode}
                    alt="Verification QR Code"
                    className="w-16 h-16 bg-white p-1 rounded-lg border border-border shadow-xs shrink-0"
                  />
                  <div>
                    <p className="text-xs font-bold leading-none">Security QR Verified</p>
                    <p className="text-[9px] text-muted-foreground mt-1.5 leading-none">Scan with a camera to instantly check verification history logs.</p>
                  </div>
                </div>
              </div>

              {/* Share Panel */}
              <div className="glass-premium rounded-3xl p-6 border border-border/80 space-y-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Share2 className="w-4 h-4 text-primary" />
                  <span>Quick Share Access</span>
                </h3>

                <form onSubmit={handleShareSubmit} className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Recipient email..."
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    className="flex-1 bg-white border border-border rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-primary"
                    required
                    disabled={isSharing}
                  />
                  <button
                    type="submit"
                    disabled={isSharing}
                    className="bg-primary hover:bg-secondary text-white font-bold px-3 py-1.5 rounded-xl text-xs cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    Share
                  </button>
                </form>
              </div>

              {/* Verification logs Timeline */}
              <div className="glass-premium rounded-3xl p-6 border border-border/80 space-y-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>Verification logs History</span>
                </h3>

                <div className="space-y-4 max-h-48 overflow-y-auto pr-1">
                  {history.length > 0 ? (
                    history.map((log: any, i: number) => {
                      const isSuccess = log.status === "verified"
                      return (
                        <div key={i} className="flex gap-3 items-start text-xs leading-4">
                          <div className={`p-1.5 rounded-full shrink-0 ${
                            isSuccess ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                          }`}>
                            {isSuccess ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground leading-none">Status: {log.status.toUpperCase()}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">Method: {log.verificationMethod} by {log.verifiedByName}</p>
                            <span className="text-[9px] text-muted-foreground/50 font-bold block mt-0.5">
                              {new Date(log.verifiedAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="py-6 text-center text-muted-foreground">
                      <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-1.5" />
                      <p className="text-[11px] font-semibold">No verification audits logged yet.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        ) : (
          <div className="glass rounded-3xl py-20 border border-border text-center">
            <p className="text-muted-foreground">Certificate details could not be parsed.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
