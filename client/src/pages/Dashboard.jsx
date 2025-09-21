import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import SongList from '../components/SongList';
import PlaylistCard from '../components/PlaylistCard';

// API Configuration - automatically detects environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.MODE === 'development' 
    ? 'http://localhost:3000' 
    : 'https://paceify.onrender.com');

const Dashboard = () => {
  const loginWithSpotify = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`);
      if (!res.ok) throw new Error('Failed to start PKCE login');

      const data = await res.json(); // { url, codeVerifier }
      localStorage.setItem('spotify_code_verifier', data.codeVerifier);

      // Redirect user to Spotify authorization page
      window.location.href = data.url;
    } catch (err) {
      console.error('Login error:', err);
      setError('Spotify login failed.');
    }
  };


  const exchangeCodeForToken = async () => {
    // Get code from query params
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) return; // no code in URL

    const codeVerifier = localStorage.getItem('spotify_code_verifier');
    if (!codeVerifier) {
      setError('Missing code verifier. Please log in again.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, codeVerifier }),
      });

      if (!res.ok) throw new Error('Token exchange failed');

      const data = await res.json();
      localStorage.setItem('spotify_access_token', data.access_token);
      setAccessToken(data.access_token);

      // Clean URL so code isn't visible
      window.history.replaceState(null, null, window.location.pathname);

    } catch (err) {
      console.error('Token exchange error:', err);
      setError('Failed to get Spotify access token');
    }
  };
  
  const callFilter = async () => {
    try {
      // Replace this with however you’re tracking the logged-in user
      const userId = localStorage.getItem('userId') || 'demo-user';

      // Fetch stored access token from backend
      const tokenResp = await fetch(`https://paceify.onrender.com/auth/token/${userId}`);
      const tokenData = await tokenResp.json();
      if (!tokenData.access_token) {
        throw new Error('No access token found for user');
      }

      // Call backend /filter with token + pace
      const resp = await fetch(`https://paceify.onrender.com/filter/filter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenData.access_token}`,
        },
        body: JSON.stringify({
          paceMinutes: 8,
          paceSeconds: 0,
          tolerance: 10,
        }),
      });

      const data = await resp.json();
      console.log('Filtered tracks:', data);
      setTracks(data.tracks || []); // assuming you have state for tracks
    } catch (err) {
      console.error('Error calling /filter:', err);
      setError('Failed to fetch tracks');
    }
  };



  const [searchParams] = useSearchParams();

  // Authentication state
  // Authentication state - read from query params instead of hash
  const [accessToken, setAccessToken] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('access_token');
    if (tokenFromUrl) {
      localStorage.setItem('spotify_access_token', tokenFromUrl);
      // Remove query params from URL
      window.history.replaceState(null, null, window.location.pathname);
      return tokenFromUrl;
    }
    return localStorage.getItem('spotify_access_token');
  });



  // Core state
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cadence, setCadence] = useState(168);
  const [tolerance, setTolerance] = useState(10);
  const [paceMinutes, setPaceMinutes] = useState(10);
  const [paceSeconds, setPaceSeconds] = useState(30);
  const [filterMode, setFilterMode] = useState('pace');
  const [apiResponse, setApiResponse] = useState(null);
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [createdPlaylist, setCreatedPlaylist] = useState(null);

  // Function to calculate BPM from pace
  const calculateBPMFromPace = (minutes, seconds) => {
    if (!minutes || minutes < 1 || seconds === undefined) return 168;
    const totalSecondsPerMile = minutes * 60 + (seconds || 0);
    const milesPerMinute = 1 / (totalSecondsPerMile / 60);
    const mph = milesPerMinute * 60;

    let estimatedStrideFeet;
    if (mph >= 8.0) estimatedStrideFeet = 3.5;
    else if (mph >= 6.5) estimatedStrideFeet = 3.2;
    else if (mph >= 5.0) estimatedStrideFeet = 3.0;
    else estimatedStrideFeet = 2.8;

    const cadenceCalc = (milesPerMinute * 5280) / estimatedStrideFeet;
    return Math.round(cadenceCalc);
  };

  // Filter tracks
  const filterTracks = async () => {
    if (!accessToken) {
      setError('No Spotify access token found.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = filterMode === 'pace'
        ? { paceMinutes, paceSeconds, tolerance }
        : { targetCadence: cadence, tolerance };

      // Send token to backend via Authorization header
      const response = await fetch(`${API_BASE_URL}/filter/filter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}` // <-- sending token
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      setTracks(data.tracks || []);
      setApiResponse(data);
      if (filterMode === 'pace' && data.targetCadence) setCadence(data.targetCadence);
    } catch (err) {
      setError(`Failed to filter tracks: ${err.message}`);
      setTracks([]);
    } finally {
      setLoading(false);
    }
  };

  // Create playlist
  const createPlaylist = async () => {
    if (!accessToken) {
      try {
      // Make a backend call to get a client-credentials token
      const tokenRes = await fetch(`${API_BASE_URL}/auth/client-token`);
      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) throw new Error('Failed to get temporary token');
      setAccessToken(tokenData.access_token);
    } catch (err) {
      console.error('Error getting temporary token:', err);
      setError('Cannot create playlist without a token');
      return;
    }

    if (!tracks.length) {
      setError('No tracks to add to playlist');
      return;
    }

    setCreatingPlaylist(true);
    setError(null);

    try {
      console.log('Creating playlist with:', {
        name: `Running Mix - ${calculateBPMFromPace(paceMinutes, paceSeconds)} BPM`,
        trackCount: tracks.length,
        trackUris: tracks.map(t => t.uri).slice(0, 3) // Show first 3 for debugging
      });

      const response = await fetch(`${API_BASE_URL}/playlists/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: `Running Mix - ${calculateBPMFromPace(paceMinutes, paceSeconds)} BPM`,
          trackUris: tracks.map(t => t.uri)
        })
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('Backend error:', responseData);
        throw new Error(responseData.error || responseData.details || 'Failed to create playlist');
      }

      console.log('Playlist created successfully:', responseData);
      setCreatedPlaylist(responseData);

    } catch (err) {
      console.error('Full error:', err);
      setError(`Failed to create playlist: ${err.message}`);
    } finally {
      setCreatingPlaylist(false);
    }
  };
  }

  // Auto-filter tracks on criteria change OR when access token is available
  useEffect(() => {
    // Exchanges PKCE "code" (from Spotify redirect) for tokens at your backend.
    const exchangeCodeIfPresent = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const errorParam = params.get('error');
        if (errorParam) {
          // Spotify returned an error (e.g. access_denied)
          setError(`OAuth error: ${errorParam}`);
          // clean up URL
          window.history.replaceState(null, null, window.location.pathname);
          return;
        }

        const code = params.get('code');
        if (!code) return; // nothing to do

        const codeVerifier = localStorage.getItem('spotify_code_verifier');
        if (!codeVerifier) {
          setError('Missing PKCE code verifier — please start login again.');
          return;
        }

        const resp = await fetch(`${API_BASE_URL}/auth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, codeVerifier })
        });

        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(text || `Token endpoint returned ${resp.status}`);
        }

        const data = await resp.json();

        if (!data.access_token) {
          throw new Error('Token response missing access_token');
        }

        // Save tokens + expiry optionally
        localStorage.setItem('spotify_access_token', data.access_token);
        if (data.refresh_token) localStorage.setItem('spotify_refresh_token', data.refresh_token);
        if (data.expires_in) localStorage.setItem('spotify_expires_in', String(data.expires_in));

        // update app state
        setAccessToken(data.access_token);

        // cleanup
        localStorage.removeItem('spotify_code_verifier');
        // remove code from URL so it isn't visible
        const cleanUrl = window.location.origin + window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
      } catch (err) {
        console.error('PKCE token exchange failed', err);
        setError('Failed to exchange code for tokens: ' + (err.message || 'unknown'));
      }
    };

    exchangeCodeIfPresent();
    // run once on mount
  }, []);


  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(45deg, #87CEEB 30%, #4682B4 90%)',
        padding: '2rem',
        color: '#FFFFFF',
      }}
    >
      {/* Content container */}
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <h1
          style={{
            fontSize: '3.5rem',
            marginBottom: '2rem',
            textAlign: 'center',
            color: '#FFFFFF',
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
            fontWeight: 'bold',
          }}
        >
          Dashboard
        </h1>

        <button onClick={callFilter}>Generate Playlist</button>

        {/* Filter Controls Section */}
        <div
          style={{
            background: '#ffffffff',
            padding: '1.5rem',
            borderRadius: '25px',
            marginBottom: '2rem',
            border: '2px solid white',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            width: 'fit-content',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '2rem',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            {/* Filter Mode Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#4A4A4A' }}>
                Filter by:
              </span>
              <select
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value)}
                style={{
                  padding: '8px 15px',
                  borderRadius: '20px',
                  border: '2px solid white',
                  background: '#4A4A4A',
                  fontSize: '1.1rem',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  color: 'white',
                  fontWeight: 'bold',
                }}
              >
                <option value="pace">Running Pace</option>
                <option value="bpm">Direct BPM</option>
              </select>
            </div>

            {filterMode === 'pace' ? (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                minWidth: '280px'
              }}>
                <div style={{
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  color: '#4A4A4A',
                  textAlign: 'center',
                  width: '100%',
                  marginBottom: '0.5rem'
                }}>
                  Pace per mile
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center',
                  alignItems: 'center', 
                  gap: '0.5rem'
                }}>
                  <input
                    type="number"
                    value={paceMinutes}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') setPaceMinutes('');
                      else {
                        const numVal = Number(val);
                        if (numVal >= 0 && numVal <= 99) setPaceMinutes(numVal);
                      }
                    }}
                    min="4"
                    max="20"
                    style={{
                      width: '4rem',
                      padding: '8px 12px',
                      borderRadius: '25px',
                      border: '2px solid white',
                      background: '#4A4A4A',
                      fontSize: '1.1rem',
                      color: 'white',
                      fontWeight: 'bold',
                      textAlign: 'center'
                    }}
                  />
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#4A4A4A' }}>:</span>
                  <input
                    type="number"
                    value={paceSeconds}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') setPaceSeconds('');
                      else {
                        const numVal = Number(val);
                        if (numVal >= 0 && numVal <= 59) setPaceSeconds(numVal);
                      }
                    }}
                    min="0"
                    max="59"
                    style={{
                      width: '4rem',
                      padding: '8px 12px',
                      borderRadius: '25px',
                      border: '2px solid white',
                      background: '#4A4A4A',
                      fontSize: '1.1rem',
                      color: 'white',
                      fontWeight: 'bold',
                      textAlign: 'center'
                    }}
                  />
                </div>
                <div style={{ fontSize: '2rem', color: '#333', textAlign: 'center' }}>
                  <div>≈ {calculateBPMFromPace(paceMinutes, paceSeconds)} BPM</div>
                  <div style={{ fontSize: '2rem', alignItems: 'center' }}>
                    ({paceMinutes}:{(paceSeconds || 0).toString().padStart(2, '0')}/mile)
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <label style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#4A4A4A' }}>
                  Target Cadence (BPM):
                  <input
                    type="number"
                    value={cadence}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') setCadence('');
                      else {
                        const numVal = Number(val);
                        if (numVal >= 0 && numVal <= 999) setCadence(numVal);
                      }
                    }}
                    min="60"
                    max="300"
                    style={{
                      marginLeft: '0.5rem',
                      width: '5rem',
                      padding: '8px 15px',
                      borderRadius: '25px',
                      border: '2px solid white',
                      background: '#4A4A4A',
                      fontSize: '1.1rem',
                      color: 'white',
                      fontWeight: 'bold',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    }}
                  />
                </label>
                <div style={{ fontSize: '2rem', color: '#333', textAlign: 'center' }}>
                  <div>
                    ≈ {Math.floor(180 / cadence)}:
                    {String(Math.round((180 / cadence - Math.floor(180 / cadence)) * 60)).padStart(2, '0')}
                    /mile
                  </div>
                  <div style={{ fontSize: '0.8 rem', color: 'black' }}>({cadence} BPM)</div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#4A4A4A' }}>
                Tolerance: ±
                <input
                  type="number"
                  value={tolerance}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') setTolerance('');
                    else {
                      const numVal = Number(val);
                      if (numVal >= 0 && numVal <= 99) setTolerance(numVal);
                    }
                  }}
                  min="1"
                  max="30"
                  style={{
                    marginLeft: '0.5rem',
                    width: '4rem',
                    padding: '8px 15px',
                    borderRadius: '25px',
                    border: '2px solid white',
                    background: '#4A4A4A',
                    fontSize: '1.1rem',
                    color: 'white',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                />
                <span style={{ marginLeft: '0.5rem' }}>BPM</span>
              </label>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div style={{
            background: '#ff4444',
            color: 'white',
            padding: '1rem',
            borderRadius: '10px',
            marginBottom: '1rem',
            maxWidth: '600px',
            textAlign: 'center'
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Loading Display */}
        {(loading || creatingPlaylist) && (
          <div style={{
            background: '#4A90E2',
            color: 'white',
            padding: '1rem',
            borderRadius: '10px',
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            {loading ? 'Filtering tracks...' : 'Creating playlist...'}
          </div>
        )}


        {/* Display Tracks and Playlist */}
        <button
          onClick={createPlaylist}
          style={{
            padding: '1rem',
            borderRadius: '25px',
            background: '#4A90E2',
            color: 'white',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '250px',
            overflowY: 'auto',
            width: '100%',
            gap: '0.3rem',
          }}
        >
          <span style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
            Create Playlist ({tracks.length} tracks)
          </span>

          {tracks.map((track, index) => (
            <span key={track.id || index} style={{ fontSize: '0.9rem', color: '#fff' }}>
              {index + 1}. {track.name} – {track.artists?.map(a => a.name).join(', ')}
            </span>
          ))}
        </button>

        {/* Keep SongList display below if desired */}
        <SongList tracks={tracks} />

        {/* Show created playlist card if it exists */}
        {createdPlaylist && <PlaylistCard playlist={createdPlaylist} />}

      </div>
    </div>
  );

};


export default Dashboard

