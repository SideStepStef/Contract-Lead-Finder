import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchOpportunities, useImportOpportunity, getListLeadsQueryKey, getGetLeadsStatsQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Download, ExternalLink, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

function formatValue(v: number | null | undefined) {
  if (v == null) return "—";
  return "$" + v.toLocaleString("en-US");
}

function formatDeadline(d: string | null | undefined) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return d;
  }
}

export default function Import() {
  const [keyword, setKeyword] = useState("");
  const [query, setQuery] = useState<string | undefined>(undefined);
  const [imported, setImported] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isFetching, error } = useSearchOpportunities(
    { keyword: query, limit: 15 },
    { query: { enabled: true, retry: false } }
  );

  const importMutation = useImportOpportunity({
    mutation: {
      onSuccess: (lead, vars) => {
        setImported((prev) => new Set(prev).add(vars.data.noticeId));
        queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetLeadsStatsQueryKey() });
        toast({
          title: "Lead imported",
          description: `"${lead.title}" added to your pipeline.`,
        });
      },
      onError: () => {
        toast({ title: "Import failed", description: "Could not import this opportunity.", variant: "destructive" });
      },
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(keyword || undefined);
  };

  const handleImport = (opp: NonNullable<typeof data>["opportunities"][number]) => {
    importMutation.mutate({
      data: {
        noticeId: opp.noticeId,
        title: opp.title,
        agency: opp.agency,
        responseDeadLine: opp.responseDeadLine,
        naicsCode: opp.naicsCode,
        type: opp.type,
        awardAmount: opp.awardAmount,
        uiLink: opp.uiLink,
      },
    });
  };

  const isApiKeyMissing =
    error && (error as { status?: number }).status === 503;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-mono">IMPORT FROM SAM.GOV</h1>
        <p className="text-muted-foreground mt-1 text-sm font-mono">
          Search live federal contract opportunities and add them to your pipeline.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          placeholder="Search by keyword, agency, or NAICS code..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="font-mono bg-background max-w-xl"
        />
        <Button type="submit" disabled={isFetching}>
          {isFetching ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Search className="w-4 h-4 mr-2" />
          )}
          SEARCH
        </Button>
      </form>

      {isApiKeyMissing && (
        <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/5 p-5 space-y-3">
          <div className="flex items-center gap-2 font-mono text-yellow-600 font-bold text-sm">
            <AlertCircle className="w-4 h-4" />
            SAM.GOV API KEY NOT CONFIGURED
          </div>
          <p className="text-sm text-muted-foreground">
            A free API key from SAM.gov is required to fetch live contract opportunities.
          </p>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside font-mono">
            <li>Sign in at sam.gov</li>
            <li>Go to your Profile &rarr; API Keys</li>
            <li>Generate a Public API Key</li>
            <li>Add it to your Replit Secrets as <code className="bg-muted px-1 rounded">SAMGOV_API_KEY</code></li>
            <li>Restart the API Server workflow</li>
          </ol>
          <a
            href="https://sam.gov/profile/details"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm" className="font-mono text-xs mt-1">
              <ExternalLink className="w-3 h-3 mr-2" />
              OPEN SAM.GOV PROFILE
            </Button>
          </a>
        </div>
      )}

      {error && !isApiKeyMissing && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Failed to fetch opportunities. Check the API server logs.
        </div>
      )}

      {data && (
        <div className="space-y-2">
          <div className="flex items-center justify-between font-mono text-xs text-muted-foreground border-b pb-2">
            <span>{data.totalRecords.toLocaleString()} TOTAL RECORDS — SHOWING {data.opportunities.length}</span>
          </div>

          {data.opportunities.length === 0 && (
            <div className="py-16 text-center text-muted-foreground font-mono text-sm">
              NO OPPORTUNITIES FOUND. TRY A DIFFERENT KEYWORD.
            </div>
          )}

          <div className="divide-y divide-border rounded-lg border overflow-hidden">
            {data.opportunities.map((opp) => {
              const alreadyImported = imported.has(opp.noticeId);
              const isPending =
                importMutation.isPending &&
                importMutation.variables?.data.noticeId === opp.noticeId;

              return (
                <div key={opp.noticeId} className="flex items-start gap-4 p-4 bg-card hover:bg-muted/40 transition-colors">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start gap-2 flex-wrap">
                      <span className="font-mono font-semibold text-sm leading-snug">{opp.title}</span>
                      {opp.type && (
                        <Badge variant="outline" className="font-mono text-xs shrink-0">
                          {opp.type.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs font-mono text-muted-foreground">
                      {opp.agency && <span>{opp.agency}</span>}
                      {opp.naicsCode && <span>NAICS {opp.naicsCode}</span>}
                      <span>VALUE: {formatValue(opp.awardAmount)}</span>
                      <span>DEADLINE: {formatDeadline(opp.responseDeadLine)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={opp.uiLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <Button
                      size="sm"
                      variant={alreadyImported ? "outline" : "default"}
                      className="font-mono text-xs h-8 px-3"
                      disabled={alreadyImported || isPending}
                      onClick={() => handleImport(opp)}
                    >
                      {isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : alreadyImported ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 mr-1.5 text-green-500" />
                          IMPORTED
                        </>
                      ) : (
                        <>
                          <Download className="w-3 h-3 mr-1.5" />
                          ADD TO PIPELINE
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!data && !isFetching && !error && (
        <div className="py-20 text-center space-y-2">
          <Search className="w-8 h-8 mx-auto text-muted-foreground/40" />
          <p className="text-sm font-mono text-muted-foreground">
            ENTER A KEYWORD TO SEARCH LIVE CONTRACT OPPORTUNITIES
          </p>
          <p className="text-xs font-mono text-muted-foreground/60">
            Examples: "software development", "construction", "cybersecurity"
          </p>
        </div>
      )}
    </div>
  );
}
