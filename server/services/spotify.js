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

export default {
  getPlaylists,
  getPlaylistTracks,
  getAudioFeatures,
  createPlaylist,
  addTracksToPlaylist,
};
