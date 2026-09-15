import React, { createContext, useContext, useEffect, useState } from 'react';
import client from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('fops_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('fops_token');
    if (!token) { setReady(true); return; }
    client.get('/auth/me')
      .then((res) => { setUser(res.data.user); localStorage.setItem('fops_user', JSON.stringify(res.data.user)); })
      .catch(() => { localStorage.removeItem('fops_token'); localStorage.removeItem('fops_user'); setUser(null); })
      .finally(() => setReady(true));
  }, []);

  async function login(email, password) {
    const res = await client.post('/auth/login', { email, password });
    localStorage.setItem('fops_token', res.data.token);
    localStorage.setItem('fops_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  }

  async function register(name, email, password, role) {
    const res = await client.post('/auth/register', { name, email, password, role });
    localStorage.setItem('fops_token', res.data.token);
    localStorage.setItem('fops_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  }

  function logout() {
    localStorage.removeItem('fops_token');
    localStorage.removeItem('fops_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
