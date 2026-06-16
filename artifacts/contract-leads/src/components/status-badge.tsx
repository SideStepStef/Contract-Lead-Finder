import { Badge } from "@/components/ui/badge";
import { LeadStatus } from "@workspace/api-client-react/src/generated/api.schemas";

export function StatusBadge({ status }: { status: LeadStatus }) {
  const colors: Record<LeadStatus, string> = {
    new: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
    researching: "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20",
    bidding: "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20",
    won: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
    lost: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
    archived: "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20",
  };

  return (
    <Badge className={`uppercase text-xs font-mono border-0 tracking-wider ${colors[status]}`}>
      {status}
    </Badge>
  );
}
