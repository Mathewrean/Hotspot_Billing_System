"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DollarSign, Activity, Users, Wifi, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { apiClient, wsClient } from "@/lib/api"
import { useUserAuth } from "@/hooks/use-user-auth"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ToastProvider } from "@/components/toast-provider"
import { toast } from "sonner"

interface DashboardStats {
  totalRevenue: number
  totalVouchers: number
  completedPayments: number
  activeSessions: number
  routerOnline: boolean
  routerStatus: any
  activeDevices: any[]
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const { user, logout } = useUserAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push("/admin/login")
      return
    }
    fetchStats()
    wsClient.connect()
    return () => wsClient.disconnect()
  }, [user, router])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getAdminDashboardStats()
      if (response.success && response.data) {
        setStats(response.data)
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
      toast.error("Failed to load dashboard stats")
    } finally {
      setLoading(false)
    }
  }

  const refreshStats = async () => {
    await fetchStats()
    toast.success("Stats refreshed")
  }

  if (!user) return null

  return (
    <>
      <ToastProvider />
      <div className="min-h-screen bg-white text-black">
        <Header />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-black">Admin Dashboard</h1>
              <p className="text-slate-600">FastNet WiFi Hotspot Management</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                className={
                  stats?.routerOnline
                    ? "bg-green-50 text-green-700 border-green-100"
                    : "bg-red-50 text-red-700 border-red-100"
                }
              >
                {stats?.routerOnline ? "Router Online" : "Router Offline"}
              </Badge>
              <Button onClick={refreshStats} size="sm" variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={handleLogout} variant="outline">
                Logout
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black"></div>
            </div>
          ) : (
            <>
              {/* Metrics Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="border border-black bg-white shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-sm font-semibold text-slate-600">Total Revenue</CardTitle>
                    <DollarSign className="h-5 w-5 text-slate-400" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-black">Ksh {stats.totalRevenue.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">{stats.completedPayments} payments</p>
                  </CardContent>
                </Card>

                <Card className="border border-black bg-white shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-sm font-semibold text-slate-600">Active Sessions</CardTitle>
                    <Activity className="h-5 w-5 text-slate-400" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-black">{stats.activeSessions}</p>
                    <p className="text-xs text-slate-500">devices online</p>
                  </CardContent>
                </Card>

                <Card className="border border-black bg-white shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-sm font-semibold text-slate-600">Total Vouchers</CardTitle>
                    <Users className="h-5 w-5 text-slate-400" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-black">{stats.totalVouchers.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">lifetime sales</p>
                  </CardContent>
                </Card>

                <Card className="border border-black bg-white shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-sm font-semibold text-slate-600">Router Status</CardTitle>
                    <Wifi className="h-5 w-5 text-slate-400" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-black">
                      {stats.routerOnline ? "Online" : "Offline"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {stats.routerOnline ? "Healthy" : "Connection lost"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Active Devices Preview */}
              <Card className="border border-black bg-white shadow-sm mb-8">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-black">Active Devices</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.activeDevices.length === 0 ? (
                    <div className="py-8 text-center text-slate-500">
                      No active devices on the network
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-black">
                            <th className="pb-3 font-semibold text-slate-600">MAC Address</th>
                            <th className="pb-3 font-semibold text-slate-600">IP Address</th>
                            <th className="pb-3 font-semibold text-slate-600">User</th>
                            <th className="pb-3 font-semibold text-slate-600">Uptime</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {stats.activeDevices.map((device: any) => (
                            <tr key={device.macAddress}>
                              <td className="py-3 font-mono text-xs text-black">{device.macAddress}</td>
                              <td className="py-3 text-xs text-slate-700">{device.ipAddress}</td>
                              <td className="py-3 text-xs text-slate-700">{device.user || "Unknown"}</td>
                              <td className="py-3 text-xs text-slate-700">{device.uptime || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </main>
        <Footer />
      </div>
    </>
  )

  function handleLogout() {
    logout()
    router.push("/admin/login")
  }
}
