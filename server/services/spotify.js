import axios from 'axios';

const SPOTIFY_API = 'https://api.spotify.com/v1';

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

async function handleRequest(promise) {
  try {
    const res = await promise;
    return res.data;
  } catch (err) {
    // Normalize error
    if (err.response) {
      const { status, data } = err.response;
      const message = data && data.error && data.error.message ? data.error.message : data;
      const e = new Error(`Spotify API error (${status}): ${JSON.stringify(message)}`);
      e.status = status;
      e.body = data;
      throw e;
    }
    throw err;
  }
}

/**
 * Fetch all playlists for the current user (handles pagination).
 * @param {string} accessToken
 * @returns {Promise<Array>} Array of playlist objects
 */
export async function getPlaylists(accessToken) {
  const items = [];
  let url = `${SPOTIFY_API}/me/playlists?limit=50`;

  while (url) {
    const data = await handleRequest(
      axios.get(url, { headers: authHeader(accessToken) })
    );
    items.push(...(data.items || []));
    url = data.next; // spotify provides full URL for next page
  }

  return items;
}

/**
 * Fetch all tracks for a playlist (handles pagination)
 * @param {string} playlistId
 * @param {string} accessToken
 * @returns {Promise<Array>} Array of playlist track objects
 */
export async function getPlaylistTracks(playlistId, accessToken) {
  const items = [];
  let url = `${SPOTIFY_API}/playlists/${playlistId}/tracks?limit=100`;

  while (url) {
    const data = await handleRequest(
      axios.get(url, { headers: authHeader(accessToken) })
    );
    items.push(...(data.items || []));
    url = data.next;
  }

  return items;
}

/**
 * Get audio features for up to 100 track IDs. If more IDs are provided,
 * this function will batch them into multiple requests and merge results.
 * @param {Array<string>} trackIds
 * @param {string} accessToken
 * @returns {Promise<Array>} Array of audio_features objects (order not guaranteed)
 */
export async function getAudioFeatures(trackIds, accessToken) {
  if (!Array.isArray(trackIds) || trackIds.length === 0) return [];

  const results = [];
  const chunkSize = 100;

  for (let i = 0; i < trackIds.length; i += chunkSize) {
    const chunk = trackIds.slice(i, i + chunkSize);
    const url = `${SPOTIFY_API}/audio-features?ids=${chunk.join(',')}`;
    const data = await handleRequest(
      axios.get(url, { headers: authHeader(accessToken) })
    );
    if (data && data.audio_features) results.push(...data.audio_features);
  }

  return results;
}

/**
 * Create a playlist for a user. If userId is omitted, will attempt to get the current user's id.
 * @param {string|null} userId
 * @param {string} name
 * @param {Object} options { description?: string, public?: boolean }
 * @param {string} accessToken
 * @returns {Promise<Object>} created playlist object
 */
export async function createPlaylist(userId, name, options = {}, accessToken) {
  if (!userId) {
    // fetch current user
    const me = await handleRequest(
      axios.get(`${SPOTIFY_API}/me`, { headers: authHeader(accessToken) })
    );
    userId = me.id;
  }

  const body = {
    name,
    description: options.description || '',
    public: !!options.public,
  };

  const data = await handleRequest(
    axios.post(`${SPOTIFY_API}/users/${encodeURIComponent(userId)}/playlists`, body, {
      headers: { ...authHeader(accessToken), 'Content-Type': 'application/json' },
    })
  );

  return data;
}

/**
 * Add tracks (uris) to a playlist. Splits into batches of 100 when necessary.
 * @param {string} playlistId
 * @param {Array<string>} trackUris - array of Spotify track URIs (e.g. spotify:track:...)
 * @param {string} accessToken
 * @returns {Promise<Array>} array of responses for each batch
 */
export async function addTracksToPlaylist(playlistId, trackUris, accessToken) {
  if (!Array.isArray(trackUris) || trackUris.length === 0) return [];

  const chunkSize = 100;
  const responses = [];

  for (let i = 0; i < trackUris.length; i += chunkSize) {
    const chunk = trackUris.slice(i, i + chunkSize);
    const data = await handleRequest(
      axios.post(`${SPOTIFY_API}/playlists/${encodeURIComponent(playlistId)}/tracks`,
        { uris: chunk },
        { headers: { ...authHeader(accessToken), 'Content-Type': 'application/json' } }
      )
    );
    responses.push(data);
  }

  return responses;
}

