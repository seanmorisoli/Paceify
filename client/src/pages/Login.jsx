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
      backgroundColor: '#1DB954', // Spotify green
      color: 'white',
    }}>
      <h1 style={{ 
        fontSize: '2.5rem', 
        marginBottom: '2rem',
        fontWeight: 'bold'
      }}>
        Paceify
      </h1>
      
      <button
        onClick={handleLogin}
        style={{
          backgroundColor: '#191414', // Spotify black
          color: 'white',
          border: 'none',
          borderRadius: '25px',
          padding: '15px 30px',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          transition: 'transform 0.2s ease',
          ':hover': {
            transform: 'scale(1.05)'
          }
        }}
      >
        <img 
          src="https://storage.googleapis.com/pr-newsroom-wp/1/2018/11/Spotify_Logo_RGB_White.png" 
          alt="Spotify"
          style={{ height: '24px', marginRight: '8px' }}
        />
        Login with Spotify
      </button>

      <p style={{ marginTop: '2rem', fontSize: '0.9rem' }}>
        Connect your Spotify account to get started
      </p>
    </div>
  );
};

export default Login;
