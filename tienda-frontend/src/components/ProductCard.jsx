export default function ProductCard({ producto, onAddToCart }) {
  const {
    nombre,
    precio_final,
    cuotas_cantidad,
    cuotas_valor,
    garantia_meses,
    imagen
  } = producto;

  const defaultImage = "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=60";

  return (
    <div className="product-card">
      <span className="product-card-badge">Delicia del Día</span>
      <div style={{ overflow: 'hidden', position: 'relative' }}>
        <img 
          src={imagen || defaultImage} 
          alt={nombre} 
          className="product-card-image"
        />
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

