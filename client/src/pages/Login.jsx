import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// API Configuration - automatically detects environment
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.MODE === 'development'
    ? 'http://localhost:3000'
    : 'https://paceify.onrender.com');

const Login = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Parse tokens from query string
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const expiresIn = params.get('expires_in');

    if (accessToken) {
      // Store tokens (could use context or secure storage later)
      localStorage.setItem('spotify_access_token', accessToken);
      if (refreshToken) {
        localStorage.setItem('spotify_refresh_token', refreshToken);
      }
      if (expiresIn) {
        localStorage.setItem('spotify_expires_in', expiresIn);
        // Save absolute expiry timestamp
        const expiryTime = Date.now() + Number(expiresIn) * 1000;
        localStorage.setItem('spotify_expiry_time', expiryTime);
      }

      // Clean up query params and go to dashboard
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleLogin = () => {
    // Redirect user to backend login endpoint
    window.location.href = `${API_BASE_URL}/auth/login`;
  };

  return (
    <div
      className="login-container"
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(45deg, #87CEEB 30%, #4682B4 90%)',
        color: 'white',
      }}
    >
      <h1
        style={{
          fontSize: '3.5rem',
          marginBottom: '2rem',
          fontWeight: 'bold',
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
        }}
      >
        Paceify
      </h1>

      <button
        onClick={handleLogin}
        style={{
          backgroundColor: '#4A4A4A',
          color: 'white',
          border: '2px solid white',
          borderRadius: '25px',
          padding: '15px 30px',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          transition: 'all 0.3s ease',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 6px 8px rgba(0,0,0,0.2)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        }}
      >
        <img
          src="https://storage.googleapis.com/pr-newsroom-wp/1/2018/11/Spotify_Logo_RGB_White.png"
          alt="Spotify"
          style={{ height: '24px', marginRight: '8px' }}
        />
        Connect with Spotify
      </button>

      <p
        style={{
          marginTop: '2rem',
          fontSize: '1rem',
          opacity: 0.9,
          textShadow: '1px 1px 2px rgba(0,0,0,0.2)',
        }}
      >
        Transform your playlists with music that moves you.
      </p>
    </div>
  );
};

export default Login;
