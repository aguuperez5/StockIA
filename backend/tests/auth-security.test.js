import { test, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import {
  createSession,
  readSession,
  requireAuth,
  requireAppRole,
  setSession,
  clearSession,
  ROLE,
  SESSION_SECRET,
  resetLoginAttempts,
  rateLimitLogin,
} from '../middleware.js';
import { login, me, logout } from '../controllers/integration.controller.js';
import { resetDb, createUser, createProduct, createDeposit } from './helpers.js';

function mockRes() {
  const headers = {};
  return {
    statusCode: 200,
    body: undefined,
    headers,
    setHeader(name, val) {
      headers[name.toLowerCase()] = val;
    },
    getHeader(name) {
      return headers[name.toLowerCase()];
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

beforeEach(resetDb);
after(async () => prisma.$disconnect());

test('login exitoso: setea cookie HttpOnly y devuelve datos de usuario', async () => {
  const passwordHash = await bcrypt.hash('clave123', 10);
  const user = await createUser({
    email: 'caja1@stockia.com',
    password: passwordHash,
    appRole: 'caja',
    name: 'Cajero Uno',
  });

  const res = mockRes();
  await login(
    { body: { email: 'CAJA1@stockia.com', password: 'clave123' }, ip: '127.0.0.1' },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.message, 'Sesión iniciada.');
  assert.equal(res.body.user.email, 'caja1@stockia.com');
  assert.equal(res.body.user.appRole, 'caja');

  const cookie = res.getHeader('set-cookie');
  assert.ok(cookie, 'Debe incluir Set-Cookie');
  assert.match(cookie, /stockia_session=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Max-Age=604800/);
});

test('login con credenciales inválidas devuelve 401 y no setea sesión', async () => {
  const passwordHash = await bcrypt.hash('correcta', 10);
  await createUser({ email: 'usuario@stockia.com', password: passwordHash });

  // Wrong password
  const resBadPass = mockRes();
  await login({ body: { email: 'usuario@stockia.com', password: 'incorrecta' } }, resBadPass);
  assert.equal(resBadPass.statusCode, 401);
  assert.equal(resBadPass.body.message, 'Email o contraseña incorrectos.');
  assert.equal(resBadPass.getHeader('set-cookie'), undefined);

  // Non-existent user
  const resBadUser = mockRes();
  await login({ body: { email: 'noexiste@stockia.com', password: 'cualquiera' } }, resBadUser);
  assert.equal(resBadUser.statusCode, 401);
});

test('/auth/me responde con usuario autenticado si hay sesión válida y 401 si no', async () => {
  const user = await createUser({ email: 'authed@stockia.com', appRole: 'administrador' });
  const validToken = createSession(user.id);

  // Sin sesión
  const reqNoSession = { headers: {} };
  const resNoSession = mockRes();
  let nextCalled = false;
  await requireAuth(reqNoSession, resNoSession, () => { nextCalled = true; });
  assert.equal(resNoSession.statusCode, 401);
  assert.equal(nextCalled, false);

  // Con sesión válida
  const reqValid = { headers: { cookie: `stockia_session=${validToken}` } };
  const resValid = mockRes();
  nextCalled = false;
  await requireAuth(reqValid, resValid, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.ok(reqValid.user);
  assert.equal(reqValid.user.id, user.id);

  // Endpoint me
  const resMe = mockRes();
  await me(reqValid, resMe);
  assert.equal(resMe.statusCode, 200);
  assert.equal(resMe.body.user.email, 'authed@stockia.com');
  assert.equal(resMe.body.user.appRole, 'administrador');
});

test('logout limpia la cookie de sesión', async () => {
  const res = mockRes();
  await logout({}, res);
  assert.equal(res.statusCode, 200);
  const cookie = res.getHeader('set-cookie');
  assert.ok(cookie);
  assert.match(cookie, /Max-Age=0/);
});

test('seguridad: cookie manipulada o firma inválida es rechazada con 401', async () => {
  const user = await createUser({ email: 'tamper@stockia.com' });
  const validToken = createSession(user.id);
  const tamperedToken = `${validToken.slice(0, -6)}XXXXXX`;

  const req = { headers: { cookie: `stockia_session=${tamperedToken}` } };
  const res = mockRes();
  let nextCalled = false;
  await requireAuth(req, res, () => { nextCalled = true; });

  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test('seguridad: token JWT expirado es rechazado con 401', async () => {
  const user = await createUser({ email: 'expired@stockia.com' });
  // Generate expired token with negative exp
  const expiredToken = jwt.sign(
    { userId: user.id, exp: Math.floor(Date.now() / 1000) - 3600 },
    SESSION_SECRET,
    { algorithm: 'HS256' }
  );

  const req = { headers: { cookie: `stockia_session=${expiredToken}` } };
  const res = mockRes();
  let nextCalled = false;
  await requireAuth(req, res, () => { nextCalled = true; });

  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test('rate limit: intentos exitosos resetean el contador de intentos fallidos', async () => {
  const email = 'ratelimit@stockia.com';
  resetLoginAttempts(email);

  // Generate 7 failed attempts
  for (let i = 0; i < 7; i++) {
    const req = { body: { email }, ip: '127.0.0.1' };
    const res = mockRes();
    let next = false;
    rateLimitLogin(req, res, () => { next = true; });
    assert.equal(next, true);
  }

  // Reset attempts on successful auth
  resetLoginAttempts(email);

  // Next attempt should NOT be blocked (would have been 8th and blocked without reset)
  const reqAfterReset = { body: { email }, ip: '127.0.0.1' };
  const resAfterReset = mockRes();
  let nextAfterReset = false;
  rateLimitLogin(reqAfterReset, resAfterReset, () => { nextAfterReset = true; });
  assert.equal(nextAfterReset, true);
  assert.equal(resAfterReset.statusCode, 200);
});

test('matriz de acceso por rol: verifica permisos permitidos (200/201) y denegados (403)', async () => {
  const adminUser = { appRole: 'administrador', role: 'ADMIN' };
  const cajaUser = { appRole: 'caja', role: 'USER' };
  const depositoUser = { appRole: 'deposito', role: 'USER' };

  function checkAccess(user, allowedRoles) {
    const middleware = requireAppRole(...allowedRoles);
    const req = { user };
    const res = mockRes();
    let nextCalled = false;
    middleware(req, res, () => { nextCalled = true; });
    return nextCalled ? 200 : res.statusCode;
  }

  // 1. Alta de productos: solo administrador
  assert.equal(checkAccess(adminUser, [ROLE.ADMIN]), 200, 'Admin puede crear productos');
  assert.equal(checkAccess(cajaUser, [ROLE.ADMIN]), 403, 'Caja no puede crear productos');
  assert.equal(checkAccess(depositoUser, [ROLE.ADMIN]), 403, 'Depósito no puede crear productos');

  // 2. Ventas: administrador y caja
  assert.equal(checkAccess(adminUser, [ROLE.ADMIN, ROLE.SALES]), 200, 'Admin puede vender');
  assert.equal(checkAccess(cajaUser, [ROLE.ADMIN, ROLE.SALES]), 200, 'Caja puede vender');
  assert.equal(checkAccess(depositoUser, [ROLE.ADMIN, ROLE.SALES]), 403, 'Depósito no puede vender');

  // 3. Transferencias y ajustes: administrador y depósito
  assert.equal(checkAccess(adminUser, [ROLE.ADMIN, ROLE.WAREHOUSE]), 200, 'Admin puede transferir');
  assert.equal(checkAccess(depositoUser, [ROLE.ADMIN, ROLE.WAREHOUSE]), 200, 'Depósito puede transferir');
  assert.equal(checkAccess(cajaUser, [ROLE.ADMIN, ROLE.WAREHOUSE]), 403, 'Caja no puede transferir');
});
