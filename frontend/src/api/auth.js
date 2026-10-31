import api from './client';

const TOKEN_KEY = 'summit_access_token';
const REFRESH_KEY = 'summit_refresh_token';
const USER_KEY = 'summit_user';

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access, refresh) {
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function login(username, password) {
  const { data } = await api.post('/auth/login/', { username, password });
  setTokens(data.access, data.refresh);
  setUser(data.user);
  return data;
}

export async function logout() {
  try {
    const refresh = getRefreshToken();
    if (refresh) {
      await api.post('/auth/logout/', { refresh });
    }
  } finally {
    clearTokens();
  }
}

export async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) throw new Error('No refresh token');
  const { data } = await api.post('/auth/token/refresh/', { refresh });
  localStorage.setItem(TOKEN_KEY, data.access);
  return data.access;
}

export function isAuthenticated() {
  return !!getAccessToken();
}
