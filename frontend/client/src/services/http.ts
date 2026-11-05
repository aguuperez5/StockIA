export const API_URL = (import.meta.env.VITE_API_URL ?? "")
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");

export function getAprilTagImageUrl(tagId: number | string, size = 160): string {
  return `${API_URL}/api/apriltags/${tagId}/image?size=${size}`;
}

let memoryToken: string | null = null;

function getSessionToken(): string | null {
  if (memoryToken) return memoryToken;
  try {
    if (typeof window !== "undefined") {
      return window.localStorage?.getItem("stockia_session_token") ?? null;
    }
  } catch {
    // ignore storage errors on iOS private mode
  }
  return null;
}

function setSessionToken(token: string | null) {
  memoryToken = token;
  try {
    if (typeof window !== "undefined") {
      if (token) window.localStorage?.setItem("stockia_session_token", token);
      else window.localStorage?.removeItem("stockia_session_token");
    }
  } catch {
    // ignore storage errors on iOS private mode
  }
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
  const currentToken = getSessionToken();
  try {
    response = await fetch(`${API_URL}/api${normalizedPath}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(
      "No pudimos conectar con StockIA. Revisá tu conexión e intentá nuevamente.",
      0
    );
  }
  const body = await response.json().catch(() => ({}));
  if (body && typeof body.token === "string" && body.token) {
    setSessionToken(body.token);
  } else if (
    normalizedPath === "/auth/logout" ||
    (response.status === 401 && !isAuthEndpoint) ||
    (normalizedPath === "/auth/me" && response.ok && body?.user === null)
  ) {
    setSessionToken(null);
  }
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
