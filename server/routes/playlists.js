import express from 'express';
import { createPlaylist, addTracksToPlaylist } from '../services/spotify.js';

const router = express.Router();

router.post('/create', async (req, res) => {
  console.log('POST /playlists/create called with body:', req.body);

  const accessToken = req.headers.authorization?.replace('Bearer ', '');
  if (!accessToken) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const { name, trackUris } = req.body;
  if (!trackUris || trackUris.length === 0) {
    return res.status(400).json({ error: 'No track URIs provided' });
  }

  try {
    // Step 1: Create the playlist
    const playlist = await createPlaylist(null, name, {}, accessToken);

    // Step 2: Add tracks to it
    await addTracksToPlaylist(playlist.id, trackUris, accessToken);

    console.log(`Playlist created with ${trackUris.length} tracks`);
    res.json(playlist);
  } catch (err) {
    console.error('Error creating playlist:', err.response?.data || err.message);
    res.status(500).json({
      error: 'Failed to create playlist',
      details: err.response?.data || err.message,
    });
  }
});

export default router;
