const createPlaylist = async () => {
  if (!tracks || tracks.length === 0) {
    console.error('No tracks available to create playlist!');
    setError('No tracks available to create playlist.');
    return;
  }

  // Filter out tracks without a valid URI
  const trackUris = tracks
    .map(t => t.uri)
    .filter(uri => typeof uri === 'string' && uri.startsWith('spotify:track:'));

  if (trackUris.length === 0) {
    console.error('No valid track URIs found:', tracks);
    setError('No valid track URIs found.');
    return;
  }

  const playlistName = `Running Mix - ${calculateBPMFromPace(paceMinutes, paceSeconds)} BPM`;

  console.log('Creating playlist with payload:', {
    name: playlistName,
    trackUris,
  });

  try {
    setCreatingPlaylist(true);
    setError(null);

    const response = await fetch(`${API_BASE_URL}/playlists/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        name: playlistName,
        trackUris,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Playlist creation failed:', response.status, errorData);
      throw new Error(errorData.error || 'Failed to create playlist');
    }

    const playlistData = await response.json();
    console.log('Playlist created successfully:', playlistData);
    setCreatedPlaylist(playlistData);

  } catch (err) {
    console.error(err);
    setError(err.message);
  } finally {
    setCreatingPlaylist(false);
  }
};
