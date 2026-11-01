import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const DeviceInfoPanel = ({ macAddress, status }: { macAddress: string; status: string }) => (
  <Card className="border-0 bg-white shadow-sm overflow-hidden">
    <CardHeader className="pb-3">
      <CardTitle className="text-base font-bold text-black">Device Information</CardTitle>
    </CardHeader>
    <CardContent className="pt-0">
      <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
        <div className="rounded bg-slate-50 p-3">
          <p className="font-medium text-black">MAC Address</p>
          <p className="mt-1 font-mono text-xs text-sky-600">{macAddress}</p>
        </div>
        <div className="rounded bg-slate-50 p-3">
          <p className="font-medium text-black">Status</p>
          <div className="mt-1">
          <Badge
            variant="outline"
            className={
              status === "completed"
                ? "rounded-none border-sky-600 text-sky-600"
                : "rounded-none border-slate-400 text-slate-500"
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
