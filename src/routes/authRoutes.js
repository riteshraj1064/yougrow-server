import express from "express";
import jwt from "jsonwebtoken";
import { oauth2Client, getAuthUrl } from "../config/googleClient.js";
import User from "../models/User.js";
import dotenv from "dotenv";
import { google } from "googleapis";

dotenv.config();

const router = express.Router();

router.get("/google", (req, res) => {
  const url = getAuthUrl();
  res.json({ url });
});

router.get("/google/callback", async (req, res) => {
  try {
    const code = req.query.code;
    const { tokens } = await oauth2Client.getToken(code);
    const { id_token, refresh_token, access_token } = tokens;

    if (!refresh_token) {
      return res
        .status(400)
        .json({ message: "No refresh token received. Make sure access_type=offline and prompt=consent." });
    }

    oauth2Client.setCredentials({ access_token });

    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: "v2",
    });
    const me = await oauth2.userinfo.get();
    const profile = me.data;

    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      user = await User.create({
        googleId: profile.id,
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
        googleRefreshToken: refresh_token,
      });
    } else {
      user.googleRefreshToken = refresh_token;
      user.email = profile.email;
      user.name = profile.name;
      user.picture = profile.picture;
      await user.save();
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Option A: send JSON (for SPA)
    if (!process.env.FRONTEND_URL) {
      return res.json({ token, user });
    }

    // Option B: redirect with token query (for frontend)
    const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${token}`;
    return res.redirect(redirectUrl);
  } catch (err) {
    console.error("OAuth callback error:", err);
    res.status(500).json({ message: "Auth failed" });
  }
});

export default router;

// import express from "express";
// import jwt from "jsonwebtoken";
// import { oauth2Client } from "../config/googleClient.js";
// import User from "../models/User.js";
// import dotenv from "dotenv";
// import { google } from "googleapis";

// dotenv.config();
// const router = express.Router();

// /**
//  * STEP 1 — Generate Google auth URL
//  */
// router.get("/google", (req, res) => {
//   const mobileRedirect = req.query.redirect_uri; // from Expo
//   console.log(mobileRedirect)

//   const url = oauth2Client.generateAuthUrl({
//     access_type: "offline",
//     prompt: "consent",
//     scope: [
//       "openid",
//       "email",
//       "profile",
//       "https://www.googleapis.com/auth/youtube.readonly"
//     ],
//     redirect_uri: process.env.GOOGLE_REDIRECT_URI,
//     state: encodeURIComponent(mobileRedirect), // ✅ store return URL
//   });

//   res.json({ url });
// });



// router.get("/google/callback", async (req, res) => {
//   try {
//     const code = req.query.code;
//     const state = decodeURIComponent(req.query.state); // ✅ return URL


//     const { tokens } = await oauth2Client.getToken({
//       code,
//       redirect_uri: process.env.GOOGLE_REDIRECT_URI,
//     });
//     console.log('tokens', tokens)
//     const { refresh_token, access_token } = tokens;

//     oauth2Client.setCredentials({ access_token });

//     const oauth2 = google.oauth2({ auth: oauth2Client, version: "v2" });
//     const profile = (await oauth2.userinfo.get()).data;

//     let user = await User.findOne({ googleId: profile.id });

//     if (!user) {
//       user = await User.create({
//         googleId: profile.id,
//         email: profile.email,
//         name: profile.name,
//         picture: profile.picture,
//         googleRefreshToken: refresh_token,
//       });
//     } else {
//       user.googleRefreshToken = refresh_token;
//       await user.save();
//     }

//     const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
//       expiresIn: "7d",
//     });
//     console.log('state', state)
//     // ✅ ✅ MOBILE REDIRECT BACK INTO EXPO APP
//     if (state && state.startsWith("youtubeseoapp://")) {
//       return res.redirect(`${state}?token=${token}`);
//     }

//     // ✅ WEB fallback
//     return res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);

//   } catch (err) {
//     console.error("OAuth callback error:", err);
//     res.status(500).json({ message: "Auth failed" });
//   }
// });

// export default router;
