import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SongList from '../components/SongList';
import PlaylistCard from '../components/PlaylistCard';

const Dashboard = () => {
  const navigate = useNavigate();
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
      setError('Please authenticate with Spotify first. Redirecting...');
      setTimeout(() => navigate('/login', { replace: true }), 2000);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = filterMode === 'pace'
        ? { paceMinutes, paceSeconds, tolerance }
        : { targetCadence: cadence, tolerance };

      const response = await fetch('http://localhost:3000/filter/filter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Spotify session expired. Redirecting...');
          localStorage.removeItem('spotify_access_token');
          setTimeout(() => navigate('/login', { replace: true }), 2000);
          return;
        }
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
      navigate('/login', { replace: true });
      return;
    }

    setCreatingPlaylist(true);
    setError(null);

    try {
      const playlistName = apiResponse?.originalPace
        ? `Running Mix - ${apiResponse.originalPace} pace (${cadence} BPM)`
        : `Running Mix - ${cadence} BPM`;

      const payload = { name: playlistName, trackUris: tracks.map(t => t.uri) };

      const response = await fetch('http://localhost:3000/playlists/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
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
    <div>
      {/* Your full dashboard JSX goes here */}
    </div>
  );
};

export default Dashboard;
