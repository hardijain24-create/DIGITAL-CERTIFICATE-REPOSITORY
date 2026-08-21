"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard,
  FileText,
  Upload,
  ShieldCheck,
  User,
  ShieldAlert,
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  ChevronRight,
  Command,
  HelpCircle,
  Settings,
  Plus
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const commandPaletteRef = useRef<HTMLDivElement>(null)

  // System Notifications State
  const [notifications, setNotifications] = useState([
    { id: 1, title: "New Certificate Uploaded", desc: "AWS Certified Architect certificate was added.", time: "10 mins ago", read: false },
    { id: 2, title: "Verification Checked", desc: "Academic degree verified successfully by a guest.", time: "2 hours ago", read: false },
    { id: 3, title: "Share Link Generated", desc: "Shared Physics Certificate with Prof. Smith.", time: "1 day ago", read: false }
  ])

  const hasUnreadNotifications = notifications.some(n => !n.read)

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    toast.success("All notifications marked as read.")
  }

  // Sidebar Links
  const links = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Certificates", href: "/certificates", icon: FileText },
    { name: "Upload", href: "/upload", icon: Upload },
    { name: "Verification", href: "/verify", icon: ShieldCheck },
    { name: "Profile", href: "/profile", icon: User },
  ]

  // Read User details on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const stored = localStorage.getItem("user")
        if (stored) {
          setUser(JSON.parse(stored))
        } else {
          const res = await fetch("/api/auth/profile")
          if (res.ok) {
            const data = await res.json()
            if (data.success && data.data) {
              setUser(data.data)
              localStorage.setItem("user", JSON.stringify(data.data))
            }
          }
        }
      } catch (e) {
        console.error("Error loading user details", e)
      }
    }
    loadUser()
  }, [])

  // Listen for Ctrl+K command shortcut and Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        setIsCommandPaletteOpen((prev) => !prev)
      }
      if (e.key === "Escape") {
        setIsCommandPaletteOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Close command palette on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (commandPaletteRef.current && !commandPaletteRef.current.contains(e.target as Node)) {
        setIsCommandPaletteOpen(false)
      }
    }
    if (isCommandPaletteOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isCommandPaletteOpen])

  // Handle Logout
  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" })
      if (response.ok) {
        localStorage.removeItem("user")
        localStorage.removeItem("token")
        toast.success("Successfully logged out.")
        router.push("/login")
      } else {
        toast.error("Logout failed. Please try again.")
      }
    } catch (err) {
      toast.error("Network error during logout.")
    }
  }

  // Generate dynamic breadcrumb path
  const getBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean)
    return ["Home", ...segments.map((s) => s.charAt(0).toUpperCase() + s.slice(1))]
  }

  // Quick Action Navigation inside Command Palette
  const handleCommandNavigate = (href: string) => {
    setIsCommandPaletteOpen(false)
    router.push(href)
  }

  return (
    <div className="min-h-screen bg-background flex text-foreground font-sans">
      {/* Sidebar - Desktop */}
      <aside className="w-64 glass border-r border-border/80 fixed h-full z-40 hidden md:flex flex-col justify-between py-6 px-4">
        <div>
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 px-3 mb-8">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-primary/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">DCRS Repository</span>
          </Link>

          {/* Nav Links */}
          <nav className="space-y-1.5">
            {links.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition-all group ${
                    isActive
                      ? "bg-primary text-white shadow-md shadow-primary/10"
                      : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 transition-transform group-hover:scale-105 ${isActive ? "text-white" : "text-primary"}`} />
                    <span>{link.name}</span>
                  </div>
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="w-1.5 h-1.5 bg-white rounded-full"
                    />
                  )}
                </Link>
              )
            })}

            {/* Admin link - only visible if role is admin */}
            {user?.role === "admin" && (
              <Link
                href="/admin"
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition-all group ${
                  pathname === "/admin"
                    ? "bg-primary text-white shadow-md shadow-primary/10"
                    : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShieldAlert className={`w-5 h-5 ${pathname === "/admin" ? "text-white" : "text-danger"}`} />
                  <span>Admin Panel</span>
                </div>
              </Link>
            )}
          </nav>
        </div>

        {/* User profile bottom item */}
        <div className="space-y-3 pt-6 border-t border-border/80">
          <div className="flex items-center gap-3 px-3 py-1">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold shadow-md shadow-primary/10">
              {user?.name.charAt(0) || "U"}
            </div>
            <div className="truncate">
              <p className="text-sm font-semibold truncate leading-4">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.role.toUpperCase()}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-danger font-medium hover:bg-danger/5 rounded-xl transition-colors text-left"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <header className="fixed top-0 right-0 left-0 md:left-64 z-30 glass border-b border-border/80 px-6 py-3.5 flex items-center justify-between gap-4">
          {/* Burger menu for mobile */}
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-1.5 md:hidden hover:bg-primary/5 text-muted-foreground rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Breadcrumbs (Desktop) */}
          <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
            {getBreadcrumbs().map((bc, index, arr) => (
              <div key={bc} className="flex items-center gap-1.5">
                <span className={index === arr.length - 1 ? "text-foreground font-semibold" : ""}>
                  {bc}
                </span>
                {index < arr.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground/50" />}
              </div>
            ))}
          </div>

          {/* Global search (Desktop Ctrl+K) */}
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="hidden sm:flex items-center justify-between gap-3 bg-white/50 border border-border/85 rounded-xl px-3 py-1.5 w-64 text-left text-sm text-muted-foreground hover:border-primary/40 hover:bg-white/80 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground/75" />
              <span>Search repository...</span>
            </div>
            <div className="flex items-center gap-0.5 bg-muted px-1.5 py-0.5 rounded text-[10px] font-bold border border-border">
              <Command className="w-3 h-3" />
              <span>K</span>
            </div>
          </button>

          {/* Actions: Notifications, Avatar, Quick Upload */}
          <div className="flex items-center gap-3">
            {/* Quick upload button */}
            <Link
              href="/upload"
              className="bg-primary hover:bg-secondary text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-primary/10 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden lg:inline">Quick Upload</span>
            </Link>

            {/* Notifications panel toggle */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsNotificationsOpen(!isNotificationsOpen)
                  setIsProfileOpen(false)
                }}
                className={`p-2 rounded-xl border border-border/50 hover:bg-white/80 transition-colors relative ${
                  isNotificationsOpen ? "bg-white border-primary/30" : "bg-white/50"
                }`}
              >
                <Bell className="w-5 h-5 text-muted-foreground" />
                {hasUnreadNotifications && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full ring-2 ring-white"></span>
                )}
              </button>

              {/* Notifications Dropdown */}
              <AnimatePresence>
                {isNotificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2.5 w-80 glass-premium rounded-2xl p-4 border border-border shadow-xl z-50"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-border">
                      <span className="font-bold text-sm">Notifications</span>
                      <button 
                        onClick={handleMarkAllRead} 
                        className="text-xs text-primary hover:underline font-semibold cursor-pointer"
                      >
                        Mark all read
                      </button>
                    </div>
                    <div className="space-y-3 mt-3 max-h-60 overflow-y-auto">
                      {notifications.map((notif) => (
                        <div key={notif.id} className={`text-left py-1 pb-2 border-b border-border/40 last:border-0 transition-colors ${!notif.read ? "bg-primary/5 px-2.5 py-1 rounded-xl" : ""}`}>
                          <p className="text-xs font-bold text-foreground leading-4">{notif.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-3.5">{notif.desc}</p>
                          <span className="text-[9px] text-muted-foreground/60 font-semibold block mt-1">{notif.time}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Menu Toggle */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsProfileOpen(!isProfileOpen)
                  setIsNotificationsOpen(false)
                }}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold shadow-md shadow-primary/15 hover:scale-102 transition-transform cursor-pointer"
              >
                {user?.name.charAt(0) || "U"}
              </button>

              {/* Profile Dropdown */}
              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2.5 w-56 glass-premium rounded-2xl p-3 border border-border shadow-xl z-50 text-left"
                  >
                    <div className="px-2 py-1.5 border-b border-border/80 pb-2.5">
                      <p className="text-xs text-muted-foreground uppercase font-bold">Signed in as</p>
                      <p className="text-sm font-semibold truncate leading-4 mt-0.5">{user?.name}</p>
                      <p className="text-xs text-muted-foreground truncate leading-3">{user?.email}</p>
                    </div>
                    <div className="py-1 mt-1.5 space-y-0.5">
                      <Link
                        href="/profile"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2.5 px-2 py-2 text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                      >
                        <User className="w-4 h-4 text-primary" />
                        <span>My Profile</span>
                      </Link>
                      <Link
                        href="/profile?tab=settings"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2.5 px-2 py-2 text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                      >
                        <Settings className="w-4 h-4 text-primary" />
                        <span>Settings</span>
                      </Link>
                      <button
                        onClick={() => {
                          setIsProfileOpen(false)
                          handleLogout()
                        }}
                        className="w-full flex items-center gap-2.5 px-2 py-2 text-sm text-danger hover:bg-danger/5 rounded-lg transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page Inner Container */}
        <main className="flex-1 pt-24 pb-12 px-6 bg-transparent">
          {children}
        </main>
      </div>

      {/* Mobile Sidebar Slide Drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 md:hidden"
            />
            {/* Sliding drawer panel */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0.1, duration: 0.4 }}
              className="fixed inset-y-0 left-0 w-72 bg-white/95 backdrop-blur-md border-r border-border/80 p-6 z-50 flex flex-col justify-between md:hidden"
            >
              <div>
                {/* Logo and close */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-7 h-7 text-primary animate-pulse" />
                    <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">DCRS Repo</span>
                  </div>
                  <button
                    onClick={() => setIsMobileOpen(false)}
                    className="p-1.5 hover:bg-primary/5 rounded-lg text-muted-foreground transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Nav list */}
                <nav className="space-y-1.5">
                  {links.map((link) => {
                    const Icon = link.icon
                    const isActive = pathname === link.href
                    return (
                      <Link
                        key={link.name}
                        href={link.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition-all ${
                          isActive
                            ? "bg-primary text-white shadow-md shadow-primary/10"
                            : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-primary"}`} />
                          <span>{link.name}</span>
                        </div>
                      </Link>
                    )
                  })}

                  {user?.role === "admin" && (
                    <Link
                      href="/admin"
                      onClick={() => setIsMobileOpen(false)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition-all ${
                        pathname === "/admin"
                          ? "bg-primary text-white shadow-md shadow-primary/10"
                          : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <ShieldAlert className={`w-5 h-5 ${pathname === "/admin" ? "text-white" : "text-danger"}`} />
                        <span>Admin Panel</span>
                      </div>
                    </Link>
                  )}
                </nav>
              </div>

              {/* Bottom profile info */}
              <div className="space-y-3 pt-6 border-t border-border">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
                    {user?.name.charAt(0) || "U"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold truncate leading-4">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.role.toUpperCase()}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsMobileOpen(false)
                    handleLogout()
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-danger font-medium hover:bg-danger/5 rounded-xl transition-colors text-left"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Ctrl+K Command Palette Modal */}
      <AnimatePresence>
        {isCommandPaletteOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.2 }}
              ref={commandPaletteRef}
              className="w-full max-w-lg glass-premium rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Search bar inside command palette */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/80">
                <Search className="w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Type a command or search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-0 outline-none text-sm text-foreground placeholder:text-muted-foreground focus:ring-0"
                  autoFocus
                />
                <button
                  onClick={() => setIsCommandPaletteOpen(false)}
                  className="p-1 hover:bg-muted rounded-md text-xs text-muted-foreground font-bold border border-border bg-white"
                >
                  ESC
                </button>
              </div>

              {/* Suggestions */}
              <div className="p-3 max-h-80 overflow-y-auto space-y-3.5">
                {/* Navigation Suggestions */}
                <div>
                  <h3 className="text-[10px] text-muted-foreground uppercase font-bold px-2.5 mb-1.5">Navigation</h3>
                  <div className="space-y-0.5">
                    {(() => {
                      const filtered = [
                        { name: "Go to Dashboard", href: "/dashboard", icon: LayoutDashboard },
                        { name: "View Certificates", href: "/certificates", icon: FileText },
                        { name: "Upload Certificate", href: "/upload", icon: Upload },
                        { name: "Verify Certificates", href: "/verify", icon: ShieldCheck },
                        { name: "View Profile", href: "/profile", icon: User },
                        ...(user?.role === "admin" ? [{ name: "Admin Panel", href: "/admin", icon: ShieldAlert }] : []),
                      ].filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()))

                      if (filtered.length === 0) {
                        return <p className="text-xs text-muted-foreground px-2.5 py-2">No matching commands found.</p>
                      }

                      return filtered.map((item) => (
                        <button
                          key={item.name}
                          onClick={() => handleCommandNavigate(item.href)}
                          className="w-full flex items-center gap-3 px-2.5 py-2 text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-colors text-left cursor-pointer"
                        >
                          <item.icon className="w-4 h-4 text-primary" />
                          <span>{item.name}</span>
                        </button>
                      ))
                    })()}
                  </div>
                </div>

                {/* Helpful guides */}
                <div className="border-t border-border pt-3">
                  <h3 className="text-[10px] text-muted-foreground uppercase font-bold px-2.5 mb-1.5">System Commands</h3>
                  <div className="space-y-0.5">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-2.5 py-2 text-sm text-danger hover:bg-danger/5 rounded-xl transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out from Account</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
