import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import channelRoutes from "./routes/channelRoutes.js";
import videoRoutes from "./routes/videoRoutes.js";
import competitorRoutes from "./routes/competitorRoutes.js";
import keywordRoutes from "./routes/keywordRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import './corn/weeklyReportsCron.js'

dotenv.config();

const app = express();
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "YouTube SEO backend running" });
});

app.use("/auth", authRoutes);
app.use("/channels", channelRoutes);
app.use("/videos", videoRoutes);
app.use("/competitors", competitorRoutes);
app.use("/keywords", keywordRoutes);
app.use("/reports", reportRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
