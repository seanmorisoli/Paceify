// server/routes/auth.js
import express from 'express';
import fetch from 'node-fetch';
import querystring from 'querystring';

const router = express.Router();

// GET /auth/login → redirect to Spotify login
router.get('/login', (req, res) => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI; // must match Spotify Dashboard
  const scope = 'playlist-read-private playlist-modify-private playlist-modify-public';

  const spotifyUrl = 'https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope,
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

    // OPTIONAL: store tokens in session or database
    // For now, just redirect to frontend dashboard
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?access_token=${accessToken}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error exchanging code for token');
  }
});

export default router;
