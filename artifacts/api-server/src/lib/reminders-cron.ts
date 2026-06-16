import cron from "node-cron";
import { getEmailConfig, sendReminderEmail } from "./mailer";
import { logger } from "./logger";

export function startRemindersCron() {
  const config = getEmailConfig();
  if (!config) {
    logger.warn("SMTP not configured — deadline reminder emails disabled. Set SMTP_HOST, SMTP_USER, SMTP_PASS, REMINDER_EMAIL to enable.");
    return;
  }

  // Run every day at 8:00 AM server time
  cron.schedule("0 8 * * *", async () => {
    logger.info("Running daily deadline reminders...");
    try {
      const result = await sendReminderEmail(config);
      logger.info(result, "Daily reminder complete");
    } catch (err) {
      logger.error(err, "Failed to send reminder email");
    }
  });

  logger.info({ to: config.toEmail }, "Deadline reminder cron scheduled (daily 08:00)");
}
