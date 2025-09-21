// server/routes/auth.js
import express from 'express';
import fetch from 'node-fetch';
import crypto from 'crypto';
import querystring from 'querystring';

const router = express.Router();

// Generate random string (for code verifier)
function generateRandomString(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

// Base64 URL-encode
function base64URLEncode(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Generate code challenge (SHA256 → base64url)
function generateCodeChallenge(codeVerifier) {
  return base64URLEncode(crypto.createHash('sha256').update(codeVerifier).digest());
}

// GET /auth/login → return Spotify auth URL + codeVerifier
router.get('/login', (req, res) => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = 'https://paceify-yzcw.onrender.com/dashboard'; // must match frontend redirect
  const scope = 'playlist-modify-private playlist-modify-public user-read-private user-read-email';

  const codeVerifier = generateRandomString(64);
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const spotifyUrl = 'https://accounts.spotify.com/authorize?' + querystring.stringify({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    show_dialog: true
  });

  // Send codeVerifier + URL to frontend
  res.json({ url: spotifyUrl, codeVerifier });
});

// POST /auth/token → exchange code + codeVerifier for access token
router.post('/token', async (req, res) => {
  const { code, codeVerifier } = req.body;
  if (!code || !codeVerifier) return res.status(400).json({ error: 'Missing code or codeVerifier' });

  const redirectUri = 'https://paceify-yzcw.onrender.com/dashboard'; // must match login redirect

  const params = new URLSearchParams();
  params.append('grant_type', 'authorization_code');
  params.append('code', code);
  params.append('redirect_uri', redirectUri);
  params.append('client_id', process.env.SPOTIFY_CLIENT_ID);
  params.append('code_verifier', codeVerifier);

  try {
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    const data = await tokenRes.json();

    if (!tokenRes.ok) return res.status(tokenRes.status).json(data);

    res.json({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Token exchange failed' });
  }
});

export default router;
