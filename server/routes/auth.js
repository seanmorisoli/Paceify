import express from 'express';
import axios from 'axios';
import querystring from 'querystring';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;

// Step 1: /login endpoint → redirect user to Spotify
router.get('/login', (req, res) => {
  const scope = 'playlist-read-private playlist-modify-private playlist-modify-public';
  const authQuery = querystring.stringify({
    client_id,
    response_type: 'code',
    redirect_uri,
    scope
  });
  res.redirect(`https://accounts.spotify.com/authorize?${authQuery}`);
});

// Step 2: /callback endpoint → Spotify redirects here with code
router.get('/callback', async (req, res) => {
  const code = req.query.code || null;

  try {
    const tokenResponse = await axios.post('https://accounts.spotify.com/api/token',
      querystring.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri
      }),
      {
        headers: {
          Authorization: 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token, refresh_token } = tokenResponse.data;

    // Later: store tokens in session or return to frontend
    res.json({ access_token, refresh_token });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error getting tokens');
  }
});

export default router;
