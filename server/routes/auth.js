// server/routes/auth.js
import express from 'express';
import querystring from 'querystring';

const router = express.Router();

// GET /auth/login → redirect to Spotify login (Implicit Grant Flow)
router.get('/login', (req, res) => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = 'https://paceify-yzcw.onrender.com/dashboard'; // frontend dashboard
  const scope = 'playlist-modify-private playlist-modify-public user-read-private user-read-email';

  const spotifyUrl = 'https://accounts.spotify.com/authorize?' + querystring.stringify({
    client_id: clientId,
    response_type: 'token',      // Implicit Grant: token returned in URL fragment
    redirect_uri: redirectUri,
    scope,
    show_dialog: true             // optional: forces login prompt
  });

  // Redirect user to Spotify login page
  res.redirect(spotifyUrl);
});

export default router;
