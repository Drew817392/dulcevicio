const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const PLACEHOLDER_POSTRE = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=60';

/**
 * Helper para resolver la URL de la imagen de un producto.
 * Concatena VITE_API_URL con producto.imagen_url si existe, o utiliza
 * producto.imagen / placeholder de fallback para evitar que se rompa la grilla.
 */
export function urlImagen(producto) {
  if (!producto) {
    return PLACEHOLDER_POSTRE;
  }

  // 1. Prioridad: imagen_url subida localmente al servidor
  if (producto.imagen_url && typeof producto.imagen_url === 'string') {
    if (producto.imagen_url.startsWith('http://') || producto.imagen_url.startsWith('https://')) {
      return producto.imagen_url;
    }
    const cleanBase = BASE_URL.replace(/\/+$/, '');
    const cleanPath = producto.imagen_url.startsWith('/') ? producto.imagen_url : `/${producto.imagen_url}`;
    return `${cleanBase}${cleanPath}`;
  }

  // 2. Fallback a URL externa guardada previamente en producto.imagen
  if (producto.imagen && typeof producto.imagen === 'string') {
    if (producto.imagen.startsWith('http://') || producto.imagen.startsWith('https://')) {
      return producto.imagen;
    }
    const cleanBase = BASE_URL.replace(/\/+$/, '');
    const cleanPath = producto.imagen.startsWith('/') ? producto.imagen : `/${producto.imagen}`;
    return `${cleanBase}${cleanPath}`;
  }

  // 3. Fallback final por defecto
  return PLACEHOLDER_POSTRE;
}
