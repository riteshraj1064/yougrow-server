import express from "express";
import { auth } from "../middleware/auth.js";
import {
  getChannelVideosWithCache,
  getSingleVideoWithSync,
  searchCompetitorVideosByKeyword,
} from "../services/youtubeService.js";
import Channel from "../models/Channel.js";
import {
  aiAnalyzeVideoSEO,
  aiGradeThumbnail,
  buildCompetitorSummaryText,
  buildTagSuggestions,
  computeKeywordDifficulty,
  computeSeoScoreFromHeuristics,
  suggestBestPostingTime,
} from "../services/analysisService.js";
import Video from "../models/Video.js";

const router = express.Router();

router.get("/:channelId/list", auth, async (req, res) => {

  console.log(req.params.channelId)
  try {
    const videos = await getChannelVideosWithCache(req.user, req.params.channelId);
    res.json(videos);
  } catch (err) {
    console.error("Get video list error:", err);
    res.status(500).json({ message: "Error fetching videos" });
  }
});

// Full single video SEO + competitor analysis
router.get("/:channelId/:videoId/detail", auth, async (req, res) => {
  try {
    const { channelId, videoId } = req.params;

    const channelDoc = await Channel.findOne({
      userId: req.user._id,
      channelId,
    });
    if (!channelDoc) return res.status(404).json({ message: "Channel not found" });

    let videoDoc = await getSingleVideoWithSync(req.user, channelId, videoId);
    
    const keywordSource = [
      videoDoc.title,
      ...(videoDoc.tags || []),
    ].join(" ");

    const mainKeyword = videoDoc.tags?.[0] || videoDoc.title.split(" ").slice(0, 3).join(" ");

    // const competitorVideos = await searchCompetitorVideosByKeyword(
    //   req.user,
    //   mainKeyword,
    //   10
    // );

    // const keywordDifficulty = computeKeywordDifficulty(competitorVideos);
    // const competitorSummaryText = buildCompetitorSummaryText(competitorVideos);
    // const tagSuggestions = buildTagSuggestions(videoDoc.tags || [], competitorVideos);
    // const { bestHour, bestPostingHourScore } = await suggestBestPostingTime(
    //   channelDoc
    // );

    // const heuristicSeoScore = computeSeoScoreFromHeuristics(
    //   videoDoc.engagementRate || 0,
    //   keywordDifficulty,
    //   (videoDoc.tags || []).length > 0,
    //   (videoDoc.description || "").length
    // );

    // const aiSeoAnalysis = await aiAnalyzeVideoSEO({
    //   title: videoDoc.title,
    //   description: videoDoc.description || "",
    //   tags: videoDoc.tags || [],
    //   views: videoDoc.stats?.viewCount || 0,
    //   likes: videoDoc.stats?.likeCount || 0,
    //   comments: videoDoc.stats?.commentCount || 0,
    //   engagementRate: videoDoc.engagementRate || 0,
    //   competitorSummaryText,
    // });

    // const competitorsInfo = competitorSummaryText;
    // const aiThumbGrade = await aiGradeThumbnail({
    //   title: videoDoc.title,
    //   thumbnailUrl: videoDoc.thumbnail,
    //   views: videoDoc.stats?.viewCount || 0,
    //   competitorsInfo,
    // });

    // videoDoc.seoScore = heuristicSeoScore;
    // videoDoc.keywordDifficulty = keywordDifficulty;
    // videoDoc.bestPostingHourScore = bestPostingHourScore;
    // videoDoc.aiAnalysis = aiSeoAnalysis;
    // videoDoc.aiThumbnailGrade = aiThumbGrade;
    // videoDoc.competitorSummary = competitorSummaryText;
    // videoDoc.tagSuggestions = tagSuggestions;
    
    await videoDoc.save();

    res.json({
      video: videoDoc,
      // mainKeyword,
      // keywordDifficulty,
      // bestPostingHour: bestHour,
      // competitorVideos,
      // tagSuggestions,

    });
  } catch (err) {
    console.error("Get video detail error:", err);
    res.status(500).json({ message: "Error fetching video detail" });
  }
});

export default router;
