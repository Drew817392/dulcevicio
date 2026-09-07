import { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, registerUser, getMe } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('access_token') || null);
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Verificar sesión al cargar
  useEffect(() => {
    async function verificarSesion() {
      const storedToken = localStorage.getItem('access_token');
      if (storedToken) {
        try {
          const perfil = await getMe();
          setUser(perfil);
          localStorage.setItem('user', JSON.stringify(perfil));
        } catch {
          // Token inválido o expirado
          logout();
        }
      }
      setLoading(false);
    }
    verificarSesion();
  }, []);

  const login = async (email, password) => {
    const data = await loginUser(email, password);
    localStorage.setItem('access_token', data.access_token);
    if (data.refresh_token) {
      localStorage.setItem('refresh_token', data.refresh_token);
    }
    setToken(data.access_token);

    const perfil = await getMe();
    setUser(perfil);
    localStorage.setItem('user', JSON.stringify(perfil));
    return perfil;
  };

  const register = async (userData) => {
    return await registerUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        isAuthenticated: Boolean(token),
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}
