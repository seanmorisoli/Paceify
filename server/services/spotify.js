const SPOTIFY_API = 'https://api.spotify.com/v1';

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

async function handleRequest(url, options = {}) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      const message = data?.error?.message || res.statusText;
      const e = new Error(`Spotify API error (${res.status}): ${message}`);
      e.status = res.status;
      e.body = data;
      throw e;
    }
    return await res.json();
  } catch (err) {
    throw err;
  }
}

/**
 * Fetch all playlists for the current user (handles pagination)
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
 * Fetch all tracks for a playlist (handles pagination)
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
  return await handleRequest(url, {
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

export default {
  getPlaylists,
  getPlaylistTracks,
  getAudioFeatures,
  createPlaylist,
  addTracksToPlaylist,
};
