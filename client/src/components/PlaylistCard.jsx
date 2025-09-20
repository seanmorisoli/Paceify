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
      backgroundColor: '#fff',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      padding: '1rem',
      width: '300px',
      margin: '0.5rem'
    }}>
      <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>{track.name}</h3>
      <div style={{ color: '#666', fontSize: '0.9rem' }}>
        <p style={{ margin: '0.3rem 0' }}>
          <strong>Artists:</strong> {track.artists}
        </p>
        <p style={{ margin: '0.3rem 0' }}>
          <strong>Album:</strong> {track.album}
        </p>
        <p style={{ margin: '0.3rem 0' }}>
          <strong>BPM:</strong> {track.bpm.toFixed(1)}
        </p>
        <div style={{ display: 'flex', gap: '1rem', margin: '0.5rem 0' }}>
          <div>
            <strong>Energy:</strong> {(track.energy * 100).toFixed(0)}%
          </div>
          <div>
            <strong>Danceability:</strong> {(track.danceability * 100).toFixed(0)}%
          </div>
        </div>
        {track.duration_ms && (
          <p style={{ margin: '0.3rem 0' }}>
            <strong>Duration:</strong> {formatDuration(track.duration_ms)}
          </p>
        )}
      </div>
    </div>
  );
};

export default PlaylistCard;
