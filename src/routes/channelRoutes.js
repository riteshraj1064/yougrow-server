import express from "express";
import { auth } from "../middleware/auth.js";
import { getUserChannelsWithCache } from "../services/youtubeService.js";
import Channel from "../models/Channel.js";

const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const channels = await getUserChannelsWithCache(req.user);
    res.json(channels);
  } catch (err) {
    console.error("Get channels error:", err);
    res.status(500).json({ message: "Error fetching channels" });
  }
});

router.get("/:channelId", auth, async (req, res) => {
  try {
    const doc = await Channel.findOne({
      userId: req.user._id,
      channelId: req.params.channelId,
    });
    if (!doc) return res.status(404).json({ message: "Channel not found" });
    res.json(doc);
  } catch (err) {
    console.error("Get channel error:", err);
    res.status(500).json({ message: "Error fetching channel" });
  }
});

export default router;
