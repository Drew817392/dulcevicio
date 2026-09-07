import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose }) {
  const { login, register } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    acepto_tratamiento: true,
  });
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setCargando(true);

    try {
      if (isLoginMode) {
        await login(formData.email, formData.password);
      } else {
        await register({
          nombre: formData.nombre,
          email: formData.email,
          password: formData.password,
          acepto_tratamiento: formData.acepto_tratamiento,
        });
        // Auto-login tras registrarse
        await login(formData.email, formData.password);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Ocurrió un error al procesar la solicitud.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isLoginMode ? '🍰 Iniciar Sesión' : '🧁 Crear Cuenta Dulce'}</h3>
          <button className="close-cart-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="auth-error-banner">
                ⚠️ {error}
              </div>
            )}

            {!isLoginMode && (
              <div className="input-group">
                <label htmlFor="auth-nombre">Nombre Completo</label>
                <input
                  id="auth-nombre"
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Valeria Silveira"
                />
              </div>
            )}

            <div className="input-group">
              <label htmlFor="auth-email">Correo Electrónico</label>
              <input
                id="auth-email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="ejemplo@correo.com"
              />
            </div>

            <div className="input-group">
              <label htmlFor="auth-password">Contraseña</label>
              <input
                id="auth-password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>

            {!isLoginMode && (
              <div className="consent-checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.acepto_tratamiento}
                    onChange={(e) => setFormData({ ...formData, acepto_tratamiento: e.target.checked })}
                  />
                  <span>
                    Acepto el tratamiento de mis datos personales conforme a la <strong>Ley N° 25.326</strong> de Protección de Datos Personales.
                  </span>
                </label>
              </div>
            )}
          </div>

          <div className="modal-actions" style={{ padding: '0 24px 24px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              type="submit"
              className="checkout-btn"
              disabled={cargando}
              style={{ width: '100%', margin: 0 }}
            >
              {cargando ? 'Procesando…' : isLoginMode ? 'Ingresar a mi Cuenta' : 'Registrarme y Aceptar'}
            </button>

            <button
              type="button"
              className="toggle-auth-btn"
              onClick={() => {
                setIsLoginMode(!isLoginMode);
                setError(null);
              }}
              style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: '14px', textDecoration: 'underline' }}
            >
              {isLoginMode ? '¿No tenés cuenta? Registrate aquí' : '¿Ya tenés cuenta? Iniciá sesión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
