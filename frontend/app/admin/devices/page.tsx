"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Wifi, UserPlus, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiClient } from "@/lib/api"
import { useUserAuth } from "@/hooks/use-user-auth"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ToastProvider } from "@/components/toast-provider"
import { toast } from "sonner"

const DURATION_OPTIONS = [
  { value: "1Hr", label: "1 Hour - Ksh 10" },
  { value: "4Hrs", label: "4 Hours - Ksh 15" },
  { value: "12Hrs", label: "12 Hours - Ksh 20" },
  { value: "24Hrs", label: "24 Hours - Ksh 30" },
]

export default function AdminDevicesPage() {
  const [macAddress, setMacAddress] = useState("")
  const [durationLabel, setDurationLabel] = useState("24Hrs")
  const [submitting, setSubmitting] = useState(false)
  const { user, logout } = useUserAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!macAddress) {
      toast.error("MAC address is required")
      return
    }
    setSubmitting(true)
    try {
      const response = await apiClient.manualWhitelistDevice(macAddress, durationLabel)
      if (response.success) {
        toast.success("Device provisioned", { description: `MAC ${macAddress} whitelisted for ${durationLabel}` })
        setMacAddress("")
      } else {
        toast.error(response.error || "Provisioning failed")
      }
    } catch (error) {
      toast.error("Provisioning failed")
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <>
      <ToastProvider />
      <div className="min-h-screen bg-white text-black">
        <Header />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-black">Manual Device Provisioning</h1>
            <p className="text-slate-600">
              Manually whitelist a customer's MAC address for WiFi access. Use for cash payments or offline scenarios.
            </p>
          </div>

          <Card className="border border-black bg-white shadow-sm max-w-lg">
            <CardHeader>
              <CardTitle className="text-base font-bold text-black">Whitelist MAC Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label className="font-medium text-black">MAC Address</Label>
                  <Input
                    placeholder="e.g. 00:00:5E:B8:22:8A"
                    value={macAddress}
                    onChange={(e) => setMacAddress(e.target.value.toUpperCase())}
                    className="uppercase"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-medium text-black">Package Duration</Label>
                  <select
                    value={durationLabel}
                    onChange={(e) => setDurationLabel(e.target.value)}
                    className="border border-black bg-white py-2 px-4 rounded text-sm focus:outline-none w-full"
                  >
                    {DURATION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-black text-white hover:bg-slate-800 shadow-[4px_4px_0_0_black] active:shadow-none active:translate-y-1"
                >
                  {submitting ? "Provisioning..." : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Whitelist Device
                    </>
                  )}
                </Button>
              </form>

              <div className="pt-4 border-t border-black">
                <p className="text-xs text-slate-500 mb-3">
                  <span className="font-bold text-black">Tip:</span> Use this for cash payments or when the M-Pesa callback
                  fails but the customer has paid. The device will be granted instant WiFi access via the router IP-binding.
                </p>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    </>
  )
}
