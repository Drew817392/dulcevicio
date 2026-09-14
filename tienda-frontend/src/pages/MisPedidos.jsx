import { useState, useEffect } from 'react';
import { getMisPedidos, revocarPedido } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function MisPedidos({ onIrACatalogo, onAbrirArrepentimiento }) {
  const { user, isAuthenticated } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revocandoId, setRevocandoId] = useState(null);
  const [revocacionExito, setRevocacionExito] = useState(null); // { pedidoId, codigo }
  const [revocacionError, setRevocacionError] = useState(null);

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

  const handleRevocar = async (pedidoId) => {
    if (!window.confirm(`¿Deseas solicitar la revocación y arrepentimiento de la orden #${pedidoId} conforme a la Res. SCI 424/2020?`)) {
      return;
    }

    setRevocandoId(pedidoId);
    setRevocacionError(null);
    setRevocacionExito(null);

    try {
      const res = await revocarPedido(pedidoId);
      setRevocacionExito({
        pedidoId,
        codigo: res.codigo_revocacion,
        mensaje: res.mensaje || 'Revocación procesada exitosamente.'
      });
      // Actualizar estado local del pedido
      setPedidos((prev) =>
        prev.map((p) =>
          p.id === pedidoId
            ? { ...p, estado: 'Revocado', codigo_revocacion: res.codigo_revocacion }
            : p
        )
      );
    } catch (err) {
      setRevocacionError({
        pedidoId,
        mensaje: err.message || 'Error al procesar la revocación.'
      });
    } finally {
      setRevocandoId(null);
    }
  };

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
          Historial de compras de <strong>{user?.nombre || user?.email}</strong> (Ley 24.240 y Ley 25.326)
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
          {pedidos.map((pedido) => {
            const fechaPedido = new Date(pedido.fecha_creacion);
            const diasPasados = (new Date() - fechaPedido) / (1000 * 60 * 60 * 24);
            const esElegibleRevocacion = pedido.estado !== 'Revocado' && pedido.estado !== 'Cancelado' && diasPasados <= 10;
            const esRevocado = pedido.estado === 'Revocado' || Boolean(pedido.codigo_revocacion);

            return (
              <div key={pedido.id} className={`pedido-card ${esRevocado ? 'pedido-card-revocado' : ''}`}>
                <div className="pedido-card-header">
                  <div className="pedido-id-badge">
                    <span className="pedido-label">Orden:</span>
                    <span className="pedido-number">#{pedido.id}</span>
                  </div>
                  <span className="pedido-fecha">
                    📅 {fechaPedido.toLocaleString('es-AR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  <span className={`pedido-estado-badge ${esRevocado ? 'badge-revocado' : 'badge-confirmado'}`}>
                    {esRevocado ? '↩️ Revocado' : `✓ ${pedido.estado}`}
                  </span>
                </div>

                {/* Banner de revocación exitosa para este pedido */}
                {revocacionExito && revocacionExito.pedidoId === pedido.id && (
                  <div role="status" className="revocacion-success-banner">
                    <span className="success-badge-icon">✅</span>
                    <div>
                      <strong>¡Revocación aprobada!</strong>
                      <p>
                        Código único de trámite: <span className="tramite-code">{revocacionExito.codigo}</span>
                      </p>
                      <small>Conserva este comprobante conforme a la Disp. 954/2025.</small>
                    </div>
                  </div>
                )}

                {/* Banner de error al revocar */}
                {revocacionError && revocacionError.pedidoId === pedido.id && (
                  <div className="cart-error-banner" style={{ margin: '12px 16px 0 16px' }}>
                    <span>⚠️</span>
                    <div className="error-content">
                      <strong>No se pudo revocar:</strong> {revocacionError.mensaje}
                    </div>
                  </div>
                )}

                {/* Código de revocación si ya estaba revocado */}
                {esRevocado && pedido.codigo_revocacion && (!revocacionExito || revocacionExito.pedidoId !== pedido.id) && (
                  <div className="revocado-info-bar">
                    <span>Código de trámite: <strong>{pedido.codigo_revocacion}</strong></span>
                    <span className="legal-tag">Res. SCI 424/2020</span>
                  </div>
                )}

                <div className="pedido-items-table">
                  <div className="pedido-table-head">
                    <span>Producto</span>
                    <span>Cant.</span>
                    <span>Precio Unit.</span>
                    <span style={{ textAlign: 'right' }}>Subtotal</span>
                  </div>
                  {pedido.items.map((item) => (
                    /* REGLA OBLIGATORIA: Usar producto_id como key */
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
                  <div className="footer-left-legal">
                    {esElegibleRevocacion ? (
                      <button
                        className="btn-revocar-order"
                        disabled={revocandoId === pedido.id}
                        onClick={() => handleRevocar(pedido.id)}
                        title="Revocar compra dentro de los 10 días (Res. SCI 424/2020)"
                      >
                        {revocandoId === pedido.id ? 'Procesando revocación…' : '↩️ Solicitar Arrepentimiento (10 días)'}
                      </button>
                    ) : esRevocado ? (
                      <span className="revocado-tag-text">Compra revocada — Stock reintegrado</span>
                    ) : (
                      <span className="plazo-vencido-tag">Plazo de revocación legal finalizado (&gt; 10 días)</span>
                    )}
                  </div>

                  <div className="footer-right-total">
                    <span className="total-label">Total:</span>
                    <span className="total-amount">${pedido.total?.toLocaleString('es-AR')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
