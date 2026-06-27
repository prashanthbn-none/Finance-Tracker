// Authentication.
//
// Local-only for now: accounts live in localStorage and "passwords" are stored
// hashed with a lightweight digest (NOT secure — a real backend must do this
// server-side with bcrypt/argon2). The component API (login, register, logout,
// resetPassword, updateProfile) is what the rest of the app depends on, so it
// stays stable when auth moves to a server.

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { uid } from '../lib/storage.js';

const AuthContext = createContext(null);
const USERS_KEY = 'pft:users';
const SESSION_KEY = 'pft:session';

async function digest(str) {
  const data = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

async function authApi(path, payload) {
  let response;
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('Email verification service is unavailable. Start the OTP server and try again.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Email verification failed.');
  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const id = localStorage.getItem(SESSION_KEY);
      if (id) {
        const found = loadUsers().find(u => u.id === id);
        if (found) setUser(publicUser(found));
      }
    } catch { /* ignore */ }
    setReady(true);
  }, []);

  const register = useCallback(async ({ name, email, password }) => {
    const users = loadUsers();
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('An account with this email already exists.');
    }
    const record = {
      id: uid(),
      name: name.trim(),
      email: email.trim(),
      passwordHash: await digest(password),
      currency: 'INR',
      createdAt: new Date().toISOString(),
    };
    users.push(record);
    saveUsers(users);
    localStorage.setItem(SESSION_KEY, record.id);
    setUser(publicUser(record));
    return publicUser(record);
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const users = loadUsers();
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!found || found.passwordHash !== await digest(password)) {
      throw new Error('Email or password is incorrect.');
    }
    localStorage.setItem(SESSION_KEY, found.id);
    setUser(publicUser(found));
    return publicUser(found);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const requestResetOtp = useCallback(async ({ email }) => {
    const normalized = email.trim().toLowerCase();
    if (!loadUsers().some(u => u.email.toLowerCase() === normalized)) {
      throw new Error('No account found with this email.');
    }
    return authApi('/api/auth/request-reset-otp', { email: normalized });
  }, []);

  const verifyResetOtp = useCallback(async ({ email, otp }) => {
    return authApi('/api/auth/verify-reset-otp', { email: email.trim().toLowerCase(), otp });
  }, []);

  const resetPassword = useCallback(async ({ email, newPassword, resetToken }) => {
    await authApi('/api/auth/consume-reset-token', {
      email: email.trim().toLowerCase(),
      resetToken,
    });
    const users = loadUsers();
    const idx = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (idx === -1) throw new Error('No account found with this email.');
    users[idx].passwordHash = await digest(newPassword);
    saveUsers(users);
  }, []);

  const updateProfile = useCallback(async (patch) => {
    const users = loadUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx === -1) return;
    users[idx] = { ...users[idx], ...patch };
    saveUsers(users);
    setUser(publicUser(users[idx]));
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, ready, register, login, logout, requestResetOtp, verifyResetOtp, resetPassword, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

function publicUser(record) {
  const rest = { ...record };
  delete rest.passwordHash;
  return rest;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
