"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import {
  ArrowRight,
  Shield,
  Lock,
  Zap,
  Share2,
  Check,
  QrCode,
  Clock,
  Database,
  Cpu,
  FileSpreadsheet,
  CheckCircle,
  HelpCircle
} from "lucide-react"

export default function LandingPage() {
  // Stagger animation container
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -top-40 -left-40 pointer-events-none" />
      <div className="absolute w-[600px] h-[600px] bg-accent/15 rounded-full blur-[140px] top-[20%] -right-40 pointer-events-none" />
      <div className="absolute w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[120px] bottom-0 left-[20%] pointer-events-none" />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-border/80">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
              <Shield className="w-4.5 h-4.5" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">DCRS Repository</span>
          </div>
          <div className="flex gap-4 items-center">
            <Link href="/login" className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
              Login
            </Link>
            <Link
              href="/register"
              className="bg-primary hover:bg-secondary text-white text-xs font-bold px-4.5 py-2.5 rounded-xl shadow-md shadow-primary/10 transition-all cursor-pointer"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-36 pb-20 px-6 max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="text-left space-y-6"
          >
            <span className="inline-block bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full border border-primary/20">
              ⚡ Military-Grade Security
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-foreground leading-[1.1] tracking-tight">
              Secure Digital <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent font-black">Certificate Vault</span>
            </h1>
            <p className="text-base text-muted-foreground leading-6 max-w-lg">
              Store, manage, verify, and share credentials securely. DCRS provides instantly verifiable certificate vaults powered by SHA-256 hashing and QR code technologies.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/register"
                className="bg-primary hover:bg-secondary text-white px-8 py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/15 transition-all flex items-center gap-2 group cursor-pointer"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/login"
                className="border border-border bg-white hover:bg-slate-50 text-foreground px-8 py-3.5 rounded-xl font-bold text-sm transition-all"
              >
                Live Demo
              </Link>
            </div>
          </motion.div>

          {/* Floating dashboard preview card illustration (Desktop only) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative lg:block"
          >
            <div className="glass rounded-3xl p-5 border border-border/80 shadow-2xl relative overflow-hidden bg-white/70">
              {/* Header preview */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-danger/70" />
                  <div className="w-3 h-3 rounded-full bg-warning/75" />
                  <div className="w-3 h-3 rounded-full bg-success/80" />
                </div>
                <div className="w-32 h-4 bg-slate-100 rounded-lg" />
              </div>

              {/* Grid content preview */}
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Total", val: "24", color: "text-primary" },
                    { label: "Verified", val: "22", color: "text-success" },
                    { label: "Shared", val: "8", color: "text-accent-foreground" }
                  ].map((stat, i) => (
                    <div key={i} className="bg-slate-50/60 p-3 rounded-xl border border-border/50 text-left">
                      <p className="text-[9px] uppercase font-bold text-muted-foreground">{stat.label}</p>
                      <p className={`text-xl font-extrabold mt-1 ${stat.color}`}>{stat.val}</p>
                    </div>
                  ))}
                </div>

                <div className="border border-border/80 rounded-2xl p-4 bg-slate-50/40 text-left flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center text-xl">🎓</div>
                    <div>
                      <p className="text-xs font-bold leading-none">B.Sc. Degree Certificate</p>
                      <p className="text-[10px] text-muted-foreground mt-1">University of Science</p>
                    </div>
                  </div>
                  <span className="bg-success/15 text-success text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                    Verified ✓
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Live Architecture Section */}
      <section className="py-20 px-6 bg-white/30 border-y border-border/80 relative z-10">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-[10px] font-black text-primary uppercase tracking-wider">Flow Diagram</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">Live System Architecture</h2>
            <p className="text-sm text-muted-foreground">Interactive transactional path between services, databases, and cryptographic validation protocols.</p>
          </div>

          {/* SVG Connection diagram */}
          <div className="glass rounded-3xl p-6 md:p-8 border border-border/80 bg-white/70 max-w-4xl mx-auto overflow-x-auto">
            <div className="min-w-[700px] p-4 relative">
              <svg className="w-full h-44 absolute inset-0 pointer-events-none" viewBox="0 0 800 176">
                {/* Connection lines */}
                <path d="M 120 88 L 240 88" stroke="var(--primary)" strokeWidth="2.5" fill="none" className="line-draw opacity-60" />
                
                <path d="M 320 88 C 360 88, 380 44, 440 44" stroke="var(--primary)" strokeWidth="2.5" fill="none" className="line-draw opacity-60" />
                <path d="M 320 88 C 360 88, 380 132, 440 132" stroke="var(--primary)" strokeWidth="2.5" fill="none" className="line-draw opacity-60" />

                <path d="M 520 44 C 580 44, 600 88, 640 88" stroke="var(--primary)" strokeWidth="2.5" fill="none" className="line-draw opacity-60" />
                <path d="M 520 132 C 580 132, 600 88, 640 88" stroke="var(--primary)" strokeWidth="2.5" fill="none" className="line-draw opacity-60" />
              </svg>

              <div className="flex justify-between items-center relative z-10 h-32">
                {/* Node 1: React Client */}
                <div className="flex flex-col items-center w-24">
                  <div className="w-16 h-16 bg-white border-2 border-primary rounded-2xl flex items-center justify-center text-primary shadow-sm hover:scale-105 transition-transform">
                    <Cpu className="w-7 h-7" />
                  </div>
                  <span className="text-[10px] font-black text-foreground mt-2 uppercase tracking-wide">React Client</span>
                </div>

                {/* Node 2: Next.js Server */}
                <div className="flex flex-col items-center w-24">
                  <div className="w-16 h-16 bg-white border-2 border-primary rounded-2xl flex items-center justify-center text-primary shadow-sm hover:scale-105 transition-transform">
                    <Database className="w-7 h-7" />
                  </div>
                  <span className="text-[10px] font-black text-foreground mt-2 uppercase tracking-wide">Next.js API</span>
                </div>

                {/* Split Nodes */}
                <div className="flex flex-col justify-between h-full w-24">
                  {/* Cloudinary */}
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 bg-white border-2 border-primary rounded-2xl flex items-center justify-center text-primary shadow-sm hover:scale-105 transition-transform">
                      ☁️
                    </div>
                    <span className="text-[8px] font-bold text-foreground mt-1 uppercase">Cloudinary Vault</span>
                  </div>

                  {/* MongoDB Atlas */}
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 bg-white border-2 border-primary rounded-2xl flex items-center justify-center text-primary shadow-sm hover:scale-105 transition-transform">
                      🍃
                    </div>
                    <span className="text-[8px] font-bold text-foreground mt-1 uppercase">MongoDB Metadata</span>
                  </div>
                </div>

                {/* Node 4: Cryptography & QR Verification */}
                <div className="flex flex-col items-center w-28">
                  <div className="w-16 h-16 bg-white border-2 border-primary rounded-2xl flex items-center justify-center text-primary shadow-sm hover:scale-105 transition-transform">
                    <QrCode className="w-7 h-7" />
                  </div>
                  <span className="text-[10px] font-black text-foreground mt-2 uppercase tracking-wide">QR Verification</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 max-w-6xl mx-auto relative z-10">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
          <span className="text-[10px] font-black text-primary uppercase tracking-wider">Features</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">Full System Architecture</h2>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {[
            {
              icon: Lock,
              title: "SHA-256 Proof Hashing",
              desc: "Every certificate undergoes cryptographic SHA-256 hash checks to block document tampering."
            },
            {
              icon: QrCode,
              title: "Instantly Verifiable QRs",
              desc: "Embedded QR codes allow third parties to quickly verify authenticity logs with a scan."
            },
            {
              icon: Share2,
              title: "Granular Share Limits",
              desc: "Allocate distinct read or download permissions to emails with automatic link expiration."
            },
            {
              icon: Clock,
              title: "Detailed Audit Trails",
              desc: "Tracks and documents login logs, sharing activities, verifications, and deletion events."
            },
            {
              icon: Shield,
              title: "JWT Cookie Sessions",
              desc: "Secure login tokenization utilizing HttpOnly SameSite cookie constraints."
            },
            {
              icon: Database,
              title: "Mongoose Data Modeling",
              desc: "Structured schemas, relational indexes, and constraints using MongoDB Atlas Cloud."
            }
          ].map((feat, i) => (
            <motion.div
              key={i}
              variants={item}
              className="glass rounded-2xl p-6 border border-border/80 hover:border-primary/20 hover:scale-[1.01] transition-all text-left"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
                <feat.icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-foreground mb-1.5">{feat.title}</h3>
              <p className="text-xs text-muted-foreground leading-4">{feat.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Research Motivation & Benefits */}
      <section className="py-20 px-6 bg-slate-50/50 border-t border-border/80 relative z-10">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-[10px] font-black text-primary uppercase tracking-wider">Motivation</span>
            <h2 className="text-3xl font-extrabold text-foreground tracking-tight">Research Motivation & Benefits</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left text-xs leading-4.5">
            <div className="glass rounded-3xl p-6 border border-border space-y-3">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-primary" />
                <span>The Problem Statement</span>
              </h3>
              <p className="text-muted-foreground">
                Academic and professional credentials are often forged or altered in transit. Traditional verification requires manual registrar requests, which can take days.
              </p>
              <p className="text-muted-foreground">
                DCRS aims to solve this by creating an instant, cloud-secured digital certificate vault with double-hashing checks to detect document tampering immediately.
              </p>
            </div>

            <div className="glass rounded-3xl p-6 border border-border space-y-3">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success" />
                <span>Strategic Benefits</span>
              </h3>
              <ul className="space-y-2 text-muted-foreground list-disc pl-4">
                <li>Eliminates registrar manual checks via instant QR/hash validation API.</li>
                <li>Ensures file integrity via strict SHA-256 cryptographic check steps.</li>
                <li>Secures third-party access control with custom sharing links.</li>
                <li>Fully transparent with system-wide activity logging audit trails.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border bg-white/20 relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
          <p>&copy; 2026 DCRS. Secure Digital Certificate Repository. All rights reserved.</p>
          <div className="flex gap-4 font-semibold">
            <Link href="/login" className="hover:text-primary transition-colors">Demo</Link>
            <Link href="/register" className="hover:text-primary transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
