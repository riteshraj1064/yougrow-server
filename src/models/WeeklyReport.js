import mongoose from "mongoose";

const weeklyReportSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    myChannelId: { type: mongoose.Schema.Types.ObjectId, ref: "Channel", index: true },
    weekOf: Date, // Monday of the week
    summary: String,
    topGainers: [String],
    topLosers: [String],
    newKeywords: [String],
    lostKeywords: [String],
    competitorHighlights: String,
  },
  { timestamps: true }
);

export default mongoose.model("WeeklyReport", weeklyReportSchema);
