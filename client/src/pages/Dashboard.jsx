import React, { useEffect, useState } from 'react';
import PlaylistCard from '../components/PlaylistCard';

const Dashboard = () => {
	const [tracks, setTracks] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [cadence, setCadence] = useState(120);
	const [tolerance, setTolerance] = useState(5);

  // Mock data for testing
  const mockTracks = [
    {
      id: 'track1',
      name: 'Running Up That Hill',
      artists: 'Kate Bush',
      album: 'Hounds of Love',
      bpm: 125.9,
      energy: 0.7,
      danceability: 0.6
    },
    {
      id: 'track2',
      name: 'Eye of the Tiger',
      artists: 'Survivor',
      album: 'Eye of the Tiger',
      bpm: 109.0,
      energy: 0.9,
      danceability: 0.8
    }
  ];

  useEffect(() => {
    // Filter mock tracks based on cadence and tolerance
    const filteredTracks = mockTracks.filter(track => {
      return track.bpm >= (cadence - tolerance) && track.bpm <= (cadence + tolerance);
    });
    setTracks(filteredTracks);
    setLoading(false);
  }, [cadence, tolerance]);	return (
		<div style={{ padding: '2rem', backgroundColor: '#4A4A4A' }}>
			<h1 style={{ color: '#fff', borderColor: '#000000ff' }}>Dashboard</h1>
			<div style={{ marginBottom: '1rem' }}>
				<label>
					Target Cadence (BPM):
					<input
						type="number"
						value={cadence}
						onChange={e => setCadence(Number(e.target.value))}
						style={{ marginLeft: '0.5rem', width: '5rem' }}
					/>
				</label>
				<label style={{ marginLeft: '1rem' }}>
					Tolerance:
					<input
						type="number"
						value={tolerance}
						onChange={e => setTolerance(Number(e.target.value))}
						style={{ marginLeft: '0.5rem', width: '3rem' }}
					/>
				</label>
			</div>
			{loading ? (
				<p>Loading tracks...</p>
			) : error ? (
				<p style={{ color: 'red' }}>{error}</p>
			) : (
				<div>
					{tracks.length === 0 ? (
						<p>No tracks found for this cadence.</p>
					) : (
						<div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
							{tracks.map(track => (
								<PlaylistCard key={track.id} track={track} />
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default Dashboard;
