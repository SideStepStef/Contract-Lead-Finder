import { useRoute, useLocation } from "wouter";
import {
  useGetLead, useUpdateLead, useDeleteLead,
  useListLeadNotes, useCreateLeadNote,
  getGetLeadQueryKey, getListLeadsQueryKey, getGetLeadsStatsQueryKey,
  getGetRecentLeadsQueryKey, getListLeadNotesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft, ExternalLink, Trash2, Calendar, Building2, Tag,
  Loader2, AlertCircle, Send, Clock, StickyNote,
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type LeadStatus = "new" | "researching" | "bidding" | "won" | "lost" | "archived";

export default function LeadDetail() {
  const [, params] = useRoute("/leads/:id");
  const [, setLocation] = useLocation();
  const id = Number(params?.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newNote, setNewNote] = useState("");

  const { data: lead, isLoading, error } = useGetLead(id, {
    query: { enabled: !isNaN(id) && id > 0, queryKey: getGetLeadQueryKey(id) },
  });

  const { data: notes = [], isLoading: notesLoading } = useListLeadNotes(id, {
    query: { enabled: !isNaN(id) && id > 0 },
  });

  const updateLeadMutation = useUpdateLead({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Lead updated", description: "Changes have been saved." });
        queryClient.setQueryData(getGetLeadQueryKey(id), data);
        queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetLeadsStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRecentLeadsQueryKey() });
      },
      onError: () => toast({ title: "Error", description: "Failed to update lead.", variant: "destructive" }),
    },
  });

  const createNoteMutation = useCreateLeadNote({
    mutation: {
      onSuccess: () => {
        setNewNote("");
        queryClient.invalidateQueries({ queryKey: getListLeadNotesQueryKey(id) });
        toast({ title: "Note added", description: "Your note has been logged." });
      },
      onError: () => toast({ title: "Error", description: "Failed to save note.", variant: "destructive" }),
    },
  });

  const deleteLeadMutation = useDeleteLead({
    mutation: {
      onSuccess: () => {
        toast({ title: "Lead deleted", description: "The lead has been removed." });
        queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetLeadsStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRecentLeadsQueryKey() });
        setLocation("/leads");
      },
      onError: () => toast({ title: "Error", description: "Failed to delete lead.", variant: "destructive" }),
    },
  });

  const handleStatusChange = (newStatus: LeadStatus) => {
    updateLeadMutation.mutate({ id, data: { status: newStatus } });
  };

  const handleAddNote = () => {
    const trimmed = newNote.trim();
    if (!trimmed) return;
    createNoteMutation.mutate({ id, data: { content: trimmed } });
  };

  const handleDelete = () => {
    if (window.confirm("Delete this lead? This cannot be undone.")) {
      deleteLeadMutation.mutate({ id });
    }
  };

  if (isNaN(id) || id <= 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center">
        <h1 className="text-2xl font-bold font-mono text-destructive">INVALID LEAD ID</h1>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center text-muted-foreground gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="font-mono text-sm">LOADING INTEL...</p>
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="font-mono font-bold">ERROR</AlertTitle>
          <AlertDescription className="font-mono text-sm">Failed to load lead details.</AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/leads")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> RETURN TO ALL LEADS
        </Button>
      </div>
    );
  }

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return "—";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-4 text-sm font-mono text-muted-foreground">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/leads")} className="h-8 px-2 font-mono text-xs">
          <ArrowLeft className="w-3 h-3 mr-2" />
          BACK TO PIPELINE
        </Button>
        <span>/</span>
        <span>LEAD #{lead.id.toString().padStart(4, "0")}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-2 flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{lead.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground font-mono">
            {lead.issuer && <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4" />{lead.issuer}</span>}
            <span className="flex items-center gap-1.5"><Tag className="w-4 h-4" />{lead.category.toUpperCase()}</span>
            {lead.deadline && <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{format(new Date(lead.deadline), "MMM dd, yyyy")}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Select value={lead.status} onValueChange={(v) => handleStatusChange(v as LeadStatus)}>
            <SelectTrigger className="w-[160px] font-mono bg-background border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["new","researching","bidding","won","lost","archived"] as const).map(s => (
                <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="destructive" size="icon" onClick={handleDelete} title="Delete Lead" disabled={deleteLeadMutation.isPending}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Description */}
          <Card className="rounded-xl border-border bg-card">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-medium font-mono">DESCRIPTION</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {lead.description ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{lead.description}</p>
              ) : (
                <p className="text-muted-foreground italic text-sm">No description provided.</p>
              )}
            </CardContent>
          </Card>

          {/* Notes History */}
          <Card className="rounded-xl border-border bg-card">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium font-mono flex items-center gap-2">
                  <StickyNote className="w-4 h-4" />
                  NOTES LOG
                </CardTitle>
                <span className="font-mono text-xs text-muted-foreground">
                  {notes.length} ENTR{notes.length !== 1 ? "IES" : "Y"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Add note input */}
              <div className="space-y-2">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Log an update, call outcome, intel, or next step..."
                  className="min-h-[80px] font-mono text-sm bg-background resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAddNote();
                  }}
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-muted-foreground">⌘ + Enter to submit</span>
                  <Button
                    size="sm"
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || createNoteMutation.isPending}
                    className="font-mono text-xs h-8"
                  >
                    {createNoteMutation.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                    ) : (
                      <Send className="w-3 h-3 mr-1.5" />
                    )}
                    LOG NOTE
                  </Button>
                </div>
              </div>

              {/* Timeline */}
              {notesLoading ? (
                <div className="flex items-center gap-2 py-4 text-muted-foreground font-mono text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading notes...
                </div>
              ) : notes.length === 0 ? (
                <div className="py-6 text-center border border-dashed border-border rounded-lg">
                  <StickyNote className="w-6 h-6 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-xs font-mono text-muted-foreground">NO NOTES YET — ADD THE FIRST ENTRY ABOVE</p>
                </div>
              ) : (
                <div className="relative space-y-0">
                  {/* Timeline line */}
                  <div className="absolute left-[7px] top-3 bottom-3 w-px bg-border" />
                  {notes.map((note, i) => (
                    <div key={note.id} className="relative flex gap-4 pb-5 last:pb-0">
                      {/* Dot */}
                      <div className={`relative z-10 mt-1 w-[15px] h-[15px] rounded-full border-2 shrink-0 ${i === 0 ? "bg-primary border-primary" : "bg-background border-border"}`} />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span title={format(new Date(note.createdAt), "MMM dd, yyyy HH:mm:ss")}>
                            {format(new Date(note.createdAt), "MMM dd, yyyy 'at' HH:mm")}
                          </span>
                          <span className="text-muted-foreground/50">
                            ({formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })})
                          </span>
                        </div>
                        <div className={`rounded-lg px-3 py-2.5 text-sm font-mono whitespace-pre-wrap leading-relaxed ${i === 0 ? "bg-primary/5 border border-primary/20" : "bg-muted/50 border border-border/50"}`}>
                          {note.content}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="rounded-xl border-border bg-card">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-medium font-mono">FINANCIALS</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold font-mono tracking-tight">
                {formatCurrency(lead.contractValue)}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-border bg-card">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-medium font-mono">METADATA</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 font-mono text-sm">
              <div>
                <span className="text-muted-foreground block text-xs mb-1">STATUS</span>
                <StatusBadge status={lead.status} />
              </div>
              <div>
                <span className="text-muted-foreground block text-xs mb-1">CREATED</span>
                <span>{format(new Date(lead.createdAt), "MMM dd, yyyy HH:mm")}</span>
              </div>
              {lead.updatedAt && (
                <div>
                  <span className="text-muted-foreground block text-xs mb-1">LAST UPDATED</span>
                  <span>{format(new Date(lead.updatedAt), "MMM dd, yyyy HH:mm")}</span>
                </div>
              )}
              {lead.sourceUrl && (
                <div>
                  <span className="text-muted-foreground block text-xs mb-1">SOURCE</span>
                  <a href={lead.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 break-all">
                    External Link <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Legacy notes field (read-only) */}
          {lead.notes && (
            <Card className="rounded-xl border-border bg-card">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-sm font-medium font-mono text-muted-foreground">INITIAL NOTES</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed font-mono text-muted-foreground">{lead.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
