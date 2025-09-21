import express from 'express';
import { createPlaylist, addTracksToPlaylist } from '../services/spotify.js';

const router = express.Router();

router.post('/create', async (req, res) => {
  console.log('POST /playlists/create called with body:', {
    ...req.body,
    trackUris: req.body.trackUris?.length ? `${req.body.trackUris.length} URIs` : 'No URIs'
  });

  const accessToken = req.headers.authorization?.replace('Bearer ', '');
  if (!accessToken) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const { name, trackUris } = req.body;
  
  console.log('Validation check:', {
    hasName: !!name,
    hasTrackUris: !!trackUris,
    trackUrisLength: trackUris?.length || 0,
    sampleTrackUris: trackUris?.slice(0, 3) || []
  });

  if (!trackUris || trackUris.length === 0) {
    return res.status(400).json({ error: 'No track URIs provided' });
  }

  // Check if URIs are valid Spotify URIs
  const invalidUris = trackUris.filter(uri => !uri || !uri.startsWith('spotify:track:'));
  if (invalidUris.length > 0) {
    console.log('Invalid URIs found:', invalidUris.slice(0, 3));
    return res.status(400).json({ 
      error: 'Invalid track URIs provided',
      details: `Found ${invalidUris.length} invalid URIs`
    });
  }

  try {
    // Step 1: Create the playlist
    const playlist = await createPlaylist(null, name, {}, accessToken);

    // Step 2: Add tracks to the newly created playlist
    await addTracksToPlaylist(playlist.id, trackUris, accessToken);

    console.log(`Playlist "${playlist.name}" created with ${trackUris.length} tracks`);
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
