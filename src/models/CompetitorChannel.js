import mongoose from "mongoose";

const competitorChannelSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    myChannelId: { type: mongoose.Schema.Types.ObjectId, ref: "Channel", index: true },
    competitorChannelId: { type: String, index: true },
    title: String,
    thumbnail: String,
    stats: {
      viewCount: Number,
      subscriberCount: Number,
      videoCount: Number,
    },
    trackedKeywords: [String],
    lastSyncedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model("CompetitorChannel", competitorChannelSchema);
