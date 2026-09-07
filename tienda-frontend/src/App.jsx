import { useState, useEffect } from 'react';
import './App.css';
import Catalogo from './pages/catalogo';

export default function App() {
  // Estado del Carrito
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('cart'); // 'cart' | 'success'

  // Estado del flujo QR y Descuento
  const [isQrUser, setIsQrUser] = useState(false);
  const [showQrAlert, setShowQrAlert] = useState(false);

  // Estado del Botón de Arrepentimiento
  const [isArrepentimientoOpen, setIsArrepentimientoOpen] = useState(false);
  const [arrepentimientoForm, setArrepentimientoForm] = useState({
    nombre: '',
    email: '',
    idCompra: '',
    motivo: ''
  });

  // Detectar QR en la URL al cargar
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('qr') === '1' || params.get('scan') === 'true') {
      setIsQrUser(true);
      setShowQrAlert(true);
      setIsCartOpen(true); // Abre el carrito automáticamente para un flujo fluido
    }
  }, []);

  // Operaciones del carrito
  const addToCart = (product) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id);
      if (existing) {
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      return [...prevCart, { ...product, cantidad: 1 }];
    });
    setIsCartOpen(true); // Abrir el carrito para dar feedback inmediato al usuario
    setCheckoutStep('cart'); // Resetear paso si estaba en success
  };

  const updateQty = (productId, amount) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.id === productId) {
            const newQty = item.cantidad + amount;
            return newQty > 0 ? { ...item, cantidad: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };

  // Cálculos de precios
  const subtotal = cart.reduce((sum, item) => sum + item.precio_final * item.cantidad, 0);
  const discountAmount = isQrUser ? subtotal * 0.1 : 0;
  const total = subtotal - discountAmount;
  const totalItems = cart.reduce((sum, item) => sum + item.cantidad, 0);

  // Simulación de Compra (Checkout)
  const handleCheckout = () => {
    if (cart.length === 0) return;
    setCheckoutStep('success');
    setCart([]); // Vaciar carrito
  };

  // Enviar formulario de arrepentimiento (Cumplimiento Res. 424/2020)
  const handleArrepentimientoSubmit = (e) => {
    e.preventDefault();
    alert(
      `Trámite de Revocación de Compra Recibido.\nEstimado/a ${arrepentimientoForm.nombre}, hemos recibido su solicitud para la compra #${arrepentimientoForm.idCompra}. Nos contactaremos a ${arrepentimientoForm.email} dentro de las próximas 24 horas hábiles.`
    );
    setIsArrepentimientoOpen(false);
    setArrepentimientoForm({ nombre: '', email: '', idCompra: '', motivo: '' });
  };

  return (
    <div className="app-container">
      {/* Barra de navegación superior */}
      <header className="navbar">
        <div className="brand">
          <span className="brand-logo">🧁</span>
          <div>
            <h1 className="brand-name">Dulce Vicio</h1>
            <p className="brand-tagline">POSTRES EXQUISITOS A PRECIOS AMIGABLES</p>
          </div>
        </div>
        
        <div className="cart-button-container">
          <button className="cart-toggle-btn" onClick={() => setIsCartOpen(true)}>
            🛒 Carrito <span className="cart-badge">{totalItems}</span>
          </button>
        </div>
      </header>

      {/* Alerta de Descuento por Código QR */}
      {showQrAlert && (
        <div className="qr-promo-banner">
          <div className="qr-promo-content">
            <span className="qr-promo-icon">🎉</span>
            <div>
              <h4 className="qr-promo-title">¡Código QR Escaneado Correctamente!</h4>
              <p className="qr-promo-text">Disfrutá de un <strong>10% de descuento automático</strong> en todas tus dulzuras.</p>
            </div>
          </div>
          <button className="qr-promo-close" onClick={() => setShowQrAlert(false)}>×</button>
        </div>
      )}

      {/* Hero Section Pastel */}
      <section className="hero-section">
        <h2 className="hero-title">¡Date un gusto dulce hoy!</h2>
        <p className="hero-description">
          Elaboramos los mejores postres artesanales con ingredientes seleccionados y recetas tradicionales. ¡Precios accesibles para endulzar tu día!
        </p>
        <span className="hero-banner-tag">🌸 100% Artesanal y Fresco 🌸</span>
      </section>

      {/* Catálogo de Productos */}
      <main>
        <Catalogo onAddToCart={addToCart} />
      </main>

      {/* Drawer Deslizable del Carrito */}
      <div className={`cart-drawer-overlay ${isCartOpen ? 'open' : ''}`} onClick={() => setIsCartOpen(false)}>
        <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
          <div className="cart-header">
            <h3 className="cart-header-title">Tu Carrito 🍰</h3>
            <button className="close-cart-btn" onClick={() => setIsCartOpen(false)}>×</button>
          </div>

          {checkoutStep === 'cart' ? (
            <>
              <div className="cart-items-container">
                {cart.length === 0 ? (
                  <div className="empty-cart-message">
                    <p className="empty-cart-icon">🛒</p>
                    <p>Tu carrito está vacío.</p>
                    <p style={{ fontSize: '14px', marginTop: '5px', opacity: 0.8 }}>
                      ¡Agregá tu postre favorito desde el catálogo!
                    </p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="cart-item">
                      <img src={item.imagen} alt={item.nombre} className="cart-item-image" />
                      <div className="cart-item-info">
                        <h4 className="cart-item-name">{item.nombre}</h4>
                        <p className="cart-item-price">${(item.precio_final * item.cantidad).toLocaleString('es-AR')}</p>
                        <div className="cart-item-qty-actions">
                          <button className="qty-btn" onClick={() => updateQty(item.id, -1)}>-</button>
                          <span className="qty-num">{item.cantidad}</span>
                          <button className="qty-btn" onClick={() => updateQty(item.id, 1)}>+</button>
                        </div>
                      </div>
                      <button className="delete-item-btn" onClick={() => removeFromCart(item.id)}>🗑️</button>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="cart-footer">
                  <div className="price-summary-row">
                    <span>Subtotal:</span>
                    <span>${subtotal.toLocaleString('es-AR')}</span>
                  </div>
                  {isQrUser && (
                    <div className="price-summary-row discount">
                      <span>Descuento QR (10%):</span>
                      <span>-${discountAmount.toLocaleString('es-AR')}</span>
                    </div>
                  )}
                  <div className="price-summary-total">
                    <span>Total:</span>
                    <span>${total.toLocaleString('es-AR')}</span>
                  </div>
                  <button className="checkout-btn" onClick={handleCheckout}>
                    Confirmar Compra ✨
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="checkout-success-view">
              <p className="success-icon">🎉</p>
              <h3 className="success-title">¡Pedido Confirmado!</h3>
              <p className="success-text">
                Tu orden ha sido enviada a cocina. En minutos tus postres estarán listos para ser retirados o enviados.
              </p>
              <button className="success-btn" onClick={() => { setCheckoutStep('cart'); setIsCartOpen(false); }}>
                Seguir Comprando 🍰
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pie de Página Legal (Defensa del Consumidor & Arrepentimiento) */}
      <footer className="site-footer">
        <div className="footer-legal-box">
          <p>
            <strong>Información al Consumidor:</strong> Las compras realizadas en esta plataforma de postres artesanales están reguladas por la Ley N° 24.240 de Defensa del Consumidor de la República Argentina. Garantizamos información transparente, productos frescos elaborados bajo normas bromatológicas vigentes, y medios de pago seguros.
          </p>
        </div>

        <div className="footer-legal-links">
          <button className="arrepentimiento-btn" onClick={() => setIsArrepentimientoOpen(true)}>
            Botón de Arrepentimiento (Res. SCI 424/2020)
          </button>
        </div>

        <p className="footer-copy">© 2026 Dulce Vicio S.A. - Todos los derechos reservados.</p>
      </footer>

      {/* Modal del Botón de Arrepentimiento */}
      <div className={`modal-overlay ${isArrepentimientoOpen ? 'open' : ''}`} onClick={() => setIsArrepentimientoOpen(false)}>
        <div className="modal-box" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Revocación de Compra</h3>
            <button className="close-cart-btn" onClick={() => setIsArrepentimientoOpen(false)}>×</button>
          </div>
          <form onSubmit={handleArrepentimientoSubmit}>
            <div className="modal-body">
              <p>
                De acuerdo con la Resolución SCI N° 424/2020, usted tiene derecho a revocar su compra dentro de los 10 días corridos desde la recepción del producto. Ingrese sus datos para iniciar la solicitud.
              </p>
              <div className="input-group">
                <label htmlFor="nombre">Nombre Completo</label>
                <input
                  id="nombre"
                  type="text"
                  required
                  value={arrepentimientoForm.nombre}
                  onChange={(e) => setArrepentimientoForm({ ...arrepentimientoForm, nombre: e.target.value })}
                  placeholder="Ej: María Gómez"
                />
              </div>
              <div className="input-group">
                <label htmlFor="email">Correo Electrónico</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={arrepentimientoForm.email}
                  onChange={(e) => setArrepentimientoForm({ ...arrepentimientoForm, email: e.target.value })}
                  placeholder="Ej: maria@correo.com"
                />
              </div>
              <div className="input-group">
                <label htmlFor="idCompra">Código/ID de Compra</label>
                <input
                  id="idCompra"
                  type="text"
                  required
                  value={arrepentimientoForm.idCompra}
                  onChange={(e) => setArrepentimientoForm({ ...arrepentimientoForm, idCompra: e.target.value })}
                  placeholder="Ej: DV-98745"
                />
              </div>
              <div className="input-group">
                <label htmlFor="motivo">Motivo (Opcional)</label>
                <input
                  id="motivo"
                  type="text"
                  value={arrepentimientoForm.motivo}
                  onChange={(e) => setArrepentimientoForm({ ...arrepentimientoForm, motivo: e.target.value })}
                  placeholder="Ej: Error en el sabor seleccionado"
                />
              </div>
            </div>
            <div className="modal-actions" style={{ padding: '0 24px 24px 24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="modal-btn cancel" onClick={() => setIsArrepentimientoOpen(false)}>
                Cancelar
              </button>
              <button type="submit" className="modal-btn confirm">
                Enviar Solicitud
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}