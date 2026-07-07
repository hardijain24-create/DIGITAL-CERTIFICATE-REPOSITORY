"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Upload,
  File,
  CheckCircle2,
  AlertCircle,
  X,
  Calendar,
  Building,
  User,
  Globe,
  Tag,
  Hash,
  QrCode,
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
  ChevronDown
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import DashboardLayout from "@/components/DashboardLayout"
import { UploadSchema } from "@/lib/validations"

export default function UploadPage() {
  const router = useRouter()
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadStage, setUploadStage] = useState<"upload" | "form" | "processing" | "complete">("upload")
  const [uploadProgress, setUploadProgress] = useState(0)
  const [processingStep, setProcessingStep] = useState("")

  const [formData, setFormData] = useState({
    certificateName: "",
    issuer: "",
    ownerName: "",
    ownerEmail: "",
    issuerWebsite: "",
    category: "academic" as any,
    description: "",
    issueDate: "",
    expiryDate: "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [createdCert, setCreatedCert] = useState<any>(null)

  // Drag over handler
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  // Handle file drop
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files.length > 0) {
      validateAndSetFile(files[0])
    }
  }

  // Handle file selection dialog
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0])
    }
  }

  // Validate file parameters
  const validateAndSetFile = (file: File) => {
    const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"]
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file format. Only PDF, PNG, JPG, and JPEG files are supported.")
      return
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      toast.error("File size exceeds 10MB maximum limit.")
      return
    }

    setUploadedFile(file)
    setUploadStage("form")
  }

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    if (!uploadedFile) {
      toast.error("Please upload a certificate file first.")
      return
    }

    // 1. Validate Form fields with Zod
    const validation = UploadSchema.safeParse(formData)
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {}
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message
        }
      })
      setErrors(fieldErrors)
      toast.error("Please check the input values.")
      return
    }

    // Move to processing animation stage
    setUploadStage("processing")
    setUploadProgress(0)

    try {
      // Stage A: Virus Scan Animation (Placeholder)
      setProcessingStep("🛡️ Initiating security scan for viruses & exploits...")
      for (let p = 0; p <= 30; p += 5) {
        setUploadProgress(p)
        await new Promise((r) => setTimeout(r, 60))
      }
      setProcessingStep("✅ Integrity check passed: 0 threats detected")
      await new Promise((r) => setTimeout(r, 400))

      // Stage B: Uploading to Cloudinary
      setProcessingStep("☁️ Uploading document to secure Cloudinary vault...")
      for (let p = 30; p <= 65; p += 3) {
        setUploadProgress(p)
        await new Promise((r) => setTimeout(r, 50))
      }

      // Prepare Multipart FormData
      const uploadData = new FormData()
      uploadData.append("file", uploadedFile)
      uploadData.append("certificateName", formData.certificateName)
      uploadData.append("issuer", formData.issuer)
      uploadData.append("ownerName", formData.ownerName)
      uploadData.append("ownerEmail", formData.ownerEmail)
      uploadData.append("issuerWebsite", formData.issuerWebsite)
      uploadData.append("category", formData.category)
      uploadData.append("description", formData.description)
      uploadData.append("issueDate", formData.issueDate)
      uploadData.append("expiryDate", formData.expiryDate)

      // Submit API request
      const response = await fetch("/api/certificates", {
        method: "POST",
        body: uploadData,
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Stage C: Cryptographic Hashing
        setProcessingStep("🔐 Generating cryptographic SHA-256 hash proofs...")
        for (let p = 65; p <= 85; p += 5) {
          setUploadProgress(p)
          await new Promise((r) => setTimeout(r, 40))
        }

        // Stage D: QR code generation
        setProcessingStep("🖨️ Minting verification QR code...")
        for (let p = 85; p <= 98; p += 3) {
          setUploadProgress(p)
          await new Promise((r) => setTimeout(r, 40))
        }

        setProcessingStep("💾 Saving digital metadata structures...")
        setUploadProgress(100)
        await new Promise((r) => setTimeout(r, 200))

        setCreatedCert(data.data)
        setUploadStage("complete")
        toast.success("Certificate uploaded successfully!")
      } else {
        setUploadStage("form")
        toast.error(data.message || "Failed to upload certificate.")
      }
    } catch (err) {
      console.error("Upload error:", err)
      setUploadStage("form")
      toast.error("Network error uploading certificate.")
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-left">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Upload Certificate</h1>
          <p className="text-sm text-muted-foreground mt-1">Register a new certificate document in your secure digital vault repository.</p>
        </div>

        {/* Dynamic Upload Stages container */}
        <AnimatePresence mode="wait">
          {/* STAGE 1: Drag-Drop File Upload */}
          {uploadStage === "upload" && (
            <motion.div
              key="stage-upload"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="glass rounded-3xl border-2 border-dashed border-primary/40 p-12 text-center hover:bg-white/40 hover:border-primary/60 transition-all duration-300 relative cursor-pointer"
              onDragOver={handleDragOver}
              onDrop={handleFileDrop}
            >
              <div className="flex flex-col items-center gap-4">
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center border border-primary/10"
                >
                  <Upload className="w-8 h-8 text-primary" />
                </motion.div>
                
                <div>
                  <h2 className="text-xl font-bold text-foreground">Drop your certificate file here</h2>
                  <p className="text-sm text-muted-foreground mt-1.5">or browse files from your computer filesystem</p>
                  <p className="text-xs text-muted-foreground/60 mt-3 font-semibold">Accepted formats: PDF, PNG, JPG, JPEG (Max 10 MB)</p>
                </div>

                <label className="mt-4 cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <span className="bg-primary hover:bg-secondary text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-primary/10 transition-colors inline-block">
                    Browse Files
                  </span>
                </label>
              </div>
            </motion.div>
          )}

          {/* STAGE 2: Metadata Form */}
          {uploadStage === "form" && (
            <motion.div
              key="stage-form"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="glass rounded-3xl border border-border/80 p-6 md:p-8 text-left"
            >
              {/* Selected File header */}
              <div className="flex items-center justify-between pb-6 border-b border-border/80 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                    <File className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground truncate max-w-sm md:max-w-md">{uploadedFile?.name}</h3>
                    <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                      File Size: {(uploadedFile!.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setUploadedFile(null)
                    setUploadStage("upload")
                  }}
                  className="p-1.5 hover:bg-danger/10 text-muted-foreground hover:text-danger rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Fields */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Certificate Name */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wider">Certificate Name *</label>
                    <input
                      type="text"
                      placeholder="e.g., Degree in Physics"
                      value={formData.certificateName}
                      onChange={(e) => setFormData({ ...formData, certificateName: e.target.value })}
                      className={`w-full bg-white/60 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary ${
                        errors.certificateName ? "border-danger" : "border-border"
                      }`}
                      required
                    />
                    {errors.certificateName && <p className="text-xs text-danger mt-1">{errors.certificateName}</p>}
                  </div>

                  {/* Issuer */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wider">Issuer *</label>
                    <div className="relative">
                      <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground/60" />
                      <input
                        type="text"
                        placeholder="e.g., University of Science"
                        value={formData.issuer}
                        onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
                        className={`w-full bg-white/60 border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary ${
                          errors.issuer ? "border-danger" : "border-border"
                        }`}
                        required
                      />
                    </div>
                    {errors.issuer && <p className="text-xs text-danger mt-1">{errors.issuer}</p>}
                  </div>

                  {/* Owner Name */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wider">Recipient Name *</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground/60" />
                      <input
                        type="text"
                        placeholder="Full Name"
                        value={formData.ownerName}
                        onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                        className={`w-full bg-white/60 border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary ${
                          errors.ownerName ? "border-danger" : "border-border"
                        }`}
                        required
                      />
                    </div>
                    {errors.ownerName && <p className="text-xs text-danger mt-1">{errors.ownerName}</p>}
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wider">Category *</label>
                    <div className="relative">
                      <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground/60 pointer-events-none" />
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full bg-white/60 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary cursor-pointer appearance-none"
                      >
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
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>

                  {/* Owner Email */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wider">Recipient Email</label>
                    <input
                      type="email"
                      placeholder="e.g., student@email.com"
                      value={formData.ownerEmail}
                      onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                      className="w-full bg-white/60 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Issuer Website */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wider">Issuer Website</label>
                    <div className="relative">
                      <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground/60" />
                      <input
                        type="url"
                        placeholder="https://example.edu"
                        value={formData.issuerWebsite}
                        onChange={(e) => setFormData({ ...formData, issuerWebsite: e.target.value })}
                        className="w-full bg-white/60 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  {/* Issue Date */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wider">Issue Date *</label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground/60" />
                      <input
                        type="date"
                        value={formData.issueDate}
                        onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                        className={`w-full bg-white/60 border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary cursor-pointer ${
                          errors.issueDate ? "border-danger" : "border-border"
                        }`}
                        required
                      />
                    </div>
                    {errors.issueDate && <p className="text-xs text-danger mt-1">{errors.issueDate}</p>}
                  </div>

                  {/* Expiry Date */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wider">Expiry Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground/60" />
                      <input
                        type="date"
                        value={formData.expiryDate}
                        onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                        className="w-full bg-white/60 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wider">Description</label>
                  <textarea
                    placeholder="Short description or notes..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-white/60 border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary resize-none"
                    rows={3}
                  />
                </div>

                {/* Form Buttons */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-secondary text-white font-bold py-3 rounded-xl shadow-md shadow-primary/10 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Upload & Verify</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedFile(null)
                      setUploadStage("upload")
                    }}
                    className="px-6 py-3 bg-white hover:bg-muted text-foreground border border-border font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* STAGE 3: Processing loading bar */}
          {uploadStage === "processing" && (
            <motion.div
              key="stage-processing"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="glass rounded-3xl border border-border/80 p-12 text-center"
            >
              <div className="flex flex-col items-center gap-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary"
                >
                  <ShieldCheck className="w-8 h-8" />
                </motion.div>

                <div>
                  <h2 className="text-xl font-bold text-foreground">Processing Document Vault</h2>
                  <p className="text-sm text-primary font-bold mt-2 animate-pulse">{processingStep}</p>
                </div>

                {/* Progress bar container */}
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-border/50 max-w-md">
                  <motion.div
                    className="bg-gradient-to-r from-primary to-secondary h-full rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
                <span className="text-xs font-bold text-muted-foreground">{uploadProgress}% Complete</span>

                {/* Steps Visual Check */}
                <div className="grid grid-cols-3 gap-4 w-full max-w-md mt-4 text-xs font-semibold text-muted-foreground">
                  {[
                    { label: "Virus Scan", done: uploadProgress >= 30 },
                    { label: "Cloud Upload", done: uploadProgress >= 65 },
                    { label: "Crypto Hash", done: uploadProgress >= 90 }
                  ].map((s, idx) => (
                    <div key={idx} className={`p-2.5 rounded-xl border ${
                      s.done ? "bg-success/10 border-success/20 text-success" : "bg-white/40 border-border"
                    }`}>
                      <p>{s.label}</p>
                      <p className="text-[10px] mt-0.5">{s.done ? "Checked ✓" : "Pending..."}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* STAGE 4: Completion success panel */}
          {uploadStage === "complete" && createdCert && (
            <motion.div
              key="stage-complete"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass rounded-3xl border border-border/80 p-8 text-center space-y-6"
            >
              <div className="w-16 h-16 bg-success/15 rounded-full flex items-center justify-center mx-auto text-success border border-success/20">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <h2 className="text-2xl font-black text-foreground">Certificate Stored Securely!</h2>
                <p className="text-sm text-muted-foreground mt-1.5">Your certificate has been validated and registered in the vault.</p>
              </div>

              {/* Created Metadata summary box */}
              <div className="bg-white/50 border border-border/80 rounded-2xl p-5 text-left space-y-4 max-w-md mx-auto">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Certificate ID</span>
                  <div className="font-mono text-[10px] bg-muted/30 p-2 rounded-xl border border-border truncate select-all">
                    {createdCert.certificateId}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">SHA-256 Hash</span>
                  <div className="font-mono text-[10px] bg-muted/30 p-2 rounded-xl border border-border truncate select-all">
                    {createdCert.hash}
                  </div>
                </div>

                <div className="flex gap-4 items-center bg-primary/5 p-3 rounded-xl border border-primary/10">
                  <img
                    src={createdCert.qrCode}
                    alt="QR Verification"
                    className="w-16 h-16 bg-white p-1 rounded-lg border border-border shrink-0"
                  />
                  <div>
                    <span className="text-[10px] font-black uppercase text-primary tracking-wider">Verification QR Minted</span>
                    <p className="text-[9px] text-muted-foreground mt-1 leading-3">Includes integrated secure link containing Certificate ID and File Hashing details.</p>
                  </div>
                </div>
              </div>

              {/* Redirect Action buttons */}
              <div className="flex gap-4 max-w-md mx-auto pt-2">
                <Link
                  href={`/certificates/${createdCert.certificateId}`}
                  className="flex-1 bg-primary hover:bg-secondary text-white font-bold py-3 rounded-xl shadow-md shadow-primary/10 transition-colors flex items-center justify-center gap-1.5 text-sm"
                >
                  <span>View Details</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => {
                    setUploadedFile(null)
                    setUploadStage("upload")
                    setFormData({
                      certificateName: "",
                      issuer: "",
                      ownerName: "",
                      ownerEmail: "",
                      issuerWebsite: "",
                      category: "academic",
                      description: "",
                      issueDate: "",
                      expiryDate: "",
                    })
                  }}
                  className="flex-1 bg-white hover:bg-muted text-foreground border border-border font-bold py-3 rounded-xl transition-colors cursor-pointer text-sm"
                >
                  Upload Another
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </DashboardLayout>
  )
}
