import { useState, useRef } from "react";
import {
  useListLeads, useListCategories, useUpdateLead,
  getListLeadsQueryKey, getGetLeadsStatsQueryKey, getGetRecentLeadsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search, Plus, Loader2, Download, FileText, Sheet,
  LayoutList, Columns3, Calendar, DollarSign, Building2,
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { exportCSV, exportPDF } from "@/lib/export";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type LeadStatus = "new" | "researching" | "bidding" | "won" | "lost" | "archived";

const KANBAN_COLUMNS: { id: LeadStatus; label: string; color: string; headerColor: string }[] = [
  { id: "new",         label: "NEW",         color: "border-blue-500/30 bg-blue-500/3",   headerColor: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  { id: "researching", label: "RESEARCHING", color: "border-amber-500/30 bg-amber-500/3", headerColor: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  { id: "bidding",     label: "BIDDING",     color: "border-purple-500/30 bg-purple-500/3", headerColor: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  { id: "won",         label: "WON",         color: "border-green-500/30 bg-green-500/3",  headerColor: "bg-green-500/10 text-green-700 border-green-500/20" },
  { id: "lost",        label: "LOST",        color: "border-red-500/30 bg-red-500/3",      headerColor: "bg-red-500/10 text-red-600 border-red-500/20" },
  { id: "archived",    label: "ARCHIVED",    color: "border-border bg-muted/20",           headerColor: "bg-muted text-muted-foreground border-border" },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

interface KanbanCardProps {
  lead: {
    id: number;
    title: string;
    issuer?: string | null;
    category: string;
    contractValue?: number | null;
    deadline?: string | null;
    status: string;
  };
  onDragStart: (id: number) => void;
}

function KanbanCard({ lead, onDragStart }: KanbanCardProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = lead.deadline ? differenceInDays(parseISO(lead.deadline), today) : null;
  const isUrgent = daysLeft !== null && daysLeft <= 2 && !["won", "lost", "archived"].includes(lead.status);
  const isWarning = daysLeft !== null && daysLeft <= 7 && !["won", "lost", "archived"].includes(lead.status);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart(lead.id);
      }}
      className="group bg-card border border-border rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/40 hover:shadow-md transition-all select-none"
    >
      <Link href={`/leads/${lead.id}`} onClick={(e) => e.stopPropagation()}>
        <div className="font-mono text-sm font-medium leading-tight mb-2 hover:underline decoration-primary underline-offset-2 cursor-pointer line-clamp-2">
          {lead.title}
        </div>
      </Link>

      {lead.issuer && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono mb-2 truncate">
          <Building2 className="w-3 h-3 shrink-0" />
          <span className="truncate">{lead.issuer}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mt-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
          {lead.category}
        </span>
        {lead.contractValue != null && (
          <div className="flex items-center gap-0.5 text-xs font-mono font-medium text-foreground">
            <DollarSign className="w-3 h-3 text-muted-foreground" />
            {formatCurrency(lead.contractValue).replace("$", "")}
          </div>
        )}
      </div>

      {lead.deadline && (
        <div className={cn(
          "flex items-center gap-1 text-xs font-mono mt-2",
          isUrgent ? "text-red-500" : isWarning ? "text-amber-500" : "text-muted-foreground"
        )}>
          <Calendar className="w-3 h-3 shrink-0" />
          <span>{format(parseISO(lead.deadline), "MMM d")}</span>
          {daysLeft !== null && daysLeft >= 0 && !["won", "lost", "archived"].includes(lead.status) && (
            <span className={cn(
              "ml-auto text-[10px] px-1 py-0.5 rounded font-bold",
              isUrgent ? "bg-red-500/10 text-red-500" : isWarning ? "bg-amber-500/10 text-amber-500" : "bg-muted text-muted-foreground"
            )}>
              {daysLeft === 0 ? "TODAY" : daysLeft === 1 ? "TMRW" : `${daysLeft}d`}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface KanbanColumnProps {
  column: typeof KANBAN_COLUMNS[number];
  leads: KanbanCardProps["lead"][];
  onDragStart: (id: number) => void;
  onDrop: (status: LeadStatus) => void;
}

function KanbanColumn({ column, leads, onDragStart, onDrop }: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const totalValue = leads.reduce((sum, l) => sum + (l.contractValue ?? 0), 0);

  return (
    <div
      className="flex flex-col min-w-[240px] w-[240px]"
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragOver(false); onDrop(column.id); }}
    >
      {/* Column header */}
      <div className={cn("flex items-center justify-between px-3 py-2 rounded-lg border mb-3 font-mono", column.headerColor)}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tracking-wider">{column.label}</span>
          <span className="text-xs font-bold bg-white/20 rounded-full px-1.5 leading-5">{leads.length}</span>
        </div>
        {totalValue > 0 && (
          <span className="text-[10px] opacity-70">{formatCurrency(totalValue)}</span>
        )}
      </div>

      {/* Drop zone */}
      <div className={cn(
        "flex-1 rounded-xl border-2 border-dashed p-2 space-y-2 min-h-[200px] transition-colors",
        isDragOver ? "border-primary bg-primary/5" : "border-border/50 bg-transparent"
      )}>
        {leads.length === 0 && !isDragOver && (
          <div className="flex items-center justify-center h-full text-muted-foreground/40 font-mono text-xs py-8">
            DROP HERE
          </div>
        )}
        {leads.map((lead) => (
          <KanbanCard key={lead.id} lead={lead} onDragStart={onDragStart} />
        ))}
        {isDragOver && (
          <div className="h-16 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 flex items-center justify-center">
            <span className="text-xs font-mono text-primary/60">RELEASE TO MOVE</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Leads() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("_all");
  const [category, setCategory] = useState<string>("_all");
  const [view, setView] = useState<"table" | "kanban">("table");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const draggedLeadId = useRef<number | null>(null);

  const { data: leads, isLoading: leadsLoading } = useListLeads({
    search: search || undefined,
    status: status === "_all" ? undefined : status,
    category: category === "_all" ? undefined : category,
  });

  const { data: categories } = useListCategories();

  const updateLeadMutation = useUpdateLead({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetLeadsStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRecentLeadsQueryKey() });
      },
      onError: () => toast({ title: "Failed to move lead", variant: "destructive" }),
    },
  });

  const handleDragStart = (id: number) => { draggedLeadId.current = id; };

  const handleDrop = (newStatus: LeadStatus) => {
    const id = draggedLeadId.current;
    if (id == null) return;
    const lead = leads?.find(l => l.id === id);
    if (!lead || lead.status === newStatus) return;
    // Optimistic cache update
    queryClient.setQueryData(getListLeadsQueryKey(), (old: typeof leads) =>
      old?.map(l => l.id === id ? { ...l, status: newStatus } : l)
    );
    updateLeadMutation.mutate({ id, data: { status: newStatus } });
    draggedLeadId.current = null;
  };

  const handleExportCSV = () => {
    if (!leads?.length) { toast({ title: "Nothing to export", variant: "destructive" }); return; }
    exportCSV(leads, `contract-leads-${format(new Date(), "yyyy-MM-dd")}.csv`);
    toast({ title: "CSV exported", description: `${leads.length} lead${leads.length !== 1 ? "s" : ""} downloaded.` });
  };

  const handleExportPDF = () => {
    if (!leads?.length) { toast({ title: "Nothing to export", variant: "destructive" }); return; }
    const filterLabel = [
      status !== "_all" ? status.toUpperCase() : "",
      category !== "_all" ? category.toUpperCase() : "",
      search ? `"${search}"` : "",
    ].filter(Boolean).join(" · ");
    exportPDF(leads, filterLabel ? `Contract Leads — ${filterLabel}` : "Contract Lead Pipeline");
    toast({ title: "PDF exported", description: `${leads.length} lead${leads.length !== 1 ? "s" : ""} downloaded.` });
  };

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-mono tracking-tight">ALL LEADS</h1>
          <p className="text-muted-foreground mt-1 text-sm font-mono">
            {leads?.length || 0} RECORDS FOUND
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center border rounded-lg border-border bg-muted/30 p-1 gap-1">
            <button
              onClick={() => setView("table")}
              className={cn(
                "h-8 w-8 flex items-center justify-center rounded-md transition-colors",
                view === "table" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              title="Table view"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("kanban")}
              className={cn(
                "h-8 w-8 flex items-center justify-center rounded-md transition-colors",
                view === "kanban" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              title="Kanban board"
            >
              <Columns3 className="w-4 h-4" />
            </button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="font-mono text-xs h-10 gap-2">
                <Download className="w-4 h-4" />EXPORT
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="font-mono text-xs text-muted-foreground">
                {leads?.length || 0} LEADS (CURRENT VIEW)
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportCSV} className="font-mono text-xs cursor-pointer gap-2">
                <Sheet className="w-4 h-4 text-green-600" />Download as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} className="font-mono text-xs cursor-pointer gap-2">
                <FileText className="w-4 h-4 text-red-500" />Download as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link href="/leads/new" className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors">
            <Plus className="w-4 h-4 mr-2" />NEW LEAD
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 border rounded-xl bg-card border-border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search title or issuer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 font-mono bg-background border-border"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px] font-mono bg-background border-border">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">ALL STATUSES</SelectItem>
            <SelectItem value="new">NEW</SelectItem>
            <SelectItem value="researching">RESEARCHING</SelectItem>
            <SelectItem value="bidding">BIDDING</SelectItem>
            <SelectItem value="won">WON</SelectItem>
            <SelectItem value="lost">LOST</SelectItem>
            <SelectItem value="archived">ARCHIVED</SelectItem>
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[180px] font-mono bg-background border-border">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">ALL CATEGORIES</SelectItem>
            {categories?.map((cat) => (
              <SelectItem key={cat.name} value={cat.name}>
                {cat.name.toUpperCase()} ({cat.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── TABLE VIEW ─────────────────────────────────────────────────── */}
      {view === "table" && (
        <div className="border rounded-xl bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-mono text-xs w-[80px]">ID</TableHead>
                <TableHead className="font-mono text-xs">TITLE</TableHead>
                <TableHead className="font-mono text-xs">ISSUER</TableHead>
                <TableHead className="font-mono text-xs">CATEGORY</TableHead>
                <TableHead className="font-mono text-xs text-right">VALUE</TableHead>
                <TableHead className="font-mono text-xs">DEADLINE</TableHead>
                <TableHead className="font-mono text-xs w-[120px]">STATUS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leadsLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground font-mono">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />LOADING DATA...
                  </TableCell>
                </TableRow>
              ) : leads?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground font-mono">
                    NO MATCHING RECORDS
                  </TableCell>
                </TableRow>
              ) : (
                leads?.map((lead) => (
                  <TableRow key={lead.id} className="border-border group transition-colors">
                    <TableCell className="font-mono text-muted-foreground text-xs">{lead.id.toString().padStart(4, "0")}</TableCell>
                    <TableCell className="font-medium max-w-[300px] truncate">
                      <Link href={`/leads/${lead.id}`} className="hover:underline decoration-primary underline-offset-4">
                        {lead.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-[200px]">{lead.issuer || "—"}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground uppercase">{lead.category}</TableCell>
                    <TableCell className="font-mono text-right">{lead.contractValue ? formatCurrency(lead.contractValue) : "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{lead.deadline ? format(new Date(lead.deadline), "MMM dd, yyyy") : "—"}</TableCell>
                    <TableCell><StatusBadge status={lead.status} /></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── KANBAN VIEW ────────────────────────────────────────────────── */}
      {view === "kanban" && (
        <>
          {leadsLoading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground font-mono gap-3">
              <Loader2 className="w-5 h-5 animate-spin" />LOADING DATA...
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {KANBAN_COLUMNS.map((col) => (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  leads={(leads ?? []).filter(l => l.status === col.id)}
                  onDragStart={handleDragStart}
                  onDrop={handleDrop}
                />
              ))}
            </div>
          )}
          <p className="text-xs font-mono text-muted-foreground text-center pt-2">
            Drag cards between columns to update status
          </p>
        </>
      )}
    </div>
  );
}
