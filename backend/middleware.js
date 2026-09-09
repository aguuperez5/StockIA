import crypto from 'node:crypto';
import prisma from './config/prisma.js';

const SECRET = process.env.SESSION_SECRET || 'stockia-dev-secret-change-me';
const COOKIE = 'stockia_session';

function sign(value) {
  return crypto.createHmac('sha256', SECRET).update(value).digest('base64url');
}

export function createSession(userId) {
  const payload = Buffer.from(JSON.stringify({ userId, exp: Date.now() + 1000 * 60 * 60 * 24 * 7 })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function readSession(req) {
  const raw = req.headers.cookie?.split(';').map(v => v.trim()).find(v => v.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!raw) return null;
  const [payload, signature] = raw.split('.');
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return data.exp > Date.now() ? Number(data.userId) : null;
  } catch { return null; }
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
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`);
}

export function clearSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
}

export function appRole(user) {
  return user.role === 'ADMIN' ? 'administrador' : (user.appRole || 'caja');
}

export function publicUser(user) {
  return { id: user.id, fullName: user.name, email: user.email, appRole: appRole(user) };
}

export function requireAppRole(...roles) { return (req, res, next) => roles.includes(appRole(req.user)) ? next() : res.status(403).json({ message: "No tenés permisos para realizar esta operación." }); };

export const ROLE = Object.freeze({
  ADMIN: 'administrador',
  SALES: 'caja',
  WAREHOUSE: 'deposito',
});
