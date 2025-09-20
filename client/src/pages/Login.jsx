import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Handle the callback from Spotify
  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    const error = searchParams.get('error');

    if (accessToken) {
      // Store the token
      localStorage.setItem('spotify_access_token', accessToken);
      // Redirect to dashboard
      navigate('/dashboard');
    } else if (error) {
      console.error('Auth error:', error);
    }
  }, [searchParams, navigate]);

  // Handle login button click
  const handleLogin = () => {
    // Redirect to our backend auth endpoint
    window.location.href = 'http://localhost:3000/auth/login';
  };

  return (
    <div className="login-container" style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(45deg, #1DB954 30%, #191414 90%)', // Spotify green to black gradient
      color: 'white',
    }}>
      <h1 style={{ 
        fontSize: '3.5rem', 
        marginBottom: '2rem',
        fontWeight: 'bold',
        textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
      }}>
        Paceify
      </h1>
      
      <button
        onClick={handleLogin}
        style={{
          backgroundColor: '#191414', // Spotify black
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

      <p style={{ 
        marginTop: '2rem', 
        fontSize: '1rem',
        opacity: '0.9',
        textShadow: '1px 1px 2px rgba(0,0,0,0.2)'
      }}>
        Transform your playlists with the power of AI
      </p>
    </div>
  );
};

export default Login;
