import express from 'express';
import { createPlaylist } from '../services/spotify.js';
const router = express.Router();

router.post('/create', async (req, res) => {
  console.log('POST /playlists/create called with body:', req.body);
  const accessToken = req.headers.authorization?.replace('Bearer ', '');
  if (!accessToken) return res.status(401).json({ error: 'Access token required' });

  const { name, trackUris } = req.body;
  if (!trackUris || trackUris.length === 0) return res.status(400).json({ error: 'No track URIs provided' });

  console.log(`Creating playlist "${name}" with ${trackUris.length} tracks`);

  try {
    const playlistData = await createPlaylist(accessToken, name, trackUris);
    console.log('Playlist successfully created:', playlistData);
    res.json(playlistData);
  } catch (err) {
    console.error('Error creating playlist:', err);
    res.status(500).json({ error: 'Failed to create playlist', details: err.message });
  }
});

export default router;
