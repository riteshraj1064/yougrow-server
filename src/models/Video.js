import mongoose from "mongoose";

const videoSchema = new mongoose.Schema(
  {
    channelId: { type: mongoose.Schema.Types.ObjectId, ref: "Channel", index: true },
    youtubeVideoId: { type: String, index: true },
    title: String,
    description: String,
    tags: [String],
    thumbnail: String,
    publishedAt: Date,
    duration: String,
    stats: {
      viewCount: Number,
      likeCount: Number,
      commentCount: Number,
    },
    status: {
      uploadStatus: String,
      privacyStatus: String,
      license: String,
      embeddable: Boolean,
      publicStatsViewable: Boolean,
      madeForKids: Boolean,
      selfDeclaredMadeForKids: Boolean
    },
    engagementRate: Number,
    seoScore: Number,
    keywordDifficulty: Number,
    bestPostingHourScore: Number,
    aiAnalysis: String,
    aiThumbnailGrade: String,
    competitorSummary: String,
    tagSuggestions: [String],
    lastSyncedAt: Date, // for caching
  },
  { timestamps: true }
);

export default mongoose.model("Video", videoSchema);
