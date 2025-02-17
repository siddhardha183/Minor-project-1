import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import { useAuthStore } from './store/authStore';

function App() {
  const { token } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!token ? <Login /> : <Navigate to="/chat" />} />
        <Route path="/register" element={!token ? <Register /> : <Navigate to="/chat" />} />
        <Route path="/chat" element={token ? <Chat /> : <Navigate to="/login" />} />
        <Route path="/" element={<Navigate to={token ? "/chat" : "/login"} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;