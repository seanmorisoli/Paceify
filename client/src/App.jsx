// client/src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

export default function App() {
  return (
    <Routes>
      {/* Default route → Dashboard */}
      <Route path="/" element={<Navigate to="/Dashboard" replace />} />

      {/* Login page */}
      <Route path="/login" element={<Login />} />

      {/* Dashboard page */}
      <Route path="/dashboard" element={<Dashboard />} />

      {/* Catch-all → go back to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
