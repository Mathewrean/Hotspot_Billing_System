"use client"

import { Shield } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
      <div className="site-container py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden border-2 border-black bg-sky-600">
                <Image
                  src="/logo.svg"
                  alt="FastNet"
                  width={40}
                  height={40}
                />
              </div>
              <span className="text-lg font-bold text-black dark:text-white">FastNet</span>
            </div>
            <p className="max-w-xs text-sm text-slate-600 dark:text-slate-400">
              Providing fast, reliable internet access with seamless M-Pesa integration for easy payments.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Quick Links</h3>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/packages" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                  Packages
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/support" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                  Support
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                  Admin
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Support</h3>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/support#help" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/support#contact" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/support#terms" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/support#privacy" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Contact</h3>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>Email: madibivemarojoma@gmail.com</li>
              <li>Phone: 0701618286</li>
              <li>Available 24/7</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 dark:border-white/10 p-4 text-sm sm:flex-row">
          <p className="text-slate-600 dark:text-slate-400">© {currentYear} FastNet. All rights reserved.</p>
          <div className="flex items-center gap-2 font-medium">
            <Shield className="h-4 w-4 text-slate-600 dark:text-slate-400" /> Secure payments
          </div>
        </div>
      </div>
    </footer>
  )
}
