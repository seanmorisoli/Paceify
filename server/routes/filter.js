import express from 'express';
import { getUserSavedTracks, getRecommendations } from '../services/spotify.js';

const router = express.Router();

// Convert pace to steps per minute (BPM)
function paceToStepsPerMinute(paceMinutes, paceSeconds = 0, strideLengthFeet = null) {
  const totalSecondsPerMile = (paceMinutes * 60) + paceSeconds;
  const milesPerMinute = 1 / (totalSecondsPerMile / 60);
  const mph = milesPerMinute * 60;

  let estimatedStride = strideLengthFeet;
  if (!strideLengthFeet) {
    if (mph >= 8) estimatedStride = 3.5;
    else if (mph >= 6.5) estimatedStride = 3.2;
    else if (mph >= 5) estimatedStride = 3.0;
    else estimatedStride = 2.8;
  }

  return Math.round((milesPerMinute * 5280) / estimatedStride);
}

// POST /filter - filter tracks by pace or target BPM
router.post('/filter', async (req, res) => {
  try {
    const { paceMinutes, paceSeconds, strideLengthFeet, targetCadence, tolerance = 10, access_token } = req.body;

    const accessToken = req.headers.authorization?.replace('Bearer ', '') || access_token;
    if (!accessToken) return res.status(401).json({ error: 'Access token required' });

    let finalCadence;

    if (paceMinutes !== undefined) {
      finalCadence = paceToStepsPerMinute(paceMinutes, paceSeconds || 0, strideLengthFeet);
    } else if (targetCadence) {
      finalCadence = targetCadence;
    } else {
      return res.status(400).json({ error: 'Provide either paceMinutes or targetCadence' });
    }

    const minBPM = finalCadence - tolerance;
    const maxBPM = finalCadence + tolerance;

    // Fetch user's saved tracks
    const userTracks = await getUserSavedTracks(accessToken, 200);

    // Filter by BPM
    let filteredTracks = userTracks.filter(track => {
      const bpm = track.audio_features?.tempo;
      return bpm && bpm >= minBPM && bpm <= maxBPM;
    });

    // If no matches, fetch recommendations
    if (filteredTracks.length === 0) {
      const seedTracks = userTracks.slice(0, 5).map(t => t.id);
      const recParams = {
        seed_tracks: seedTracks.length ? seedTracks : undefined,
        seed_genres: seedTracks.length ? undefined : ['pop', 'rock', 'electronic', 'hip-hop', 'dance'],
        target_tempo: finalCadence,
        min_tempo: minBPM,
        max_tempo: maxBPM,
        limit: 20,
      };
      const recommendations = await getRecommendations(recParams, accessToken);
      filteredTracks = recommendations.filter(track => {
        const bpm = track.audio_features?.tempo;
        return bpm && bpm >= minBPM && bpm <= maxBPM;
      });
    }

    const formattedTracks = filteredTracks.map(track => ({
      id: track.id,
      name: track.name,
      artists: track.artists?.map(a => a.name).join(', ') || 'Unknown Artist',
      album: track.album?.name || 'Unknown Album',
      duration_ms: track.duration_ms,
      bpm: track.audio_features?.tempo || null,
      energy: track.audio_features?.energy || null,
      danceability: track.audio_features?.danceability || null,
      uri: track.uri,
    })).filter(t => t.bpm !== null);

    res.json({
      targetCadence: finalCadence,
      bpmRange: `${minBPM}-${maxBPM}`,
      totalTracks: userTracks.length,
      filteredCount: filteredTracks.length,
      tracks: formattedTracks,
    });

  } catch (err) {
    console.error('Error filtering tracks:', err);
    res.status(500).json({ error: 'Failed to filter tracks' });
  }
});

// Optional test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Filter service is running' });
});

export default router;
