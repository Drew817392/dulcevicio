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
 * - 409: Conflicto de stock dinámico enviado desde el backend.
 * - Resto de errores: Mensaje genérico descriptivo.
 */
export async function manejarRespuesta(res) {
  if (res.status === 401) {
    throw new Error('Tu sesión venció');
  }

  if (res.status === 409) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Conflicto de stock en el servidor.');
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