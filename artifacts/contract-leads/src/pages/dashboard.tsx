import { useGetLeadsStats, useGetRecentLeads, useHealthCheck } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { Link } from "wouter";
import { Activity, DollarSign, CalendarClock, Briefcase } from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetLeadsStats();
  const { data: recentLeads, isLoading: recentLoading } = useGetRecentLeads();
  const { data: health } = useHealthCheck();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-mono tracking-tight">PIPELINE DASHBOARD</h1>
          <p className="text-muted-foreground mt-1 text-sm font-mono flex items-center gap-2">
            <span>SYS.STATUS:</span>
            <span className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${health?.status === "ok" ? "bg-green-500" : "bg-red-500"}`} />
              {health?.status === "ok" ? "ONLINE" : "OFFLINE"}
            </span>
          </p>
        </div>
        <Link href="/leads/new" className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors">
          + NEW LEAD
        </Link>
      </div>

      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-xl" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="rounded-xl border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium font-mono">TOTAL LEADS</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium font-mono">PIPELINE VALUE</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono">{formatCurrency(stats.totalPipelineValue)}</div>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium font-mono">ACTIVE BIDS</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono">
                {stats.byStatus.find((s) => s.status === "bidding")?.count || 0}
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-border bg-card text-primary-foreground bg-primary">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium font-mono text-primary-foreground/80">UPCOMING DEADLINES</CardTitle>
              <CalendarClock className="h-4 w-4 text-primary-foreground/80" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono">{stats.upcomingDeadlines}</div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="space-y-4">
        <h2 className="text-lg font-mono font-semibold tracking-tight">RECENT INTEL</h2>
        <div className="border rounded-xl bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-mono text-xs">ID</TableHead>
                <TableHead className="font-mono text-xs">TITLE</TableHead>
                <TableHead className="font-mono text-xs">ISSUER</TableHead>
                <TableHead className="font-mono text-xs">VALUE</TableHead>
                <TableHead className="font-mono text-xs">DEADLINE</TableHead>
                <TableHead className="font-mono text-xs">STATUS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground font-mono">Loading data...</TableCell>
                </TableRow>
              ) : recentLeads?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground font-mono">No recent leads found.</TableCell>
                </TableRow>
              ) : (
                recentLeads?.map((lead) => (
                  <TableRow key={lead.id} className="border-border group">
                    <TableCell className="font-mono text-muted-foreground text-xs">{lead.id.toString().padStart(4, "0")}</TableCell>
                    <TableCell className="font-medium max-w-[300px] truncate">
                      <Link href={`/leads/${lead.id}`} className="hover:underline decoration-primary underline-offset-4">
                        {lead.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{lead.issuer || "—"}</TableCell>
                    <TableCell className="font-mono">{lead.contractValue ? formatCurrency(lead.contractValue) : "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{lead.deadline ? format(new Date(lead.deadline), "MMM dd, yyyy") : "—"}</TableCell>
                    <TableCell><StatusBadge status={lead.status} /></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
