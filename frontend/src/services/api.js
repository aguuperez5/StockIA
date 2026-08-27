// Capa de acceso a la API real (Express + Prisma) que hicieron tus compañeros.
// Centraliza URLs, mapeo de campos (ES <-> EN) y manejo de errores.
//
// Contrato relevado desde backend/controllers y backend/routes:
//   Producto  -> { name, code, price, category, imageUrl }
//   Depósito  -> { name, location }
//   Venta     -> { depositId, items: [{ productId, quantity, price }], total }
//   Ajuste    -> { productId, depositId, quantity, type: 'IN' | 'OUT' }
//
// El backend ya arranca y persiste correctamente. Sigue faltando
// POST /api/auth/login del lado del servidor — ver BACKEND_NOTES.md.
// Mientras eso no esté resuelto, el login sigue en modo demo (ver AuthPage).
// El resto de las operaciones (alta/edición de producto, depósito, venta)
// pegan contra la API real; solo caen a datos mock si el servidor es
// inalcanzable (no si el servidor responde rechazando la operación —
// ver ApiError y su uso en AppDataContext).

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  let body = null;
  try { body = await res.json(); } catch { /* respuesta vacía */ }
  if (!res.ok) {
    throw new ApiError(body?.error || `Error ${res.status} al conectar con la API`, res.status);
  }
  return body;
}

/* ---------- Mapeo de campos: nuestro modelo interno (ES) <-> API (EN) ---------- */

export function productToApi(p) {
  return { name: p.nombre, code: p.sku, price: Number(p.precio), category: p.categoria, imageUrl: p.imagen || undefined };
}

export function productFromApi(p) {
  return {
    // String siempre: los IDs mock del modo demo son strings ("prod-1") y las
    // rutas usan useParams() (siempre string) — mezclar tipos rompe `p.id === id`.
    id: String(p.id),
    sku: p.code,
    nombre: p.name,
    categoria: p.category,
    unidad: p.unidad || "unidad",
    precio: Number(p.price),
    stockMinimo: p.stockMinimo ?? 0,
    descripcion: p.description || "",
    stock: p.stock || {},
  };
}

export function depositToApi(d) {
  return { name: d.nombre, location: d.direccion };
}

export function depositFromApi(d) {
  return {
    id: String(d.id),
    nombre: d.name,
    tipo: d.tipo || "Secundario",
    direccion: d.location || "",
    responsable: d.responsable || "",
    capacidad: d.capacidad ?? null,
    telefono: d.telefono || "",
  };
}

export function saleToApi(sale) {
  return {
    depositId: sale.depositoId,
    total: sale.total,
    items: sale.items.map(it => ({ productId: it.productId, quantity: it.cantidad, price: it.precio })),
  };
}

/* ---------- Endpoints ---------- */

export const api = {
  auth: {
    register: (data) =>
      request("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name: data.nombre, email: data.email, password: data.password }),
      }),
    login: (data) =>
      request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: data.email, password: data.password }),
      }),
  },
  products: {
    list: (search) => request(`/products${search ? `?search=${encodeURIComponent(search)}` : ""}`),
    create: (data) => request("/products", { method: "POST", body: JSON.stringify(productToApi(data)) }),
    update: (id, data) => request(`/products/${id}`, { method: "PUT", body: JSON.stringify(productToApi(data)) }),
  },
  deposits: {
    list: () => request("/deposits"),
    create: (data) => request("/deposits", { method: "POST", body: JSON.stringify(depositToApi(data)) }),
    stockByDeposit: (id) => request(`/deposits/${id}/stock`),
  },
  stock: {
    adjust: (data) => request("/stock/adjust", { method: "POST", body: JSON.stringify(data) }),
  },
  sales: {
    list: () => request("/sales"),
    create: (data) => request("/sales", { method: "POST", body: JSON.stringify(saleToApi(data)) }),
  },
};

export { ApiError, BASE_URL };
