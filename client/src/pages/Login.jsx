// client/src/pages/Login.jsx
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();

  function handleLogin() {
    // Later: call backend /auth/login
    // For now: simulate success
    navigate('/dashboard');
  }

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Login Page</h1>
      <button onClick={handleLogin}>Log in with Spotify</button>
    </div>
  );
}
