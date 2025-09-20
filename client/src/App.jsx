// client/src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

export default function App() {
  return (
<<<<<<< HEAD
    <div>
      {/* Simple nav bar for testing */}
      <nav style={{ padding: '1rem', borderBottom: '1px solid #272525ff' }}>
        <Link to="/login" style={{ marginRight: '1rem' }}>Login</Link>
        <Link to="/dashboard">Dashboard</Link>
      </nav>
=======
    <Routes>
      {/* Default route → Login */}
      <Route path="/" element={<Navigate to="/login" replace />} />
>>>>>>> 1d3f8fb5529177949f4e4c755b7dc4f2e30c7f1e

      

      {/* Catch-all → redirect to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
