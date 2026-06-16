import { useRoute, useLocation } from "wouter";
import { useGetLead, useUpdateLead, useDeleteLead, getGetLeadQueryKey, getListLeadsQueryKey, getGetLeadsStatsQueryKey, getGetRecentLeadsQueryKey } from "@workspace/api-client-react";
import { LeadStatus } from "@workspace/api-client-react/src/generated/api.schemas";
import { useQueryClient } from "@tanstack/react-query";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ArrowLeft, ExternalLink, Save, Trash2, Calendar, Building2, Tag, Loader2, AlertCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function LeadDetail() {
  const [, params] = useRoute("/leads/:id");
  const [, setLocation] = useLocation();
  const id = Number(params?.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: lead, isLoading, error } = useGetLead(id, { query: { enabled: !isNaN(id) && id > 0, queryKey: getGetLeadQueryKey(id) } });
  
  const updateLeadMutation = useUpdateLead({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Lead updated", description: "Changes have been saved." });
        queryClient.setQueryData(getGetLeadQueryKey(id), data);
        queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetLeadsStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRecentLeadsQueryKey() });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to update lead.", variant: "destructive" });
      }
    }
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
      onError: () => {
        toast({ title: "Error", description: "Failed to delete lead.", variant: "destructive" });
      }
    }
  });

  const [notes, setNotes] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const initializedId = useRef<number | null>(null);

  useEffect(() => {
    if (lead && initializedId.current !== lead.id) {
      setNotes(lead.notes || "");
      initializedId.current = lead.id;
    }
  }, [lead]);

  const handleStatusChange = (newStatus: LeadStatus) => {
    updateLeadMutation.mutate({ id, data: { status: newStatus } });
  };

  const handleNotesSave = () => {
    updateLeadMutation.mutate({ id, data: { notes } });
    setIsEditingNotes(false);
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this lead? This action cannot be undone.")) {
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
          <AlertDescription className="font-mono text-sm">Failed to load lead details. The lead might have been deleted or the server is unreachable.</AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/leads")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> RETURN TO ALL LEADS
        </Button>
      </div>
    );
  }

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "—";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 text-sm font-mono text-muted-foreground">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/leads")} className="h-8 px-2 font-mono text-xs">
          <ArrowLeft className="w-3 h-3 mr-2" />
          BACK TO PIPELINE
        </Button>
        <span>/</span>
        <span>LEAD #{lead.id.toString().padStart(4, "0")}</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-2 flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{lead.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground font-mono">
            {lead.issuer && (
              <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4" /> {lead.issuer}</span>
            )}
            <span className="flex items-center gap-1.5"><Tag className="w-4 h-4" /> {lead.category.toUpperCase()}</span>
            {lead.deadline && (
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {format(new Date(lead.deadline), "MMM dd, yyyy")}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Select value={lead.status} onValueChange={(v) => handleStatusChange(v as LeadStatus)}>
            <SelectTrigger className="w-[160px] font-mono bg-background border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">NEW</SelectItem>
              <SelectItem value="researching">RESEARCHING</SelectItem>
              <SelectItem value="bidding">BIDDING</SelectItem>
              <SelectItem value="won">WON</SelectItem>
              <SelectItem value="lost">LOST</SelectItem>
              <SelectItem value="archived">ARCHIVED</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="destructive" size="icon" onClick={handleDelete} title="Delete Lead" disabled={deleteLeadMutation.isPending}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
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

          <Card className="rounded-xl border-border bg-card">
            <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium font-mono">OPERATIONAL NOTES</CardTitle>
              {!isEditingNotes && (
                <Button variant="ghost" size="sm" className="h-8 font-mono text-xs" onClick={() => setIsEditingNotes(true)}>
                  EDIT
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {isEditingNotes ? (
                <>
                  <Textarea 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                    placeholder="Enter intel and updates..."
                    className="min-h-[150px] font-mono text-sm bg-background"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setIsEditingNotes(false); setNotes(lead.notes || ""); }}>CANCEL</Button>
                    <Button size="sm" onClick={handleNotesSave} disabled={updateLeadMutation.isPending}>
                      <Save className="w-4 h-4 mr-2" /> SAVE NOTES
                    </Button>
                  </div>
                </>
              ) : (
                <div className="min-h-[150px]">
                  {notes ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed font-mono">{notes}</p>
                  ) : (
                    <p className="text-muted-foreground italic font-mono text-sm">No notes currently on file. Click Edit to add intel.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

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
                    External Link <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
