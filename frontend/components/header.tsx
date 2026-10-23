"use client"

import { useState, useEffect } from "react"
import { Wifi, Menu, X, User, LogOut, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuthModal } from "@/components/AuthModal"
import { useUserAuth } from "@/hooks/use-user-auth"
import Link from "next/link"
import { usePathname } from "next/navigation"

const navLinks = [
  { href: "/packages", label: "Packages" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/about", label: "About" },
  { href: "/support", label: "Support" },
]

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<any>(null)
  const { logout } = useUserAuth()
  const pathname = usePathname()

  useEffect(() => {
    const token = localStorage.getItem('user_token')
    const userData = localStorage.getItem('user_data')
    if (token && userData) {
      setIsAuthenticated(true)
      setUser(JSON.parse(userData))
    }
  }, [])

  const handleAuthSuccess = (user: any, token: string) => {
    setShowAuthModal(false)
    setIsAuthenticated(true)
    setUser(user)
  }

  const handleLogout = () => {
    logout()
    setIsAuthenticated(false)
    setUser(null)
  }

  const isActive = (href: string) => pathname === href

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 backdrop-blur">
      <div className="site-container">
        <div className="flex min-h-14 items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2">
              <div className="flex h-9 w-9 items-center justify-center border-2 border-black bg-sky-600">
                <Wifi className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-black dark:text-white">FastNet</h1>
                <p className="text-xs text-sky-600 dark:text-sky-400 font-medium">WiFi billing</p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-5 py-2 text-sm font-medium transition-all ${
                  isActive(link.href)
                    ? "bg-sky-600 text-white shadow-[4px_4px_0_0_hsl(var(--sky-600))]"
                    : "text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  size="sm"
                  className="h-auto rounded-none px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-sky-600 hover:text-white hover:shadow-[4px_4px_0_0_hsl(var(--sky-600))] transition-all"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            )}
            {!isAuthenticated && (
              <Link
                href="/login"
                className="px-5 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400"
              >
                Login
              </Link>
            )}
          </nav>

          {/* Mobile navigation toggle */}
          <div className="flex items-center md:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-none border-2 border-black text-black"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation - slide out overlay */}
        {isMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
        )}
        {isMenuOpen && (
          <div className="fixed inset-y-0 left-0 z-50 w-full sm:w-72 bg-white dark:bg-slate-800 shadow-2xl transform transition-transform duration-300 translate-x-0 sm:translate-x-0 border-r border-slate-200 dark:border-white/10">
            <div className="p-6 border-b border-slate-200 dark:border-white/10">
              <Link href="/" className="flex items-center space-x-2">
                <div className="flex h-9 w-9 items-center justify-center border-2 border-black bg-sky-600">
                  <Wifi className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-black dark:text-white">FastNet</h1>
                </div>
              </Link>
            </div>
            <nav className="px-6 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block px-5 py-3 text-sm font-medium transition-all ${
                    isActive(link.href)
                      ? "bg-sky-600 text-white shadow-[4px_4px_0_0_hsl(var(--sky-600))]"
                      : "text-slate-600 dark:text-slate-300 hover:bg-sky-600/10 dark:hover:bg-sky-600/20 hover:text-sky-600 dark:hover:text-sky-400"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-6 pb-4 border-t border-slate-200 dark:border-white/10">
                {isAuthenticated ? (
                  <Button
                    onClick={() => { handleLogout(); setIsMenuOpen(false) }}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start rounded-none px-5 py-3 text-slate-600 dark:text-slate-300 hover:bg-sky-600 hover:text-white hover:shadow-[4px_4px_0_0_hsl(var(--sky-600))] transition-all"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                ) : (
                  <Link
                    href="/login"
                    className="block px-5 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      </div>
    </header>
  )
}
