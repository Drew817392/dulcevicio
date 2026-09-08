import { useState, useEffect } from 'react';
import './App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CarritoProvider, useCarrito } from './context/CarritoContext';
import Catalogo from './pages/catalogo';
import CarritoPage from './pages/CarritoPage';
import MisPedidos from './pages/MisPedidos';
import AuthModal from './components/AuthModal';

function TiendaApp() {
  const { user, isAuthenticated, logout } = useAuth();
  const { totalItems } = useCarrito();
  const [vistaActual, setVistaActual] = useState('catalogo'); // 'catalogo' | 'carrito' | 'mis-pedidos'
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isArrepentimientoOpen, setIsArrepentimientoOpen] = useState(false);
  const [arrepentimientoForm, setArrepentimientoForm] = useState({
    nombre: '',
    email: '',
    idCompra: '',
    motivo: '',
  });

  const handleArrepentimientoSubmit = (e) => {
    e.preventDefault();
    alert(
      `Trámite de Revocación de Compra Recibido (Res. SCI N° 424/2020).\nEstimado/a ${arrepentimientoForm.nombre}, hemos recibido su solicitud para la orden #${arrepentimientoForm.idCompra}. Se contactará a ${arrepentimientoForm.email} dentro de las próximas 24 horas hábiles.`
    );
    setIsArrepentimientoOpen(false);
    setArrepentimientoForm({ nombre: '', email: '', idCompra: '', motivo: '' });
  };

  return (
    <div className="app-container">
      {/* Barra de navegación superior */}
      <header className="navbar">
        <div className="brand" onClick={() => setVistaActual('catalogo')} style={{ cursor: 'pointer' }}>
          <span className="brand-logo">🧁</span>
          <div>
            <h1 className="brand-name">Dulce Vicio</h1>
            <p className="brand-tagline">POSTRES EXQUISITOS A PRECIOS AMIGABLES</p>
          </div>
        </div>

        {/* Enlaces de Navegación */}
        <nav className="nav-links-menu">
          <button
            className={`nav-link-btn ${vistaActual === 'catalogo' ? 'active' : ''}`}
            onClick={() => setVistaActual('catalogo')}
          >
            🍰 Catálogo
          </button>

          <button
            className={`nav-link-btn ${vistaActual === 'carrito' ? 'active' : ''}`}
            onClick={() => setVistaActual('carrito')}
          >
            🛒 Carrito <span className="cart-badge">{totalItems}</span>
          </button>

          {/* Enlace visible solo con sesión iniciada */}
          {isAuthenticated && (
            <button
              className={`nav-link-btn ${vistaActual === 'mis-pedidos' ? 'active' : ''}`}
              onClick={() => setVistaActual('mis-pedidos')}
            >
              🛍️ Mis Pedidos
            </button>
          )}
        </nav>

        {/* Acciones de Usuario / Autenticación */}
        <div className="nav-user-actions">
          {isAuthenticated ? (
            <div className="user-profile-badge">
              <span className="user-avatar-icon">👤</span>
              <div className="user-text-info">
                <span className="user-name">{user?.nombre || user?.email}</span>
                <span className="user-role-tag">{user?.rol === 'admin' ? '⭐ Admin' : 'Cliente'}</span>
              </div>
              <button className="logout-btn" onClick={logout} title="Cerrar sesión">
                Cerrar sesión 🚪
              </button>
            </div>
          ) : (
            <button className="login-trigger-btn" onClick={() => setIsAuthOpen(true)}>
              🔑 Iniciar Sesión / Registrarse
            </button>
          )}
        </div>
      </header>

      {/* Hero Banner en la vista de catálogo */}
      {vistaActual === 'catalogo' && (
        <section className="hero-section">
          <h2 className="hero-title">¡Date un gusto dulce hoy!</h2>
          <p className="hero-description">
            Elaboramos los mejores postres artesanales con ingredientes seleccionados y recetas tradicionales. ¡Precios accesibles para endulzar tu día!
          </p>
          <span className="hero-banner-tag">🌸 100% Artesanal y Fresco 🌸</span>
        </section>
      )}

      {/* Renderizado de la vista activa */}
      <main className="main-content-wrapper">
        {vistaActual === 'catalogo' && <Catalogo />}
        {vistaActual === 'carrito' && (
          <CarritoPage
            onIrAHistorial={() => setVistaActual('mis-pedidos')}
            onIrACatalogo={() => setVistaActual('catalogo')}
            onAbrirAuth={() => setIsAuthOpen(true)}
          />
        )}
        {vistaActual === 'mis-pedidos' && (
          <MisPedidos onIrACatalogo={() => setVistaActual('catalogo')} />
        )}
      </main>

      {/* Pie de Página Legal (Defensa del Consumidor & Arrepentimiento) */}
      <footer className="site-footer">
        <div className="footer-legal-box">
          <p>
            <strong>Información al Consumidor:</strong> Las compras realizadas en esta plataforma de postres artesanales están reguladas por la Ley N° 24.240 de Defensa del Consumidor y la Ley N° 25.326 de Protección de Datos Personales de la República Argentina. Garantizamos información transparente, productos frescos elaborados bajo normas bromatológicas vigentes, y medios de pago seguros.
          </p>
        </div>

        <div className="footer-legal-links">
          <button className="arrepentimiento-btn" onClick={() => setIsArrepentimientoOpen(true)}>
            Botón de Arrepentimiento (Res. SCI 424/2020)
          </button>
        </div>

        <p className="footer-copy">© 2026 Dulce Vicio S.A. - Todos los derechos reservados.</p>
      </footer>

      {/* Modal de Autenticación */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

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
                <label htmlFor="nombre-revoc">Nombre Completo</label>
                <input
                  id="nombre-revoc"
                  type="text"
                  required
                  value={arrepentimientoForm.nombre}
                  onChange={(e) => setArrepentimientoForm({ ...arrepentimientoForm, nombre: e.target.value })}
                  placeholder="Ej: Valeria Silveira"
                />
              </div>
              <div className="input-group">
                <label htmlFor="email-revoc">Correo Electrónico</label>
                <input
                  id="email-revoc"
                  type="email"
                  required
                  value={arrepentimientoForm.email}
                  onChange={(e) => setArrepentimientoForm({ ...arrepentimientoForm, email: e.target.value })}
                  placeholder="ejemplo@correo.com"
                />
              </div>
              <div className="input-group">
                <label htmlFor="idCompra-revoc">Código/ID de Compra</label>
                <input
                  id="idCompra-revoc"
                  type="text"
                  required
                  value={arrepentimientoForm.idCompra}
                  onChange={(e) => setArrepentimientoForm({ ...arrepentimientoForm, idCompra: e.target.value })}
                  placeholder="Ej: 1"
                />
              </div>
              <div className="input-group">
                <label htmlFor="motivo-revoc">Motivo (Opcional)</label>
                <input
                  id="motivo-revoc"
                  type="text"
                  value={arrepentimientoForm.motivo}
                  onChange={(e) => setArrepentimientoForm({ ...arrepentimientoForm, motivo: e.target.value })}
                  placeholder="Ej: Cambio de decisión"
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

export default function App() {
  return (
    <AuthProvider>
      <CarritoProvider>
        <TiendaApp />
      </CarritoProvider>
    </AuthProvider>
  );
}