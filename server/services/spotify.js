import fetch from 'node-fetch';

const SPOTIFY_API = 'https://api.spotify.com/v1';

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

async function handleRequest(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const message = data?.error?.message || res.statusText;
    const e = new Error(`Spotify API error (${res.status}): ${message}`);
    e.status = res.status;
    e.body = data;
    throw e;
  }
  return res.json();
}

/**
 * Fetch all playlists for the current user
 */
export async function getPlaylists(accessToken) {
  const items = [];
  let url = `${SPOTIFY_API}/me/playlists?limit=50`;

  while (url) {
    const data = await handleRequest(url, { headers: authHeader(accessToken) });
    items.push(...(data.items || []));
    url = data.next;
  }

  return items;
}

/**
 * Fetch all tracks for a playlist
 */
export async function getPlaylistTracks(playlistId, accessToken) {
  const items = [];
  let url = `${SPOTIFY_API}/playlists/${playlistId}/tracks?limit=100`;

  while (url) {
    const data = await handleRequest(url, { headers: authHeader(accessToken) });
    items.push(...(data.items || []));
    url = data.next;
  }

  return items;
}

/**
 * Get audio features for up to 100 track IDs at a time
 */
export async function getAudioFeatures(trackIds, accessToken) {
  if (!Array.isArray(trackIds) || trackIds.length === 0) return [];

  const results = [];
  const chunkSize = 100;

  for (let i = 0; i < trackIds.length; i += chunkSize) {
    const chunk = trackIds.slice(i, i + chunkSize);
    const url = `${SPOTIFY_API}/audio-features?ids=${chunk.join(',')}`;
    const data = await handleRequest(url, { headers: authHeader(accessToken) });
    if (data?.audio_features) results.push(...data.audio_features);
  }

  return results;
}

/**
 * Create a new playlist
 */
export async function createPlaylist(userId, name, options = {}, accessToken) {
  if (!userId) {
    const me = await handleRequest(`${SPOTIFY_API}/me`, { headers: authHeader(accessToken) });
    userId = me.id;
  }

  const body = {
    name,
    description: options.description || '',
    public: !!options.public,
  };

  const url = `${SPOTIFY_API}/users/${encodeURIComponent(userId)}/playlists`;
  return handleRequest(url, {
    method: 'POST',
    headers: { ...authHeader(accessToken), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/**
 * Add tracks to a playlist (max 100 per request)
 */
export async function addTracksToPlaylist(playlistId, trackUris, accessToken) {
  if (!Array.isArray(trackUris) || trackUris.length === 0) return [];

  const chunkSize = 100;
  const responses = [];

  for (let i = 0; i < trackUris.length; i += chunkSize) {
    const chunk = trackUris.slice(i, i + chunkSize);
    const url = `${SPOTIFY_API}/playlists/${encodeURIComponent(playlistId)}/tracks`;
    const data = await handleRequest(url, {
      method: 'POST',
      headers: { ...authHeader(accessToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({ uris: chunk }),
    });
    responses.push(data);
  }

  return responses;
}

/**
 * Get all user saved tracks (liked songs) with audio features
 */
export async function getUserSavedTracks(accessToken, limitPerPage = 50) {
  let allTracks = [];
  let url = `${SPOTIFY_API}/me/tracks?limit=${limitPerPage}`;

  while (url) {
    const data = await handleRequest(url, { headers: authHeader(accessToken) });
    const tracks = (data.items || []).map(item => item.track);
    allTracks.push(...tracks);
    url = data.next;
  }

  // Fetch audio features in batches of 100
  const trackIds = allTracks.map(t => t.id);
  const audioFeatures = await getAudioFeatures(trackIds, accessToken);

  const featuresMap = {};
  audioFeatures.forEach(f => { if (f?.id) featuresMap[f.id] = f; });

  // Attach audio features
  return allTracks.map(t => ({ ...t, audio_features: featuresMap[t.id] || null })).filter(t => t.audio_features);
}

/**
 * Get recommendations based on seed tracks and audio features
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

  const queryParams = { limit: Math.min(limit, 100), ...otherParams };

  if (seed_tracks.length > 0) queryParams.seed_tracks = seed_tracks.slice(0, 5).join(',');
  if (target_tempo) queryParams.target_tempo = target_tempo;
  if (min_tempo) queryParams.min_tempo = min_tempo;
  if (max_tempo) queryParams.max_tempo = max_tempo;

  if (!queryParams.seed_tracks) queryParams.seed_genres = 'pop,rock,electronic';

  const url = `${SPOTIFY_API}/recommendations?${new URLSearchParams(queryParams).toString()}`;
  const data = await handleRequest(url, { headers: authHeader(accessToken) });

  const tracks = data.tracks || [];
  const trackIds = tracks.map(t => t.id);
  const audioFeatures = await getAudioFeatures(trackIds, accessToken);

  const featuresMap = {};
  audioFeatures.forEach(f => { if (f?.id) featuresMap[f.id] = f; });

  return tracks.map(track => ({ ...track, audio_features: featuresMap[track.id] || null, isRecommended: true }))
               .filter(track => track.audio_features);
}
