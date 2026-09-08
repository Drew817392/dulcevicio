import { useAuth } from '../context/AuthContext';

export default function RutaProtegida({ children, onAbrirAuth }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="pedidos-loading">
        <div className="spinner"></div>
        <p>Verificando credenciales...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="pedidos-container">
        <div className="pedidos-auth-required">
          <span className="pedidos-icon">🔒</span>
          <h2>Acceso Restringido</h2>
          <p>Debes iniciar sesión para ver tu historial de compras.</p>
          {onAbrirAuth && (
            <button
              className="volver-catalogo-btn"
              style={{ marginTop: '16px' }}
              onClick={onAbrirAuth}
            >
              🔑 Iniciar Sesión / Registrarse
            </button>
          )}
        </div>
      </div>
    );
  }

  return children;
}
