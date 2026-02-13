import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Database, Loader2, AlertCircle } from "lucide-react";
import type { ConnectionStatus } from "@shared/schema";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ConnectionBadge() {
  const { data: status, isLoading } = useQuery<ConnectionStatus>({
    queryKey: ["/api/connection/status"],
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <Badge variant="secondary" className="gap-1.5">
        <Loader2 className="w-3 h-3 animate-spin" />
        Connecting...
      </Badge>
    );
  }

  if (!status?.connected) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex">
            <Badge variant="destructive" className="gap-1.5" data-testid="badge-connection-error">
              <AlertCircle className="w-3 h-3" />
              Disconnected
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs text-xs">{status?.error || "Unable to connect to MySQL"}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="inline-flex">
          <Badge variant="secondary" className="gap-1.5" data-testid="badge-connection-status">
            <Database className="w-3 h-3" />
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-status-online" />
            Connected
          </Badge>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">{status.host} / {status.database}</p>
      </TooltipContent>
    </Tooltip>
  );
}
