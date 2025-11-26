import Video from "../models/Video.js";
import Channel from "../models/Channel.js";
import CompetitorChannel from "../models/CompetitorChannel.js";
import KeywordRank from "../models/KeywordRank.js";
import { gemini } from "../config/aiClient.js";

export const computeKeywordDifficulty = (competitorVideos) => {
  if (!competitorVideos?.length) return 10; // very easy

  let avgViews = 0;
  let avgAgeDays = 0;
  competitorVideos.forEach((v) => {
    const views = Number(v.statistics?.viewCount || 0);
    avgViews += views;
    const ageMs = Date.now() - new Date(v.snippet?.publishedAt).getTime();
    avgAgeDays += ageMs / (1000 * 60 * 60 * 24);
  });

  avgViews /= competitorVideos.length;
  avgAgeDays /= competitorVideos.length;

  // simple heuristic: more views + older = harder
  let score = 20;

  if (avgViews > 50000) score += 20;
  if (avgViews > 200000) score += 25;
  if (avgViews > 1000000) score += 25;

  if (avgAgeDays < 7) score += 5;
  if (avgAgeDays < 30) score += 5;

  if (score > 100) score = 100;
  return Math.round(score);
};

export const suggestBestPostingTime = async (channelDoc) => {
  const videos = await Video.find({ channelId: channelDoc._id });

  if (!videos.length) return 50;

  const buckets = {}; // key: hourOfDay 0-23, value: sum of views
  videos.forEach((v) => {
    if (!v.publishedAt || !v.stats?.viewCount) return;
    const d = new Date(v.publishedAt);
    const hour = d.getUTCHours(); // simplified
    buckets[hour] = (buckets[hour] || 0) + v.stats.viewCount;
  });

  const entries = Object.entries(buckets);
  if (!entries.length) return 50;

  entries.sort((a, b) => b[1] - a[1]);
  const [bestHour, bestScore] = entries[0];

  // normalize to 0–100
  const maxViews = bestScore;
  const normalized = maxViews > 0 ? 80 + Math.min(20, (maxViews / maxViews) * 20) : 60;

  return {
    bestHour: Number(bestHour),
    bestPostingHourScore: Math.round(normalized),
  };
};

export const buildTagSuggestions = (myTags = [], competitorVideos = []) => {
  const mySet = new Set(myTags.map((t) => t.toLowerCase()));
  const candidateSet = new Set();

  competitorVideos.forEach((v) => {
    (v.snippet?.tags || []).forEach((t) => {
      const lower = t.toLowerCase();
      if (!mySet.has(lower) && lower.length <= 60 && !lower.includes("free download")) {
        candidateSet.add(t);
      }
    });
  });

  return Array.from(candidateSet).slice(0, 25);
};



export const aiAnalyzeVideoSEO = async ({
  title,
  description,
  tags,
  views,
  likes,
  comments,
  engagementRate,
  competitorSummaryText,
}) => {
  const prompt = `
Analyze this YouTube video SEO:

Title: ${title}
Description: ${description}
Tags: ${tags.join(", ")}
Views: ${views}
Likes: ${likes}
Comments: ${comments}
Engagement: ${engagementRate.toFixed(2)}%

Competitors:
${competitorSummaryText}

Return:
- SEO score (0-100)
- strengths
- weaknesses
- warnings
- improvements
- better title suggestion
- top 10 tag suggestions
`;

   const result = await gemini.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });
  const response = result.text

  return response;
};



export const aiGradeThumbnail = async ({
  title,
  thumbnailUrl,
  views,
  competitorsInfo,
}) => {

  const prompt = `
Evaluate YouTube thumbnail CTR potential:

Title: ${title}
Thumbnail: ${thumbnailUrl}
Views: ${views}

Competitors:
${competitorsInfo}

Return:
- grade (A+ to F)
- short reasoning
- 3 concrete improvements
`;

   const result = await gemini.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    maxTokens: 100,
  });

  return result.text;
};


export const buildCompetitorSummaryText = (competitorVideos = []) => {
  return competitorVideos
    .slice(0, 10)
    .map((v, idx) => {
      const views = v.statistics?.viewCount || 0;
      const title = v.snippet?.title || "";
      const ch = v.snippet?.channelTitle || "";
      return `${idx + 1}. ${title} (${views} views) by ${ch}`;
    })
    .join("\n");
};

export const computeSeoScoreFromHeuristics = (
  engagementRate,
  keywordDifficulty,
  hasTags,
  descLength
) => {
  let score = 50;

  if (engagementRate > 5) score += 10;
  if (engagementRate > 10) score += 15;

  if (keywordDifficulty < 30) score += 10;
  if (keywordDifficulty > 70) score -= 10;

  if (hasTags) score += 10;
  if (descLength > 300) score += 10;
  if (descLength < 50) score -= 10;

  if (score < 0) score = 0;
  if (score > 100) score = 100;
  return Math.round(score);
};

export const generateWeeklyReportForUserChannel = async (userId, myChannelDoc, weekOfDate) => {
  const myVideos = await Video.find({ channelId: myChannelDoc._id }).sort({
    createdAt: -1,
  });

  const lastWeekVideos = myVideos.slice(0, 30); // naive: last 30 videos

  const topGainers = lastWeekVideos
    .sort((a, b) => (b.stats.viewCount || 0) - (a.stats.viewCount || 0))
    .slice(0, 5)
    .map((v) => v.title);

  const topLosers = lastWeekVideos
    .sort((a, b) => (a.engagementRate || 0) - (b.engagementRate || 0))
    .slice(0, 5)
    .map((v) => v.title);

  // Keywords from KeywordRank
  const ranks = await KeywordRank.find({
    userId,
    myChannelId: myChannelDoc._id,
  });

  const newKeywords = ranks
    .filter((r) => r.results?.length > 0)
    .map((r) => r.keyword)
    .slice(0, 15);

  const competitorChannels = await CompetitorChannel.find({
    userId,
    myChannelId: myChannelDoc._id,
  });

  const competitorHighlights = competitorChannels
    .map(
      (c) =>
        `${c.title} | subs: ${c.stats?.subscriberCount} | views: ${c.stats?.viewCount}`
    )
    .join("\n");

  const summary = `
Weekly performance summary for channel: ${myChannelDoc.title}

Top gaining videos:
${topGainers.join("\n")}

Videos with low engagement:
${topLosers.join("\n")}

New / tracked keywords:
${newKeywords.join(", ") || "No data"}

Competitor highlights:
${competitorHighlights || "No competitors configured"}
`;

  return {
    summary,
    topGainers,
    topLosers,
    newKeywords,
    competitorHighlights,
  };
};
