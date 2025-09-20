import React from 'react';

const PlaylistCard = ({ track }) => {
  // Helper function to format duration from milliseconds to mm:ss
  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds.padStart(2, '0')}`;
  };

  return (
    <div style={{
      background: '#4A4A4A',
      borderRadius: '25px',
      padding: '1.5rem',
      color: '#FFFFFF',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      border: '2px solid white',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      ':hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 6px 12px rgba(0, 0, 0, 0.2)'
      }
    }}>
      <h3 style={{ 
        margin: '0 0 1rem 0',
        fontSize: '1.3rem',
        fontWeight: '600',
        color: '#000000ff'
      }}>
        {track.name}
      </h3>
      
      <div style={{ fontSize: '0.95rem' }}>
        <p style={{ 
          margin: '0.5rem 0',
          color: 'rgba(255, 255, 255, 0.9)'
        }}>
                    <span style={{ 
            color: '#FFFFFF',
            textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
            fontWeight: 'bold'
          }}>Artists:</span> {track.artists}
        </p>
        
        <p style={{ 
          margin: '0.5rem 0',
          color: 'rgba(255, 255, 255, 0.9)'
        }}>
          <span style={{ color: '#000000ff' }}>Album:</span> {track.album}
        </p>
        
        <div style={{
          background: 'rgba(29, 185, 84, 0.1)',
          padding: '0.8rem',
          borderRadius: '8px',
          margin: '1rem 0',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <span style={{
            fontSize: '1.4rem',
            fontWeight: 'bold',
            color: '#000000ff'
          }}>
            {track.bpm.toFixed(1)} BPM
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.8rem',
          margin: '1rem 0'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '0.6rem',
            borderRadius: '6px',
            textAlign: 'center'
          }}>
            <div style={{ color: '#000000ff', marginBottom: '0.2rem' }}>Energy</div>
            <div style={{ fontWeight: '600' }}>{(track.energy * 100).toFixed(0)}%</div>
          </div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '0.6rem',
            borderRadius: '6px',
            textAlign: 'center'
          }}>
            <div style={{ color: '#000000ff', marginBottom: '0.2rem' }}>Danceability</div>
            <div style={{ fontWeight: '600' }}>{(track.danceability * 100).toFixed(0)}%</div>
          </div>
        </div>

        {track.duration_ms && (
          <p style={{
            margin: '0.5rem 0',
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '0.9rem',
            textAlign: 'right'
          }}>
            <span style={{ color: '#000000ff' }}>Duration:</span> {formatDuration(track.duration_ms)}
          </p>
        )}
      </div>
    </div>
  );
};

export default PlaylistCard;
