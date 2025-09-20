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

// Mock recommended tracks for when user's library doesn't have matches
const mockRecommendedTracks = [
  {
    id: 'rec1',
    name: 'Pump It',
    artists: [{ name: 'The Black Eyed Peas' }],
    album: { name: 'Monkey Business' },
    duration_ms: 214000,
    audio_features: {
      tempo: 120.0,
      energy: 0.9,
      danceability: 0.8
    },
    isRecommended: true
  },
  {
    id: 'rec2',
    name: 'Can\'t Stop the Feeling!',
    artists: [{ name: 'Justin Timberlake' }],
    album: { name: 'Trolls (Original Motion Picture Soundtrack)' },
    duration_ms: 236000,
    audio_features: {
      tempo: 113.0,
      energy: 0.8,
      danceability: 0.9
    },
    isRecommended: true
  },
  {
    id: 'rec3',
    name: 'Good 4 U',
    artists: [{ name: 'Olivia Rodrigo' }],
    album: { name: 'SOUR' },
    duration_ms: 178000,
    audio_features: {
      tempo: 164.0,
      energy: 0.9,
      danceability: 0.6
    },
    isRecommended: true
  },
  {
    id: 'rec4',
    name: 'Levitating',
    artists: [{ name: 'Dua Lipa' }],
    album: { name: 'Future Nostalgia' },
    duration_ms: 203000,
    audio_features: {
      tempo: 103.0,
      energy: 0.8,
      danceability: 0.8
    },
    isRecommended: true
  }
];

// Function to convert running pace to cadence (BPM)
// Uses actual running science: pace -> speed -> cadence based on stride length
function paceToStepsPerMinute(paceMinutes, paceSeconds = 0, strideLengthFeet = null) {
  // Convert pace to total seconds per mile
  const totalSecondsPerMile = (paceMinutes * 60) + paceSeconds;
  
  // Convert to speed in miles per minute
  const milesPerMinute = 1 / (totalSecondsPerMile / 60);
  
  // Convert to miles per hour for reference
  const mph = milesPerMinute * 60;
  
  // Estimate stride length if not provided
  let estimatedStrideFeet;
  if (!strideLengthFeet) {
    if (mph >= 8.0) {
      estimatedStrideFeet = 3.5; // Fast runner, longer stride
    } else if (mph >= 6.5) {
      estimatedStrideFeet = 3.2; // Moderate pace
    } else if (mph >= 5.0) {
      estimatedStrideFeet = 3.0; // Casual jogging (10:30 pace falls here)
    } else {
      estimatedStrideFeet = 2.8; // Walking/very slow
    }
  } else {
    estimatedStrideFeet = strideLengthFeet;
  }
  
  // Calculate cadence: speed × feet per mile / stride length
  const cadence = (milesPerMinute * 5280) / estimatedStrideFeet;
  
  // Round to nearest whole number
  const finalCadence = Math.round(cadence);
  
  console.log(`Pace calculation: ${paceMinutes}:${paceSeconds.toString().padStart(2, '0')} → ${mph.toFixed(1)} mph → ${finalCadence} SPM (stride: ${estimatedStrideFeet}ft)`);
  
  return finalCadence;
}

