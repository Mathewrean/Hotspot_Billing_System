"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { apiClient, wsClient } from "@/lib/api"
import { useUserAuth } from "@/hooks/use-user-auth"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ToastProvider } from "@/components/toast-provider"
import DeviceInfoPanel from "@/components/DeviceInfoPanel"
import InfoPanel from "@/components/InfoPanel"

interface Transaction {
  id: string
  phone: string
  amount: number
  status: "completed" | "failed" | "pending" | "refunded"
  timestamp: string
  mpesaRef: string
  mpesaReceipt?: string
  expiresAt?: string | null
}

interface Notification {
  id: string
  type: "payment" | "loan" | "support"
  title: string
  body: string
  timestamp: string
  read: boolean
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [activePayment, setActivePayment] = useState<any>(null)
  const [timeRemaining, setTimeRemaining] = useState<string>("00:00:00")
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const { user, logout, loading: authLoading } = useUserAuth()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }
    fetchActivePayment()
    fetchTransactions()
    loadNotifications()
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user) return
    wsClient.connect(user.id, user.phone)
    return () => wsClient.disconnect()
  }, [user])

  let countdownInterval: NodeJS.Timeout | null = null

  const fetchActivePayment = async () => {
    try {
      const response = await apiClient.getTransactions({ status: "completed", limit: 10 })
      if (response.success && response.data?.transactions) {
        const now = new Date()
        const active = response.data.transactions.find((tx: any) => {
          if (!tx.expiresAt) return false
          return new Date(tx.expiresAt) > now
        })
        if (active) {
          setActivePayment(active)
          startCountdown(active.expiresAt)
        }
      }
    } catch (error) {
      console.error("Failed to fetch active payment:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTransactions = async () => {
    try {
      const response = await apiClient.getTransactions({ status: "all", limit: 20 })
      if (response.success && response.data?.transactions) {
        setTransactions(response.data.transactions)
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error)
    }
  }

  const startCountdown = (expiresAt: string) => {
    if (countdownInterval) clearInterval(countdownInterval)

    const updateCountdown = () => {
      const now = new Date().getTime()
      const expiry = new Date(expiresAt).getTime()
      const diff = expiry - now

      if (diff <= 0) {
        setTimeRemaining("00:00:00")
        if (countdownInterval) clearInterval(countdownInterval)
        fetchActivePayment()
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / 1000 / 60)
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeRemaining(
        `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      )
    }

    updateCountdown()
    countdownInterval = setInterval(updateCountdown, 1000)
  }

  useEffect(() => {
    return () => {
      if (countdownInterval) clearInterval(countdownInterval)
    }
  }, [])

  // Listen for real-time payment completion via WebSocket
  useEffect(() => {
    const handlePaymentCompleted = (event: CustomEvent) => {
      const { checkoutId, amount: paidAmount, expiresAt } = event.detail
      const newNotification: Notification = {
        id: `payment_${Date.now()}`,
        type: "payment",
        title: "Payment Confirmed",
        body: `Ksh ${paidAmount} — WiFi access activated`,
        timestamp: new Date().toISOString(),
        read: false,
      }
      setNotifications((prev) => [newNotification, ...prev.slice(0, 49)])

      if (expiresAt) {
        setActivePayment({
          package: "WiFi Access",
          amount: paidAmount,
          expiresAt,
          mpesaRef: checkoutId,
        } as any)
        startCountdown(expiresAt)
        fetchTransactions()
      }

      toast({
        title: "Payment confirmed!",
        description: `Ksh ${paidAmount} — You are now connected`,
      })
    }

    window.addEventListener("payment_completed", handlePaymentCompleted as EventListener)
    return () => {
      window.removeEventListener("payment_completed", handlePaymentCompleted as EventListener)
    }
  }, [])

  const loadNotifications = () => {
    const stored = localStorage.getItem("fastnet_notifications")
    if (stored) {
      try {
        setNotifications(JSON.parse(stored))
      } catch {
        // ignore
      }
    }
  }

  const saveNotifications = (next: Notification[]) => {
    localStorage.setItem("fastnet_notifications", JSON.stringify(next))
    setNotifications(next)
  }

  const markAsRead = (id: string) => {
    saveNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const dismissNotification = (id: string) => {
    saveNotifications(notifications.filter((n) => n.id !== id))
  }

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <>
      <ToastProvider />
      <div className="min-h-screen bg-white text-slate-900">
        <Header />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-16">
          <div className="max-w-4xl mx-auto">
            {/* Page Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-black">Dashboard</h1>
                <p className="text-slate-600">
                  Welcome back, {user?.username || 'User'}!
                </p>
              </div>
              <Button onClick={handleLogout} variant="outline" className="shadow-[4px_4px_0_0_rgba(0,0,0,0.1)]">
                Logout
              </Button>
            </div>

            {/* (1) Active Package + Countdown - TOP */}
            {activePayment ? (
              <Card className="mb-8 rounded-none shadow-sm border-0 bg-white border border-slate-200 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-200 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-sky-600 flex items-center justify-center shadow-[4px_4px_0_0_rgba(2,132,199,0.4)]">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <CardTitle className="text-black text-base font-bold">Active WiFi Package</CardTitle>
                      <CardDescription className="text-sky-600 text-sm font-medium">
                        {activePayment.package} • Ksh {activePayment.amount}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-sky-600">{timeRemaining}</div>
                    <div className="text-xs text-sky-600 uppercase tracking-wider">Time Remaining</div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-white/50 rounded">
                      <span className="block text-xs text-slate-500 uppercase">Status</span>
                      <Badge variant="default" className="bg-sky-100 text-sky-700 border-sky-200">
                        Active
                      </Badge>
                    </div>
                    <div className="p-3 bg-white/50 rounded">
                      <span className="block text-xs text-slate-500 uppercase">Expires At</span>
                      <span className="block font-medium text-black">
                        {new Date(activePayment.expiresAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="p-3 bg-white/50 rounded">
                      <span className="block text-xs text-slate-500 uppercase">Amount</span>
                      <span className="block font-medium text-black">
                        Ksh {activePayment.amount}
                      </span>
                    </div>
                    <div className="p-3 bg-white/50 rounded">
                      <span className="block text-xs text-slate-500 uppercase">Reference</span>
                      <span className="block font-mono text-xs font-medium text-black">
                        {activePayment.mpesaRef || activePayment.id}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="mb-8 rounded-none shadow-sm border-0 bg-white border border-slate-200">
                <CardHeader className="border-0">
                  <CardTitle className="text-black text-base font-bold">No Active Package</CardTitle>
                  <CardDescription className="text-slate-600">
                    You don't have an active WiFi package. Purchase one to get connected.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <Button
                    onClick={() => router.push("/packages")}
                    className="w-full btn-sky shadow-[4px_4px_0_0_hsl(var(--sky-600))]"
                  >
                    Browse Packages
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* (2) Notifications Panel */}
            <Card className="mb-8 rounded-none shadow-sm border-0 bg-white border border-slate-200">
              <CardHeader className="border-0 flex justify-between items-center">
                <CardTitle className="text-black text-base font-bold">Notifications</CardTitle>
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => saveNotifications([])}
                    className="text-slate-500 hover:text-sky-600"
                  >
                    Clear all
                  </Button>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-slate-500">No notifications yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markAsRead(n.id)}
                        className={`flex items-center justify-between p-3 rounded cursor-pointer transition-colors ${
                          n.read
                            ? "bg-white/30"
                            : "bg-sky-50 shadow-sm ring-1 ring-sky-200"
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${n.type === "payment" ? "text-sky-700" : "text-black"}`}>
                              {n.title}
                            </span>
                            <span className="text-xs text-slate-500">{n.type}</span>
                          </div>
                          <p className="text-sm text-slate-600 mt-0.5">{n.body}</p>
                          <span className="text-xs text-slate-400 mt-1 block">
                            {new Date(n.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            dismissNotification(n.id)
                          }}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-sky-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* (3) Quick Actions */}
            <Card className="mb-8 rounded-none shadow-sm border-0 bg-white border border-slate-200">
              <CardHeader className="border-0">
                <CardTitle className="text-black text-base font-bold">Quick Actions</CardTitle>
                <CardDescription className="text-slate-600">
                  Access your WiFi billing features
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 flex gap-3">
                <Button onClick={() => router.push("/packages")} className="flex-1 btn-sky shadow-[4px_4px_0_0_hsl(var(--sky-600))]">
                  Buy Package
                </Button>
                <Button variant="outline" onClick={() => router.push("/support")} className="flex-1 shadow-[4px_4px_0_0_rgba(0,0,0,0.1)]">
                  Get Support
                </Button>
              </CardContent>
            </Card>

            {/* (4) Transaction History - Actual payments, not loans */}
            <Card className="mb-8 rounded-none shadow-sm border-0 bg-white border border-slate-200">
              <CardHeader className="border-0 flex justify-between items-center">
                <CardTitle className="text-black text-base font-bold">Transaction History</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {loading ? (
                  <div className="text-center py-8">Loading transactions...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="pb-3 font-medium text-slate-600">Date</th>
                          <th className="pb-3 font-medium text-slate-600">Description</th>
                          <th className="pb-3 font-medium text-slate-600">Amount</th>
                          <th className="pb-3 font-medium text-slate-600">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {transactions.length > 0 ? (
                          transactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-slate-50">
                              <td className="py-3 text-black">
                                {new Date(tx.timestamp).toLocaleDateString()}
                              </td>
                              <td className="py-3 text-black">
                                {tx.mpesaRef ? `M-Pesa Payment` : `WiFi Package`}
                              </td>
                              <td className="py-3 text-black font-medium">
                                Ksh {tx.amount}
                              </td>
                              <td className="py-3">
                                <Badge variant="default" className={tx.status === "completed" ? "bg-sky-100 text-sky-700 border-sky-200" : "bg-slate-100 text-slate-700 border-slate-200 text-xs px-2 py-1 rounded-none shadow-[2px_2px_0_0_rgba(0,0,0,0.1)]"}>
                                  {tx.status}
                                </Badge>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-slate-500">
                              No transactions yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    </>
  )
}
