// server/routes/auth.js
import express from 'express';
import fetch from 'node-fetch';
import querystring from 'querystring';

const router = express.Router();

// GET /auth/login → redirect to Spotify login
router.get('/login', (req, res) => {
  const querystring = require('querystring');

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = 'https://paceify.onrender.com/auth/callback';
  const scope = 'playlist-modify-private playlist-modify-public user-read-private user-read-email';

  const spotifyUrl = 'https://accounts.spotify.com/authorize?' + querystring.stringify({
    client_id: clientId,
    response_type: 'token', // <- this is the key change
    redirect_uri: redirectUri,
    scope,
    show_dialog: true // optional, forces login prompt
  });

  // Redirect user to Spotify login page
  res.redirect(spotifyUrl);
});

// GET /auth/callback → handle Spotify redirect
router.get('/callback', async (req, res) => {
  const code = req.query.code || null;

  if (!code) {
    return res.status(400).send('No code returned from Spotify');
  }

  try {
    // Exchange code for access token
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', process.env.SPOTIFY_REDIRECT_URI);

    const authString = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString('base64');

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (data.error) {
      return res.status(400).json(data);
    }

    const accessToken = data.access_token;
    const refreshToken = data.refresh_token;
    const expiresIn = data.expires_in;

    // Redirect to frontend /dashboard with tokens in query params
    const redirectUrl = `${process.env.FRONTEND_URL}/dashboard?` +
      querystring.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: expiresIn,
      });

    res.redirect(redirectUrl);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error exchanging code for token');
  }
});

export default router;
