"use client"

import { Shield } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t-2 border-black bg-white">
      <div className="site-container py-8">
        <div className="grid grid-cols-1 border-l-2 border-t-2 border-black md:grid-cols-4">
          {/* Company Info */}
          <div className="grid-cell space-y-4">
            <div className="flex items-center space-x-2">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden border-2 border-black">
                <Image
                  src="/logo.svg"
                  alt="FastNet"
                  width={40}
                  height={40}
                />
              </div>
              <span className="text-lg font-bold text-black">FastNet</span>
            </div>
            <p className="max-w-xs text-sm text-neutral-600">
              Providing fast, reliable internet access with seamless M-Pesa integration for easy payments.
            </p>
          </div>

          {/* Quick Links */}
          <div className="grid-cell space-y-4">
            <h3 className="text-sm font-semibold text-black">Quick Links</h3>
            <ul className="space-y-2 text-sm text-neutral-600">
              <li>
                <Link href="/packages" className="hover:text-black">
                  Packages
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-black">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/support" className="hover:text-black">
                  Support
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-black">
                  Admin
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="grid-cell space-y-4">
            <h3 className="text-sm font-semibold text-black">Support</h3>
            <ul className="space-y-2 text-sm text-neutral-600">
              <li>
                <Link href="/support#help" className="hover:text-black">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/support#contact" className="hover:text-black">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/support#terms" className="hover:text-black">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/support#privacy" className="hover:text-black">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="grid-cell space-y-4">
            <h3 className="text-sm font-semibold text-black">Contact</h3>
            <ul className="space-y-2 text-sm text-neutral-600">
              <li>Email: madibivemarojoma@gmail.com</li>
              <li>Phone: 0701618286</li>
              <li>Available 24/7</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-x-2 border-b-2 border-black p-4 text-sm sm:flex-row">
          <p className="text-neutral-600">© {currentYear} FastNet. All rights reserved.</p>
          <div className="flex items-center gap-2 font-medium">
            <Shield className="h-4 w-4" /> Secure payments
          </div>
        </div>
      </div>
    </footer>
  )
}
