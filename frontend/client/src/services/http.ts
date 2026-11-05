export const API_URL = (import.meta.env.VITE_API_URL ?? "")
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");

export function getAprilTagImageUrl(tagId: number | string, size = 160): string {
  return `${API_URL}/api/apriltags/${tagId}/image?size=${size}`;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  // /auth/me es un chequeo rutinario de sesión (devuelve 200 con user:null si no hay
  // sesión) y /auth/login devuelve 401 ante credenciales inválidas: ninguno de los
  // dos debe disparar el logout global.
  const isAuthEndpoint =
    normalizedPath === "/auth/me" ||
    normalizedPath === "/auth/login" ||
    normalizedPath === "/users/register";
  try {
    response = await fetch(`${API_URL}/api${normalizedPath}`, {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
  } catch {
    throw new ApiError(
      "No pudimos conectar con StockIA. Revisá tu conexión e intentá nuevamente.",
      0
    );
  }
  const body = await response.json().catch(() => ({}));
  if (response.status === 401 && !isAuthEndpoint)
    window.dispatchEvent(new Event("stockia:unauthorized"));
  if (!response.ok)
    throw new ApiError(
      body.message ?? "No pudimos completar la operación.",
      response.status
    );
  return body as T;
}

export const get = <T>(path: string) => api<T>(path);
export const post = <T>(path: string, data: unknown) =>
  api<T>(path, { method: "POST", body: JSON.stringify(data) });
export const put = <T>(path: string, data: unknown) =>
  api<T>(path, { method: "PUT", body: JSON.stringify(data) });
export const patch = <T>(path: string, data: unknown) =>
  api<T>(path, { method: "PATCH", body: JSON.stringify(data) });
export const del = <T>(path: string) => api<T>(path, { method: "DELETE" });
export const remove = <T>(path: string) => api<T>(path, { method: "DELETE" });
