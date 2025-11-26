import mongoose from "mongoose";

const keywordRankSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    myChannelId: { type: mongoose.Schema.Types.ObjectId, ref: "Channel", index: true },
    keyword: { type: String, index: true },
    results: [
      {
        videoId: String,
        rankPosition: Number,
        title: String,
        isMyVideo: Boolean,
        competitorChannelId: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("KeywordRank", keywordRankSchema);
