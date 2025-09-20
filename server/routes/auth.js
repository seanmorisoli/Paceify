// server/routes/auth.js
import express from 'express';
import fetch from 'node-fetch'; // make sure to `npm install node-fetch`
import querystring from 'querystring';

const router = express.Router();

// 1️⃣ Redirect to Spotify login
router.get('/login', (req, res) => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  const scopes = [
    'playlist-read-private',
    'playlist-modify-private',
    'playlist-read-collaborative',
  ].join(' ');

  const spotifyUrl = `https://accounts.spotify.com/authorize?${querystring.stringify({
    response_type: 'code',
    client_id: clientId,
    scope: scopes,
    redirect_uri: redirectUri,
  })}`;

  res.redirect(spotifyUrl);
});

// 2️⃣ Handle Spotify callback
router.get('/callback', async (req, res) => {
  const code = req.query.code || null;

  if (!code) {
    return res.status(400).send('No code provided by Spotify');
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  const tokenUrl = 'https://accounts.spotify.com/api/token';
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });

  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    const data = await response.json();

    if (data.error) {
      return res.status(400).json(data);
    }

    // You now have access_token and refresh_token
    const { access_token, refresh_token, expires_in } = data;

    // Option 1: send tokens to frontend
    // res.json({ access_token, refresh_token, expires_in });

    // Option 2: redirect frontend to dashboard with token in query (less secure)
    res.redirect(`/dashboard?access_token=${access_token}`);

  } catch (err) {
    console.error(err);
    res.status(500).send('Error exchanging code for token');
  }
});

export default router;
