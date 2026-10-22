import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Zap, Shield, Globe } from "lucide-react"

const InfoPanel = () => (
  <Card className="grid-panel rounded-none shadow-none">
    <CardHeader className="border-b-2 border-black">
      <CardTitle className="text-base text-black">Why FastNet</CardTitle>
    </CardHeader>
    <CardContent className="divide-y-2 divide-black p-0">
      <div className="flex items-start gap-3 p-5">
        <Zap className="mt-1 h-5 w-5" />
        <div>
          <h3 className="font-semibold text-black">Fast connection</h3>
          <p className="text-sm text-neutral-600">High-speed internet up to 5 Mbps</p>
        </div>
      </div>
      <div className="flex items-start gap-3 p-5">
        <Shield className="mt-1 h-5 w-5" />
        <div>
          <h3 className="font-semibold text-black">Secure payments</h3>
          <p className="text-sm text-neutral-600">Protected M-Pesa transactions</p>
        </div>
      </div>
      <div className="flex items-start gap-3 p-5">
        <Globe className="mt-1 h-5 w-5" />
        <div>
          <h3 className="font-semibold text-black">Reliable network</h3>
          <p className="text-sm text-neutral-600">99.9% uptime guarantee</p>
        </div>
      </div>
    </CardContent>
  </Card>
)

export default InfoPanel
