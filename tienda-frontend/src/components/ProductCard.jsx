import { urlImagen } from '../utils/imagenes';
import { useAuth } from '../context/AuthContext';

export default function ProductCard({ producto, onAddToCart, onEditarImagen, onEditarProducto }) {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'admin';

  const {
    nombre,
    precio_final,
    cuotas_cantidad,
    cuotas_valor,
    garantia_meses,
    stock,
  } = producto;

  const handleEditClick = () => {
    if (onEditarProducto) {
      onEditarProducto(producto);
    } else if (onEditarImagen) {
      onEditarImagen(producto);
    }
  };

  return (
    <div className="product-card">
      <span className="product-card-badge">
        {stock !== undefined && stock <= 0 ? '⚠️ Sin stock' : 'Delicia del Día'}
      </span>
      
      {/* Contenedor de imagen con aspect-square u object-cover */}
      <div className="product-card-image-wrapper aspect-square" style={{ overflow: 'hidden', position: 'relative' }}>
        <img 
          src={urlImagen(producto)} 
          alt={nombre} 
          loading="lazy"
          className="product-card-image object-cover"
        />
        {isAdmin && (onEditarProducto || onEditarImagen) && (
          <button
            type="button"
            className="admin-edit-image-btn"
            onClick={handleEditClick}
            title="Editar producto y foto (Admin)"
          >
            ✏️ Editar Producto
          </button>
        )}
      </div>


      <div className="product-card-content">
        <h3 className="product-card-title">{nombre}</h3>
        
        <div className="product-card-price-container">
          <span className="product-card-price">
            ${precio_final ? precio_final.toLocaleString('es-AR', { minimumFractionDigits: 0 }) : '0'}
          </span>
          <span className="product-card-price-sub">¡Precio Bajo!</span>
        </div>

        {cuotas_cantidad > 0 && cuotas_valor > 0 && (
          <p className="product-card-installments">
            💳 {cuotas_cantidad} cuotas sin interés de ${cuotas_valor.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
          </p>
        )}

        {garantia_meses > 0 && (
          <p className="product-card-warranty">
            🛡️ Garantía: {garantia_meses} {garantia_meses === 1 ? 'mes' : 'meses'}
          </p>
        )}

        <button 
          className="product-card-button"
          onClick={() => onAddToCart(producto)}
        >
          Agregar al carrito 🍰
        </button>
      </div>
    </div>
  );
}


