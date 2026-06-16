import { useGetLeadsStats, useGetRecentLeads, useHealthCheck, useListLeads } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { Link } from "wouter";
import { Activity, DollarSign, CalendarClock, Briefcase, AlertTriangle, Clock, Bell } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function DeadlineAlerts() {
  const { data: allLeads } = useListLeads();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysOut = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const alertLeads = (allLeads ?? [])
    .filter((lead) => {
      if (!lead.deadline) return false;
      if (["won", "lost", "archived"].includes(lead.status)) return false;
      const d = parseISO(lead.deadline);
      return d >= today && d <= sevenDaysOut;
    })
    .sort((a, b) => a.deadline!.localeCompare(b.deadline!));

  if (alertLeads.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-amber-500" />
        <h2 className="text-lg font-mono font-semibold tracking-tight">DEADLINE ALERTS</h2>
        <span className="font-mono text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
          {alertLeads.length} LEAD{alertLeads.length !== 1 ? "S" : ""} DUE THIS WEEK
        </span>
      </div>
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden divide-y divide-amber-500/10">
        {alertLeads.map((lead) => {
          const daysLeft = differenceInDays(parseISO(lead.deadline!), today);
          const isUrgent = daysLeft <= 2;
          const isWarning = daysLeft <= 4;

          return (
            <div key={lead.id} className="flex items-center gap-4 px-4 py-3 hover:bg-amber-500/5 transition-colors">
              <div className="shrink-0">
                {isUrgent ? (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                ) : (
                  <Clock className="h-4 w-4 text-amber-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/leads/${lead.id}`}>
                  <span className="font-mono text-sm font-medium hover:underline decoration-primary underline-offset-4 cursor-pointer truncate block">
                    {lead.title}
                  </span>
                </Link>
                <span className="font-mono text-xs text-muted-foreground">
                  {lead.issuer ?? "Unknown issuer"} &middot; {lead.category.toUpperCase()}
                  {lead.contractValue != null ? ` · ${formatCurrency(lead.contractValue)}` : ""}
                </span>
              </div>
              <div className="shrink-0 text-right space-y-0.5">
                <div
                  className={`font-mono text-sm font-bold ${
                    isUrgent ? "text-red-500" : isWarning ? "text-amber-500" : "text-blue-500"
                  }`}
                >
                  {daysLeft === 0 ? "TODAY" : daysLeft === 1 ? "TOMORROW" : `${daysLeft} DAYS`}
                </div>
                <div className="font-mono text-xs text-muted-foreground">
                  {format(parseISO(lead.deadline!), "MMM d")}
                </div>
              </div>
              <div className="shrink-0">
                <StatusBadge status={lead.status} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetLeadsStats();
  const { data: recentLeads, isLoading: recentLoading } = useGetRecentLeads();
  const { data: health } = useHealthCheck();

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

      <DeadlineAlerts />

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
