"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Wifi, WifiOff, RefreshCw, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { apiClient } from "@/lib/api"
import { useUserAuth } from "@/hooks/use-user-auth"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ToastProvider } from "@/components/toast-provider"
import { toast } from "sonner"

interface Session {
  macAddress: string
  ipAddress: string
  user: string
  uptime: string
}

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const { user, logout } = useUserAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push("/admin/login")
      return
    }
    fetchSessions()
  }, [user, router])

  const fetchSessions = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getActiveSessions()
      if (response.success && response.data) {
        setSessions(response.data)
      }
    } catch (error) {
      console.error("Error fetching sessions:", error)
      toast.error("Failed to load sessions")
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async (macAddress: string) => {
    if (!confirm(`Disconnect device ${macAddress}?`)) return
    try {
      const response = await apiClient.disconnectSession(macAddress)
      if (response.success) {
        toast.success("Device disconnected")
        await fetchSessions()
      } else {
        toast.error(response.error || "Disconnect failed")
      }
    } catch (error) {
      toast.error("Disconnect failed")
    }
  }

  const filteredSessions = sessions.filter((s) =>
    s.macAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.ipAddress.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!user) return null

  return (
    <>
      <ToastProvider />
      <div className="min-h-screen bg-white text-black">
        <Header />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-black">Active Sessions</h1>
              <p className="text-slate-600">
                Manage devices currently connected to the FastNet hotspot
              </p>
            </div>
            <Button onClick={fetchSessions} size="sm" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by MAC or IP address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Sessions Table */}
          <Card className="border border-black bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold text-black">
                Connected Devices ({filteredSessions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black"></div>
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
                        <th className="pb-3 font-semibold text-slate-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredSessions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500">
                            No active sessions
                          </td>
                        </tr>
                      ) : (
                        filteredSessions.map((session) => (
                          <TableRow key={session.macAddress}>
                            <TableCell className="font-mono text-xs font-medium text-black">
                              {session.macAddress}
                            </TableCell>
                            <TableCell className="text-xs text-slate-700">
                              {session.ipAddress}
                            </TableCell>
                            <TableCell className="text-xs text-slate-700">
                              {session.user}
                            </TableCell>
                            <TableCell className="text-xs text-slate-700">
                              {session.uptime || "—"}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <WifiOff className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleDisconnect(session.macAddress)}
                                    className="text-red-700"
                                  >
                                    <WifiOff className="h-4 w-4 mr-2" />
                                    Revoke Access
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    </>
  )
}
