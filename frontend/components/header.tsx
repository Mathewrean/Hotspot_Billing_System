"use client"

import { useState, useEffect } from "react"
import { Wifi, Menu, X, User, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuthModal } from "@/components/AuthModal"
import { useUserAuth } from "@/hooks/use-user-auth"
import Link from "next/link"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<any>(null)
  const { logout } = useUserAuth()

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

  return (
    <header className="sticky top-0 z-50 w-full border-b-2 border-black bg-white">
      <div className="site-container">
        <div className="flex min-h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="flex h-10 w-10 items-center justify-center border-2 border-black bg-black">
                <Wifi className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-black">FastNet</h1>
                <p className="text-xs text-neutral-600">WiFi billing</p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center divide-x-2 divide-black border-x-2 border-black">
            {isAuthenticated && (
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm font-medium text-black hover:bg-black hover:text-white"
              >
                Dashboard
              </Link>
            )}
            <Link
              href="/packages"
              className="px-4 py-2 text-sm font-medium text-black hover:bg-black hover:text-white"
            >
              Packages
            </Link>
            <Link
              href="/about"
              className="px-4 py-2 text-sm font-medium text-black hover:bg-black hover:text-white"
            >
              About
            </Link>
            <Link
              href="/support"
              className="px-4 py-2 text-sm font-medium text-black hover:bg-black hover:text-white"
            >
              Support
            </Link>
            {isAuthenticated ? (
              <div className="flex items-center">
                {user?.username === 'Denis2' && (
                  <Link
                    href="/admin"
                    className="px-4 py-2 text-sm font-medium text-black hover:bg-black hover:text-white"
                  >
                    Admin Panel
                  </Link>
                )}
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  size="sm"
                  className="h-auto rounded-none px-4 py-2 text-black hover:bg-black hover:text-white"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-semibold text-black hover:bg-black hover:text-white"
              >
                Login
              </Link>
            )}
          </nav>

          {/* Mobile navigation toggle */}
          <div className="flex items-center space-x-2 md:hidden">
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

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t-2 border-black py-3">
            <nav className="grid grid-cols-2 border-l-2 border-t-2 border-black">
              {isAuthenticated && (
                <Link
                  href="/dashboard"
                  className="border-b-2 border-r-2 border-black p-3 text-sm font-medium text-black hover:bg-black hover:text-white"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
              )}
              <Link
                href="/packages"
                className="border-b-2 border-r-2 border-black p-3 text-sm font-medium text-black hover:bg-black hover:text-white"
                onClick={() => setIsMenuOpen(false)}
              >
                Packages
              </Link>
              <Link
                href="/about"
                className="border-b-2 border-r-2 border-black p-3 text-sm font-medium text-black hover:bg-black hover:text-white"
                onClick={() => setIsMenuOpen(false)}
              >
                About
              </Link>
              <Link
                href="/support"
                className="border-b-2 border-r-2 border-black p-3 text-sm font-medium text-black hover:bg-black hover:text-white"
                onClick={() => setIsMenuOpen(false)}
              >
                Support
              </Link>

              {isAuthenticated ? (
                <div className="col-span-2 flex flex-col">
                  {user?.username === 'Denis2' && (
                    <Link
                      href="/admin"
                      className="border-b-2 border-r-2 border-black p-3 text-sm font-medium text-black hover:bg-black hover:text-white"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Admin Panel
                    </Link>
                  )}
                  <Button
                    onClick={() => {
                      handleLogout()
                      setIsMenuOpen(false)
                    }}
                    variant="ghost"
                    size="sm"
                    className="justify-start rounded-none border-b-2 border-r-2 border-black p-3 text-black hover:bg-black hover:text-white"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="col-span-2 border-b-2 border-r-2 border-black p-3 text-sm font-semibold text-black hover:bg-black hover:text-white"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Login
                </Link>
              )}

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
