import { useState, useEffect } from 'react';
import { getMisPedidos } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function MisPedidos({ onIrACatalogo }) {
  const { user, isAuthenticated } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargarPedidos = () => {
    setIsLoading(true);
    setError(null);
    getMisPedidos()
      .then((data) => {
        setPedidos(data);
      })
      .catch((err) => {
        setError(err.message || 'No pudimos cargar tu historial de compras.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    if (isAuthenticated) {
      cargarPedidos();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="pedidos-container">
        <div className="pedidos-auth-required">
          <span className="pedidos-icon">🔒</span>
          <h2>Acceso Restringido</h2>
          <p>Debes iniciar sesión para ver tu historial de compras.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pedidos-container">
      <div className="pedidos-header">
        <h2 className="pedidos-title">🛍️ Mis Compras Realizadas</h2>
        <p className="pedidos-subtitle">
          Historial de postres y delicias adquiridas por <strong>{user?.nombre || user?.email}</strong>
        </p>
      </div>

      {/* ESTADO 1: Cargando */}
      {isLoading ? (
        <div className="pedidos-loading">
          <div className="spinner"></div>
          <p>Consultando tu historial en el servidor...</p>
        </div>
      ) : error ? (
        /* ESTADO 2: Error */
        <div className="pedidos-error">
          <div className="error-card">
            <span className="error-icon">⚠️</span>
            <h3 className="error-title">No se pudo cargar el historial</h3>
            <p className="error-text">{error}</p>
            <button className="retry-btn" onClick={cargarPedidos}>
              🔄 Reintentar
            </button>
          </div>
        </div>
      ) : pedidos.length === 0 ? (
        /* ESTADO 3: Lista vacía */
        <div className="pedidos-empty">
          <span className="empty-pedidos-icon">🧁</span>
          <h3>Todavía no realizaste ningún pedido</h3>
          <p>¡Nuestros postres artesanales están esperando por vos!</p>
          <button className="volver-catalogo-btn" onClick={onIrACatalogo}>
            Ir al Catálogo de Delicias ✨
          </button>
        </div>
      ) : (
        /* Lista de Pedidos */
        <div className="pedidos-list">
          {pedidos.map((pedido) => (
            <div key={pedido.id} className="pedido-card">
              <div className="pedido-card-header">
                <div className="pedido-id-badge">
                  <span className="pedido-label">Orden:</span>
                  <span className="pedido-number">#{pedido.id}</span>
                </div>
                <span className="pedido-fecha">
                  📅 {new Date(pedido.fecha_creacion).toLocaleString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                <span className="pedido-estado-badge">
                  ✓ {pedido.estado}
                </span>
              </div>

              <div className="pedido-items-table">
                <div className="pedido-table-head">
                  <span>Producto</span>
                  <span>Cant.</span>
                  <span>Precio Unit.</span>
                  <span style={{ textAlign: 'right' }}>Subtotal</span>
                </div>
                {pedido.items.map((item) => (
                  // REGLA: Usá producto_id como key, nunca el índice del array
                  <div key={item.producto_id} className="pedido-item-row">
                    <span className="item-prod-nombre">
                      🍰 {item.nombre_producto || `Producto #${item.producto_id}`}
                    </span>
                    <span className="item-prod-qty">x{item.cantidad}</span>
                    <span className="item-prod-price">
                      ${item.precio_unitario?.toLocaleString('es-AR')}
                    </span>
                    <span className="item-prod-subtotal" style={{ textAlign: 'right', fontWeight: 700 }}>
                      ${item.subtotal?.toLocaleString('es-AR')}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pedido-card-footer">
                <span className="total-label">Total Abonado:</span>
                <span className="total-amount">${pedido.total?.toLocaleString('es-AR')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
