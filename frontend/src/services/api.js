// Capa de acceso a la API real (Express + Prisma).
// Centraliza URLs, mapeo de campos (ES <-> EN) y manejo de errores.
//
// Contrato (backend/controllers + backend/routes):
//   Producto  -> { id, name, code, category, price, imageUrl, active, stock: {depositId: qty} }
//   Depósito  -> { id, name, location, stockTotal }
//   Stock     -> POST /stock/adjust   { productId, depositId, quantity, type: 'IN'|'OUT'|'ADJUST', reason? }
//               POST /stock/transfer  { productId, fromDepositId, toDepositId, quantity, reason? }
//   Venta     -> POST /sales { depositId, items: [{ productId, quantity }] }  (precio y total los pone el server)
//
// El login sigue en modo demo hasta que exista POST /api/auth/login (ver BACKEND_NOTES.md).

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
  } catch (networkErr) {
    // fetch sólo rechaza por fallo de red / servidor inalcanzable.
    throw networkErr;
  }
  let body = null;
  try { body = await res.json(); } catch { /* respuesta vacía */ }
  if (!res.ok) {
    const msg = body?.error || body?.details || `Error ${res.status} al conectar con la API`;
    throw new ApiError(msg, res.status);
  }
  return body;
}

/* ---------- Mapeo de campos: modelo interno (ES) <-> API (EN) ---------- */

export function productToApi(p) {
  return {
    name: p.nombre,
    code: p.sku,
    price: Number(p.precio),
    category: p.categoria || undefined,
    imageUrl: p.imagen || undefined,
  };
}

export function productFromApi(p) {
  return {
    // String siempre: las rutas usan useParams() (string) — mezclar tipos rompe `p.id === id`.
    id: String(p.id),
    sku: p.code,
    nombre: p.name,
    categoria: p.category || "",
    unidad: p.unidad || "unidad",
    precio: Number(p.price),
    stockMinimo: p.stockMinimo ?? 0,
    descripcion: p.description || "",
    activo: p.active ?? true,
    // stock: { depositId(string): cantidad }  — lo llena el backend en getProducts/getProductById.
    stock: p.stock
      ? Object.fromEntries(Object.entries(p.stock).map(([k, v]) => [String(k), Number(v)]))
      : {},
  };
}

export function depositToApi(d) {
  return { name: d.nombre, location: d.direccion || undefined };
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
    stockTotal: d.stockTotal ?? 0,
  };
}

export function saleFromApi(s) {
  const items = (s.items || []).map((it) => {
    const precio = Number(it.price);
    return {
      productId: String(it.productId),
      nombre: it.product?.name || "Producto eliminado",
      cantidad: it.quantity,
      precio,
      subtotal: precio * it.quantity,
    };
  });
  return {
    numero: String(s.id),
    cliente: "Mostrador",
    depositoId: String(s.depositId),
    metodoPago: "—",
    notas: "",
    fecha: s.createdAt,
    estado: "Completado",
    items,
    total: Number(s.total),
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
    login: () => Promise.reject(new ApiError("El backend todavía no expone POST /api/auth/login.", 501)),
  },
  products: {
    list: (search) => request(`/products${search ? `?search=${encodeURIComponent(search)}` : ""}`),
    get: (id) => request(`/products/${id}`),
    create: (data) => request("/products", { method: "POST", body: JSON.stringify(productToApi(data)) }),
    update: (id, data) => request(`/products/${id}`, { method: "PUT", body: JSON.stringify(productToApi(data)) }),
    remove: (id) => request(`/products/${id}`, { method: "DELETE" }),
  },
  deposits: {
    list: () => request("/deposits"),
    create: (data) => request("/deposits", { method: "POST", body: JSON.stringify(depositToApi(data)) }),
    update: (id, data) => request(`/deposits/${id}`, { method: "PUT", body: JSON.stringify(depositToApi(data)) }),
    stockByDeposit: (id) => request(`/deposits/${id}/stock`),
  },
  stock: {
    byProduct: (productId) => request(`/stock?productId=${encodeURIComponent(productId)}`),
    adjust: (data) => request("/stock/adjust", { method: "POST", body: JSON.stringify(data) }),
    transfer: (data) => request("/stock/transfer", { method: "POST", body: JSON.stringify(data) }),
  },
  sales: {
    list: () => request("/sales"),
    create: (data) =>
      request("/sales", {
        method: "POST",
        body: JSON.stringify({
          depositId: Number(data.depositoId),
          items: data.items.map((it) => ({ productId: Number(it.productId), quantity: it.cantidad })),
        }),
      }),
  },
};

export { ApiError, BASE_URL };