/**
 * Get user's saved tracks (liked songs) with audio features
 * @param {string} accessToken
 * @param {number} limit - max tracks to fetch (default 50, max 50 per request)
 * @returns {Promise<Array>} Array of track objects with audio features
 */
export async function getUserSavedTracks(accessToken, limit = 50) {
  const items = [];
  let url = `${SPOTIFY_API}/me/tracks?limit=${Math.min(limit, 50)}`;
  let fetched = 0;

  while (url && fetched < limit) {
    const data = await handleRequest(
      axios.get(url, { headers: authHeader(accessToken) })
    );
    
    const tracks = (data.items || []).map(item => item.track).filter(track => track && track.id);
    items.push(...tracks);
    fetched += tracks.length;
    
    url = data.next && fetched < limit ? data.next : null;
  }

  // Get audio features for all tracks
  const trackIds = items.map(track => track.id);
  const audioFeatures = await getAudioFeatures(trackIds, accessToken);
  
  // Create a map of track ID to audio features
  const featuresMap = {};
  audioFeatures.forEach(feature => {
    if (feature && feature.id) {
      featuresMap[feature.id] = feature;
    }
  });

  // Combine tracks with their audio features
  return items.map(track => ({
    ...track,
    audio_features: featuresMap[track.id] || null
  })).filter(track => track.audio_features); // Only return tracks with audio features
}

/**
 * Get track recommendations based on seed tracks and audio features
 * @param {Object} params - recommendation parameters
 * @param {Array<string>} params.seed_tracks - array of track IDs (max 5)
 * @param {number} params.target_tempo - target BPM
 * @param {number} params.min_tempo - minimum BPM
 * @param {number} params.max_tempo - maximum BPM
 * @param {number} params.limit - number of recommendations (default 20, max 100)
 * @param {string} accessToken
 * @returns {Promise<Array>} Array of recommended track objects with audio features
 */
export async function getRecommendations(params, accessToken) {
  const {
    seed_tracks = [],
    target_tempo,
    min_tempo,
    max_tempo,
    limit = 20,
    ...otherParams
  } = params;

  // Build query parameters
  const queryParams = {
    limit: Math.min(limit, 100),
    ...otherParams
  };

  // Add seed tracks (max 5)
  if (seed_tracks.length > 0) {
    queryParams.seed_tracks = seed_tracks.slice(0, 5).join(',');
  }

  // Add tempo constraints
  if (target_tempo) queryParams.target_tempo = target_tempo;
  if (min_tempo) queryParams.min_tempo = min_tempo;
  if (max_tempo) queryParams.max_tempo = max_tempo;

  // If no seed tracks provided, use seed genres as fallback
  if (!queryParams.seed_tracks) {
    queryParams.seed_genres = 'pop,rock,electronic'; // default genres for running
  }

  const url = `${SPOTIFY_API}/recommendations?${new URLSearchParams(queryParams).toString()}`;
  const data = await handleRequest(
    axios.get(url, { headers: authHeader(accessToken) })
  );

  const tracks = data.tracks || [];
  
  // Get audio features for recommended tracks
  const trackIds = tracks.map(track => track.id);
  const audioFeatures = await getAudioFeatures(trackIds, accessToken);
  
  // Create a map of track ID to audio features
  const featuresMap = {};
  audioFeatures.forEach(feature => {
    if (feature && feature.id) {
      featuresMap[feature.id] = feature;
    }
  });

  // Combine tracks with their audio features
  return tracks.map(track => ({
    ...track,
    audio_features: featuresMap[track.id] || null,
    isRecommended: true
  })).filter(track => track.audio_features);
}

export default {
  getPlaylists,
  getPlaylistTracks,
  getAudioFeatures,
  createPlaylist,
  addTracksToPlaylist,
  getUserSavedTracks,
  getRecommendations,
};
