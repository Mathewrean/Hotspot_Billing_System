import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const DeviceInfoPanel = ({ macAddress, status }: { macAddress: string; status: string }) => (
  <Card className="border-0 bg-white shadow-sm overflow-hidden">
    <CardHeader className="pb-3">
      <CardTitle className="text-base font-bold text-slate-900 dark:text-white">Device Information</CardTitle>
    </CardHeader>
    <CardContent className="pt-0">
      <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
        <div className="rounded bg-slate-50 p-3 dark:bg-white/5">
          <p className="font-medium text-slate-900 dark:text-white">MAC Address</p>
          <p className="mt-1 font-mono text-xs text-sky-600 dark:text-sky-400">{macAddress}</p>
        </div>
        <div className="rounded bg-slate-50 p-3 dark:bg-white/5">
          <p className="font-medium text-slate-900 dark:text-white">Status</p>
          <div className="mt-1">
          <Badge
            variant="outline"
            className={
              status === "completed"
                ? "rounded-none border-sky-600 text-sky-600 dark:border-sky-400 dark:text-sky-400"
                : "rounded-none border-slate-400 text-slate-500 dark:border-white/20 dark:text-slate-400"
            }
          >
            {status === "completed" ? "Connected" : "Not Connected"}
          </Badge>
        </div>
        </div>
      </div>
    </CardContent>
  </Card>
)

export default DeviceInfoPanel
