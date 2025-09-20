import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';

const App = () => {
  return (
    <div>
      {/* Simple nav bar for testing */}
      <nav style={{ padding: '1rem', borderBottom: '1px solid #272525ff' }}>
        <Link to="/login" style={{ marginRight: '1rem' }}>Login</Link>
        <Link to="/dashboard">Dashboard</Link>
      </nav>

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        {/* fallback route */}
        <Route path="*" element={<Login />} />
      </Routes>
    </div>
  );
};

export default App;
