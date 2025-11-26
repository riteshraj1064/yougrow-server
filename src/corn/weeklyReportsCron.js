import cron from "node-cron";
import Channel from "../models/Channel.js";
import WeeklyReport from "../models/WeeklyReport.js";
import { generateWeeklyReportForUserChannel } from "../services/analysisService.js";

/**
 * Runs every Monday at 09:00 server time.
 * CRON: "0 9 * * 1"
 */
cron.schedule("0 9 * * 1", async () => {
  try {
    console.log("🕒 Running weekly competitor report job...");

    const channels = await Channel.find({});
    const monday = new Date();
    monday.setHours(0, 0, 0, 0);

    for (const ch of channels) {
      const existing = await WeeklyReport.findOne({
        userId: ch.userId,
        myChannelId: ch._id,
        weekOf: monday,
      });
      if (existing) continue;

      const reportData = await generateWeeklyReportForUserChannel(
        ch.userId,
        ch,
        monday
      );

      await WeeklyReport.create({
        userId: ch.userId,
        myChannelId: ch._id,
        weekOf: monday,
        summary: reportData.summary,
        topGainers: reportData.topGainers,
        topLosers: reportData.topLosers,
        newKeywords: reportData.newKeywords,
        lostKeywords: reportData.lostKeywords || [],
        competitorHighlights: reportData.competitorHighlights,
      });
    }

    console.log("✅ Weekly competitor report job completed");
  } catch (err) {
    console.error("❌ Weekly report job error:", err);
  }
});
