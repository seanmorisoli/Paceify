// server/routes/auth.js
import express from 'express';
import fetch from 'node-fetch';
import crypto from 'crypto';
import querystring from 'querystring';

const router = express.Router();

// Utility to generate a random string
function generateRandomString(length) {
  return crypto.randomBytes(length).toString('hex');
}

// Utility to base64-url encode a string (for PKCE)
function base64URLEncode(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Utility to generate code challenge for PKCE
function generateCodeChallenge(codeVerifier) {
  return base64URLEncode(
    crypto.createHash('sha256').update(codeVerifier).digest()
  );
}


// GET /auth/login → redirect user to Spotify login
router.get('/login', (req, res) => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = 'https://paceify-yzcw.onrender.com/auth/callback';
  const scope = 'playlist-modify-private playlist-modify-public user-read-private user-read-email';

  // PKCE code verifier & challenge
  const codeVerifier = generateRandomString(64);
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // Save codeVerifier in session (or some store)
  req.session = req.session || {};
  req.session.codeVerifier = codeVerifier;

  const spotifyUrl = 'https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      client_id: clientId,
      response_type: 'code', // Authorization Code Flow
      redirect_uri: redirectUri,
      scope,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
      show_dialog: true
    });

  res.redirect(spotifyUrl);
});

// GET /auth/callback → exchange code for access token
router.get('/callback', async (req, res) => {
  const code = req.query.code || null;
  if (!code) return res.status(400).send('No code returned from Spotify');

  const codeVerifier = req.session?.codeVerifier;
  if (!codeVerifier) return res.status(400).send('Missing code verifier');

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', 'https://paceify-yzcw.onrender.com/auth/callback');
    params.append('client_id', process.env.SPOTIFY_CLIENT_ID);
    params.append('code_verifier', codeVerifier);

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    const data = await response.json();
    if (data.error) return res.status(400).json(data);

    const accessToken = data.access_token;
    const refreshToken = data.refresh_token;
    const expiresIn = data.expires_in;

    // Redirect to frontend with tokens in query params
    const redirectUrl = 'https://paceify-yzcw.onrender.com/dashboard?' + 
      querystring.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: expiresIn
      });

    res.redirect(redirectUrl);

  } catch (err) {
    console.error(err);
  }
});

router.get('/client-token', async (req, res) => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials'
    });
    const data = await tokenRes.json();
    res.json(data); // { access_token, token_type, expires_in }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get client token' });
  }
});

router.post('/token', async (req, res) => {
  try {
    const { code, codeVerifier, userId } = req.body;
    if (!code || !codeVerifier || !userId) {
      return res.status(400).json({ error: 'Missing code, codeVerifier, or userId' });
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const redirectUri = 'https://paceify-yzcw.onrender.com/auth/callback';

    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', redirectUri);
    params.append('client_id', clientId);
    params.append('code_verifier', codeVerifier);

    const resp = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await resp.json();
    if (!resp.ok) {
      return res.status(resp.status).json(data);
    }

    // Save tokens in memory store
    userTokens.set(userId, {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: Date.now() + data.expires_in * 1000,
    });

    res.json({
      message: 'Tokens stored successfully',
      access_token: data.access_token,
      expires_in: data.expires_in,
    });
  } catch (err) {
    console.error('Error in /auth/token', err);
    res.status(500).json({ error: 'Failed to exchange code for token' });
  }
});

/**
 * GET /auth/token/:userId
 * Returns the stored access token for a given user
 */
router.get('/token/:userId', (req, res) => {
  const tokens = userTokens.get(req.params.userId);
  if (!tokens) return res.status(404).json({ error: 'No tokens found for user' });

  res.json(tokens);
});

export default router;
