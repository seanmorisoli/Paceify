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
  }, [cadence, tolerance]);
  
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #84c5faff 0%, #3595e9ff 100%)',
      padding: '2rem',
      color: '#FFFFFF'
    }}>
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

        <div style={{
          background: '#b8b3b3ff',
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
            flexWrap: 'wrap'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <label style={{ fontSize: '1.1rem' }}>
                Target Cadence (BPM):
                <input
                  type="number"
                  value={cadence}
                  onChange={e => setCadence(Number(e.target.value))}
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
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <label style={{ fontSize: '1.1rem' }}>
                Tolerance:
                <input
                  type="number"
                  value={tolerance}
                  onChange={e => setTolerance(Number(e.target.value))}
                  style={{
                    marginLeft: '0.5rem',
                    width: '4rem',
                    padding: '0.5rem',
                    borderRadius: '5px',
                    border: '1px solid #000000ff',
                    background: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '1rem'
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '2rem',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            textShadow: '1px 1px 2px rgba(0,0,0,0.2)'
          }}>
            Loading tracks...
          </div>
        ) : error ? (
          <div style={{ 
            textAlign: 'center',
            padding: '1rem',
            background: 'rgba(255,59,48,0.1)',
            borderRadius: '8px'
          }}>
            <p style={{ color: '#ff3b30' }}>{error}</p>
          </div>
        ) : (
          <div>
            {tracks.length === 0 ? (
              <div style={{ 
                textAlign: 'center',
                padding: '2rem',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '10px'
              }}>
                <p style={{ fontSize: '1.2rem' }}>No tracks found matching your cadence preferences.</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1.5rem',
                padding: '1rem'
              }}>
                {tracks.map(track => (
                  <PlaylistCard key={track.id} track={track} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
