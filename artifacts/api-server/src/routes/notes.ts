import { Router } from "express";
import { db, leadsTable, leadNotesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/leads/:id/notes", async (req, res) => {
  const leadId = Number(req.params.id);
  if (isNaN(leadId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [lead] = await db.select({ id: leadsTable.id }).from(leadsTable).where(eq(leadsTable.id, leadId));
  if (!lead) { res.status(404).json({ error: "Lead not found" }); return; }

  const notes = await db
    .select()
    .from(leadNotesTable)
    .where(eq(leadNotesTable.leadId, leadId))
    .orderBy(desc(leadNotesTable.createdAt));

  res.json(notes.map(n => ({
    id: n.id,
    leadId: n.leadId,
    content: n.content,
    createdAt: n.createdAt.toISOString(),
  })));
});

router.post("/leads/:id/notes", async (req, res) => {
  const leadId = Number(req.params.id);
  if (isNaN(leadId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
  if (!content) { res.status(400).json({ error: "content is required" }); return; }

  const [lead] = await db.select({ id: leadsTable.id }).from(leadsTable).where(eq(leadsTable.id, leadId));
  if (!lead) { res.status(404).json({ error: "Lead not found" }); return; }

  const [note] = await db
    .insert(leadNotesTable)
    .values({ leadId, content })
    .returning();

  res.status(201).json({
    id: note.id,
    leadId: note.leadId,
    content: note.content,
    createdAt: note.createdAt.toISOString(),
  });
});

export default router;
