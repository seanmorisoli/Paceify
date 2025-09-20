import React, { useEffect, useState } from 'react';
import SongList from '../components/SongList';
import PlaylistCard from '../components/PlaylistCard';

/**
 * Dashboard Component
 * Main interface for finding songs that match your running pace
 * Features:
 * - Filter by running pace (minutes/mile) or direct BPM input
 * - Adjustable tolerance range for BPM matching
 * - Real-time track filtering with API integration
 * - Playlist creation from filtered tracks
 * - Dynamic display of matching songs with their properties
 * - Automatic BPM/pace conversion
 */
const Dashboard = () => {
  // Core state for track management
  const [tracks, setTracks] = useState([]); // Stores filtered track results
  const [loading, setLoading] = useState(false); // Controls loading states
  const [error, setError] = useState(null); // Stores error messages
  
  // Running pace and BPM settings
  const [cadence, setCadence] = useState(168); // Default to 10:30 pace (168 BPM)
  const [tolerance, setTolerance] = useState(10); // Match backend default tolerance
  // Pace input controls (minutes:seconds per mile)
  const [paceMinutes, setPaceMinutes] = useState(10); // Minutes portion of pace
  const [paceSeconds, setPaceSeconds] = useState(30); // Seconds portion of pace
  const [filterMode, setFilterMode] = useState('pace'); // Toggle between 'pace' or 'bpm' input modes
  
  // API and playlist management
  const [apiResponse, setApiResponse] = useState(null); // Stores the complete API response
  const [creatingPlaylist, setCreatingPlaylist] = useState(false); // Controls playlist creation state
  const [createdPlaylist, setCreatedPlaylist] = useState(null); // Stores created playlist details

  // Function to calculate BPM from pace in real-time (frontend only)
  const calculateBPMFromPace = (minutes, seconds) => {
    if (!minutes || minutes < 1 || !seconds === undefined) return 168; // Default fallback
    
    // Convert pace to total seconds per mile
    const totalSecondsPerMile = (minutes * 60) + (seconds || 0);
    
    // Convert to speed in miles per minute
    const milesPerMinute = 1 / (totalSecondsPerMile / 60);
    
    // Convert to mph for stride length estimation
    const mph = milesPerMinute * 60;
    
    // Estimate stride length based on speed
    let estimatedStrideFeet;
    if (mph >= 8.0) {
      estimatedStrideFeet = 3.5; // Fast runner
    } else if (mph >= 6.5) {
      estimatedStrideFeet = 3.2; // Moderate pace  
    } else if (mph >= 5.0) {
      estimatedStrideFeet = 3.0; // Casual jogging
    } else {
      estimatedStrideFeet = 2.8; // Walking/very slow
    }
    
    // Calculate cadence: speed × feet per mile / stride length
    const cadenceCalc = (milesPerMinute * 5280) / estimatedStrideFeet;
    
    return Math.round(cadenceCalc);
  };

  /**
   * Filters tracks based on either pace or BPM criteria
   * Makes API call to backend service to get matching tracks
   * Handles both pace-based (min:sec per mile) and direct BPM filtering
   * Updates the tracks list and stores full API response
   */
  const filterTracks = async () => {
    console.log('filterTracks called with:', { filterMode, paceMinutes, paceSeconds, cadence, tolerance });
    
    if (filterMode === 'pace' && (!paceMinutes || paceMinutes < 1 || paceMinutes === '')) {
        console.log('Skipping API call - invalid pace minutes:', paceMinutes);
        return;
      }
    if (filterMode === 'bpm' && (!cadence || cadence < 1)) {
      console.log('Skipping API call - invalid cadence:', cadence);
      return;
    }

    console.log('Making API call...');
    setLoading(true);
    setError(null);

    try {
      const payload = filterMode === 'pace' 
        ? { paceMinutes, paceSeconds, tolerance }
        : { targetCadence: cadence, tolerance };

      console.log('Filtering with payload:', payload);

      const response = await fetch('/api/filter/filter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Filter response:', data);
      console.log('Setting tracks to:', data.tracks);
      
      setApiResponse(data);
      setTracks(data.tracks || []);
      console.log('Tracks state should now be:', data.tracks || []);
      
      // Update cadence display if using pace mode
      if (filterMode === 'pace' && data.targetCadence) {
        setCadence(data.targetCadence);
      }

    } catch (err) {
      console.error('Error filtering tracks:', err);
      setError(`Failed to filter tracks: ${err.message}`);
      setTracks([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Creates a new Spotify playlist from the filtered tracks
   * - Generates a descriptive name based on pace/BPM
   * - Includes all currently filtered tracks
   * - Sets playlist to private by default
   * - Updates UI with creation status and success message
   */
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

      const payload = {
        name: playlistName,
        description: `Curated for ${apiResponse?.bpmRange || `${cadence}±${tolerance}`} BPM running cadence. Generated by Paceify.`,
        tracks: tracks.map(track => track.id),
        public: false
      };

      console.log('Creating playlist with payload:', payload);

      const response = await fetch('/api/playlists/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // In real implementation, add: 'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const playlistData = await response.json();
      console.log('Playlist created:', playlistData);
      
      setCreatedPlaylist(playlistData);

    } catch (err) {
      console.error('Error creating playlist:', err);
      setError(`Failed to create playlist: ${err.message}`);
    } finally {
      setCreatingPlaylist(false);
    }
  };

  /**
   * Automatically triggers track filtering when any filter criteria changes
   * - Debounces API calls by 500ms to prevent excessive requests
   * - Watches for changes in filterMode, pace settings, cadence, and tolerance
   * - Cleans up timeout on component unmount or criteria change
   */
  useEffect(() => {
    console.log('Dashboard useEffect triggered:', { filterMode, paceMinutes, paceSeconds, cadence, tolerance });
    const timeoutId = setTimeout(() => {
      console.log('About to call filterTracks...');
      filterTracks();
    }, 500); // Debounce API calls

    return () => clearTimeout(timeoutId);
  }, [filterMode, paceMinutes, paceSeconds, cadence, tolerance]);
  
  return (
    <div style={{  // Main container - Full page with gradient background
      minHeight: '100vh',
      background: 'linear-gradient(45deg, #87CEEB 30%, #4682B4 90%)',
      padding: '2rem',
      color: '#FFFFFF'
    }}>
      {/* Content container - Centers and limits width of content */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <h1 style={{
          fontSize: '3.5rem',
          marginBottom: '2rem',
          textAlign: 'center',
          color: '#FFFFFF',
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
          fontWeight: 'bold'
        }}>
          Dashboard
        </h1>

        {/* Filter Controls Section - BPM and Tolerance inputs */}
        <div style={{
          background: '#4A4A4A',
          padding: '1.5rem',
          borderRadius: '25px',
          marginBottom: '2rem',
          border: '2px solid white',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          width: 'fit-content'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '2rem',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            {/* Filter Mode Toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Filter by:</span>
              <select
                value={filterMode}
                onChange={e => setFilterMode(e.target.value)}
                style={{
                  padding: '8px 15px',
                  borderRadius: '25px',
                  border: '2px solid white',
                  background: '#191414',
                  fontSize: '1.1rem',
                  color: 'white',
                  fontWeight: 'bold'
                }}
              >
                <option value="pace">Running Pace</option>
                <option value="bpm">Direct BPM</option>
              </select>
            </div>

            {filterMode === 'pace' ? (
              // Pace Input Mode
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <label style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                  Pace per mile:
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <input
                      type="number"
                      value={paceMinutes}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === '') {
                          setPaceMinutes('');
                        } else {
                          const numVal = Number(val);
                          // Allow any positive number up to 99 for typing flexibility
                          if (numVal >= 0 && numVal <= 99) {
                            setPaceMinutes(numVal);
                          }
                        }
                      }}
                      min="4"
                      max="20"
                      style={{
                        width: '4rem',
                        padding: '8px 12px',
                        borderRadius: '25px',
                        border: '2px solid white',
                        background: '#191414',
                        fontSize: '1.1rem',
                        color: 'white',
                        fontWeight: 'bold',
                        textAlign: 'center'
                      }}
                    />
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>:</span>
                    <input
                      type="number"
                      value={paceSeconds}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === '') {
                          setPaceSeconds('');
                        } else {
                          const numVal = Number(val);
                          if (numVal >= 0 && numVal <= 59) {
                            setPaceSeconds(numVal);
                          }
                        }
                      }}
                      min="0"
                      max="59"
                      style={{
                        width: '4rem',
                        padding: '8px 12px',
                        borderRadius: '25px',
                        border: '2px solid white',
                        background: '#191414',
                        fontSize: '1.1rem',
                        color: 'white',
                        fontWeight: 'bold',
                        textAlign: 'center'
                      }}
                    />
                  </div>
                </label>
                <div style={{
                  fontSize: '0.9rem',
                  color: '#333',
                  textAlign: 'center'
                }}>
                  <div>≈ {calculateBPMFromPace(paceMinutes, paceSeconds)} BPM</div>
                  <div style={{ fontSize: '0.8rem' }}>
                    ({paceMinutes}:{(paceSeconds || 0).toString().padStart(2, '0')}/mile)
                  </div>
                </div>
              </div>
            ) : (
              // Direct BPM Mode
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <label style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                  Target Cadence (BPM):
                  <input
                    type="number"
                    value={cadence}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '') {
                        setCadence('');
                      } else {
                        const numVal = Number(val);
                        // Allow any reasonable number for typing flexibility
                        if (numVal >= 0 && numVal <= 999) {
                          setCadence(numVal);
                        }
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
                      background: '#191414',
                      fontSize: '1.1rem',
                      color: 'white',
                      fontWeight: 'bold',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  />
                </label>
                <div style={{
                  fontSize: '0.9rem',
                  color: '#333',
                  textAlign: 'center'
                }}>
                  <div>≈ {Math.floor(180/cadence)}:{String(Math.round((180/cadence - Math.floor(180/cadence)) * 60)).padStart(2, '0')}/mile</div>
                  <div style={{ fontSize: '0.8rem' }}>
                    ({cadence} BPM)
                  </div>
                </div>
              </div>
            )}

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <label style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                Tolerance: ±
                <input
                  type="number"
                  value={tolerance}
                  onChange={e => setTolerance(Number(e.target.value))}
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
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                />
                <span style={{ marginLeft: '0.5rem' }}>BPM</span>
              </label>
            </div>
          </div>

          {/* Status Display */}
          {apiResponse && (
            <div style={{
              marginTop: '1rem',
              padding: '0.5rem',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              textAlign: 'center',
              fontSize: '0.9rem'
            }}>
              <div>
                <strong>Filtering:</strong> {apiResponse.bpmRange} BPM 
                {apiResponse.originalPace && (
                  <span> (from {apiResponse.originalPace} pace)</span>
                )}
              </div>
              <div>
                <strong>Results:</strong> {apiResponse.filteredCount} tracks
                {apiResponse.recommendationsAdded > 0 && (
                  <span style={{ color: '#FFD700' }}> + {apiResponse.recommendationsAdded} recommendations</span>
                )}
              </div>
            </div>
          )}
        </div>
        {/* Track Results Display */}
        <div style={{ width: '100%', maxWidth: '800px' }}>
          {/* Create Playlist Button - Show when we have tracks */}
          {tracks.length > 0 && !createdPlaylist && (
            <div style={{ 
              textAlign: 'center', 
              marginBottom: '1rem'
            }}>
              <button
                onClick={createPlaylist}
                disabled={creatingPlaylist}
                style={{
                  backgroundColor: creatingPlaylist ? '#999' : '#1DB954',
                  color: 'white',
                  border: 'none',
                  borderRadius: '25px',
                  padding: '12px 24px',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  cursor: creatingPlaylist ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  if (!creatingPlaylist) {
                    e.currentTarget.style.backgroundColor = '#1ed760';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!creatingPlaylist) {
                    e.currentTarget.style.backgroundColor = '#1DB954';
                    e.currentTarget.style.transform = 'scale(1)';
                  }
                }}
              >
                {creatingPlaylist ? '🎵 Creating Playlist...' : `🎵 Create Playlist (${tracks.length} tracks)`}
              </button>
            </div>
          )}

          {/* Created Playlist Success Message */}
          {createdPlaylist && (
            <div style={{
              background: 'rgba(29, 185, 84, 0.1)',
              border: '2px solid #1DB954',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1rem',
              textAlign: 'center'
            }}>
              <h3 style={{ color: '#1DB954', margin: '0 0 0.5rem 0' }}>
                ✅ Playlist Created Successfully!
              </h3>
              <p style={{ margin: '0', fontSize: '1rem' }}>
                <strong>"{createdPlaylist.name}"</strong>
              </p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', opacity: '0.8' }}>
                {createdPlaylist.tracks?.length || tracks.length} tracks added to your Spotify library
              </p>
            </div>
          )}

          <SongList 
            tracks={tracks}
            targetCadence={cadence}
            isLoading={loading}
          />
          
          {error && (
            <div style={{ 
              textAlign: 'center',
              padding: '1rem',
              background: 'rgba(255,59,48,0.1)',
              borderRadius: '8px',
              marginTop: '1rem'
            }}>
              <p style={{ color: '#ff3b30', margin: 0 }}>{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
