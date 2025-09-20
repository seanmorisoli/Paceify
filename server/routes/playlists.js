const express = require('express');
const router = express.Router();

// Mock track data with audio features for testing
const mockTracks = [
  {
    id: 'track1',
    name: 'Running Up That Hill',
    artists: [{ name: 'Kate Bush' }],
    album: { name: 'Hounds of Love' },
    duration_ms: 298000,
    audio_features: {
      tempo: 125.9, // BPM
      energy: 0.7,
      danceability: 0.6
    }
  },
  {
    id: 'track2',
    name: 'Eye of the Tiger',
    artists: [{ name: 'Survivor' }],
    album: { name: 'Eye of the Tiger' },
    duration_ms: 246000,
    audio_features: {
      tempo: 109.0,
      energy: 0.9,
      danceability: 0.8
    }
  },
  {
    id: 'track3',
    name: 'Don\'t Stop Believin\'',
    artists: [{ name: 'Journey' }],
    album: { name: 'Escape' },
    duration_ms: 251000,
    audio_features: {
      tempo: 119.0,
      energy: 0.8,
      danceability: 0.7
    }
  },
  {
    id: 'track4',
    name: 'Uptown Funk',
    artists: [{ name: 'Mark Ronson', }, { name: 'Bruno Mars' }],
    album: { name: 'Uptown Special' },
    duration_ms: 269000,
    audio_features: {
      tempo: 115.0,
      energy: 0.9,
      danceability: 0.9
    }
  },
  {
    id: 'track5',
    name: 'Thunderstruck',
    artists: [{ name: 'AC/DC' }],
    album: { name: 'The Razors Edge' },
    duration_ms: 292000,
    audio_features: {
      tempo: 133.0,
      energy: 1.0,
      danceability: 0.6
    }
  }
];

// POST /create - Create a new playlist with filtered tracks// GET /filter/test - Test endpoint to verify service is working
// POST /create - Create a new playlist with filtered tracks
router.post('/create', async (req, res) => {
  try {
    const { name, description, tracks, public: isPublic = false } = req.body;

    // Validate input
    if (!name || !tracks || !Array.isArray(tracks)) {
      return res.status(400).json({
        error: 'Name and tracks array are required',
        example: {
          name: 'My Running Playlist',
          description: 'Perfect for 10:30 pace runs',
          tracks: ['track1', 'track2'],
          public: false
        }
      });
    }

    console.log(`Creating playlist: "${name}" with ${tracks.length} tracks`);

    // In real implementation, this would:
    // 1. Use Spotify API to create playlist: POST https://api.spotify.com/v1/users/{user_id}/playlists
    // 2. Add tracks to playlist: POST https://api.spotify.com/v1/playlists/{playlist_id}/tracks
    
    // Mock successful playlist creation
    const mockPlaylist = {
      id: `playlist_${Date.now()}`,
      name,
      description,
      tracks: tracks.map(trackId => {
        const foundTrack = mockTracks.find(t => t.id === trackId);
        return foundTrack ? {
          id: foundTrack.id,
          name: foundTrack.name,
          artists: foundTrack.artists.map(a => a.name).join(', ')
        } : { id: trackId, name: 'Unknown Track' };
      }),
      public: isPublic,
      created_at: new Date().toISOString(),
      spotify_url: `https://open.spotify.com/playlist/mock_${Date.now()}`, // Mock URL
      total_tracks: tracks.length
    };

    console.log('Mock playlist created:', mockPlaylist.id);

    res.json({
      success: true,
      message: 'Playlist created successfully',
      playlist: mockPlaylist
    });

  } catch (error) {
    console.error('Error creating playlist:', error);
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

router.get('/test', (req, res) => {
  res.json({ 
    message: 'Playlist service is working!',
    mockTracksCount: mockTracks.length,
    sampleTrack: mockTracks[0]
  });
});

module.exports = router;