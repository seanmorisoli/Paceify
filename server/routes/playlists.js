// server/routes/playlists.js
import express from 'express';
import { createPlaylist, addTracksToPlaylist } from '../services/spotify.js';

const router = express.Router();

// POST /playlists/create
router.post('/create', async (req, res) => {
  console.log('POST /playlists/create called with body:', {
    ...req.body,
    trackUris: req.body.trackUris?.length ? `${req.body.trackUris.length} URIs` : 'No URIs'
  });

  const accessToken = req.headers.authorization?.replace('Bearer ', '');
  if (!accessToken) {
    console.warn('No access token provided');
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
    console.warn('No track URIs provided');
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
    // Create playlist
    const playlistData = await createPlaylist(null, name, { public: false }, accessToken);
    console.log('Playlist created with ID:', playlistData.id);

    // Add tracks
    await addTracksToPlaylist(playlistData.id, trackUris, accessToken);
    console.log(`Added ${trackUris.length} tracks to playlist`);

    // Return playlist info
    res.json({
      id: playlistData.id,
      name: playlistData.name,
      uri: playlistData.uri,
      tracksCount: trackUris.length,
    });

  } catch (err) {
    console.error('Error creating playlist:', err);
    res.status(500).json({ error: 'Failed to create playlist', details: err.message });
  }
});

export default router;
