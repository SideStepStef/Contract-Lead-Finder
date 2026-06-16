import { Router } from "express";
import { db, leadsTable } from "@workspace/db";

const router = Router();

const SAMGOV_BASE = "https://api.sam.gov/opportunities/v2/search";
const SETUP_URL = "https://sam.gov/profile/details";

router.get("/opportunities/search", async (req, res) => {
  const apiKey = process.env.SAMGOV_API_KEY;
  if (!apiKey) {
    res.status(503).json({
      error: "SAM.gov API key not configured. Add SAMGOV_API_KEY to your secrets.",
      setupUrl: SETUP_URL,
    });
    return;
  }

  const keyword = typeof req.query.keyword === "string" ? req.query.keyword : "";
  const limit = Math.min(Number(req.query.limit) || 10, 25);

  const params = new URLSearchParams({
    api_key: apiKey,
    limit: String(limit),
    active: "Yes",
    ptype: "o,p,k,r,s",
  });

  if (keyword) params.set("keyword", keyword);

  try {
    const response = await fetch(`${SAMGOV_BASE}?${params.toString()}`);
    if (!response.ok) {
      const text = await response.text();
      console.error("SAM.gov error:", response.status, text);
      res.status(502).json({ error: `SAM.gov returned ${response.status}` });
      return;
    }

    const data = (await response.json()) as {
      opportunitiesData?: SamOpportunity[];
      totalRecords?: number;
    };

    const opportunities = (data.opportunitiesData ?? []).map(mapOpportunity);

    res.json({
      opportunities,
      totalRecords: data.totalRecords ?? opportunities.length,
    });
  } catch (err) {
    console.error("SAM.gov fetch error:", err);
    res.status(502).json({ error: "Failed to reach SAM.gov API" });
  }
});

router.post("/opportunities/import", async (req, res) => {
  const { noticeId, title, agency, responseDeadLine, naicsCode, type, awardAmount, uiLink } =
    req.body as {
      noticeId: string;
      title: string;
      agency?: string | null;
      responseDeadLine?: string | null;
      naicsCode?: string | null;
      type?: string | null;
      awardAmount?: number | null;
      uiLink: string;
    };

  if (!title || !noticeId) {
    res.status(400).json({ error: "title and noticeId are required" });
    return;
  }

  const category = naicsCategory(naicsCode) ?? "Government";

  const deadline = responseDeadLine
    ? parseDeadline(responseDeadLine)
    : null;

  const [lead] = await db
    .insert(leadsTable)
    .values({
      title,
      description: type ? `Opportunity type: ${type}` : null,
      issuer: agency ?? null,
      contractValue: awardAmount != null ? String(awardAmount) : null,
      deadline,
      category,
      status: "new",
      sourceUrl: uiLink,
      notes: `Imported from SAM.gov. Notice ID: ${noticeId}`,
    })
    .returning();

  res.status(201).json({
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
  });
});

interface SamOpportunity {
  noticeId: string;
  title: string;
  solicitationNumber?: string;
  fullParentPathName?: string;
  postedDate?: string;
  responseDeadLine?: string;
  naicsCode?: string;
  type?: string;
  active: string;
  award?: { amount?: string };
  uiLink?: string;
}

function mapOpportunity(o: SamOpportunity) {
  const agency = o.fullParentPathName
    ? o.fullParentPathName.split("::").pop()?.trim() ?? null
    : null;

  const awardAmount = o.award?.amount ? parseFloat(o.award.amount) : null;

  return {
    noticeId: o.noticeId,
    title: o.title,
    solicitationNumber: o.solicitationNumber ?? null,
    agency,
    postedDate: o.postedDate ?? null,
    responseDeadLine: o.responseDeadLine ?? null,
    naicsCode: o.naicsCode ?? null,
    type: o.type ?? null,
    active: o.active,
    awardAmount: isNaN(awardAmount as number) ? null : awardAmount,
    uiLink: o.uiLink ?? `https://sam.gov/opp/${o.noticeId}/view`,
  };
}

function parseDeadline(raw: string): string | null {
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

const NAICS_MAP: Record<string, string> = {
  "23": "Construction",
  "31": "Manufacturing",
  "32": "Manufacturing",
  "33": "Manufacturing",
  "51": "Technology",
  "54": "Consulting",
  "56": "Consulting",
  "61": "Consulting",
  "62": "Healthcare",
  "92": "Government",
};

function naicsCategory(code?: string | null): string | null {
  if (!code) return null;
  const prefix2 = code.slice(0, 2);
  return NAICS_MAP[prefix2] ?? "Government";
}

export default router;
