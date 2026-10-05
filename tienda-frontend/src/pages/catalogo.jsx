import { useState, useEffect } from 'react';
import { getProductos } from '../services/api';
import { useCarrito } from '../context/CarritoContext';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';
import AdminEditarProductoModal from '../components/AdminEditarProductoModal';
import AdminNuevoProductoModal from '../components/AdminNuevoProductoModal';

export default function Catalogo({ onAddToCart }) {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'admin';
  const { agregar } = useCarrito();
  const [productos, setProductos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [busqueda, setBusqueda] = useState('');
  const [mensajeToast, setMensajeToast] = useState(null);
  const [productoAEditar, setProductoAEditar] = useState(null);
  const [isCrearModalOpen, setIsCrearModalOpen] = useState(false);
  const limit = 6; // Límite amigable para catálogo con paginación fluida

  const cargarProductos = () => {
    setIsLoading(true);
    setError(null);
    getProductos({ page, limit, nombre: busqueda })
      .then((data) => {
        setProductos(data);
      })
      .catch((err) => {
        setError(err.message || 'No pudimos cargar los productos.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    cargarProductos();
  }, [page, busqueda]);

  const handleAddToCart = (producto) => {
    if (onAddToCart) {
      onAddToCart(producto);
    } else {
      agregar(producto, 1);
    }
    setMensajeToast(`¡Agregaste "${producto.nombre}" al carrito! 🍰`);
    setTimeout(() => {
      setMensajeToast(null);
    }, 2500);
  };

  const handleProductoActualizado = (productoActualizado) => {
    setProductos((prev) =>
      prev.map((p) => (p.id === productoActualizado.id ? { ...p, ...productoActualizado } : p))
    );
    setMensajeToast(`¡Producto "${productoActualizado.nombre}" actualizado con éxito! ✨`);
    setTimeout(() => {
      setMensajeToast(null);
    }, 3000);
  };

  const handleProductoCreado = (nuevoProducto) => {
    setMensajeToast(`¡Producto "${nuevoProducto.nombre}" publicado con éxito! 🧁`);
    setPage(0);
    setBusqueda('');
    cargarProductos();
    setTimeout(() => {
      setMensajeToast(null);
    }, 3500);
  };

  return (
    <div className="catalog-container">
      {/* Notificación flotante de producto agregado / actualizado */}
      {mensajeToast && (
        <div className="cart-toast-notification">
          {mensajeToast}
        </div>
      )}

      {/* Barra superior de acciones del catálogo */}
      <div className="catalog-header-actions">
        <div className="search-bar-container">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Buscar postres exquisitos..."
            value={busqueda}
            onChange={(e) => {
              setPage(0);
              setBusqueda(e.target.value);
            }}
          />
        </div>

        {isAdmin && (
          <button
            type="button"
            className="admin-btn-nuevo-producto"
            onClick={() => setIsCrearModalOpen(true)}
            title="Subir nuevo producto al catálogo"
          >
            ✨ + Subir Nuevo Producto
          </button>
        )}
      </div>

      {/* Cuerpo del catálogo */}
      {isLoading ? (
        <div className="catalog-loading">
          <div className="spinner"></div>
          <p style={{ fontWeight: 600, fontSize: '1.2rem', marginBottom: '8px' }}>🍰 Preparando nuestras dulzuras artesanales...</p>
          <div style={{
            maxWidth: '520px',
            margin: '12px auto 0',
            padding: '10px 16px',
            background: 'rgba(255, 230, 240, 0.7)',
            borderRadius: '12px',
            border: '1px solid rgba(220, 100, 150, 0.25)',
            fontSize: '0.9rem',
            color: '#703050',
            lineHeight: '1.4'
          }}>
            <span>⏳ <strong>Aviso de primer inicio:</strong> Si el backend estuvo inactivo (Plan Free de Render), puede demorar aproximadamente 45-60 segundos en despertar. ¡Gracias por la paciencia!</span>
          </div>
        </div>
      ) : error ? (
        <div className="catalog-error">
          <div className="error-card">
            <span className="error-icon">⚠️</span>
            <h3 className="error-title">No se pudieron cargar los productos</h3>
            <p className="error-text">{error}</p>
            <button className="retry-btn" onClick={cargarProductos}>
              🔄 Reintentar
            </button>
          </div>
        </div>
      ) : productos.length === 0 ? (
        <div className="catalog-empty">
          <p>No se encontraron delicias que coincidan con tu búsqueda 🧁</p>
        </div>
      ) : (
        <>
          <div className="product-grid">
            {productos.map((producto) => (
              <ProductCard 
                key={producto.id} 
                producto={producto} 
                onAddToCart={handleAddToCart}
                onEditarProducto={(p) => setProductoAEditar(p)}
              />
            ))}
          </div>

          {/* Botones de página */}
          <div className="pagination-container">
            <button 
              className="pagination-btn"
              disabled={page === 0} 
              onClick={() => setPage((prev) => prev - 1)}
            >
              ← Anterior
            </button>
            <span className="pagination-info">Página {page + 1}</span>
            <button 
              className="pagination-btn"
              disabled={productos.length < limit} 
              onClick={() => setPage((prev) => prev + 1)}
            >
              Siguiente →
            </button>
          </div>
        </>
      )}

      {/* Modal de edición completa de producto para Administradores */}
      <AdminEditarProductoModal
        isOpen={Boolean(productoAEditar)}
        producto={productoAEditar}
        onClose={() => setProductoAEditar(null)}
        onProductoActualizado={handleProductoActualizado}
      />

      {/* Modal para crear y subir nuevo producto (Admin) */}
      <AdminNuevoProductoModal
        isOpen={isCrearModalOpen}
        onClose={() => setIsCrearModalOpen(false)}
        onProductoCreado={handleProductoCreado}
      />
    </div>
  );
}