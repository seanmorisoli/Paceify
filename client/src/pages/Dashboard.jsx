import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import SongList from '../components/SongList';
import PlaylistCard from '../components/PlaylistCard';

const Dashboard = () => {
  const [searchParams] = useSearchParams();

  // Authentication state
  const [accessToken, setAccessToken] = useState(() => {
    const tokenFromUrl = searchParams.get('access_token');
    if (tokenFromUrl) {
      localStorage.setItem('spotify_access_token', tokenFromUrl);
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

  // Auto-filter tracks on criteria change
  useEffect(() => {
    const timeoutId = setTimeout(() => filterTracks(), 500);
    return () => clearTimeout(timeoutId);
  }, [filterMode, paceMinutes, paceSeconds, cadence, tolerance]);

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
                  padding: '12px 40px 12px 20px',
                  borderRadius: '25px',
                  border: '2px solid white',
                  background: '#4A4A4A',
                  fontSize: '1.2rem',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  color: 'white',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  minWidth: '180px',
                  textAlign: 'center',
                  backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 15px top 50%',
                  backgroundSize: '12px auto'
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
                minWidth: '220px'
              }}>
                <label
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    color: '#4A4A4A',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: '100%',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ marginBottom: '0.5rem' }}>Pace per mile:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                        textAlign: 'center',
                      }}
                    />
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>:</span>
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
                        textAlign: 'center',
                      }}
                    />
                  </div>
                </label>
                <div style={{ fontSize: '0.9rem', color: '#333', textAlign: 'center' }}>
                  <div>≈ {calculateBPMFromPace(paceMinutes, paceSeconds)} BPM</div>
                  <div style={{ fontSize: '0.8rem', alignItems: 'center' }}>
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
