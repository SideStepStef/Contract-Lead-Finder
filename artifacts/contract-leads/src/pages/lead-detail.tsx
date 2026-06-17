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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft, ExternalLink, Trash2, Calendar, Building2, Tag,
  Loader2, AlertCircle, Send, Clock, StickyNote,
  User, Mail, Phone, Pencil, X, Check, Trophy, XCircle,
} from "lucide-react";
import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type LeadStatus = "new" | "researching" | "bidding" | "won" | "lost" | "archived";
const CLOSE_STATUSES: LeadStatus[] = ["won", "lost"];
const CATEGORIES = ["technology", "construction", "consulting", "marketing", "healthcare", "education", "other"];

// ── Inline edit helpers ──────────────────────────────────────────────────────

interface InlineTextProps {
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  multiline?: boolean;
  displayAs?: "heading" | "normal";
}

function InlineText({ value, onSave, placeholder = "—", className, inputClassName, multiline, displayAs }: InlineTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);

  const start = () => { setDraft(value); setEditing(true); };
  const cancel = () => setEditing(false);
  const save = () => {
    const trimmed = draft.trim();
    if (trimmed !== value) onSave(trimmed || value);
    setEditing(false);
  };
  const handleKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") { cancel(); return; }
    if (e.key === "Enter" && !multiline) { e.preventDefault(); save(); }
    if (e.key === "Enter" && multiline && (e.metaKey || e.ctrlKey)) { save(); }
  };

  if (editing) {
    const sharedProps = {
      ref: inputRef as any,
      value: draft,
      onChange: (e: React.ChangeEvent<any>) => setDraft(e.target.value),
      onKeyDown: handleKey,
      onBlur: save,
      className: cn("bg-background border-primary ring-primary focus-visible:ring-1", inputClassName),
    };
    return (
      <div className={cn("flex items-start gap-2", className)}>
        {multiline
          ? <Textarea {...sharedProps} className={cn(sharedProps.className, "min-h-[120px] resize-none flex-1 font-mono text-sm")} />
          : <Input {...sharedProps} className={cn(sharedProps.className, displayAs === "heading" ? "text-2xl font-bold h-auto py-1 px-2" : "h-8 text-sm font-mono", "flex-1")} />
        }
        <div className="flex gap-1 pt-0.5 shrink-0">
          <button onMouseDown={(e) => { e.preventDefault(); cancel(); }} className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
          <button onMouseDown={(e) => { e.preventDefault(); save(); }} className="h-7 w-7 flex items-center justify-center rounded-md text-primary hover:bg-primary/10 transition-colors">
            <Check className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={start}
      className={cn(
        "group flex items-center gap-2 text-left w-full rounded-md transition-colors",
        "hover:bg-muted/50 -mx-2 px-2 py-1",
        className
      )}
    >
      <span className={cn(!value && "text-muted-foreground italic", displayAs === "heading" && "text-3xl font-bold tracking-tight")}>
        {value || placeholder}
      </span>
      <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  );
}

interface InlineNumberProps {
  value: number | null | undefined;
  onSave: (v: number | null) => void;
  prefix?: string;
  className?: string;
}

function InlineNumber({ value, onSave, prefix, className }: InlineNumberProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value != null ? String(value) : "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { if (!editing) setDraft(value != null ? String(value) : ""); }, [value, editing]);

  const start = () => { setDraft(value != null ? String(value) : ""); setEditing(true); };
  const cancel = () => setEditing(false);
  const save = () => {
    const num = draft.trim() === "" ? null : Number(draft.replace(/[^0-9.]/g, ""));
    onSave(isNaN(num as number) ? null : num);
    setEditing(false);
  };
  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") cancel();
    if (e.key === "Enter") { e.preventDefault(); save(); }
  };

  const display = value != null
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)
    : "—";

  if (editing) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex items-center gap-1 flex-1">
          {prefix && <span className="text-muted-foreground font-mono text-sm">{prefix}</span>}
          <Input
            ref={inputRef}
            type="number"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKey}
            onBlur={save}
            placeholder="0"
            className="bg-background border-primary ring-primary focus-visible:ring-1 font-mono text-2xl font-bold h-auto py-1 px-2 w-full"
          />
        </div>
        <div className="flex gap-1 shrink-0">
          <button onMouseDown={e => { e.preventDefault(); cancel(); }} className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
          <button onMouseDown={e => { e.preventDefault(); save(); }} className="h-7 w-7 flex items-center justify-center rounded-md text-primary hover:bg-primary/10 transition-colors">
            <Check className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <button onClick={start} className="group flex items-center gap-2 text-left w-full rounded-md hover:bg-muted/50 -mx-2 px-2 py-1 transition-colors">
      <span className="text-3xl font-bold font-mono tracking-tight">{display}</span>
      <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  );
}

