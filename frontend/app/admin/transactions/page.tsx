"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Download, RefreshCw, Eye } from "lucide-react"
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

interface Transaction {
  id: string
  phone: string
  amount: number
  package: string
  status: "completed" | "failed" | "pending" | "refunded"
  timestamp: string
  mpesaRef: string
  mpesaReceipt?: string
  expiresAt?: string | null
}

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const { user, logout } = useUserAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push("/admin/login")
      return
    }
    fetchTransactions()
  }, [user, router, searchTerm, statusFilter, currentPage])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getTransactions({
        search: searchTerm,
        status: statusFilter,
        page: currentPage,
        limit: 20,
      })
      if (response.success && response.data) {
        setTransactions(response.data.transactions)
        setTotalPages(response.data.totalPages)
      }
    } catch (error) {
      console.error("Error fetching transactions:", error)
      toast.error("Failed to load transactions")
    } finally {
      setLoading(false)
    }
  }

  const handleForceWhitelist = async (tx: Transaction) => {
    if (!confirm(`Force-whitelist MAC for ${tx.phone}?`)) return
    try {
      const response = await apiClient.manualWhitelistDevice(tx.phone, "24Hrs")
      if (response.success) {
        toast.success("Device whitelisted")
        await fetchTransactions()
      } else {
        toast.error(response.error || "Force-whitelist failed")
      }
    } catch (error) {
      toast.error("Force-whitelist failed")
    }
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, string> = {
      completed: "bg-green-50 text-green-700 border-green-100",
      failed: "bg-red-50 text-red-700 border-red-100",
      pending: "bg-yellow-50 text-yellow-700 border-yellow-100",
      refunded: "bg-blue-50 text-blue-700 border-blue-100",
    }
    return <Badge className={`border ${config[status] || config.pending}`}>{status}</Badge>
  }

  const filteredTx = transactions.filter((tx) => {
    const matchesSearch =
      tx.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.mpesaRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || tx.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (!user) return null

  return (
    <>
      <ToastProvider />
      <div className="min-h-screen bg-white text-black">
        <Header />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-black">M-Pesa Transaction Ledger</h1>
              <p className="text-slate-600">
                Full audit log of all M-Pesa STK push payments
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchTransactions} size="sm" variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={() => {
                  toast.info("Exporting transaction data...")
                }}
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by phone, transaction ID, or M-Pesa reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="min-w-[200px]">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-black bg-white py-2 px-4 rounded text-sm focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
          </div>

          {/* Transactions Table */}
          <Card className="border border-black bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold text-black">Transactions ({filteredTx.length})</CardTitle>
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
                        <th className="pb-3 font-semibold text-slate-600">Transaction ID</th>
                        <th className="pb-3 font-semibold text-slate-600">Phone</th>
                        <th className="pb-3 font-semibold text-slate-600">Amount</th>
                        <th className="pb-3 font-semibold text-slate-600">Status</th>
                        <th className="pb-3 font-semibold text-slate-600">M-Pesa Ref</th>
                        <th className="pb-3 font-semibold text-slate-600">Timestamp</th>
                        <th className="pb-3 font-semibold text-slate-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredTx.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500">
                            No transactions found
                          </td>
                        </tr>
                      ) : (
                        filteredTx.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell className="font-mono text-xs font-medium text-black">
                              {tx.id}
                            </TableCell>
                            <TableCell className="text-xs text-slate-700">{tx.phone}</TableCell>
                            <TableCell className="text-xs font-medium text-black">
                              Ksh {tx.amount}
                            </TableCell>
                            <TableCell>{getStatusBadge(tx.status)}</TableCell>
                            <TableCell className="font-mono text-xs text-slate-700">
                              {tx.mpesaRef}
                            </TableCell>
                            <TableCell className="text-xs text-slate-700">
                              {new Date(tx.timestamp).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleForceWhitelist(tx)}
                                    disabled={tx.status !== "completed"}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Force Whitelist MAC
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
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-black">
                  <Button variant="outline" onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>
                    Previous
                  </Button>
                  <span className="text-xs text-slate-600">Page {currentPage} of {totalPages}</span>
                  <Button variant="outline" onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
                    Next
                  </Button>
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
