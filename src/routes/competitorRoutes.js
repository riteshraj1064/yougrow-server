import express from "express";
import { auth } from "../middleware/auth.js";
import {
  getCompetitorChannelsWithCache,
  syncCompetitorChannel,
} from "../services/youtubeService.js";
import Channel from "../models/Channel.js";
import CompetitorChannel from "../models/CompetitorChannel.js";

const router = express.Router();

// Add competitor channel
router.post("/", auth, async (req, res) => {
  try {
    const { myChannelId, competitorChannelId } = req.body;
    if (!myChannelId || !competitorChannelId) {
      return res.status(400).json({ message: "myChannelId and competitorChannelId are required" });
    }

    const myChannelDoc = await Channel.findOne({
      userId: req.user._id,
      channelId: myChannelId,
    });
    if (!myChannelDoc)
      return res.status(404).json({ message: "My channel not found" });

    const doc = await syncCompetitorChannel(
      req.user,
      myChannelDoc,
      competitorChannelId
    );

    res.json(doc);
  } catch (err) {
    console.error("Add competitor error:", err);
    res.status(500).json({ message: "Error adding competitor" });
  }
});

// List competitor channels (cached)
router.get("/:myChannelId", auth, async (req, res) => {
  try {
    const data = await getCompetitorChannelsWithCache(
      req.user,
      req.params.myChannelId
    );
    res.json(data);
  } catch (err) {
    console.error("List competitor error:", err);
    res.status(500).json({ message: "Error fetching competitors" });
  }
});

// Delete competitor channel
router.delete("/:id", auth, async (req, res) => {
  try {
    await CompetitorChannel.deleteOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("Delete competitor error:", err);
    res.status(500).json({ message: "Error deleting competitor" });
  }
});

export default router;
