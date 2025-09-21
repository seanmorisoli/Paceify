const SPOTIFY_API = 'https://api.spotify.com/v1';

/**
 * Build authorization header
 */
function authHeader(token) {
  if (!token) throw new Error('Spotify access token required');
  return { Authorization: `Bearer ${token}` };
}

/**
 * General fetch wrapper with error handling
 */
async function handleRequest(url, options = {}) {
  const res = await fetch(url, options);
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message = data?.error?.message || res.statusText;
    const e = new Error(`Spotify API error (${res.status}): ${message}`);
    e.status = res.status;
    e.body = data;
    throw e;
  }

  return data;
}

/**
 * Fetch all playlists for the user (pagination safe)
 */
export async function getPlaylists(accessToken, limitPerPage = 50, maxPages = 10) {
  const playlists = [];
  let url = `${SPOTIFY_API}/me/playlists?limit=${limitPerPage}`;
  let pagesFetched = 0;

  while (url && pagesFetched < maxPages) {
    const data = await handleRequest(url, { headers: authHeader(accessToken) });
    playlists.push(...(data.items || []));
    url = data.next;
    pagesFetched++;
  }

  return playlists;
}

/**
 * Fetch all tracks for a playlist (pagination safe)
 */
export async function getPlaylistTracks(playlistId, accessToken, limitPerPage = 100, maxPages = 10) {
  const tracks = [];
  let url = `${SPOTIFY_API}/playlists/${playlistId}/tracks?limit=${limitPerPage}`;
  let pagesFetched = 0;

  while (url && pagesFetched < maxPages) {
    const data = await handleRequest(url, { headers: authHeader(accessToken) });
    tracks.push(...(data.items || []));
    url = data.next;
    pagesFetched++;
  }

  return tracks;
}

/**
 * Get audio features in batches of 100
 */
export async function getAudioFeatures(trackIds = [], accessToken) {
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
 * Get user saved tracks (liked songs) safely with batching
 */
export async function getUserSavedTracks(accessToken, limitPerPage = 50, maxPages = 5) {
  let allTracks = [];
  let url = `${SPOTIFY_API}/me/tracks?limit=${limitPerPage}`;
  let pagesFetched = 0;

  while (url && pagesFetched < maxPages) {
    const data = await handleRequest(url, { headers: authHeader(accessToken) });
    const tracks = (data.items || []).map(item => item.track);
    allTracks.push(...tracks);
    url = data.next;
    pagesFetched++;
  }

  // Fetch audio features in batches of 100
  const trackIds = allTracks.map(t => t.id);
  const audioFeatures = await getAudioFeatures(trackIds, accessToken);

  const featuresMap = {};
  audioFeatures.forEach(f => { if (f?.id) featuresMap[f.id] = f; });

  return allTracks
    .map(t => ({ ...t, audio_features: featuresMap[t.id] || null }))
    .filter(t => t.audio_features);
}

/**
 * Get track recommendations based on seeds and tempo
 */
export async function getRecommendations(params = {}, accessToken) {
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

  return tracks
    .map(track => ({ ...track, audio_features: featuresMap[track.id] || null, isRecommended: true }))
    .filter(track => track.audio_features);
}

/**
 * Create a new playlist
 */
export async function createPlaylist(userId, name, options = {}, accessToken) {
  if (!userId) {
    const me = await handleRequest(`${SPOTIFY_API}/me`, { headers: authHeader(accessToken) });
    userId = me.id;
  }

  const body = { name, description: options.description || '', public: !!options.public };
  const url = `${SPOTIFY_API}/users/${encodeURIComponent(userId)}/playlists`;

  return handleRequest(url, {
    method: 'POST',
    headers: { ...authHeader(accessToken), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/**
 * Add tracks to a playlist in chunks
 */
export async function addTracksToPlaylist(playlistId, trackUris = [], accessToken) {
  if (!trackUris.length) return [];
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
