import React from 'react';
import './SongList.css';

const SongList = ({ tracks, targetCadence, isLoading }) => {
  // Format duration from milliseconds to MM:SS
  const formatDuration = (duration_ms) => {
    const minutes = Math.floor(duration_ms / 60000);
    const seconds = Math.floor((duration_ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="song-list loading">
        <p>Filtering tracks by cadence...</p>
      </div>
    );
  }

  if (!tracks || tracks.length === 0) {
    return (
      <div className="song-list empty">
        <h3>No tracks found</h3>
        <p>
          {targetCadence 
            ? `No tracks found matching ${targetCadence} BPM ± 10`
            : 'Enter a target running cadence to find matching tracks'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="song-list">
      <div className="song-list-header">
        <h3>
          {tracks.some(track => track.isRecommended) 
            ? 'Recommended Tracks' 
            : 'Your Library - Filtered Tracks'
          }
        </h3>
        <p className="results-summary">
          {tracks.some(track => track.isRecommended) 
            ? `Found ${tracks.length} recommended tracks matching ${targetCadence} BPM ± 10 (none found in your library)`
            : `Found ${tracks.length} tracks matching ${targetCadence} BPM ± 10`
          }
        </p>
      </div>
      
      <div className="tracks-container">
        {tracks.map((track) => (
          <div key={track.id} className={`track-item ${track.isRecommended ? 'recommended' : ''}`}>
            <div className="track-info">
              <div className="track-main">
                <h4 className="track-name">
                  {track.name}
                  {track.isRecommended && <span className="rec-badge">RECOMMENDED</span>}
                </h4>
                <p className="track-artist">{track.artists}</p>
                <p className="track-album">{track.album}</p>
              </div>
              <div className="track-details">
                <span className="track-duration">
                  {formatDuration(track.duration_ms)}
                </span>
              </div>
            </div>
            
            <div className="track-audio-features">
              <div className="bpm-badge">
                <span className="bpm-value">{track.bpm}</span>
                <span className="bpm-label">BPM</span>
              </div>
              <div className="audio-metrics">
                <div className="metric">
                  <span className="metric-label">Energy</span>
                  <div className="metric-bar">
                    <div 
                      className="metric-fill energy"
                      style={{ width: `${track.energy * 100}%` }}
                    ></div>
                  </div>
                  <span className="metric-value">{Math.round(track.energy * 100)}%</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Dance</span>
                  <div className="metric-bar">
                    <div 
                      className="metric-fill danceability"
                      style={{ width: `${track.danceability * 100}%` }}
                    ></div>
                  </div>
                  <span className="metric-value">{Math.round(track.danceability * 100)}%</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SongList;
