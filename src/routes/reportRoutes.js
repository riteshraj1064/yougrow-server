import express from "express";
import { auth } from "../middleware/auth.js";
import WeeklyReport from "../models/WeeklyReport.js";
import Channel from "../models/Channel.js";

const router = express.Router();

// Get last N weekly reports for a channel
router.get("/:myChannelId", auth, async (req, res) => {
  try {
    const limit = Number(req.query.limit || 5);

    const myChannelDoc = await Channel.findOne({
      userId: req.user._id,
      channelId: req.params.myChannelId,
    });
    if (!myChannelDoc) return res.status(404).json({ message: "Channel not found" });

    const reports = await WeeklyReport.find({
      userId: req.user._id,
      myChannelId: myChannelDoc._id,
    })
      .sort({ weekOf: -1 })
      .limit(limit);

    res.json(reports);
  } catch (err) {
    console.error("Get reports error:", err);
    res.status(500).json({ message: "Error fetching weekly reports" });
  }
});

export default router;
