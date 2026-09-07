const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Helper para obtener las cabeceras de autorización
export function authHeaders(extraHeaders = {}) {
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };
}

// Manejador centralizado de respuestas y errores HTTP
export async function manejarRespuesta(res) {
  if (res.status === 401) {
    throw new Error('Tu sesión venció. Por favor, iniciá sesión nuevamente.');
  }

  if (res.status === 409) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Conflicto de stock en el servidor.');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Error ${res.status} al procesar la solicitud`);
  }

  // Si no hay contenido (por ej. 204 No Content)
  if (res.status === 204) return null;

  return res.json();
}

// Obtener catálogo de productos
export async function getProductos({ page = 0, limit = 12, nombre = "" } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (nombre) params.set("nombre", nombre);

  const res = await fetch(`${BASE_URL}/productos/?${params}`);
  return manejarRespuesta(res);
}

// Confirmar y crear pedido en el backend
export async function crearPedido(items) {
  // La regla que no se negocia: Al backend le mandás solo producto_id y cantidad
  const payload = {
    items: items.map((item) => ({
      producto_id: item.id,
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

// Obtener historial de compras del usuario autenticado
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