import { useState } from "react";
import { useListLeads, useListCategories } from "@workspace/api-client-react";
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
import { Search, Plus, Loader2, Download, FileText, Sheet } from "lucide-react";
import { format } from "date-fns";
import { exportCSV, exportPDF } from "@/lib/export";
import { useToast } from "@/hooks/use-toast";

export default function Leads() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("_all");
  const [category, setCategory] = useState<string>("_all");
  const { toast } = useToast();

  const { data: leads, isLoading: leadsLoading } = useListLeads({
    search: search || undefined,
    status: status === "_all" ? undefined : status,
    category: category === "_all" ? undefined : category,
  });

  const { data: categories } = useListCategories();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

  const handleExportCSV = () => {
    if (!leads?.length) { toast({ title: "Nothing to export", description: "No leads match the current filters.", variant: "destructive" }); return; }
    const filename = `contract-leads-${format(new Date(), "yyyy-MM-dd")}.csv`;
    exportCSV(leads, filename);
    toast({ title: "CSV exported", description: `${leads.length} lead${leads.length !== 1 ? "s" : ""} downloaded.` });
  };

  const handleExportPDF = () => {
    if (!leads?.length) { toast({ title: "Nothing to export", description: "No leads match the current filters.", variant: "destructive" }); return; }
    const filterLabel = [
      status !== "_all" ? status.toUpperCase() : "",
      category !== "_all" ? category.toUpperCase() : "",
      search ? `"${search}"` : "",
    ].filter(Boolean).join(" · ");
    const title = filterLabel ? `Contract Leads — ${filterLabel}` : "Contract Lead Pipeline";
    exportPDF(leads, title);
    toast({ title: "PDF exported", description: `${leads.length} lead${leads.length !== 1 ? "s" : ""} downloaded.` });
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-mono tracking-tight">ALL LEADS</h1>
          <p className="text-muted-foreground mt-1 text-sm font-mono">
            {leads?.length || 0} RECORDS FOUND
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="font-mono text-xs h-10 gap-2">
                <Download className="w-4 h-4" />
                EXPORT
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="font-mono text-xs text-muted-foreground">
                {leads?.length || 0} LEADS (CURRENT VIEW)
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportCSV} className="font-mono text-xs cursor-pointer gap-2">
                <Sheet className="w-4 h-4 text-green-600" />
                Download as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} className="font-mono text-xs cursor-pointer gap-2">
                <FileText className="w-4 h-4 text-red-500" />
                Download as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link href="/leads/new" className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors">
            <Plus className="w-4 h-4 mr-2" />
            NEW LEAD
          </Link>
        </div>
      </div>

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
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  LOADING DATA...
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
    </div>
  );
}
