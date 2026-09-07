import { useState } from 'react';
import { useCarrito } from '../context/CarritoContext';
import { useAuth } from '../context/AuthContext';
import { crearPedido } from '../services/api';

export default function CarritoPage({ onIrAHistorial, onIrACatalogo, onAbrirAuth }) {
  const { items, actualizarCantidad, quitar, vaciar, total } = useCarrito();
  const { isAuthenticated } = useAuth();
  const [enviando, setEnviando] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState(null);
  const [compraExitosa, setCompraExitosa] = useState(false);

  const confirmar = async () => {
    // Protección contra doble clic o peticiones simultáneas
    if (enviando) return;

    if (!isAuthenticated) {
      setErrorMensaje('Debes iniciar sesión para confirmar tu compra.');
      if (onAbrirAuth) onAbrirAuth();
      return;
    }

    if (items.length === 0) {
      setErrorMensaje('El carrito está vacío.');
      return;
    }

    setErrorMensaje(null);
    setEnviando(true);

    try {
      // La regla que no se negocia: se envían solo producto_id y cantidad
      await crearPedido(items);
      setCompraExitosa(true);
      vaciar(); // Vaciamos el carrito tras confirmar la compra
      setTimeout(() => {
        if (onIrAHistorial) onIrAHistorial();
      }, 1200);
    } catch (err) {
      setErrorMensaje(err.message || 'Ocurrió un problema al confirmar la compra.');
    } finally {
      setEnviando(false);
    }
  };

  if (compraExitosa) {
    return (
      <div className="cart-page-container">
        <div className="checkout-success-view">
          <p className="success-icon">🎉</p>
          <h3 className="success-title">¡Compra Confirmada con Éxito!</h3>
          <p className="success-text">
            Tu pedido ha sido registrado y el stock fue actualizado. Te estamos redirigiendo a tu historial de compras...
          </p>
          <button className="success-btn" onClick={onIrAHistorial}>
            Ver Mis Pedidos 🛍️
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page-container">
      <div className="cart-page-header">
        <h2>🛒 Tu Carrito de Postres</h2>
        <p>Revisá tus productos antes de confirmar tu pedido artesanal.</p>
      </div>

      {errorMensaje && (
        <div className="cart-error-banner">
          <span className="error-icon-small">⚠️</span>
          <div className="error-content">
            <strong>Atención:</strong> {errorMensaje}
          </div>
          <button className="error-close-btn" onClick={() => setErrorMensaje(null)}>×</button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="empty-cart-message">
          <p className="empty-cart-icon">🛒</p>
          <h3>Tu carrito está vacío</h3>
          <p style={{ fontSize: '15px', marginTop: '6px', opacity: 0.85 }}>
            ¡Agregá tu postre favorito desde el catálogo para comenzar!
          </p>
          <button className="volver-catalogo-btn" style={{ marginTop: '20px' }} onClick={onIrACatalogo}>
            Ver Catálogo de Postres 🍰
          </button>
        </div>
      ) : (
        <div className="cart-layout-grid">
          {/* Lista de productos en el carrito */}
          <div className="cart-items-list">
            {items.map((item) => (
              <div key={item.id} className="cart-page-item">
                <img
                  src={item.imagen || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500'}
                  alt={item.nombre}
                  className="cart-item-image"
                />
                <div className="cart-item-details">
                  <h4 className="cart-item-title">{item.nombre}</h4>
                  <p className="cart-item-unit-price">
                    Precio unitario: ${item.precio_final?.toLocaleString('es-AR')}
                  </p>
                  <div className="cart-item-qty-actions">
                    <button className="qty-btn" onClick={() => actualizarCantidad(item.id, -1)}>-</button>
                    <span className="qty-num">{item.cantidad}</span>
                    <button className="qty-btn" onClick={() => actualizarCantidad(item.id, 1)}>+</button>
                  </div>
                </div>
                <div className="cart-item-total-box">
                  <span className="item-subtotal-price">
                    ${((item.precio_final || 0) * item.cantidad).toLocaleString('es-AR')}
                  </span>
                  <button className="delete-item-btn" onClick={() => quitar(item.id)} title="Eliminar del carrito">
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Resumen del Pedido */}
          <div className="cart-summary-card">
            <h3>Resumen de la Compra</h3>
            <div className="summary-row">
              <span>Subtotal:</span>
              <span>${total.toLocaleString('es-AR')}</span>
            </div>
            <div className="summary-row total-highlight">
              <span>Total Estimado:</span>
              <span>${total.toLocaleString('es-AR')}</span>
            </div>
            <p className="summary-disclaimer">
              * El total definitivo y stock son validados en el servidor.
            </p>

            <button
              className="checkout-btn"
              disabled={enviando || items.length === 0}
              onClick={confirmar}
            >
              {enviando ? 'Confirmando…' : 'Confirmar Compra ✨'}
            </button>

            <button className="vaciar-cart-link" onClick={vaciar}>
              Vaciar carrito
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
