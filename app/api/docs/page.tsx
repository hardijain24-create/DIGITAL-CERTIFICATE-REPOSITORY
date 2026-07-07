"use client"

import Link from "next/link"
import { Shield, Code2, Server, Database } from "lucide-react"

export default function APIDocs() {
  const endpoints = [
    {
      category: "Authentication",
      icon: Shield,
      endpoints: [
        { method: "POST", path: "/api/auth/register", desc: "Register new user" },
        { method: "POST", path: "/api/auth/login", desc: "Login user" },
      ],
    },
    {
      category: "Certificates",
      icon: Server,
      endpoints: [
        { method: "GET", path: "/api/certificates", desc: "List all certificates" },
        { method: "POST", path: "/api/certificates", desc: "Upload certificate" },
        { method: "GET", path: "/api/certificates/[id]", desc: "Get certificate" },
        { method: "PUT", path: "/api/certificates/[id]", desc: "Update certificate" },
        { method: "DELETE", path: "/api/certificates/[id]", desc: "Delete certificate" },
      ],
    },
    {
      category: "Verification",
      icon: Code2,
      endpoints: [
        { method: "POST", path: "/api/verify", desc: "Verify certificate" },
        { method: "GET", path: "/api/verify/[id]", desc: "Get verification history" },
      ],
    },
    {
      category: "System",
      icon: Database,
      endpoints: [
        { method: "GET", path: "/api/health", desc: "Health check" },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <Link href="/" className="flex items-center gap-2 mb-8">
            <Shield className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold text-primary">DCRS API Documentation</span>
          </Link>
          <p className="text-muted-foreground text-lg">Digital Certificate Repository System - REST API Reference</p>
        </div>

        {/* API Endpoints */}
        <div className="space-y-8">
          {endpoints.map((section, i) => (
            <div key={i} className="glass rounded-xl border border-border p-8">
              <div className="flex items-center gap-3 mb-6">
                <section.icon className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold text-foreground">{section.category}</h2>
              </div>

              <div className="space-y-4">
                {section.endpoints.map((ep, j) => (
                  <div key={j} className="p-4 bg-white/50 rounded-lg">
                    <div className="flex items-center gap-4 mb-2">
                      <span className={`px-3 py-1 rounded font-bold text-white text-sm ${
                        ep.method === "GET" ? "bg-blue-500" :
                        ep.method === "POST" ? "bg-green-500" :
                        ep.method === "PUT" ? "bg-amber-500" :
                        "bg-red-500"
                      }`}>
                        {ep.method}
                      </span>
                      <code className="flex-1 font-mono text-foreground">{ep.path}</code>
                    </div>
                    <p className="text-muted-foreground">{ep.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Setup Info */}
        <div className="mt-12 glass rounded-xl border border-border p-8 bg-blue-50/40">
          <h2 className="text-2xl font-bold text-foreground mb-4">Getting Started</h2>
          <div className="space-y-4 text-foreground">
            <p>1. <strong>Register an account:</strong> POST to /api/auth/register</p>
            <p>2. <strong>Upload certificates:</strong> POST to /api/certificates</p>
            <p>3. <strong>Verify certificates:</strong> POST to /api/verify with certificate ID</p>
            <p>4. <strong>Manage permissions:</strong> Share certificates with controlled access</p>
          </div>
        </div>

        {/* Test Endpoints */}
        <div className="mt-8 glass rounded-xl border border-border p-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">Test Endpoints</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <a
              href="/api/health"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 bg-white/50 rounded-lg hover:bg-white/80 transition-all"
            >
              <p className="font-bold text-primary">Health Check</p>
              <code className="text-sm text-muted-foreground">/api/health</code>
            </a>
            <Link
              href="/certificates"
              className="p-4 bg-white/50 rounded-lg hover:bg-white/80 transition-all"
            >
              <p className="font-bold text-primary">View Certificates</p>
              <code className="text-sm text-muted-foreground">/certificates</code>
            </Link>
            <Link
              href="/upload"
              className="p-4 bg-white/50 rounded-lg hover:bg-white/80 transition-all"
            >
              <p className="font-bold text-primary">Upload Certificate</p>
              <code className="text-sm text-muted-foreground">/upload</code>
            </Link>
            <Link
              href="/verify"
              className="p-4 bg-white/50 rounded-lg hover:bg-white/80 transition-all"
            >
              <p className="font-bold text-primary">Verify Certificate</p>
              <code className="text-sm text-muted-foreground">/verify</code>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-muted-foreground">
          <p>For more details, see <code className="bg-white/50 px-2 py-1 rounded">DCRS_SETUP.md</code></p>
        </div>
      </div>
    </div>
  )
}
