import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Zap, Shield, Globe } from "lucide-react"

const InfoPanel = () => (
  <Card className="border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-800">
    <CardHeader>
      <CardTitle className="text-base text-slate-900 dark:text-white">How It Works</CardTitle>
    </CardHeader>
    <CardContent className="space-y-5 pt-0">
      <div className="flex items-start gap-3">
        <Zap className="mt-1 h-5 w-5 text-sky-600" />
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">Pay with M-Pesa</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">Select a package and pay instantly via M-Pesa STK Push.</p>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <Shield className="mt-1 h-5 w-5 text-sky-600" />
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">Instant Access</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">Your device is whitelisted on the router immediately after payment.</p>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <Globe className="mt-1 h-5 w-5 text-sky-600" />
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">Auto-Reconnect</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">Returning devices with active sessions reconnect automatically.</p>
        </div>
      </div>
    </CardContent>
  </Card>
)

export default InfoPanel
