import nodemailer from "nodemailer";
import { db, leadsTable } from "@workspace/db";
import { and, isNotNull, ne, lte, gte } from "drizzle-orm";
import { logger } from "./logger";

export interface EmailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  toEmail: string;
}

export function getEmailConfig(): EmailConfig | null {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, REMINDER_EMAIL } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !REMINDER_EMAIL) return null;
  return {
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    user: SMTP_USER,
    pass: SMTP_PASS,
    toEmail: REMINDER_EMAIL,
  };
}

export async function getUpcomingDeadlineLeads(days = 7) {
  const now = new Date();
  const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const nowStr = now.toISOString().slice(0, 10);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const leads = await db
    .select()
    .from(leadsTable)
    .where(
      and(
        isNotNull(leadsTable.deadline),
        gte(leadsTable.deadline, nowStr),
        lte(leadsTable.deadline, cutoffStr),
        ne(leadsTable.status, "won"),
        ne(leadsTable.status, "lost"),
        ne(leadsTable.status, "archived")
      )
    )
    .orderBy(leadsTable.deadline);

  return leads.map((l) => ({
    id: l.id,
    title: l.title,
    issuer: l.issuer ?? null,
    contractValue: l.contractValue ? parseFloat(l.contractValue) : null,
    deadline: l.deadline!,
    category: l.category,
    status: l.status,
    sourceUrl: l.sourceUrl ?? null,
  }));
}

export async function sendReminderEmail(config: EmailConfig, testMode = false) {
  const leads = testMode ? [] : await getUpcomingDeadlineLeads(7);

  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
  });

  const subject = testMode
    ? "CLF — Email Reminders Configured Successfully"
    : `CLF — ${leads.length} Contract Deadline${leads.length !== 1 ? "s" : ""} This Week`;

  const leadsHtml = testMode
    ? `<p style="color:#6b7280;font-family:monospace">This is a test message. Your email reminders are working correctly.</p>`
    : leads.length === 0
    ? `<p style="color:#6b7280;font-family:monospace">No upcoming deadlines in the next 7 days.</p>`
    : leads
        .map((l) => {
          const daysLeft = Math.ceil(
            (new Date(l.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          const urgencyColor = daysLeft <= 2 ? "#ef4444" : daysLeft <= 4 ? "#f59e0b" : "#3b82f6";
          const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
          return `
          <tr style="border-bottom:1px solid #e5e7eb">
            <td style="padding:12px 8px;font-family:monospace;font-size:13px">${l.title}</td>
            <td style="padding:12px 8px;font-family:monospace;font-size:13px;color:#6b7280">${l.issuer ?? "—"}</td>
            <td style="padding:12px 8px;font-family:monospace;font-size:13px">${l.contractValue != null ? fmt.format(l.contractValue) : "—"}</td>
            <td style="padding:12px 8px;font-family:monospace;font-size:13px;color:${urgencyColor};font-weight:bold">${l.deadline} (${daysLeft}d)</td>
            <td style="padding:12px 8px;font-family:monospace;font-size:12px;text-transform:uppercase">${l.status}</td>
          </tr>`;
        })
        .join("");

  const html = `
  <div style="max-width:700px;margin:0 auto;font-family:monospace;background:#f9fafb;padding:24px">
    <div style="background:#111827;color:#f9fafb;padding:16px 20px;border-radius:8px 8px 0 0">
      <span style="font-weight:bold;letter-spacing:.05em">TERMINAL // CLF — DEADLINE INTEL</span>
    </div>
    <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:20px;border-radius:0 0 8px 8px">
      ${
        !testMode && leads.length > 0
          ? `<table style="width:100%;border-collapse:collapse">
               <thead>
                 <tr style="border-bottom:2px solid #111827">
                   <th style="padding:8px;text-align:left;font-size:11px;text-transform:uppercase">Title</th>
                   <th style="padding:8px;text-align:left;font-size:11px;text-transform:uppercase">Issuer</th>
                   <th style="padding:8px;text-align:left;font-size:11px;text-transform:uppercase">Value</th>
                   <th style="padding:8px;text-align:left;font-size:11px;text-transform:uppercase">Deadline</th>
                   <th style="padding:8px;text-align:left;font-size:11px;text-transform:uppercase">Status</th>
                 </tr>
               </thead>
               <tbody>${leadsHtml}</tbody>
             </table>`
          : leadsHtml
      }
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
      <p style="color:#9ca3af;font-size:11px;margin:0">Contract Lead Finder — Daily Digest</p>
    </div>
  </div>`;

  await transport.sendMail({
    from: `"Contract Lead Finder" <${config.user}>`,
    to: config.toEmail,
    subject,
    html,
  });

  logger.info({ to: config.toEmail, leads: leads.length }, "Reminder email sent");
  return { sent: true, leadsCount: leads.length };
}
