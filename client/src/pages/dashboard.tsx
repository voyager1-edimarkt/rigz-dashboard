import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="flex items-center justify-center h-full w-full bg-background" data-testid="status-page">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="flex flex-col items-center gap-6 pt-10 pb-10">
          <div className="flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-title">Sales Analyser</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-lg font-medium" data-testid="text-status">Server Status</span>
            <Badge variant="default" className="bg-green-600 text-white no-default-hover-elevate" data-testid="badge-online">Online</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
