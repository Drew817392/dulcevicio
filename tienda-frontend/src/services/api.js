const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Helper para obtener las cabeceras con token JWT si existe en localStorage
 */
export function authHeaders(extraHeaders = {}) {
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };
}

/**
 * Manejador centralizado de respuestas HTTP:
 * - 401: Sesión expirada o no autorizada ("Tu sesión venció").
 * - 409: Conflicto devuelto por la API (ej: falta de stock o revocación fuera de plazo / duplicada).
 * - Resto de errores: Mensaje descriptivo con detail o fallback genérico.
 */
export async function manejarRespuesta(res) {
  if (res.status === 401) {
    // Limpiar almacenamiento si la sesión venció
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    throw new Error('Tu sesión venció');
  }

  if (res.status === 409) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Conflicto al procesar la solicitud en el servidor.');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Ocurrió un error inesperado al procesar la solicitud.');
  }

  if (res.status === 204) return null;

  return res.json();
}

/**
 * Obtener catálogo paginado y filtrado de productos
 */
export async function getProductos({ page = 0, limit = 12, nombre = "" } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (nombre) params.set("nombre", nombre);

  const res = await fetch(`${BASE_URL}/productos/?${params}`);
  return manejarRespuesta(res);
}

/**
 * Crear un nuevo producto en el catálogo (Requiere rol Admin)
 */
export async function crearProducto(productoData) {
  const res = await fetch(`${BASE_URL}/productos/`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(productoData),
  });

  if (res.status === 401) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    throw new Error('Tu sesión venció');
  }

  if (res.status === 403) {
    throw new Error('No tienes permisos de administrador para crear productos.');
  }

  return manejarRespuesta(res);
}

/**
 * Actualizar un producto existente en el catálogo (Requiere rol Admin)
 */
export async function actualizarProducto(productoId, productoData) {
  const res = await fetch(`${BASE_URL}/productos/${productoId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(productoData),
  });

  if (res.status === 401) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    throw new Error('Tu sesión venció');
  }

  if (res.status === 403) {
    throw new Error('No tienes permisos de administrador para editar productos.');
  }

  return manejarRespuesta(res);
}

/**
 * Obtener todas las órdenes de todos los clientes (Requiere rol Admin)
 */
export async function getTodosLosPedidosAdmin() {
  const res = await fetch(`${BASE_URL}/pedidos/admin/todos`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (res.status === 401) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    throw new Error('Tu sesión venció');
  }

  if (res.status === 403) {
    throw new Error('No tienes permisos de administrador para consultar las órdenes de todos los clientes.');
  }

  return manejarRespuesta(res);
}



/**
 * REGLA DE ORO BACKEND: Al backend NUNCA se le envían nombres, precios ni totales calculados.
 * Solo acepta el array de ítems con producto_id y cantidad.
 * Formato estricto: { "items": [ { "producto_id": X, "cantidad": Y } ] }
 */
export async function crearPedido(items) {
  const payload = {
    items: items.map((item) => ({
      producto_id: item.id || item.producto_id,
      cantidad: item.cantidad,
    })),
  };

  const res = await fetch(`${BASE_URL}/pedidos/`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  return manejarRespuesta(res);
}

/**
 * Obtener historial de pedidos del usuario autenticado
 */
export async function getMisPedidos() {
  const res = await fetch(`${BASE_URL}/pedidos/mis-pedidos`, {
    method: 'GET',
    headers: authHeaders(),
  });

  return manejarRespuesta(res);
}

/**
 * Revocar compra (Botón de Arrepentimiento - Res. SCI 424/2020 y Disp. 954/2025)
 */
export async function revocarPedido(pedidoId) {
  const res = await fetch(`${BASE_URL}/pedidos/${pedidoId}/revocacion`, {
    method: 'POST',
    headers: authHeaders(),
  });

  return manejarRespuesta(res);
}

// --- Usuarios & Privacidad (Ley N° 25.326) ---

/**
 * Obtener datos personales del usuario autenticado (Derecho de Acceso)
 */
export async function getMisDatos() {
  const res = await fetch(`${BASE_URL}/usuarios/me/datos`, {
    method: 'GET',
    headers: authHeaders(),
  });

  return manejarRespuesta(res);
}

/**
 * Exportar y descargar datos personales y compras en formato JSON (Portabilidad)
 */
export async function exportarMisDatos() {
  const res = await fetch(`${BASE_URL}/usuarios/me/exportar`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (res.status === 401) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    throw new Error('Tu sesión venció');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Error al exportar datos personales.');
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mis_datos_dulce_vicio_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
  return true;
}

/**
 * Solicitar baja lógica y anonimización de la cuenta (Derecho de Supresión)
 */
export async function darDeBajaCuenta() {
  const res = await fetch(`${BASE_URL}/usuarios/me`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  return manejarRespuesta(res);
}

// --- Autenticación ---

export async function loginUser(email, password) {
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', password);

  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  if (res.status === 401) {
    throw new Error('Credenciales incorrectas');
  }

  return manejarRespuesta(res);
}

export async function registerUser({ nombre, email, password, acepto_tratamiento }) {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ nombre, email, password, acepto_tratamiento }),
  });

  return manejarRespuesta(res);
}

export async function getMe() {
  const res = await fetch(`${BASE_URL}/auth/me`, {
    method: 'GET',
    headers: authHeaders(),
  });

  return manejarRespuesta(res);
}

/**
 * Subir imagen de producto (Admin - Clase 10)
 * - Usa FormData con el campo 'archivo'.
 * - NO incluye 'Content-Type' manualmente (el navegador añade el boundary).
 * - Incluye únicamente la cabecera Authorization si hay token.
 * - Traduce respuestas 403, 404, 413, 415.
 */
export async function subirImagenProducto(productoId, file) {
  const token = localStorage.getItem('access_token');
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const formData = new FormData();
  formData.append('archivo', file);

  const res = await fetch(`${BASE_URL}/productos/${productoId}/imagen`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (res.status === 401) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    throw new Error('Tu sesión venció');
  }

  if (res.status === 403) {
    throw new Error('No tienes permisos de administrador para realizar esta acción.');
  }

  if (res.status === 404) {
    throw new Error('El producto no fue encontrado en el catálogo.');
  }

  if (res.status === 413) {
    throw new Error('El archivo supera el límite máximo permitido de 2 MB.');
  }

  if (res.status === 415) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Formato de imagen no soportado o archivo corrupto (solo JPG, PNG y WebP reales).');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Ocurrió un error al subir la imagen del producto.');
  }

  return res.json();
}