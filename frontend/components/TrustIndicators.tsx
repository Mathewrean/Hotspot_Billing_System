import { Shield, Users, Globe } from "lucide-react"

const TrustIndicators = () => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
    <div className="flex items-center gap-3 p-4 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 shadow-sm">
      <Shield className="h-6 w-6 text-sky-600 dark:text-sky-400" />
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Secure Payment</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">M-Pesa protected</p>
      </div>
    </div>
    <div className="flex items-center gap-3 p-4 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 shadow-sm">
      <Users className="h-6 w-6 text-sky-600 dark:text-sky-400" />
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-white">10,000+ Users</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">Trusted daily</p>
      </div>
    </div>
    <div className="flex items-center gap-3 p-4 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 shadow-sm">
      <Globe className="h-6 w-6 text-sky-600 dark:text-sky-400" />
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-white">99.9% Uptime</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">Reliable connection</p>
      </div>
    </div>
  </div>
)

export default TrustIndicators
