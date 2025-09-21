import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import SongList from '../components/SongList';
import PlaylistCard from '../components/PlaylistCard';

const Dashboard = () => {
  const [searchParams] = useSearchParams();

  // Authentication state
  const [accessToken, setAccessToken] = useState(() => {
    const tokenFromUrl = searchParams.get('access_token');
    console.log('Initializing - tokenFromUrl:', !!tokenFromUrl);
    
    if (tokenFromUrl) {
      console.log('Found token in URL, storing in localStorage');
      localStorage.setItem('spotify_access_token', tokenFromUrl);
      return tokenFromUrl;
    }
    
    const storedToken = localStorage.getItem('spotify_access_token');
    console.log('Using stored token:', !!storedToken);
    return storedToken;
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
    console.log('filterTracks called with accessToken:', !!accessToken);
    
    if (!accessToken) {
      setError('No Spotify access token found.');
      console.log('No access token - skipping filter');
      return;
    }

    console.log('Starting track filtering...');
    setLoading(true);
    setError(null);

    try {
      const payload =
        filterMode === 'pace'
          ? { paceMinutes, paceSeconds, tolerance }
          : { targetCadence: cadence, tolerance };

      const response = await fetch('http://localhost:3000/filter/filter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setApiResponse(data);
      setTracks(data.tracks || []);
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
    if (!tracks || tracks.length === 0) {
      setError('No tracks available to create playlist');
      return;
    }

    if (!accessToken) {
      setError('No Spotify access token found.');
      return;
    }

    setCreatingPlaylist(true);
    setError(null);

    try {
      const playlistName = apiResponse?.originalPace
        ? `Running Mix - ${apiResponse.originalPace} pace (${cadence} BPM)`
        : `Running Mix - ${cadence} BPM`;

      const payload = { name: playlistName, trackUris: tracks.map((t) => t.uri) };

      const response = await fetch('http://localhost:3000/playlists/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const playlistData = await response.json();
      setCreatedPlaylist(playlistData);
    } catch (err) {
      setError(`Failed to create playlist: ${err.message}`);
    } finally {
      setCreatingPlaylist(false);
    }
  };

  // Auto-filter tracks on criteria change OR when access token is available
  useEffect(() => {
    console.log('useEffect triggered - accessToken:', !!accessToken, 'filterMode:', filterMode);
    if (accessToken) {
      const timeoutId = setTimeout(() => filterTracks(), 500);
      return () => clearTimeout(timeoutId);
    }
  }, [filterMode, paceMinutes, paceSeconds, cadence, tolerance, accessToken]);

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
                <div style={{ fontSize: '0.9rem', color: '#333', textAlign: 'center' }}>
                  <div>≈ {calculateBPMFromPace(paceMinutes, paceSeconds)} BPM</div>
                  <div style={{ fontSize: '1.2 rem', alignItems: 'center' }}>
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
                <div style={{ fontSize: '0.9rem', color: '#333', textAlign: 'center' }}>
                  <div>
                    ≈ {Math.floor(180 / cadence)}:
                    {String(Math.round((180 / cadence - Math.floor(180 / cadence)) * 60)).padStart(2, '0')}
                    /mile
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'black' }}>({cadence} BPM)</div>
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


        {/* Display Tracks and Playlist */}
        <SongList tracks={tracks} />
        {createdPlaylist && <PlaylistCard playlist={createdPlaylist} />}

      </div>
    </div>
  );
};

export default Dashboard;
