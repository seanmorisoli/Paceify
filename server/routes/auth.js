// server/routes/auth.js
import express from 'express';
import fetch from 'node-fetch'; // make sure node-fetch is installed
import querystring from 'querystring';

const router = express.Router();

// Spotify OAuth scopes
const scopes = [
  'playlist-read-private',
  'playlist-modify-private',
  'playlist-modify-public',
];

// Redirect user to Spotify login
router.get('/login', (req, res) => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI; // Spotify redirect URI
  const scope = scopes.join(' ');

  const authUrl = `https://accounts.spotify.com/authorize?${querystring.stringify({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope,
  })}`;

  res.redirect(authUrl);
});

// Spotify redirects here after login
router.get('/callback', async (req, res) => {
  const code = req.query.code || null;
  if (!code) return res.status(400).send('No code returned from Spotify');

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  const body = querystring.stringify({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });

  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    const data = await tokenRes.json();
    const { access_token, refresh_token, expires_in } = data;

    // Redirect to frontend (e.g., dashboard) with access token in query (or store in cookie)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173/dashboard';
    res.redirect(`${frontendUrl}?access_token=${access_token}&refresh_token=${refresh_token}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to get access token from Spotify');
  }
});

export default router;
