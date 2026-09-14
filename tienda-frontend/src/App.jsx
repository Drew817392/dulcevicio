import { useState } from 'react';
import './App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CarritoProvider, useCarrito } from './context/CarritoContext';
import Catalogo from './pages/catalogo';
import CarritoPage from './pages/CarritoPage';
import MisPedidos from './pages/MisPedidos';
import Arrepentimiento from './pages/Arrepentimiento';
import MisDatos from './pages/MisDatos';
import AuthModal from './components/AuthModal';
import RutaProtegida from './components/RutaProtegida';

function TiendaApp() {
  const { user, isAuthenticated, logout } = useAuth();
  const { totalItems } = useCarrito();
  const [vistaActual, setVistaActual] = useState('catalogo'); // 'catalogo' | 'carrito' | 'mis-pedidos' | 'arrepentimiento' | 'mis-datos'
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const irA = (vista) => {
    setVistaActual(vista);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-container">
      {/* Barra de navegación superior */}
      <header className="navbar">
        <div className="brand" onClick={() => irA('catalogo')} style={{ cursor: 'pointer' }}>
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
            onClick={() => irA('catalogo')}
          >
            🍰 Catálogo
          </button>

          <button
            className={`nav-link-btn ${vistaActual === 'carrito' ? 'active' : ''}`}
            onClick={() => irA('carrito')}
          >
            🛒 Carrito <span className="cart-badge">{totalItems}</span>
          </button>

          {/* Enlaces visibles solo con sesión iniciada */}
          {isAuthenticated && (
            <>
              <button
                className={`nav-link-btn ${vistaActual === 'mis-pedidos' ? 'active' : ''}`}
                onClick={() => irA('mis-pedidos')}
              >
                🛍️ Mis Pedidos
              </button>

              <button
                className={`nav-link-btn ${vistaActual === 'mis-datos' ? 'active' : ''}`}
                onClick={() => irA('mis-datos')}
              >
                🛡️ Mis Datos
              </button>
            </>
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
            onIrAHistorial={() => irA('mis-pedidos')}
            onIrACatalogo={() => irA('catalogo')}
            onAbrirAuth={() => setIsAuthOpen(true)}
          />
        )}

        {vistaActual === 'mis-pedidos' && (
          <RutaProtegida
            onAbrirAuth={() => setIsAuthOpen(true)}
            onIrACatalogo={() => irA('catalogo')}
          >
            <MisPedidos
              onIrACatalogo={() => irA('catalogo')}
              onAbrirArrepentimiento={() => irA('arrepentimiento')}
            />
          </RutaProtegida>
        )}

        {/* RUTA PÚBLICA (fuera de RutaProtegida) conforme a Disposición 954/2025 */}
        {vistaActual === 'arrepentimiento' && (
          <Arrepentimiento
            onIrACatalogo={() => irA('catalogo')}
            onIrAMisPedidos={() => irA('mis-pedidos')}
            onAbrirAuth={() => setIsAuthOpen(true)}
          />
        )}

        {vistaActual === 'mis-datos' && (
          <RutaProtegida
            onAbrirAuth={() => setIsAuthOpen(true)}
            onIrACatalogo={() => irA('catalogo')}
          >
            <MisDatos onIrACatalogo={() => irA('catalogo')} />
          </RutaProtegida>
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
          {/* Enlace visible en todas las páginas conforme a Disposición 954/2025 y Res. SCI 424/2020 */}
          <button
            className={`arrepentimiento-btn ${vistaActual === 'arrepentimiento' ? 'active' : ''}`}
            onClick={() => irA('arrepentimiento')}
          >
            Botón de Arrepentimiento (Res. SCI 424/2020 & Disp. 954/2025) ↩️
          </button>
        </div>

        <p className="footer-copy">© 2026 Dulce Vicio S.A. - Todos los derechos reservados.</p>
      </footer>

      {/* Modal de Autenticación */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
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