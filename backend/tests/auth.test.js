import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../config/prisma.js';
import { resetDb } from './helpers.js';
import { register } from '../controllers/auth.controller.js';

function mockRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; }
  };
}

before(async () => { await resetDb(); });
beforeEach(async () => { await resetDb(); });
after(async () => { await prisma.$disconnect(); });

test('registra un usuario válido', async () => {
  const res = mockRes();
  await register({ body: { name: 'Ana Test', email: 'ana@test.com', password: 'password123' } }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.user.name, 'Ana Test');
  assert.equal(res.body.user.email, 'ana@test.com');
  assert.equal(res.body.user.password, undefined); // no debe filtrarse el hash
});

test('rechaza registro sin name', async () => {
  const res = mockRes();
  await register({ body: { email: 'sin-nombre@test.com', password: 'password123' } }, res);
  assert.equal(res.statusCode, 400);
});

test('rechaza registro sin email', async () => {
  const res = mockRes();
  await register({ body: { name: 'Sin Email', password: 'password123' } }, res);
  assert.equal(res.statusCode, 400);
});

test('rechaza registro sin password', async () => {
  const res = mockRes();
  await register({ body: { name: 'Sin Password', email: 'sinpass@test.com' } }, res);
  assert.equal(res.statusCode, 400);
});

test('rechaza campos que son solo espacios en blanco', async () => {
  const res = mockRes();
  await register({ body: { name: '   ', email: 'espacios@test.com', password: 'password123' } }, res);
  assert.equal(res.statusCode, 400);
});

test('rechaza campos con tipo de dato inválido', async () => {
  const res = mockRes();
  await register({ body: { name: 12345, email: 'tipo-invalido@test.com', password: 'password123' } }, res);
  assert.equal(res.statusCode, 400);
});

test('rechaza email con formato inválido', async () => {
  const res = mockRes();
  await register({ body: { name: 'Email Invalido', email: 'no-es-un-email', password: 'password123' } }, res);
  assert.equal(res.statusCode, 400);
});

test('normaliza espacios y mayúsculas del email antes de guardarlo', async () => {
  const res = mockRes();
  await register({ body: { name: '  Con Espacios  ', email: '  con-espacios@test.com  ', password: 'password123' } }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.user.name, 'Con Espacios');
  assert.equal(res.body.user.email, 'con-espacios@test.com');
});

test('rechaza registro con email ya existente', async () => {
  const first = mockRes();
  await register({ body: { name: 'Primero', email: 'duplicado@test.com', password: 'password123' } }, first);
  assert.equal(first.statusCode, 201);

  const second = mockRes();
  await register({ body: { name: 'Segundo', email: 'duplicado@test.com', password: 'otraPassword' } }, second);
  assert.equal(second.statusCode, 400);
});
