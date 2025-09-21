import express from 'express';
import { getUserSavedTracks, getRecommendations } from '../services/spotify.js';
const router = express.Router();

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
      strideLengthFeet, // User's stride length in feet
      // Auth token - should be extracted from headers in production
      access_token
    } = req.body;

    // Extract access token from Authorization header or request body
    const accessToken = req.headers.authorization?.replace('Bearer ', '') || access_token;
    
    if (!accessToken) {
      return res.status(401).json({ 
        error: 'Access token required. Please authenticate with Spotify first.' 
      });
    }

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

    try {
      // Fetch user's saved tracks from Spotify
      console.log('Fetching user saved tracks from Spotify...');
      const userTracks = await getUserSavedTracks(accessToken, 200); // Fetch up to 200 liked songs
      
      // Filter user tracks by BPM range
      const filteredTracks = userTracks.filter(track => {
        const bpm = track.audio_features?.tempo;
        return bpm && bpm >= minBPM && bpm <= maxBPM;
      });

      let finalTracks = filteredTracks;
      let recommendationsAdded = 0;
      let totalUserTracks = userTracks.length;

      // If no matches found in user library, get recommendations
      if (filteredTracks.length === 0) {
        console.log('No tracks found in user library, fetching recommendations...');
        
        // Get seed tracks from user's library (any 5 tracks for seeding)
        const seedTrackIds = userTracks.slice(0, 5).map(track => track.id);
        
        const recommendationParams = {
          seed_tracks: seedTrackIds,
          target_tempo: finalCadence,
          min_tempo: minBPM,
          max_tempo: maxBPM,
          min_energy: 0.4, // Good for running
          target_energy: 0.7,
          limit: 20
        };

        // If no user tracks available, use genre seeds instead
        if (seedTrackIds.length === 0) {
          delete recommendationParams.seed_tracks;
          recommendationParams.seed_genres = 'pop,rock,electronic,hip-hop,dance';
        }

        const recommendedTracks = await getRecommendations(recommendationParams, accessToken);
        
        // Filter recommendations by BPM range (double check)
        const filteredRecommendations = recommendedTracks.filter(track => {
          const bpm = track.audio_features?.tempo;
          return bpm && bpm >= minBPM && bpm <= maxBPM;
        });
        
        finalTracks = filteredRecommendations;
        recommendationsAdded = filteredRecommendations.length;
      }

      // Format response with relevant info for frontend
      const formattedTracks = finalTracks.map(track => ({
        id: track.id,
        name: track.name,
        artists: Array.isArray(track.artists) 
          ? track.artists.map(artist => artist.name).join(', ')
          : 'Unknown Artist',
        album: track.album?.name || 'Unknown Album',
        duration_ms: track.duration_ms,
        bpm: track.audio_features ? Math.round(track.audio_features.tempo * 10) / 10 : null,
        energy: track.audio_features?.energy || null,
        danceability: track.audio_features?.danceability || null,
        isRecommended: track.isRecommended || false,
        uri: track.uri // Include Spotify URI for playlist creation
      })).filter(track => track.bpm !== null); // Only include tracks with valid audio features

      res.json({
        targetCadence: finalCadence,
        originalPace: paceMinutes ? `${paceMinutes}:${(paceSeconds || 0).toString().padStart(2, '0')}` : null,
        tolerance,
        bpmRange: `${minBPM}-${maxBPM}`,
        totalTracks: totalUserTracks,
        filteredCount: filteredTracks.length,
        recommendationsAdded,
        tracks: formattedTracks
      });

    } catch (spotifyError) {
      console.error('Spotify API Error:', spotifyError);
      
      // Handle specific Spotify API errors
      if (spotifyError.status === 401) {
        return res.status(401).json({ 
          error: 'Invalid or expired access token. Please re-authenticate with Spotify.' 
        });
      }
      
      if (spotifyError.status === 403) {
        return res.status(403).json({ 
          error: 'Insufficient permissions. Please ensure you have granted the required scopes.' 
        });
      }

      if (spotifyError.status === 429) {
        return res.status(429).json({ 
          error: 'Rate limited by Spotify API. Please try again later.' 
        });
      }

      // Fallback to generic error
      throw spotifyError;
    }

  } catch (error) {
    console.error('Error filtering tracks:', error);
    res.status(500).json({ error: 'Failed to filter tracks' });
  }
});

// GET /filter/test - Test endpoint to verify service is working
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Filter service is working!',
    info: 'Real Spotify API integration enabled',
    endpoints: [
      'POST /filter/filter - Filter tracks by pace or BPM (requires access token)',
      'GET /filter/pace-table - Show pace to BPM conversion table'
    ]
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

export default router;
