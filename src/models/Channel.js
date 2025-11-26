import mongoose from "mongoose";

const channelSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    channelId: { type: String, index: true },
    title: String,
    description: String,
    thumbnail: String,
    country: String,
    stats: {
      viewCount: Number,
      subscriberCount: Number,
      videoCount: Number,
    },
    uploadsPlaylistId: String,
    lastSyncedAt: Date, // for caching
  },
  { timestamps: true }
);

export default mongoose.model("Channel", channelSchema);
