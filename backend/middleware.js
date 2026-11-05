import jwt from 'jsonwebtoken';
import prisma from './config/prisma.js';

const DEFAULT_SECRET = 'stockia-dev-secret-change-me';
export const SESSION_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || DEFAULT_SECRET;

/**
 * Validates that production environments do not use default or empty secrets.
 */
export function validateProductionSecret() {
  if (process.env.NODE_ENV === 'production') {
    const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET;
    if (!secret || secret === DEFAULT_SECRET || secret.trim().length < 16) {
      throw new Error('FATAL: En producción se debe configurar SESSION_SECRET o JWT_SECRET con un valor seguro diferente al predeterminado.');
    }
  }
}

validateProductionSecret();

const COOKIE = 'stockia_session';

/**
 * Creates a real JWT token with HS256 algorithm and 7-day expiration.
 * Minimal payload contains userId.
 */
export function createSession(userId) {
  return jwt.sign({ userId: Number(userId) }, SESSION_SECRET, {
    algorithm: 'HS256',
    expiresIn: '7d',
  });
}

/**
 * Reads and verifies JWT from the HttpOnly session cookie.
 * Returns numeric userId if valid, or null if expired/tampered/missing.
 */
export function readSession(req) {
  const raw = req.headers.cookie
    ?.split(';')
    .map(v => v.trim())
    .find(v => v.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);

  if (!raw) return null;

  try {
    const decoded = jwt.verify(raw, SESSION_SECRET, { algorithms: ['HS256'] });
    return typeof decoded === 'object' && decoded.userId ? Number(decoded.userId) : null;
  } catch {
    return null;
  }
}

export async function requireAuth(req, res, next) {
  try {
    const userId = readSession(req);
    if (!userId) return res.status(401).json({ message: 'Tu sesión no es válida o expiró.' });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(401).json({ message: 'Tu sesión no es válida o expiró.' });
    req.user = user;
    next();
  } catch (e) {
    res.status(500).json({ message: 'No pudimos validar la sesión.', details: e.message });
  }
}

export function setSession(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  const secure = isProd ? '; Secure' : '';
  const sameSite = isProd ? 'SameSite=None' : 'SameSite=Lax';
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; Path=/; ${sameSite}; Max-Age=604800${secure}`);
}

export function clearSession(res) {
  const isProd = process.env.NODE_ENV === 'production';
  const secure = isProd ? '; Secure' : '';
  const sameSite = isProd ? 'SameSite=None' : 'SameSite=Lax';
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; Path=/; ${sameSite}; Max-Age=0${secure}`);
}

export function appRole(user) {
  return user.role === 'ADMIN' ? 'administrador' : (user.appRole || 'caja');
}

export function publicUser(user) {
  return { id: user.id, fullName: user.name, legajo: user.legajo || '', email: user.email, appRole: appRole(user) };
}

export function requireAppRole(...roles) {
  return (req, res, next) =>
    roles.includes(appRole(req.user))
      ? next()
      : res.status(403).json({ message: 'No tenés permisos para realizar esta operación.' });
}

export const ROLE = Object.freeze({
  ADMIN: 'administrador',
  SALES: 'caja',
  WAREHOUSE: 'deposito',
});

const loginAttempts = new Map();

export function resetLoginAttempts(key) {
  if (key) {
    loginAttempts.delete(key.trim().toLowerCase());
  }
}

export function rateLimitLogin(req, res, next) {
  const key = req.body?.email?.trim().toLowerCase() || req.ip;
  const now = Date.now();
  const entry = loginAttempts.get(key) || { count: 0, windowStart: now };
  if (now - entry.windowStart > 15 * 60 * 1000) {
    entry.count = 0;
    entry.windowStart = now;
  }
  entry.count += 1;
  loginAttempts.set(key, entry);
  if (entry.count > 8) return res.status(429).json({ message: 'Demasiados intentos. Probá de nuevo en unos minutos.' });
  next();
}