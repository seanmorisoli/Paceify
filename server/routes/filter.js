import express from 'express';
import { getUserSavedTracks, getRecommendations } from '../services/spotify.js';
const router = express.Router();

// Convert pace to cadence (BPM)
function paceToStepsPerMinute(paceMinutes, paceSeconds = 0, strideLengthFeet = null) {
  const totalSecondsPerMile = paceMinutes * 60 + paceSeconds;
  const milesPerMinute = 1 / (totalSecondsPerMile / 60);
  const mph = milesPerMinute * 60;

  let estimatedStrideFeet = strideLengthFeet;
  if (!strideLengthFeet) {
    if (mph >= 8.0) estimatedStrideFeet = 3.5;
    else if (mph >= 6.5) estimatedStrideFeet = 3.2;
    else if (mph >= 5.0) estimatedStrideFeet = 3.0;
    else estimatedStrideFeet = 2.8;
  }

  const cadence = Math.round((milesPerMinute * 5280) / estimatedStrideFeet);
  console.log(`Pace ${paceMinutes}:${paceSeconds} → ${mph.toFixed(1)} mph → ${cadence} BPM (stride ${estimatedStrideFeet}ft)`);
  return cadence;
}

// POST /filter
router.post('/filter', async (req, res) => {
  console.log('POST /filter called with body:', req.body);
  const accessToken = req.headers.authorization?.replace('Bearer ', '') || req.body.access_token;
  if (!accessToken) return res.status(401).json({ error: 'Access token required' });

  const { paceMinutes, paceSeconds, targetCadence, strideLengthFeet, tolerance = 10 } = req.body;

  let finalCadence;
  if (paceMinutes !== undefined) finalCadence = paceToStepsPerMinute(paceMinutes, paceSeconds || 0, strideLengthFeet);
  else if (targetCadence) finalCadence = targetCadence;
  else return res.status(400).json({ error: 'Provide pace or targetCadence' });

  const minBPM = finalCadence - tolerance;
  const maxBPM = finalCadence + tolerance;
  console.log(`Filtering for BPM: ${minBPM}-${maxBPM}`);

  try {
    const userTracks = await getUserSavedTracks(accessToken, 200);
    console.log('Fetched user tracks:', userTracks.length);

    const filteredTracks = userTracks.filter(t => t.audio_features?.tempo >= minBPM && t.audio_features?.tempo <= maxBPM);
    console.log('Tracks after BPM filter:', filteredTracks.length);

    let finalTracks = filteredTracks;
    if (filteredTracks.length === 0) {
      console.log('No matching tracks, fetching recommendations...');
      const seedTrackIds = userTracks.slice(0, 5).map(t => t.id);
      const recParams = {
        seed_tracks: seedTrackIds.length > 0 ? seedTrackIds : undefined,
        seed_genres: seedTrackIds.length === 0 ? 'pop,rock,electronic,hip-hop,dance' : undefined,
        target_tempo: finalCadence,
        min_tempo: minBPM,
        max_tempo: maxBPM,
        min_energy: 0.4,
        target_energy: 0.7,
        limit: 20
      };
      const recTracks = await getRecommendations(recParams, accessToken);
      console.log('Recommended tracks fetched:', recTracks.length);
      finalTracks = recTracks.filter(t => t.audio_features?.tempo >= minBPM && t.audio_features?.tempo <= maxBPM);
      console.log('Tracks after BPM filter (recommendations):', finalTracks.length);
    }

    const formattedTracks = finalTracks.map(t => ({
      id: t.id,
      name: t.name,
      artists: t.artists.map(a => a.name).join(', '),
      album: t.album?.name || 'Unknown Album',
      duration_ms: t.duration_ms,
      bpm: t.audio_features?.tempo || null,
      energy: t.audio_features?.energy || null,
      danceability: t.audio_features?.danceability || null,
      uri: t.uri
    })).filter(t => t.bpm !== null);

    console.log('Returning tracks to frontend:', formattedTracks.length);

    res.json({
      targetCadence: finalCadence,
      bpmRange: `${minBPM}-${maxBPM}`,
      totalTracks: userTracks.length,
      filteredCount: filteredTracks.length,
      tracks: formattedTracks
    });

  } catch (err) {
    console.error('Error in /filter:', err);
    res.status(500).json({ error: 'Failed to fetch/filter tracks', details: err.message });
  }
});

export default router;
