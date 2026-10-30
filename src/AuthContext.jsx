import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api, { TOKEN_KEY } from './api';
import { clearCache } from './cache';

const USER_KEY = 'ht_user';
const AuthContext = createContext(null);

function readCachedUser() {
  try {
    return localStorage.getItem(TOKEN_KEY) ? JSON.parse(localStorage.getItem(USER_KEY)) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  // Show the app immediately with the saved user; /auth/me refreshes it in the background
  const [user, setUserState] = useState(readCachedUser);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)) && !readCachedUser());

  const setUser = useCallback((u) => {
    setUserState(u);
    try {
      if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
      else localStorage.removeItem(USER_KEY);
      // Remembered for the login page too, where there is no user yet
      if (u?.language) localStorage.setItem('ht_lang', u.language);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    api
      .get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch((err) => {
        if (err.response?.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          setUser(null);
        }
      })
      .finally(() => setLoading(false));
  }, [setUser]);

  const loginWithGoogle = useCallback(async (credential, mode) => {
    const { data } = await api.post('/auth/google', { credential, mode });
    localStorage.setItem(TOKEN_KEY, data.token);
    clearCache();
    setUser(data.user);
    return data;
  }, [setUser]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    clearCache();
    setUser(null);
  }, [setUser]);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