// POST /filter - Filter tracks by running cadence (BPM)
router.post('/filter', async (req, res) => {
  try {
    const { 
      playlistId, 
      targetCadence, 
      tolerance = 10,
      // New pace input options
      paceMinutes,
      paceSeconds,
      strideLengthFeet // User's stride length in feet
    } = req.body;

    let finalCadence;

    // Option 1: User provides pace (preferred)
    if (paceMinutes !== undefined) {
      const seconds = paceSeconds || 0;
      finalCadence = paceToStepsPerMinute(paceMinutes, seconds, strideLengthFeet);
    }
    // Option 2: User provides BPM directly (fallback)
    else if (targetCadence) {
      finalCadence = targetCadence;
      console.log(`Using direct BPM input: ${finalCadence}`);
    }
    // Option 3: No valid input
    else {
      return res.status(400).json({ 
        error: 'Either pace (paceMinutes, paceSeconds) or targetCadence is required',
        examples: {
          paceExample: { 
            paceMinutes: 10, 
            paceSeconds: 30,
            strideLengthFeet: 3.5 // optional
          },
          bpmExample: { targetCadence: 165 }
        },
        note: "Pace like 10:30 per mile gets converted to ~165 BPM based on estimated stride length"
      });
    }

    console.log(`Filtering tracks for cadence: ${finalCadence} ± ${tolerance} BPM`);

    // Calculate BPM range
    const minBPM = finalCadence - tolerance;
    const maxBPM = finalCadence + tolerance;

    // Filter mock tracks by BPM (in real implementation, this would fetch from Spotify)
    const filteredTracks = mockTracks.filter(track => {
      const bpm = track.audio_features.tempo;
      return bpm >= minBPM && bpm <= maxBPM;
    });

    let finalTracks = filteredTracks;
    let recommendationsAdded = 0;

    // If no matches found, add recommendations
    if (filteredTracks.length === 0) {
      console.log('No tracks found in user library, adding recommendations...');
      
      const recommendedTracks = mockRecommendedTracks.filter(track => {
        const bpm = track.audio_features.tempo;
        return bpm >= minBPM && bpm <= maxBPM;
      });
      
      finalTracks = recommendedTracks;
      recommendationsAdded = recommendedTracks.length;
    }

    // Format response with relevant info for frontend
    const formattedTracks = finalTracks.map(track => ({
      id: track.id,
      name: track.name,
      artists: track.artists.map(artist => artist.name).join(', '),
      album: track.album.name,
      duration_ms: track.duration_ms,
      bpm: Math.round(track.audio_features.tempo * 10) / 10, // Round to 1 decimal
      energy: track.audio_features.energy,
      danceability: track.audio_features.danceability,
      isRecommended: track.isRecommended || false
    }));

    res.json({
      targetCadence: finalCadence,
      originalPace: paceMinutes ? `${paceMinutes}:${(paceSeconds || 0).toString().padStart(2, '0')}` : null,
      tolerance,
      bpmRange: `${minBPM}-${maxBPM}`,
      totalTracks: mockTracks.length,
      filteredCount: filteredTracks.length,
      recommendationsAdded,
      tracks: formattedTracks
    });

  } catch (error) {
    console.error('Error filtering tracks:', error);
    res.status(500).json({ error: 'Failed to filter tracks' });
  }
});

// GET /filter/test - Test endpoint to verify service is working
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Filter service is working!',
    mockTracksCount: mockTracks.length,
    sampleTrack: mockTracks[0]
  });
});

// GET /filter/pace-table - Show pace to BPM conversion examples
router.get('/pace-table', (req, res) => {
  const commonPaces = [
    { pace: "6:00", minutes: 6, seconds: 0 },
    { pace: "7:00", minutes: 7, seconds: 0 },
    { pace: "8:00", minutes: 8, seconds: 0 },
    { pace: "9:00", minutes: 9, seconds: 0 },
    { pace: "10:00", minutes: 10, seconds: 0 },
    { pace: "10:30", minutes: 10, seconds: 30 },
    { pace: "11:00", minutes: 11, seconds: 0 },
    { pace: "12:00", minutes: 12, seconds: 0 }
  ];

  const conversions = commonPaces.map(p => ({
    pace: p.pace + " per mile",
    estimatedBPM: paceToStepsPerMinute(p.minutes, p.seconds),
    mph: ((1 / ((p.minutes * 60 + p.seconds) / 60)) * 60).toFixed(1)
  }));

  res.json({
    message: "Pace to BPM conversion table",
    note: "BPM estimates based on average stride length. Actual cadence varies by individual.",
    conversions
  });
});

module.exports = router;
