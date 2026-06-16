import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateLead, getListLeadsQueryKey, getGetLeadsStatsQueryKey, getGetRecentLeadsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
const LEAD_STATUSES = ["new", "researching", "bidding", "won", "lost", "archived"] as const;

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  issuer: z.string().optional(),
  contractValue: z.coerce.number().optional(),
  deadline: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  status: z.enum(LEAD_STATUSES).optional(),
  sourceUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewLead() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      issuer: "",
      contractValue: undefined,
      deadline: "",
      category: "",
      status: "new",
      sourceUrl: "",
      notes: "",
    },
  });

  const createLeadMutation = useCreateLead({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Lead created", description: "New contract lead has been added." });
        queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetLeadsStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRecentLeadsQueryKey() });
        setLocation(`/leads/${data.id}`);
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to create lead.", variant: "destructive" });
      }
    }
  });

  const onSubmit = (data: FormValues) => {
    createLeadMutation.mutate({
      data: {
        ...data,
        sourceUrl: data.sourceUrl || undefined,
        deadline: data.deadline ? new Date(data.deadline).toISOString() : undefined,
      }
    });
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4 text-sm font-mono text-muted-foreground">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/leads")} className="h-8 px-2 font-mono text-xs">
          <ArrowLeft className="w-3 h-3 mr-2" />
          BACK TO PIPELINE
        </Button>
        <span>/</span>
        <span>NEW LEAD</span>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">ADD NEW LEAD</h1>
        <p className="text-muted-foreground mt-1 text-sm font-mono">Enter contract details into the system.</p>
      </div>

      <Card className="rounded-xl border-border bg-card">
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel className="font-mono text-xs">CONTRACT TITLE *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. IT Services Procurement" className="font-mono bg-background" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="issuer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs">ISSUER/AGENCY</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Dept of Defense" className="font-mono bg-background" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs">CATEGORY *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. IT, Defense, Construction" className="font-mono bg-background" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contractValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs">EST. VALUE (USD)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="500000" className="font-mono bg-background" {...field} value={field.value || ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs">DEADLINE</FormLabel>
                      <FormControl>
                        <Input type="date" className="font-mono bg-background" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs">INITIAL STATUS</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="font-mono bg-background">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="new">NEW</SelectItem>
                          <SelectItem value="researching">RESEARCHING</SelectItem>
                          <SelectItem value="bidding">BIDDING</SelectItem>
                          <SelectItem value="won">WON</SelectItem>
                          <SelectItem value="lost">LOST</SelectItem>
                          <SelectItem value="archived">ARCHIVED</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sourceUrl"
                  render={({ field }) => (
                    <FormItem className="col-span-2 md:col-span-1">
                      <FormLabel className="font-mono text-xs">SOURCE URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." className="font-mono bg-background" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs">DESCRIPTION</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Contract scope and details..." className="min-h-[100px] font-mono bg-background text-sm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs">INITIAL NOTES</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Internal operational notes..." className="min-h-[100px] font-mono bg-background text-sm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-4 border-t border-border">
                <Button type="button" variant="outline" className="mr-2" onClick={() => setLocation("/leads")}>
                  CANCEL
                </Button>
                <Button type="submit" disabled={createLeadMutation.isPending}>
                  {createLeadMutation.isPending ? "SAVING..." : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      SAVE LEAD
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
