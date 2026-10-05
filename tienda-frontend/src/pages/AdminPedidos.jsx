import { useState, useEffect } from 'react';
import { getTodosLosPedidosAdmin } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AdminPedidos({ onIrACatalogo }) {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.rol === 'admin';
  const [pedidos, setPedidos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos'); // 'todos' | 'Confirmado' | 'Revocado'

  const cargarPedidos = () => {
    setIsLoading(true);
    setError(null);
    getTodosLosPedidosAdmin()
      .then((data) => {
        setPedidos(data);
      })
      .catch((err) => {
        setError(err.message || 'No pudimos cargar las órdenes de los clientes.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      cargarPedidos();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, isAdmin]);

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="pedidos-container">
        <div className="pedidos-auth-required">
          <span className="pedidos-icon">🔒</span>
          <h2>Acceso Exclusivo de Administrador</h2>
          <p>Debes iniciar sesión con una cuenta de administrador para acceder a las órdenes de clientes.</p>
          <button className="volver-catalogo-btn" onClick={onIrACatalogo}>
            Ir al Catálogo ✨
          </button>
        </div>
      </div>
    );
  }

  // Filtrado en memoria
  const pedidosFiltrados = pedidos.filter((pedido) => {
    const coincideEstado = filtroEstado === 'todos' || pedido.estado.toLowerCase() === filtroEstado.toLowerCase();
    const query = busqueda.trim().toLowerCase();
    if (!query) return coincideEstado;

    const coincideId = String(pedido.id).includes(query);
    const coincideNombre = (pedido.usuario_nombre || '').toLowerCase().includes(query);
    const coincideEmail = (pedido.usuario_email || '').toLowerCase().includes(query);
    const coincideCodigo = (pedido.codigo_revocacion || '').toLowerCase().includes(query);

    return coincideEstado && (coincideId || coincideNombre || coincideEmail || coincideCodigo);
  });

  // Métricas resumidas para el panel de administración
  const totalRecaudado = pedidos
    .filter((p) => p.estado !== 'Revocado' && p.estado !== 'Cancelado')
    .reduce((acc, p) => acc + (p.total || 0), 0);
  const totalConfirmados = pedidos.filter((p) => p.estado === 'Confirmado').length;
  const totalRevocados = pedidos.filter((p) => p.estado === 'Revocado').length;

  return (
    <div className="pedidos-container admin-pedidos-container">
      {/* Encabezado del Panel */}
      <div className="pedidos-header">
        <div className="admin-header-title-row">
          <div>
            <h2 className="pedidos-title">📦 Panel de Órdenes de Clientes</h2>
            <p className="pedidos-subtitle">
              Gestión centralizada de compras y pedidos de todos los usuarios registrados (Admin: <strong>{user?.email}</strong>).
            </p>
          </div>
          <button className="admin-refresh-btn" onClick={cargarPedidos} disabled={isLoading} title="Recargar órdenes">
            🔄 {isLoading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas Rápidas */}
      <div className="admin-stats-grid">
        <div className="stat-card">
          <span className="stat-icon">🛍️</span>
          <div className="stat-info">
            <span className="stat-value">{pedidos.length}</span>
            <span className="stat-label">Total Órdenes</span>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">💰</span>
          <div className="stat-info">
            <span className="stat-value">${totalRecaudado.toLocaleString('es-AR', { minimumFractionDigits: 0 })}</span>
            <span className="stat-label">Ventas Netas Activas</span>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">✅</span>
          <div className="stat-info">
            <span className="stat-value">{totalConfirmados}</span>
            <span className="stat-label">Confirmadas</span>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">↩️</span>
          <div className="stat-info">
            <span className="stat-value">{totalRevocados}</span>
            <span className="stat-label">Revocadas (Ley 24.240)</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="admin-orders-controls">
        <div className="admin-search-box">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Buscar por #orden, nombre de cliente o email..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="admin-filter-group">
          <button
            className={`filter-tag-btn ${filtroEstado === 'todos' ? 'active' : ''}`}
            onClick={() => setFiltroEstado('todos')}
          >
            Todas ({pedidos.length})
          </button>
          <button
            className={`filter-tag-btn ${filtroEstado === 'Confirmado' ? 'active' : ''}`}
            onClick={() => setFiltroEstado('Confirmado')}
          >
            ✓ Confirmadas ({totalConfirmados})
          </button>
          <button
            className={`filter-tag-btn ${filtroEstado === 'Revocado' ? 'active' : ''}`}
            onClick={() => setFiltroEstado('Revocado')}
          >
            ↩️ Revocadas ({totalRevocados})
          </button>
        </div>
      </div>

      {/* Estados de carga y error */}
      {isLoading ? (
        <div className="pedidos-loading">
          <div className="spinner"></div>
          <p>Consultando base de datos de pedidos...</p>
        </div>
      ) : error ? (
        <div className="pedidos-error">
          <div className="error-card">
            <span className="error-icon">⚠️</span>
            <h3 className="error-title">No se pudieron cargar las órdenes</h3>
            <p className="error-text">{error}</p>
            <button className="retry-btn" onClick={cargarPedidos}>
              🔄 Reintentar
            </button>
          </div>
        </div>
      ) : pedidosFiltrados.length === 0 ? (
        <div className="pedidos-empty">
          <span className="empty-pedidos-icon">📋</span>
          <h3>No se encontraron órdenes con los filtros aplicados</h3>
          <p>Prueba con otro término de búsqueda o cambia el filtro de estado.</p>
          <button
            className="volver-catalogo-btn"
            onClick={() => {
              setBusqueda('');
              setFiltroEstado('todos');
            }}
          >
            Limpiar Filtros
          </button>
        </div>
      ) : (
        /* Listado de Todas las Órdenes */
        <div className="pedidos-list">
          {pedidosFiltrados.map((pedido) => {
            const fechaPedido = new Date(pedido.fecha_creacion);
            const esRevocado = pedido.estado === 'Revocado' || Boolean(pedido.codigo_revocacion);

            return (
              <div key={pedido.id} className={`pedido-card admin-order-card ${esRevocado ? 'pedido-card-revocado' : ''}`}>
                <div className="pedido-card-header">
                  <div className="pedido-id-badge">
                    <span className="pedido-label">Orden:</span>
                    <span className="pedido-number">#{pedido.id}</span>
                  </div>

                  {/* Información del Cliente */}
                  <div className="admin-customer-info-badge">
                    <span className="customer-avatar">👤</span>
                    <div className="customer-text">
                      <strong className="customer-name">{pedido.usuario_nombre || 'Cliente'}</strong>
                      <span className="customer-email">{pedido.usuario_email || `ID Usuario: ${pedido.usuario_id}`}</span>
                    </div>
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

                {/* Info de Revocación si aplica */}
                {esRevocado && pedido.codigo_revocacion && (
                  <div className="revocado-info-bar">
                    <span>Trámite de Revocación: <strong>{pedido.codigo_revocacion}</strong></span>
                    {pedido.fecha_revocacion && (
                      <span style={{ fontSize: '12px', opacity: 0.9 }}>
                        (Fecha: {new Date(pedido.fecha_revocacion).toLocaleDateString('es-AR')})
                      </span>
                    )}
                    <span className="legal-tag">Stock Reintegrado</span>
                  </div>
                )}

                {/* Tabla de ítems comprados */}
                <div className="pedido-items-table">
                  <div className="pedido-table-head">
                    <span>Producto Comprado</span>
                    <span>Cant.</span>
                    <span>Precio Unit.</span>
                    <span style={{ textAlign: 'right' }}>Subtotal</span>
                  </div>
                  {pedido.items.map((item) => (
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

                {/* Pie de la tarjeta con Total */}
                <div className="pedido-card-footer">
                  <div className="footer-left-legal">
                    <span className="admin-items-count">
                      📦 Total ítems: {pedido.items.reduce((sum, i) => sum + i.cantidad, 0)} unidad(es)
                    </span>
                  </div>

                  <div className="footer-right-total">
                    <span className="total-label">Total Orden:</span>
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
