const axios = require('axios');

// server/services/spotify.js
//
// Helper functions for calling Spotify Web API.
// Exports:
// - getPlaylists(accessToken)
// - getPlaylistTracks(playlistId, accessToken)
// - getAudioFeatures(trackIds, accessToken)
// - createPlaylist(userId, name, description, isPublic, accessToken)
// - addTracksToPlaylist(playlistId, trackUris, accessToken)
// - refreshAccessToken(refreshToken)


const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const SPOTIFY_ACCOUNTS_BASE = 'https://accounts.spotify.com/api/token';

function authHeader(accessToken) {
    return { Authorization: `Bearer ${accessToken}` };
}

async function getPlaylists(accessToken, { limit = 50, offset = 0 } = {}) {
    try {
        const url = `${SPOTIFY_API_BASE}/me/playlists`;
        const res = await axios.get(url, {
            headers: authHeader(accessToken),
            params: { limit, offset },
        });
        return res.data; // contains items, limit, next, total, etc.
    } catch (err) {
        throw makeSpotifyError(err);
    }
}

async function getPlaylistTracks(playlistId, accessToken) {
    // Fetch all tracks in a playlist (handles pagination)
    try {
        const limit = 100;
        let offset = 0;
        let allItems = [];

        while (true) {
            const url = `${SPOTIFY_API_BASE}/playlists/${encodeURIComponent(
                playlistId
            )}/tracks`;
            const res = await axios.get(url, {
                headers: authHeader(accessToken),
                params: { limit, offset },
            });

            if (!res.data || !Array.isArray(res.data.items)) break;

            allItems = allItems.concat(res.data.items);
            if (!res.data.next || res.data.items.length < limit) break;
            offset += limit;
        }

        // Flatten to track objects (items contain wrapper with track field)
        return allItems.map((item) => item.track).filter(Boolean);
    } catch (err) {
        throw makeSpotifyError(err);
    }
}

async function getAudioFeatures(trackIds = [], accessToken) {
    // Accepts array of track IDs (max 100 per request)
    try {
        if (!Array.isArray(trackIds) || trackIds.length === 0) return [];
        const chunks = chunkArray(trackIds, 100);
        const results = [];

        for (const chunk of chunks) {
            const url = `${SPOTIFY_API_BASE}/audio-features`;
            const res = await axios.get(url, {
                headers: authHeader(accessToken),
                params: { ids: chunk.join(',') },
            });
            if (res.data && Array.isArray(res.data.audio_features)) {
                results.push(...res.data.audio_features);
            }
        }

        return results;
    } catch (err) {
        throw makeSpotifyError(err);
    }
}

async function createPlaylist(userId, name, description = '', isPublic = false, accessToken) {
    try {
        const url = `${SPOTIFY_API_BASE}/users/${encodeURIComponent(userId)}/playlists`;
        const res = await axios.post(
            url,
            {
                name,
                description,
                public: Boolean(isPublic),
            },
            {
                headers: {
                    ...authHeader(accessToken),
                    'Content-Type': 'application/json',
                },
            }
        );
        return res.data; // created playlist object
    } catch (err) {
        throw makeSpotifyError(err);
    }
}

async function addTracksToPlaylist(playlistId, trackUris = [], accessToken) {
    // Adds tracks in batches of 100 (Spotify limit). Accepts array of track URIs.
    try {
        if (!Array.isArray(trackUris) || trackUris.length === 0) return { added: 0 };

        const chunks = chunkArray(trackUris, 100);
        const results = [];

        for (const chunk of chunks) {
            const url = `${SPOTIFY_API_BASE}/playlists/${encodeURIComponent(playlistId)}/tracks`;
            const res = await axios.post(
                url,
                { uris: chunk },
                {
                    headers: {
                        ...authHeader(accessToken),
                        'Content-Type': 'application/json',
                    },
                }
            );
            results.push(res.data); // contains snapshot_id
        }

        return { added: trackUris.length, responses: results };
    } catch (err) {
        throw makeSpotifyError(err);
    }
}

async function refreshAccessToken(refreshToken) {
    // Requires SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in env
    try {
        const clientId = process.env.SPOTIFY_CLIENT_ID;
        const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            throw new Error('Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET in env');
        }

        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const res = await axios.post(
            SPOTIFY_ACCOUNTS_BASE,
            new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
            }),
            {
                headers: {
                    Authorization: `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        // res.data contains access_token, token_type, scope, expires_in, and possibly refresh_token
        return res.data;
    } catch (err) {
        throw makeSpotifyError(err);
    }
}

/* ----- Helpers ----- */

function chunkArray(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) {
        out.push(arr.slice(i, i + size));
    }
    return out;
}

function makeSpotifyError(err) {
    if (err.response && err.response.data) {
        const status = err.response.status;
        const body = err.response.data;
        const message = body.error && body.error.message ? body.error.message : JSON.stringify(body);
        const e = new Error(`Spotify API error (${status}): ${message}`);
        e.status = status;
        e.response = body;
        return e;
    }
    return err;
}

module.exports = {
    getPlaylists,
    getPlaylistTracks,
    getAudioFeatures,
    createPlaylist,
    addTracksToPlaylist,
    refreshAccessToken,
};