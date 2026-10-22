import { Shield, Users, Globe } from "lucide-react"

const TrustIndicators = () => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
    <div className="grid-cell flex items-center gap-3">
      <Shield className="h-6 w-6" />
      <div>
        <p className="text-sm font-semibold">Secure Payment</p>
        <p className="text-xs text-neutral-600">M-Pesa protected</p>
      </div>
    </div>
    <div className="grid-cell flex items-center gap-3">
      <Users className="h-6 w-6" />
      <div>
        <p className="text-sm font-semibold">10,000+ Users</p>
        <p className="text-xs text-neutral-600">Trusted daily</p>
      </div>
    </div>
    <div className="grid-cell flex items-center gap-3">
      <Globe className="h-6 w-6" />
      <div>
        <p className="text-sm font-semibold">99.9% Uptime</p>
        <p className="text-xs text-neutral-600">Reliable connection</p>
      </div>
    </div>
  </div>
)

export default TrustIndicators
