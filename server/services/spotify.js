import axios from 'axios';

export async function getPlaylists(accessToken) {
  const res = await axios.get('https://api.spotify.com/v1/me/playlists', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return res.data.items;
}

export async function getPlaylistTracks(playlistId, accessToken) {
  const res = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return res.data.items;
}

// Add more helpers for audio features, creating playlists, etc.
