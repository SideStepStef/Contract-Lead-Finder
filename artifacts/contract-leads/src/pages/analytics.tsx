import { useMemo } from "react";
import { useListLeads, useGetLeadsStats } from "@workspace/api-client-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, FunnelChart, Funnel, LabelList,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { TrendingUp, Target, BarChart2, Award, Trophy, XCircle, ExternalLink } from "lucide-react";
import { format } from "date-fns";

const STATUS_ORDER = ["new", "researching", "bidding", "won", "lost", "archived"];

const STATUS_COLORS: Record<string, string> = {
  new: "#3b82f6",
  researching: "#f59e0b",
  bidding: "#8b5cf6",
  won: "#22c55e",
  lost: "#ef4444",
  archived: "#6b7280",
};

const CATEGORY_COLORS = [
  "#3b82f6", "#8b5cf6", "#f59e0b", "#22c55e", "#ef4444",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316",
];

function fmt(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

function fmtFull(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string; sub?: string; color?: string }) {
  return (
    <Card className="rounded-xl border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xs font-mono font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-3xl font-bold font-mono" style={color ? { color } : undefined}>{value}</div>
        {sub && <div className="text-xs font-mono text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; fill?: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg font-mono text-xs space-y-1">
      {label && <div className="font-bold text-foreground mb-1">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          {p.fill && <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.fill }} />}
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-bold">{typeof p.value === "number" && p.value > 10000 ? fmt(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

const MEDAL = ["🥇", "🥈", "🥉"];

export default function Analytics() {
  const { data: leads = [] } = useListLeads();
  const { data: stats } = useGetLeadsStats();

  const activeLeads = leads.filter(l => !["won", "lost", "archived"].includes(l.status));

  const winRate = useMemo(() => {
    const decided = leads.filter(l => l.status === "won" || l.status === "lost");
    if (!decided.length) return 0;
    return Math.round((leads.filter(l => l.status === "won").length / decided.length) * 100);
  }, [leads]);

  const avgValue = useMemo(() => {
    const withValue = leads.filter(l => l.contractValue != null);
    if (!withValue.length) return 0;
    return withValue.reduce((s, l) => s + (l.contractValue ?? 0), 0) / withValue.length;
  }, [leads]);

  const statusData = useMemo(() =>
    STATUS_ORDER
      .map(s => ({
        status: s.toUpperCase(),
        count: leads.filter(l => l.status === s).length,
        fill: STATUS_COLORS[s],
      }))
      .filter(s => s.count > 0),
    [leads]
  );

  const categoryData = useMemo(() => {
    const map: Record<string, { count: number; value: number }> = {};
    for (const l of leads) {
      if (!map[l.category]) map[l.category] = { count: 0, value: 0 };
      map[l.category].count++;
      map[l.category].value += l.contractValue ?? 0;
    }
    return Object.entries(map)
      .map(([name, d]) => ({ name, count: d.count, value: d.value }))
      .sort((a, b) => b.value - a.value);
  }, [leads]);

  const winLossData = useMemo(() => {
    const won = leads.filter(l => l.status === "won").length;
    const lost = leads.filter(l => l.status === "lost").length;
    if (!won && !lost) return [];
    return [
      { name: "WON", value: won, fill: STATUS_COLORS.won },
      { name: "LOST", value: lost, fill: STATUS_COLORS.lost },
    ];
  }, [leads]);

  const funnelData = useMemo(() => [
    { name: "NEW", value: leads.filter(l => l.status === "new").length, fill: STATUS_COLORS.new },
    { name: "RESEARCHING", value: leads.filter(l => l.status === "researching").length, fill: STATUS_COLORS.researching },
    { name: "BIDDING", value: leads.filter(l => l.status === "bidding").length, fill: STATUS_COLORS.bidding },
    { name: "WON", value: leads.filter(l => l.status === "won").length, fill: STATUS_COLORS.won },
  ].filter(d => d.value > 0), [leads]);

  // Top wins: won leads sorted by contract value desc
  const topWins = useMemo(() =>
    leads
      .filter(l => l.status === "won")
      .sort((a, b) => (b.contractValue ?? 0) - (a.contractValue ?? 0)),
    [leads]
  );

  // Close reason breakdown
  const lostWithReason = useMemo(() =>
    leads.filter(l => l.status === "lost" && l.closeReason),
    [leads]
  );
  const wonWithReason = useMemo(() =>
    leads.filter(l => l.status === "won" && l.closeReason),
    [leads]
  );

  const totalWonValue = useMemo(() =>
    topWins.reduce((s, l) => s + (l.contractValue ?? 0), 0),
    [topWins]
  );

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-mono tracking-tight">PIPELINE ANALYTICS</h1>
        <p className="text-muted-foreground mt-1 text-sm font-mono">
          Performance breakdown across {leads.length} leads
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Target} label="WIN RATE" value={`${winRate}%`} sub="of decided leads" />
        <StatCard icon={TrendingUp} label="AVG CONTRACT VALUE" value={fmt(avgValue)} sub="across all leads" />
        <StatCard icon={BarChart2} label="ACTIVE IN PIPELINE" value={String(activeLeads.length)} sub="not yet decided" />
        <StatCard icon={Award} label="TOTAL WON" value={String(topWins.length)} sub={`of ${leads.length} total leads`} color="#22c55e" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-xl border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-mono text-sm">LEADS BY STATUS</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={statusData} barCategoryGap="30%">
                <XAxis dataKey="status" tick={{ fontFamily: "monospace", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontFamily: "monospace", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-mono text-sm">WIN / LOSS RATIO</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {winLossData.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center text-muted-foreground font-mono text-sm">
                No won or lost leads yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={winLossData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                    {winLossData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Legend formatter={(value) => <span style={{ fontFamily: "monospace", fontSize: 11 }}>{value}</span>} />
                  <Tooltip content={<CustomTooltip />} />
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" style={{ fontFamily: "monospace", fontWeight: "bold", fontSize: 22, fill: "hsl(var(--foreground))" }}>
                    {winRate}%
                  </text>
                  <text x="50%" y="50%" dy={20} textAnchor="middle" dominantBaseline="middle" style={{ fontFamily: "monospace", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}>
                    WIN RATE
                  </text>
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-mono text-sm">PIPELINE VALUE BY CATEGORY</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={categoryData} layout="vertical" barCategoryGap="25%">
                <XAxis type="number" tick={{ fontFamily: "monospace", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmt} />
                <YAxis type="category" dataKey="name" tick={{ fontFamily: "monospace", fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="value" name="Value" radius={[0, 4, 4, 0]}>
                  {categoryData.map((_, i) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-mono text-sm">CONVERSION FUNNEL</CardTitle>
          </CardHeader>
          <CardContent>
            {funnelData.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center text-muted-foreground font-mono text-sm">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <FunnelChart>
                  <Tooltip content={<CustomTooltip />} />
                  <Funnel dataKey="value" data={funnelData} isAnimationActive>
                    {funnelData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    <LabelList
                      position="center"
                      fill="#fff"
                      style={{ fontFamily: "monospace", fontSize: 12, fontWeight: "bold" }}
                      formatter={(v: number) => `${funnelData.find(d => d.value === v)?.name ?? ""} (${v})`}
                    />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Leads per category */}
      <Card className="rounded-xl border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="font-mono text-sm">LEADS PER CATEGORY</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={categoryData} barCategoryGap="30%">
              <XAxis dataKey="name" tick={{ fontFamily: "monospace", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontFamily: "monospace", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
              <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]}>
                {categoryData.map((_, i) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* TOP WINS LEADERBOARD */}
      <Card className="rounded-xl border-border bg-card">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <CardTitle className="font-mono text-sm flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              TOP WINS LEADERBOARD
            </CardTitle>
            {topWins.length > 0 && (
              <span className="font-mono text-xs text-muted-foreground">
                {fmtFull(totalWonValue)} TOTAL
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {topWins.length === 0 ? (
            <div className="py-10 text-center">
              <Trophy className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
              <p className="font-mono text-sm text-muted-foreground">NO WINS YET</p>
              <p className="font-mono text-xs text-muted-foreground/60 mt-1">Mark a lead as WON to see it ranked here</p>
            </div>
          ) : (
            <div className="space-y-0 divide-y divide-border/50">
              {topWins.map((lead, i) => (
                <div key={lead.id} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                  {/* Rank */}
                  <div className="w-10 shrink-0 flex items-center justify-center">
                    {i < 3 ? (
                      <span className="text-xl" title={`Rank #${i + 1}`}>{MEDAL[i]}</span>
                    ) : (
                      <span className="font-mono text-sm font-bold text-muted-foreground">#{i + 1}</span>
                    )}
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/leads/${lead.id}`} className="font-medium text-sm hover:underline decoration-primary underline-offset-4 truncate">
                        {lead.title}
                      </Link>
                      <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                    </div>
                    <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground flex-wrap">
                      {lead.issuer && <span>{lead.issuer}</span>}
                      <span className="px-1.5 py-0.5 rounded bg-muted">{lead.category.toUpperCase()}</span>
                      {lead.deadline && (
                        <span>Closed {format(new Date(lead.deadline), "MMM yyyy")}</span>
                      )}
                    </div>
                    {lead.closeReason && (
                      <div className="flex items-start gap-1.5 mt-1.5">
                        <Trophy className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-green-700 dark:text-green-400 font-mono italic leading-snug">
                          "{lead.closeReason}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Value */}
                  <div className="shrink-0 text-right">
                    <div className="font-mono font-bold text-base text-green-600 dark:text-green-400">
                      {lead.contractValue != null ? fmtFull(lead.contractValue) : "—"}
                    </div>
                    {totalWonValue > 0 && lead.contractValue != null && (
                      <div className="text-xs font-mono text-muted-foreground mt-0.5">
                        {Math.round((lead.contractValue / totalWonValue) * 100)}% of wins
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CLOSE REASON INSIGHTS */}
      {(wonWithReason.length > 0 || lostWithReason.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Why we win */}
          {wonWithReason.length > 0 && (
            <Card className="rounded-xl border-border bg-card">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="font-mono text-sm flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-green-500" />
                  WHY WE WIN
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {wonWithReason.map((lead) => (
                  <div key={lead.id} className="flex items-start gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/15">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <Link href={`/leads/${lead.id}`} className="font-mono text-xs font-semibold hover:underline decoration-primary underline-offset-2 truncate block">
                        {lead.title}
                      </Link>
                      <p className="font-mono text-xs text-muted-foreground mt-0.5 leading-snug italic">
                        "{lead.closeReason}"
                      </p>
                    </div>
                    {lead.contractValue != null && (
                      <span className="font-mono text-xs font-bold text-green-600 dark:text-green-400 shrink-0">{fmt(lead.contractValue)}</span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Why we lose */}
          {lostWithReason.length > 0 && (
            <Card className="rounded-xl border-border bg-card">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="font-mono text-sm flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-destructive" />
                  WHY WE LOSE
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {lostWithReason.map((lead) => (
                  <div key={lead.id} className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/15">
                    <div className="w-1.5 h-1.5 rounded-full bg-destructive mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <Link href={`/leads/${lead.id}`} className="font-mono text-xs font-semibold hover:underline decoration-primary underline-offset-2 truncate block">
                        {lead.title}
                      </Link>
                      <p className="font-mono text-xs text-muted-foreground mt-0.5 leading-snug italic">
                        "{lead.closeReason}"
                      </p>
                    </div>
                    {lead.contractValue != null && (
                      <span className="font-mono text-xs font-bold text-destructive shrink-0">{fmt(lead.contractValue)}</span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
