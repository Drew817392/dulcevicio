import { useAuth } from '../context/AuthContext';

/**
 * Componente RutaProtegida:
 * Envuelve cualquier vista o componente que requiera autenticación activa.
 * Si el usuario no está autenticado, muestra una pantalla de bloqueo con opción de iniciar sesión.
 */
export default function RutaProtegida({ children, onAbrirAuth, onIrACatalogo }) {
  const { isAuthenticated, loading } = useAuth();

  // Estado de carga inicial mientras se valida el token en localStorage / API
  if (loading) {
    return (
      <div className="pedidos-loading">
        <div className="spinner"></div>
        <p>Verificando credenciales...</p>
      </div>
    );
  }

  // Si no está autenticado, bloquea la vista
  if (!isAuthenticated) {
    return (
      <div className="pedidos-container">
        <div className="pedidos-auth-required">
          <span className="pedidos-icon">🔒</span>
          <h2>Acceso Protegido</h2>
          <p>Debes iniciar sesión con tu cuenta para acceder a esta sección.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px', flexWrap: 'wrap' }}>
            {onAbrirAuth && (
              <button className="confirm-btn" onClick={onAbrirAuth}>
                🔑 Iniciar Sesión / Registrarse
              </button>
            )}
            {onIrACatalogo && (
              <button className="volver-catalogo-btn" onClick={onIrACatalogo}>
                Volver al Catálogo 🍰
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Usuario autenticado: renderiza el contenido protegido
  return children;
}
