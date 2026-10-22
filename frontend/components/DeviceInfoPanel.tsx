import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const DeviceInfoPanel = ({ macAddress, status }: { macAddress: string; status: string }) => (
  <Card className="grid-panel rounded-none shadow-none">
    <CardHeader className="border-b-2 border-black">
      <CardTitle className="text-base text-black">Device Information</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 border-l border-t border-black text-sm sm:grid-cols-2">
        <div className="border-b border-r border-black p-3 font-medium">MAC Address</div>
        <div className="border-b border-r border-black p-3 font-mono text-xs">{macAddress}</div>
        <div className="border-b border-r border-black p-3 font-medium">Status</div>
        <div className="border-b border-r border-black p-3">
          <Badge
            variant="outline"
            className={
              status === "completed"
              ? "rounded-none border-black text-black"
                : "rounded-none border-black text-black"
            }
          >
            {status === "completed" ? "Connected" : "Not Connected"}
          </Badge>
        </div>
      </div>
    </CardContent>
  </Card>
)

export default DeviceInfoPanel
