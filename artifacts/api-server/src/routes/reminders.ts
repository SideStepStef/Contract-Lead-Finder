import { Router } from "express";
import { getEmailConfig, getUpcomingDeadlineLeads, sendReminderEmail } from "../lib/mailer";

const router = Router();

router.get("/reminders/upcoming", async (req, res) => {
  const days = Math.min(Number(req.query.days) || 7, 30);
  const leads = await getUpcomingDeadlineLeads(days);
  res.json({ leads, days });
});

router.get("/reminders/email-status", (_req, res) => {
  const config = getEmailConfig();
  res.json({
    configured: config !== null,
    toEmail: config?.toEmail ?? null,
    host: config?.host ?? null,
  });
});

router.post("/reminders/send-test", async (_req, res) => {
  const config = getEmailConfig();
  if (!config) {
    res.status(503).json({
      error: "SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, REMINDER_EMAIL.",
    });
    return;
  }
  try {
    const result = await sendReminderEmail(config, true);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
