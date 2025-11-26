import express from "express";
import { auth } from "../middleware/auth.js";
import Channel from "../models/Channel.js";
import { trackKeywordRank } from "../services/youtubeService.js";
import KeywordRank from "../models/KeywordRank.js";

const router = express.Router();

// Track keyword for channel (run search + store positions)
router.post("/track", auth, async (req, res) => {
  try {
    const { myChannelId, keyword } = req.body;
    if (!myChannelId || !keyword) {
      return res.status(400).json({ message: "myChannelId and keyword required" });
    }

    const myChannelDoc = await Channel.findOne({
      userId: req.user._id,
      channelId: myChannelId,
    });
    if (!myChannelDoc) return res.status(404).json({ message: "Channel not found" });

    const doc = await trackKeywordRank(req.user, myChannelDoc, keyword);
    res.json(doc);
  } catch (err) {
    console.error("Track keyword error:", err);
    res.status(500).json({ message: "Error tracking keyword" });
  }
});

// Get tracked keywords + last results
router.get("/:myChannelId", auth, async (req, res) => {
  try {
    const myChannelDoc = await Channel.findOne({
      userId: req.user._id,
      channelId: req.params.myChannelId,
    });
    if (!myChannelDoc) return res.status(404).json({ message: "Channel not found" });

    const data = await KeywordRank.find({
      userId: req.user._id,
      myChannelId: myChannelDoc._id,
    });

    res.json(data);
  } catch (err) {
    console.error("Get keywords error:", err);
    res.status(500).json({ message: "Error fetching keyword ranks" });
  }
});

export default router;
