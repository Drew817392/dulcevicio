import { useState, useEffect } from 'react';
import { getProductos } from '../services/api';
import ProductCard from '../components/ProductCard';

export default function Catalogo({ onAddToCart }) {
  const [productos, setProductos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [busqueda, setBusqueda] = useState('');
  const limit = 2; // Mostrar 2 productos por página para facilitar la prueba de paginación

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

  return (
    <div className="catalog-container">
      {/* Buscador de productos */}
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

      {/* Cuerpo del catálogo */}
      {isLoading ? (
        <div className="catalog-loading">
          <div className="spinner"></div>
          <p>Preparando nuestras dulzuras artesanales...</p>
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
                onAddToCart={onAddToCart} 
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
    </div>
  );
}
