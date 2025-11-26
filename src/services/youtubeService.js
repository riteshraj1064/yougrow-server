import Channel from "../models/Channel.js";
import Video from "../models/Video.js";
import CompetitorChannel from "../models/CompetitorChannel.js";
import KeywordRank from "../models/KeywordRank.js";
import { getYouTubeClientForUser } from "../config/googleClient.js";
import { google } from "googleapis";

const CACHE_MINUTES_CHANNEL = 60; // 1 hour
const CACHE_MINUTES_VIDEO = 30;   // 30 minutes
const CACHE_MINUTES_COMP = 240;   // 4 hours

const isFresh = (date, minutes) => {
  if (!date) return false;
  const diffMs = Date.now() - new Date(date).getTime();
  return diffMs < minutes * 60 * 1000;
};

export const syncUserChannels = async (user) => {
  const youtube = getYouTubeClientForUser(user);

  const resp = await youtube.channels.list({
    part: "snippet,statistics,contentDetails",
    mine: true,
    maxResults: 50,
  });

  const items = resp.data.items || [];
  const channels = [];

  for (const ch of items) {
    const uploadPlaylistId =
      ch.contentDetails?.relatedPlaylists?.uploads || null;

    const doc = await Channel.findOneAndUpdate(
      { userId: user._id, channelId: ch.id },
      {
        userId: user._id,
        channelId: ch.id,
        title: ch.snippet.title,
        description: ch.snippet.description,
        thumbnail: ch.snippet.thumbnails?.default?.url,
        country: ch.snippet.country,
        stats: {
          viewCount: Number(ch.statistics.viewCount || 0),
          subscriberCount: Number(ch.statistics.subscriberCount || 0),
          videoCount: Number(ch.statistics.videoCount || 0),
        },
        uploadsPlaylistId: uploadPlaylistId,
        lastSyncedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    channels.push(doc);
  }

  return channels;
};

export const getUserChannelsWithCache = async (user) => {
  const existing = await Channel.find({ userId: user._id });

  const allFresh =
    existing.length > 0 &&
    existing.every((ch) => isFresh(ch.lastSyncedAt, CACHE_MINUTES_CHANNEL));

  if (allFresh) return existing;

  return await syncUserChannels(user);
};

export const syncChannelVideos = async (user, channelDoc) => {
  const youtube = getYouTubeClientForUser(user);
  if (!channelDoc.uploadsPlaylistId)
    throw new Error("No uploads playlist id");

  const videos = [];
  let nextPageToken = null;

  do {
    const resp = await youtube.playlistItems.list({
      part: "snippet,contentDetails",
      playlistId: channelDoc.uploadsPlaylistId,
      maxResults: 50,
      pageToken: nextPageToken || undefined,
    });

    for (const item of resp.data.items || []) {
      const vidId = item.contentDetails.videoId;

      const detailsResp = await youtube.videos.list({
        part: "snippet,statistics,contentDetails,status",
        id: vidId,
      });

      const v = detailsResp.data.items?.[0];
      if (!v) continue;

      const snippet = v.snippet || {};
      const stats = v.statistics || {};
      const status = v.status || {};

      const viewCount = Number(stats.viewCount || 0);
      const likeCount = Number(stats.likeCount || 0);
      const commentCount = Number(stats.commentCount || 0);
      const engagement =
        viewCount > 0 ? ((likeCount + commentCount) / viewCount) * 100 : 0;

      const doc = await Video.findOneAndUpdate(
        { channelId: channelDoc._id, youtubeVideoId: vidId },
        {
          channelId: channelDoc._id,
          youtubeVideoId: vidId,
          title: snippet.title,
          description: snippet.description,
          tags: snippet.tags || [],
          thumbnail: snippet.thumbnails?.medium?.url,
          publishedAt: snippet.publishedAt,
          duration: v.contentDetails?.duration,
          stats: { viewCount, likeCount, commentCount },
          status: {
            uploadStatus: status.uploadStatus,
            privacyStatus: status.privacyStatus,
            license: status.license,
            embeddable: status.embeddable,
            publicStatsViewable: status.publicStatsViewable,
            madeForKids: status.madeForKids,
            selfDeclaredMadeForKids: status.selfDeclaredMadeForKids,
          },
          engagementRate: engagement,
          lastSyncedAt: new Date(),
        },
        { upsert: true, new: true }
      );

      videos.push(doc);
    }

    nextPageToken = resp.data.nextPageToken;
  } while (nextPageToken);

  return videos;
};

export const getChannelVideosWithCache = async (user, channelId) => {
  const channelDoc = await Channel.findOne({
    userId: user._id,
    channelId,
  });
  if (!channelDoc) throw new Error("Channel not found");

  const existing = await Video.find({ channelId: channelDoc._id }).sort({
    publishedAt: -1,
  });

  const allFresh =
    existing.length > 0 &&
    existing.every((v) => isFresh(v.lastSyncedAt, CACHE_MINUTES_VIDEO));

  if (allFresh) return existing;

  return await syncChannelVideos(user, channelDoc);
};

export const getSingleVideoWithSync = async (user, channelId, youtubeVideoId) => {
  const channelDoc = await Channel.findOne({
    userId: user._id,
    channelId,
  });
  if (!channelDoc) throw new Error("Channel not found");

  let videoDoc = await Video.findOne({
    channelId: channelDoc._id,
    youtubeVideoId,
  });

  if (videoDoc && isFresh(videoDoc.lastSyncedAt, CACHE_MINUTES_VIDEO)) {
    return videoDoc;
  }

  const youtube = getYouTubeClientForUser(user);
  const resp = await youtube.videos.list({
    part: "snippet,statistics,contentDetails,status",
    id: youtubeVideoId,
  });
  console.log(resp.data)

  const v = resp.data.items?.[0];
  if (!v) throw new Error("Video not found in YouTube");

  const stats = v.statistics || {};
  const s = v.snippet || {};
  const status = v.status || {};

  const viewCount = Number(stats.viewCount || 0);
  const likeCount = Number(stats.likeCount || 0);
  const commentCount = Number(stats.commentCount || 0);
  const engagement =
    viewCount > 0 ? ((likeCount + commentCount) / viewCount) * 100 : 0;

  videoDoc = await Video.findOneAndUpdate(
    { channelId: channelDoc._id, youtubeVideoId },
    {
      channelId: channelDoc._id,
      youtubeVideoId,
      title: s.title,
      description: s.description,
      tags: s.tags || [],
      thumbnail: s.thumbnails?.medium?.url,
      publishedAt: s.publishedAt,
      duration: v.contentDetails?.duration,
      stats: { viewCount, likeCount, commentCount },
      status: {
        uploadStatus: status.uploadStatus,
        privacyStatus: status.privacyStatus,
        license: status.license,
        embeddable: status.embeddable,
        publicStatsViewable: status.publicStatsViewable,
        madeForKids: status.madeForKids,
        selfDeclaredMadeForKids: status.selfDeclaredMadeForKids,
      },
      engagementRate: engagement,
      lastSyncedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  return videoDoc;
};


// ✅ UPDATED getSingleVideoWithSync



// export const getSingleVideoWithSync = async (user, channelId, youtubeVideoId) => {

//   console.log("✅ FUNCTION STARTED", { user: user._id, channelId, youtubeVideoId });
//   const channelDoc = await Channel.findOne({
//     userId: user._id,
//     channelId,
//   });

//   if (!channelDoc) throw new Error("Channel not found");

//   let videoDoc = await Video.findOne({
//     channelId: channelDoc._id,
//     youtubeVideoId,
//   });

//   if (videoDoc && isFresh(videoDoc.lastSyncedAt, CACHE_MINUTES_VIDEO)) {
//     return videoDoc;
//   }

//   const youtube = getYouTubeClientForUser(user);
//   const resp = await youtube.videos.list({
//     part: "snippet,statistics,contentDetails,status",
//     id: youtubeVideoId,
//   });
// console.log(resp)
//   const v = resp.data.items?.[0];
//   if (!v) throw new Error("Video not found in YouTube");

//   const stats = v.statistics || {};
//   const s = v.snippet || {};
//   const status = v.status || {};

//   const viewCount = Number(stats.viewCount || 0);
//   const likeCount = Number(stats.likeCount || 0);
//   const commentCount = Number(stats.commentCount || 0);
//   const engagement =
//     viewCount > 0 ? ((likeCount + commentCount) / viewCount) * 100 : 0;
//   // ✅ ANALYTICS CLIENT
//   const analytics = getYouTubeClientForUser(user);
//   console.log("Analytics client ready");


//   let revenue = 0;
//   let avgDuration = 0;
//   let retentionPercent = 0;
//   try {
//     console.log("Analytics Query:", channelDoc.youtubeChannelId, youtubeVideoId);

//     const analyticsResp = await analytics.reports.query({
//       ids: `channel==${channelDoc.youtubeChannelId}`,
//       startDate: "2024-01-01",
//       endDate: "2024-12-31",
//       metrics: "estimatedRevenue,averageViewDuration,averageViewPercentage",
//       filters: `video==${youtubeVideoId}`,
//       currency: "USD",
//     });

//     const row = analyticsResp.data.rows?.[0] || [];

//     revenue = Number(row[0] || 0);
//     avgDuration = Number(row[1] || 0);
//     retentionPercent = Number(row[2] || 0);

//     console.log("Analytics Row:", row);

//   } catch (err) {
//     console.log("Analytics unavailable:", err?.errors?.[0]?.reason);
//   }

//   videoDoc = await Video.findOneAndUpdate(
//     { channelId: channelDoc._id, youtubeVideoId },
//     {
//       title: s.title,
//       description: s.description,
//       thumbnail: s.thumbnails?.medium?.url,
//       publishedAt: s.publishedAt,
//       stats: { viewCount, likeCount, commentCount },
//       engagementRate: engagement,
//       revenue,
//       retention: {
//         averageViewDuration: avgDuration,
//         averageViewPercentage: retentionPercent,
//       },
//       lastSyncedAt: new Date(),
//     },
//     { new: true, upsert: true }
//   );

//   return videoDoc;
// };


export const searchCompetitorVideosByKeyword = async (user, keyword, maxResults = 10) => {
  const youtube = getYouTubeClientForUser(user);

  const searchResp = await youtube.search.list({
    part: "snippet",
    q: keyword,
    type: "video",
    maxResults,
    order: "viewCount",
  });

  const ids = (searchResp.data.items || []).map(i => i.id.videoId).join(",");

  const videoResp = await youtube.videos.list({
    part: "snippet,statistics,status",
    id: ids,
  });

  return videoResp.data.items || [];
};

export const syncCompetitorChannel = async (user, myChannelDoc, competitorChannelId) => {
  const youtube = getYouTubeClientForUser(user);

  const resp = await youtube.channels.list({
    part: "snippet,statistics",
    id: competitorChannelId,
  });

  const c = resp.data.items?.[0];
  if (!c) throw new Error("Competitor channel not found");

  return await CompetitorChannel.findOneAndUpdate(
    {
      userId: user._id,
      myChannelId: myChannelDoc._id,
      competitorChannelId,
    },
    {
      userId: user._id,
      myChannelId: myChannelDoc._id,
      competitorChannelId,
      title: c.snippet.title,
      thumbnail: c.snippet.thumbnails?.default?.url,
      stats: {
        viewCount: Number(c.statistics.viewCount || 0),
        subscriberCount: Number(c.statistics.subscriberCount || 0),
        videoCount: Number(c.statistics.videoCount || 0),
      },
      lastSyncedAt: new Date(),
    },
    { upsert: true, new: true }
  );
};

export const getCompetitorChannelsWithCache = async (user, myChannelId) => {
  const myChannelDoc = await Channel.findOne({
    userId: user._id,
    channelId: myChannelId,
  });

  if (!myChannelDoc) throw new Error("My channel not found");

  const existing = await CompetitorChannel.find({
    userId: user._id,
    myChannelId: myChannelDoc._id,
  });

  const allFresh =
    existing.length > 0 &&
    existing.every((c) => isFresh(c.lastSyncedAt, CACHE_MINUTES_COMP));

  if (allFresh) return existing;

  const refreshed = [];
  for (const comp of existing) {
    refreshed.push(
      await syncCompetitorChannel(user, myChannelDoc, comp.competitorChannelId)
    );
  }

  return refreshed;
};

export const trackKeywordRank = async (user, myChannelDoc, keyword) => {
  const youtube = getYouTubeClientForUser(user);

  const resp = await youtube.search.list({
    part: "snippet",
    q: keyword,
    type: "video",
    maxResults: 25,
    order: "relevance",
  });

  const items = resp.data.items || [];

  const results = [];
  let position = 1;

  for (const it of items) {
    results.push({
      videoId: it.id.videoId,
      rankPosition: position++,
      title: it.snippet.title,
      isMyVideo: it.snippet.channelId === myChannelDoc.channelId,
      competitorChannelId:
        it.snippet.channelId === myChannelDoc.channelId
          ? null
          : it.snippet.channelId,
    });
  }

  return await KeywordRank.findOneAndUpdate(
    {
      userId: user._id,
      myChannelId: myChannelDoc._id,
      keyword: keyword.toLowerCase(),
    },
    {
      $push: { results: { $each: results } },
    },
    { upsert: true, new: true }
  );
};