interface InlineDateProps {
  value: string | null | undefined;
  onSave: (v: string | null) => void;
}

function InlineDate({ value, onSave }: InlineDateProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ? value.slice(0, 10) : "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { if (!editing) setDraft(value ? value.slice(0, 10) : ""); }, [value, editing]);

  const start = () => { setDraft(value ? value.slice(0, 10) : ""); setEditing(true); };
  const cancel = () => setEditing(false);
  const save = () => { onSave(draft || null); setEditing(false); };
  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") cancel();
    if (e.key === "Enter") { e.preventDefault(); save(); }
  };

  const display = value ? format(new Date(value), "MMM dd, yyyy") : "—";

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          type="date"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKey}
          onBlur={save}
          className="bg-background border-primary ring-primary focus-visible:ring-1 font-mono text-sm h-8 w-auto"
        />
        <button onMouseDown={e => { e.preventDefault(); cancel(); }} className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <X className="w-3 h-3" />
        </button>
        <button onMouseDown={e => { e.preventDefault(); save(); }} className="h-6 w-6 flex items-center justify-center rounded text-primary hover:bg-primary/10 transition-colors">
          <Check className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <button onClick={start} className="group flex items-center gap-1.5 rounded hover:bg-muted/50 px-1 py-0.5 -mx-1 transition-colors text-left">
      <Calendar className="w-4 h-4" />
      <span>{display}</span>
      <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function LeadDetail() {
  const [, params] = useRoute("/leads/:id");
  const [, setLocation] = useLocation();
  const id = Number(params?.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [newNote, setNewNote] = useState("");
  const [editingContact, setEditingContact] = useState(false);
  const [contactDraft, setContactDraft] = useState({ name: "", email: "", phone: "" });

  const [closeDialog, setCloseDialog] = useState<{ open: boolean; status: "won" | "lost" | null }>({ open: false, status: null });
  const [closeReasonDraft, setCloseReasonDraft] = useState("");

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

  const patch = (data: Record<string, unknown>) => updateLeadMutation.mutate({ id, data: data as any });

  const handleStatusChange = (newStatus: LeadStatus) => {
    if (CLOSE_STATUSES.includes(newStatus)) {
      setCloseReasonDraft("");
      setCloseDialog({ open: true, status: newStatus });
    } else {
      patch({ status: newStatus, closeReason: "" });
    }
  };

  const handleCloseConfirm = () => {
    if (!closeDialog.status) return;
    updateLeadMutation.mutate(
      { id, data: { status: closeDialog.status, closeReason: closeReasonDraft.trim() || undefined } },
      { onSuccess: () => setCloseDialog({ open: false, status: null }) }
    );
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

  const startEditContact = () => {
    setContactDraft({ name: lead?.contactName ?? "", email: lead?.contactEmail ?? "", phone: lead?.contactPhone ?? "" });
    setEditingContact(true);
  };

  const saveContact = () => {
    patch({ contactName: contactDraft.name || undefined, contactEmail: contactDraft.email || undefined, contactPhone: contactDraft.phone || undefined });
    setEditingContact(false);
  };

  if (isNaN(id) || id <= 0) return (
    <div className="p-8 max-w-4xl mx-auto text-center">
      <h1 className="text-2xl font-bold font-mono text-destructive">INVALID LEAD ID</h1>
    </div>
  );

  if (isLoading) return (
    <div className="p-8 flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center text-muted-foreground gap-4">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="font-mono text-sm">LOADING INTEL...</p>
      </div>
    </div>
  );

  if (error || !lead) return (
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

  const hasContact = lead.contactName || lead.contactEmail || lead.contactPhone;
  const isClosed = lead.status === "won" || lead.status === "lost";

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">

      {/* Close-reason dialog */}
      <Dialog open={closeDialog.open} onOpenChange={(open) => !open && setCloseDialog({ open: false, status: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono flex items-center gap-2">
              {closeDialog.status === "won"
                ? <><Trophy className="w-5 h-5 text-green-500" /> MARK AS WON</>
                : <><XCircle className="w-5 h-5 text-destructive" /> MARK AS LOST</>}
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              {closeDialog.status === "won"
                ? "Congratulations! What made this deal close?"
                : "What was the reason this lead didn't move forward?"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="font-mono text-xs text-muted-foreground">CLOSE REASON <span className="opacity-50">(optional)</span></label>
            <Textarea
              value={closeReasonDraft}
              onChange={(e) => setCloseReasonDraft(e.target.value)}
              placeholder={closeDialog.status === "won"
                ? "e.g. Best price, strong proposal, existing relationship..."
                : "e.g. Lost on price, missed deadline, competitor selected..."}
              className="min-h-[90px] font-mono text-sm bg-background resize-none"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" className="font-mono text-xs" onClick={() => setCloseDialog({ open: false, status: null })}>CANCEL</Button>
            <Button
              size="sm"
              className={`font-mono text-xs ${closeDialog.status === "won" ? "bg-green-600 hover:bg-green-700" : ""}`}
              variant={closeDialog.status === "lost" ? "destructive" : "default"}
              onClick={handleCloseConfirm}
              disabled={updateLeadMutation.isPending}
            >
              {updateLeadMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : null}
              {closeReasonDraft.trim() ? "SAVE & CLOSE" : "SKIP & CLOSE"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Breadcrumb */}
      <div className="flex items-center gap-4 text-sm font-mono text-muted-foreground">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/leads")} className="h-8 px-2 font-mono text-xs">
          <ArrowLeft className="w-3 h-3 mr-2" />BACK TO PIPELINE
        </Button>
        <span>/</span>
        <span>LEAD #{lead.id.toString().padStart(4, "0")}</span>
        {updateLeadMutation.isPending && (
          <span className="flex items-center gap-1 text-primary text-xs">
            <Loader2 className="w-3 h-3 animate-spin" /> SAVING...
          </span>
        )}
      </div>

      {/* Header — title + controls */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-3 flex-1 min-w-0">
          {/* Editable title */}
          <InlineText
            value={lead.title}
            onSave={(v) => patch({ title: v })}
            placeholder="Untitled lead"
            displayAs="heading"
            inputClassName="text-2xl font-bold"
          />

          {/* Editable issuer · category · deadline row */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground font-mono">
            {/* Issuer */}
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 shrink-0" />
              <InlineText
                value={lead.issuer ?? ""}
                onSave={(v) => patch({ issuer: v || undefined })}
                placeholder="Add issuer"
                inputClassName="h-7 text-sm"
                className="hover:!bg-transparent -mx-0 px-0 py-0"
              />
            </div>

            {/* Category — select dropdown */}
            <div className="flex items-center gap-1.5">
              <Tag className="w-4 h-4 shrink-0" />
              <Select value={lead.category} onValueChange={(v) => patch({ category: v })}>
                <SelectTrigger className="h-7 text-xs font-mono border-0 shadow-none bg-transparent hover:bg-muted/50 px-1 w-auto gap-1.5 focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c} className="font-mono text-xs">{c.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Deadline */}
            <InlineDate
              value={lead.deadline}
              onSave={(v) => patch({ deadline: v || undefined })}
            />
          </div>
        </div>

        {/* Status + delete */}
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

      {/* Close reason banner */}
      {isClosed && lead.closeReason && (
        <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border font-mono text-sm ${
          lead.status === "won"
            ? "bg-green-500/8 border-green-500/20 text-green-700 dark:text-green-400"
            : "bg-destructive/8 border-destructive/20 text-destructive"
        }`}>
          {lead.status === "won"
            ? <Trophy className="w-4 h-4 mt-0.5 shrink-0" />
            : <XCircle className="w-4 h-4 mt-0.5 shrink-0" />}
          <div>
            <span className="font-bold text-xs block mb-0.5">
              {lead.status === "won" ? "WON — " : "LOST — "}CLOSE REASON
            </span>
            <span className="opacity-90">{lead.closeReason}</span>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">

          {/* Editable description */}
          <Card className="rounded-xl border-border bg-card">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-medium font-mono">DESCRIPTION</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <InlineText
                value={lead.description ?? ""}
                onSave={(v) => patch({ description: v || undefined })}
                placeholder="Click to add a description…"
                multiline
                className="hover:!bg-transparent -mx-0 px-0 py-0 items-start"
                inputClassName="text-sm leading-relaxed"
              />
            </CardContent>
          </Card>

          {/* Notes Log */}
          <Card className="rounded-xl border-border bg-card">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium font-mono flex items-center gap-2">
                  <StickyNote className="w-4 h-4" />NOTES LOG
                </CardTitle>
                <span className="font-mono text-xs text-muted-foreground">
                  {notes.length} ENTR{notes.length !== 1 ? "IES" : "Y"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Log an update, call outcome, intel, or next step..."
                  className="min-h-[80px] font-mono text-sm bg-background resize-none"
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAddNote(); }}
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-muted-foreground">⌘ + Enter to submit</span>
                  <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim() || createNoteMutation.isPending} className="font-mono text-xs h-8">
                    {createNoteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <Send className="w-3 h-3 mr-1.5" />}
                    LOG NOTE
                  </Button>
                </div>
              </div>

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
                  <div className="absolute left-[7px] top-3 bottom-3 w-px bg-border" />
                  {notes.map((note, i) => (
                    <div key={note.id} className="relative flex gap-4 pb-5 last:pb-0">
                      <div className={`relative z-10 mt-1 w-[15px] h-[15px] rounded-full border-2 shrink-0 ${i === 0 ? "bg-primary border-primary" : "bg-background border-border"}`} />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span title={format(new Date(note.createdAt), "MMM dd, yyyy HH:mm:ss")}>
                            {format(new Date(note.createdAt), "MMM dd, yyyy 'at' HH:mm")}
                          </span>
                          <span className="text-muted-foreground/50">({formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })})</span>
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

        {/* Right sidebar */}
        <div className="space-y-6">

          {/* Editable contract value */}
          <Card className="rounded-xl border-border bg-card">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-medium font-mono">FINANCIALS</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <InlineNumber
                value={lead.contractValue}
                onSave={(v) => patch({ contractValue: v ?? undefined })}
              />
            </CardContent>
          </Card>

          {/* Point of Contact */}
          <Card className="rounded-xl border-border bg-card">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium font-mono flex items-center gap-2">
                  <User className="w-4 h-4" />POINT OF CONTACT
                </CardTitle>
                {!editingContact ? (
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={startEditContact} title="Edit contact">
                    <Pencil className="w-3 h-3" />
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground" onClick={() => setEditingContact(false)}><X className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-primary" onClick={saveContact} disabled={updateLeadMutation.isPending}>
                      {updateLeadMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {editingContact ? (
                <div className="space-y-3">
                  {[
                    { icon: <User className="w-3 h-3" />, label: "NAME", key: "name", type: "text", placeholder: "Jane Smith" },
                    { icon: <Mail className="w-3 h-3" />, label: "EMAIL", key: "email", type: "email", placeholder: "jane@agency.gov" },
                    { icon: <Phone className="w-3 h-3" />, label: "PHONE", key: "phone", type: "tel", placeholder: "(555) 000-0000" },
                  ].map(({ icon, label, key, type, placeholder }) => (
                    <div key={key} className="space-y-1">
                      <label className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">{icon}{label}</label>
                      <Input
                        type={type}
                        value={contactDraft[key as keyof typeof contactDraft]}
                        onChange={(e) => setContactDraft(d => ({ ...d, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="font-mono text-sm bg-background h-8"
                      />
                    </div>
                  ))}
                </div>
              ) : hasContact ? (
                <div className="space-y-3 font-mono text-sm">
                  {lead.contactName && <div className="flex items-start gap-2"><User className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" /><span className="break-all">{lead.contactName}</span></div>}
                  {lead.contactEmail && <div className="flex items-start gap-2"><Mail className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" /><a href={`mailto:${lead.contactEmail}`} className="text-primary hover:underline break-all">{lead.contactEmail}</a></div>}
                  {lead.contactPhone && <div className="flex items-start gap-2"><Phone className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" /><a href={`tel:${lead.contactPhone}`} className="text-primary hover:underline">{lead.contactPhone}</a></div>}
                </div>
              ) : (
                <button onClick={startEditContact} className="w-full py-5 border border-dashed border-border rounded-lg flex flex-col items-center gap-1.5 text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors group">
                  <User className="w-5 h-5 group-hover:text-primary transition-colors" />
                  <span className="font-mono text-xs">ADD CONTACT</span>
                </button>
              )}
            </CardContent>
          </Card>

          {/* Metadata */}
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
