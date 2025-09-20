const express = require("express");
const axios = require("axios");
const querystring = require("querystring");

const router = express.Router();

// ⚡ Spotify app credentials (get from https://developer.spotify.com/dashboard)
const clientID = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const redirectURI = process.env.SPOTIFY_REDIRECT_URI || "http://localhost:3000/auth/callback";

// -------------------
//  /login → Redirects to Spotify
// -------------------
router.get("/login", (req, res) => {
  // Check if we have the required credentials
  if (!clientID || !clientSecret) {
    console.error('Missing Spotify credentials. Please check your .env file');
    return res.status(500).json({ 
      error: "Server configuration error",
      details: "Missing Spotify credentials"
    });
  }

  const scope = "user-read-email user-read-private playlist-read-private playlist-modify-public playlist-modify-private";
  
  try {
    const authURL =
      "https://accounts.spotify.com/authorize?" +
      querystring.stringify({
        response_type: "code",
        client_id: clientID,
        scope: scope,
        redirect_uri: redirectURI,
      });

    res.redirect(authURL);
  } catch (error) {
    console.error('Error creating auth URL:', error);
    res.status(500).json({ 
      error: "Failed to create authorization URL",
      details: error.message
    });
  }
});

// -------------------
//  /callback → Handle Spotify response
// -------------------
router.get("/callback", async (req, res) => {
  const code = req.query.code || null;

  if (!code) {
    return res.status(400).json({ error: "Authorization code missing" });
  }

  try {
    const tokenResponse = await axios.post(
      "https://accounts.spotify.com/api/token",
      querystring.stringify({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectURI,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization:
            "Basic " +
            Buffer.from(clientID + ":" + clientSecret).toString("base64"),
        },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // ⚡ Option A: Send tokens to frontend
    res.json({
      access_token,
      refresh_token,
      expires_in,
    });

    // ⚡ Option B (recommended): store in session/db and redirect
    // req.session.access_token = access_token;
    // res.redirect("/dashboard");

  } catch (err) {
    console.error("Error getting Spotify token:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to get token" });
  } // this is just the error  
});

module.exports = router;
