import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCarrito } from '../context/CarritoContext';
import { getMisDatos, exportarMisDatos, darDeBajaCuenta } from '../services/api';

export default function MisDatos({ onIrACatalogo }) {
  const { user, logout, isAuthenticated } = useAuth();
  const { vaciar } = useCarrito();

  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportando, setExportando] = useState(false);
  const [exportExito, setExportExito] = useState(false);

  // Estado para la confirmación interactiva de baja
  const [textoConfirmacion, setTextoConfirmacion] = useState('');
  const [procesandoBaja, setProcesandoBaja] = useState(false);
  const [bajaError, setBajaError] = useState(null);

  const cargarDatos = async () => {
    setLoading(true);
    setError(null);
    try {
      const info = await getMisDatos();
      setDatos(info);
    } catch (err) {
      setError(err.message || 'Error al cargar los datos personales.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      cargarDatos();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const handleExportar = async () => {
    setExportando(true);
    setExportExito(false);
    try {
      await exportarMisDatos();
      setExportExito(true);
      setTimeout(() => setExportExito(false), 4000);
    } catch (err) {
      alert(err.message || 'Error al descargar datos personales.');
    } finally {
      setExportando(false);
    }
  };

  const handleBaja = async () => {
    if (textoConfirmacion.trim() !== 'ELIMINAR') {
      return;
    }

    if (!window.confirm('¿Estás seguro/a de que deseas dar de baja y anonimizar tu cuenta definitivamente? Esta acción no se puede deshacer.')) {
      return;
    }

    setProcesandoBaja(true);
    setBajaError(null);

    try {
      await darDeBajaCuenta();
      // 1. Limpiar carrito en frontend
      vaciar();
      // 2. Destruir sesión activa
      logout();
      alert('Tu cuenta ha sido dada de baja y anonimizada con éxito conforme a la Ley 25.326.');
      // 3. Redirigir a portada
      if (onIrACatalogo) {
        onIrACatalogo();
      }
    } catch (err) {
      setBajaError(err.message || 'Error al procesar la baja de la cuenta.');
      setProcesandoBaja(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="pedidos-container">
        <div className="pedidos-auth-required">
          <span className="pedidos-icon">🔒</span>
          <h2>Acceso Restringido</h2>
          <p>Debes iniciar sesión para consultar y gestionar tus datos personales.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mis-datos-container">
      <div className="mis-datos-header">
        <div className="legal-badge-pill">
          <span>🛡️ Ley N° 25.326 — Protección de Datos Personales</span>
        </div>
        <h2 className="mis-datos-title">Mis Datos Personales y Privacidad</h2>
        <p className="mis-datos-subtitle">
          Gestioná el acceso, portabilidad y supresión de tus datos registrados en Dulce Vicio.
        </p>
      </div>

      {loading ? (
        <div className="pedidos-loading">
          <div className="spinner"></div>
          <p>Cargando información personal...</p>
        </div>
      ) : error ? (
        <div className="pedidos-error">
          <div className="error-card">
            <span className="error-icon">⚠️</span>
            <h3>Error al cargar datos</h3>
            <p>{error}</p>
            <button className="retry-btn" onClick={cargarDatos}>🔄 Reintentar</button>
          </div>
        </div>
      ) : (
        <div className="mis-datos-grid">
          {/* Tarjeta 1: Información del Titular (Derecho de Acceso) */}
          <div className="datos-card">
            <div className="datos-card-header">
              <span className="datos-card-icon">👤</span>
              <h3>Información de tu Perfil</h3>
            </div>
            <div className="datos-info-list">
              <div className="dato-row">
                <span className="dato-label">Nombre Completo:</span>
                <span className="dato-value">{datos?.nombre || user?.nombre}</span>
              </div>
              <div className="dato-row">
                <span className="dato-label">Correo Electrónico:</span>
                <span className="dato-value">{datos?.email || user?.email}</span>
              </div>
              <div className="dato-row">
                <span className="dato-label">Rol del Usuario:</span>
                <span className="dato-value role-badge">{datos?.rol === 'admin' ? '⭐ Administrador' : '🧁 Cliente'}</span>
              </div>
              <div className="dato-row">
                <span className="dato-label">Consentimiento Ley 25.326:</span>
                <span className="dato-value status-granted">✓ Otorgado y Vigente</span>
              </div>
              <div className="dato-row">
                <span className="dato-label">Fecha de Consentimiento:</span>
                <span className="dato-value">
                  {datos?.fecha_consentimiento
                    ? new Date(datos.fecha_consentimiento).toLocaleString('es-AR')
                    : 'Registrada'}
                </span>
              </div>
              <div className="dato-row">
                <span className="dato-label">Total de Compras:</span>
                <span className="dato-value">{datos?.total_pedidos ?? 0} pedidos</span>
              </div>
            </div>
          </div>

          {/* Tarjeta 2: Portabilidad de Datos (Derecho de Exportación) */}
          <div className="datos-card">
            <div className="datos-card-header">
              <span className="datos-card-icon">📥</span>
              <h3>Portabilidad de Datos (Art. 14)</h3>
            </div>
            <p className="datos-card-text">
              Podés descargar una copia completa y estructurada en formato JSON con tu perfil y el historial de compras para tus registros personales.
            </p>
            {exportExito && (
              <div role="status" className="toast-success-mini">
                ✓ Archivo JSON descargado exitosamente.
              </div>
            )}
            <button
              className="btn-exportar-datos"
              disabled={exportando}
              onClick={handleExportar}
            >
              {exportando ? 'Generando archivo JSON…' : '📥 Descargar mis datos (JSON)'}
            </button>
          </div>

          {/* Tarjeta 3: Zona de Peligro - Baja y Anonimización (Derecho de Supresión) */}
          <div className="datos-card danger-zone-card">
            <div className="datos-card-header">
              <span className="datos-card-icon">⚠️</span>
              <h3 style={{ color: '#d32f2f' }}>Zona de Peligro: Baja de Cuenta</h3>
            </div>
            <p className="danger-zone-text">
              La baja de cuenta anonimizará de forma permanente tus datos personales (nombre, email y credenciales) y desactivará tu acceso al sitio conforme a la <strong>Ley 25.326</strong>. Tus registros de compras se conservarán disociados exclusivamente para fines legales y contables.
            </p>

            {bajaError && (
              <div className="cart-error-banner" style={{ margin: '10px 0' }}>
                <span>⚠️</span>
                <div>{bajaError}</div>
              </div>
            )}

            <div className="danger-confirm-box">
              <label htmlFor="input-eliminar-cuenta" className="danger-confirm-label">
                Para confirmar la baja definitiva, escribe exactamente <strong>ELIMINAR</strong> a continuación:
              </label>
              <input
                id="input-eliminar-cuenta"
                type="text"
                className="input-danger-confirm"
                value={textoConfirmacion}
                onChange={(e) => setTextoConfirmacion(e.target.value)}
                placeholder="Escribe ELIMINAR"
                autoComplete="off"
              />
              <button
                className="btn-danger-baja"
                disabled={textoConfirmacion.trim() !== 'ELIMINAR' || procesandoBaja}
                onClick={handleBaja}
              >
                {procesandoBaja ? 'Procesando baja y anonimización…' : '🗑️ Eliminar y Anonimizar mi Cuenta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
