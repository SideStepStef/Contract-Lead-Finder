import { Router } from "express";
import { db, leadsTable } from "@workspace/db";
import { eq, ilike, or, and, isNotNull, lte } from "drizzle-orm";
import {
  ListLeadsQueryParams,
  CreateLeadBody,
  GetLeadParams,
  UpdateLeadParams,
  UpdateLeadBody,
  DeleteLeadParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/leads/stats", async (_req, res) => {
  const all = await db.select().from(leadsTable);

  const byStatusMap: Record<string, number> = {};
  let totalPipelineValue = 0;
  let upcomingDeadlines = 0;

  const now = new Date();
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  for (const lead of all) {
    byStatusMap[lead.status] = (byStatusMap[lead.status] ?? 0) + 1;

    if (
      lead.contractValue &&
      ["new", "researching", "bidding"].includes(lead.status)
    ) {
      totalPipelineValue += parseFloat(lead.contractValue);
    }

    if (lead.deadline) {
      const d = new Date(lead.deadline);
      if (d >= now && d <= sevenDaysOut) {
        upcomingDeadlines++;
      }
    }
  }

  const statuses = ["new", "researching", "bidding", "won", "lost", "archived"];
  const byStatus = statuses.map((s) => ({ status: s, count: byStatusMap[s] ?? 0 }));

  res.json({
    total: all.length,
    byStatus,
    totalPipelineValue,
    upcomingDeadlines,
  });
});

router.get("/leads/recent", async (_req, res) => {
  const leads = await db
    .select()
    .from(leadsTable)
    .orderBy(leadsTable.createdAt)
    .limit(5);
  res.json(leads.map(formatLead));
});

router.get("/leads", async (req, res) => {
  const parsed = ListLeadsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  const { status, category, search } = parsed.data;
  const conditions = [];

  if (status) conditions.push(eq(leadsTable.status, status));
  if (category) conditions.push(eq(leadsTable.category, category));
  if (search) {
    conditions.push(
      or(
        ilike(leadsTable.title, `%${search}%`),
        ilike(leadsTable.issuer, `%${search}%`),
        ilike(leadsTable.description, `%${search}%`)
      )!
    );
  }

  const leads =
    conditions.length > 0
      ? await db.select().from(leadsTable).where(and(...conditions))
      : await db.select().from(leadsTable);

  res.json(leads.map(formatLead));
});

router.post("/leads", async (req, res) => {
  const parsed = CreateLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const [lead] = await db
    .insert(leadsTable)
    .values({
      title: data.title,
      description: data.description ?? null,
      issuer: data.issuer ?? null,
      contractValue: data.contractValue?.toString() ?? null,
      deadline: data.deadline ?? null,
      category: data.category ?? "General",
      status: data.status ?? "new",
      sourceUrl: data.sourceUrl ?? null,
      notes: data.notes ?? null,
    })
    .returning();

  res.status(201).json(formatLead(lead));
});

router.get("/leads/:id", async (req, res) => {
  const parsed = GetLeadParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [lead] = await db
    .select()
    .from(leadsTable)
    .where(eq(leadsTable.id, parsed.data.id));

  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  res.json(formatLead(lead));
});

router.patch("/leads/:id", async (req, res) => {
  const paramsParsed = UpdateLeadParams.safeParse({ id: Number(req.params.id) });
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const bodyParsed = UpdateLeadBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  const d = bodyParsed.data;
  if (d.title !== undefined) updates.title = d.title;
  if (d.description !== undefined) updates.description = d.description;
  if (d.issuer !== undefined) updates.issuer = d.issuer;
  if (d.contractValue !== undefined) updates.contractValue = d.contractValue?.toString();
  if (d.deadline !== undefined) updates.deadline = d.deadline;
  if (d.category !== undefined) updates.category = d.category;
  if (d.status !== undefined) updates.status = d.status;
  if (d.sourceUrl !== undefined) updates.sourceUrl = d.sourceUrl;
  if (d.notes !== undefined) updates.notes = d.notes;
  updates.updatedAt = new Date();

  const [lead] = await db
    .update(leadsTable)
    .set(updates)
    .where(eq(leadsTable.id, paramsParsed.data.id))
    .returning();

  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  res.json(formatLead(lead));
});

router.delete("/leads/:id", async (req, res) => {
  const parsed = DeleteLeadParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [deleted] = await db
    .delete(leadsTable)
    .where(eq(leadsTable.id, parsed.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  res.status(204).send();
});

router.get("/categories", async (_req, res) => {
  const all = await db.select({ category: leadsTable.category }).from(leadsTable);
  const counts: Record<string, number> = {};
  for (const row of all) {
    counts[row.category] = (counts[row.category] ?? 0) + 1;
  }
  const categories = Object.entries(counts).map(([name, count]) => ({
    name,
    count,
  }));
  res.json(categories);
});

function formatLead(lead: typeof leadsTable.$inferSelect) {
  return {
    id: lead.id,
    title: lead.title,
    description: lead.description ?? null,
    issuer: lead.issuer ?? null,
    contractValue: lead.contractValue ? parseFloat(lead.contractValue) : null,
    deadline: lead.deadline ?? null,
    category: lead.category,
    status: lead.status,
    sourceUrl: lead.sourceUrl ?? null,
    notes: lead.notes ?? null,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

export default router;
