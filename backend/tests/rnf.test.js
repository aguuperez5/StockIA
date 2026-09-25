import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import prisma from '../config/prisma.js';
import { resetDb, createProduct, createDeposit } from './helpers.js';
import { createSale } from '../controllers/sale.controller.js';
import { requireAuth, requireAppRole, ROLE } from '../middleware.js';
import { recognition } from '../controllers/integration.controller.js';

// Helper para simular req/res de Express
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

// =========================================================================
// CP-RNF-01: Rendimiento - Tiempo de respuesta API REST (< 2000 ms)
// =========================================================================
test('CP-RNF-01: Rendimiento - Confirmación de venta debe responder en menos de 2000 ms', async () => {
    const deposit = await createDeposit();
    const product = await createProduct({ price: 150 });
    const user = await prisma.user.create({
        data: { name: 'Cajero Test', email: `caja-${Date.now()}@test.com`, password: 'password123' }
    });
    await prisma.stock.create({
        data: { productId: product.id, depositId: deposit.id, quantity: 50 }
    });

    const req = {
        body: {
            depositId: deposit.id,
            items: [{ productId: product.id, quantity: 2 }]
        },
        user: { id: user.id }
    };
    const res = mockRes();

    // Medición de tiempo de ejecución
    const start = performance.now();
    await createSale(req, res);
    const durationMs = performance.now() - start;

    // Verificaciones
    assert.equal(res.statusCode, 201, `La venta debió confirmarse con 201. Recibido: ${res.statusCode} - ${JSON.stringify(res.body)}`);
    assert.ok(
        durationMs < 2000,
        `El tiempo de respuesta fue de ${durationMs.toFixed(2)} ms, superando el límite de 2000 ms`
    );
    console.log(`⏱️ [CP-RNF-01] Tiempo de respuesta obtenido: ${durationMs.toFixed(2)} ms`);
});

// =========================================================================
// CP-RNF-02: Consistencia Transaccional - Concurrencia de stock
// =========================================================================
test('CP-RNF-02: Concurrencia - 2 ventas simultáneas con stock=1: una pasa y la otra se rechaza', async () => {
    const deposit = await createDeposit();
    const product = await createProduct({ price: 200 });
    const user = await prisma.user.create({
        data: { name: 'Cajero Concurrente', email: `caja-concurr-${Date.now()}@test.com`, password: 'password123' }
    });

    // Precondición: Stock disponible = 1 unidad
    await prisma.stock.create({
        data: { productId: product.id, depositId: deposit.id, quantity: 1 }
    });

    const makeSaleReq = () => ({
        body: {
            depositId: deposit.id,
            items: [{ productId: product.id, quantity: 1 }]
        },
        user: { id: user.id }
    });

    const res1 = mockRes();
    const res2 = mockRes();

    // Ejecución simultánea de las 2 solicitudes
    await Promise.all([
        createSale(makeSaleReq(), res1),
        createSale(makeSaleReq(), res2)
    ]);

    const results = [res1.statusCode, res2.statusCode];

    // Exactamente una debe ser exitosa (201) y la otra rechazada (código >= 400 por falta de stock o conflicto)
    assert.equal(results.filter(c => c === 201).length, 1, 'Exactamente una venta debe confirmarse');
    assert.equal(results.filter(c => c !== 201).length, 1, 'La otra venta debe ser rechazada');
    const rejectedStatus = results.find(c => c !== 201);
    assert.ok(rejectedStatus >= 400, `El estado de rechazo debe ser de error HTTP (>= 400). Recibido: ${rejectedStatus}`);

    // Verificación en base de datos: el stock debe ser 0, nunca negativo
    const stockDb = await prisma.stock.findUnique({
        where: { productId_depositId: { productId: product.id, depositId: deposit.id } }
    });
    assert.equal(stockDb.quantity, 0, 'El stock final debe ser exactamente 0 sin saldos negativos');

    // Verificación de registros de venta
    const salesCount = await prisma.sale.count();
    assert.equal(salesCount, 1, 'Solo debe persistirse 1 venta');
});

// =========================================================================
// CP-RNF-03: Seguridad - Protección de rutas API REST (401 / 403)
// =========================================================================
test('CP-RNF-03: Seguridad - Rechaza peticiones sin token (401) o sin rol adecuado (403)', async () => {
    // Subcaso 1: Sin sesión/credenciales -> 401 Unauthorized
    const unauthReq = { headers: {} };
    const unauthRes = mockRes();
    let nextCalled = false;

    await requireAuth(unauthReq, unauthRes, () => { nextCalled = true; });

    assert.equal(unauthRes.statusCode, 401, 'Debe devolver 401 Unauthorized');
    assert.equal(nextCalled, false, 'No debe permitir avanzar al controlador');

    // Subcaso 2: Con usuario de rol no autorizado para la operación -> 403 Forbidden
    // Ejemplo: Usuario con rol 'caja' intentando acceder a una operación reservada para 'administrador'
    const forbiddenReq = {
        user: { id: 2, name: 'Cajero', role: 'USER', appRole: ROLE.SALES }
    };
    const forbiddenRes = mockRes();
    nextCalled = false;

    const adminOnlyMiddleware = requireAppRole(ROLE.ADMIN);
    adminOnlyMiddleware(forbiddenReq, forbiddenRes, () => { nextCalled = true; });

    assert.equal(forbiddenRes.statusCode, 403, 'Debe devolver 403 Forbidden por falta de permisos');
    assert.equal(nextCalled, false, 'No debe permitir avanzar');
});

// =========================================================================
// CP-RNF-04: Tolerancia a Fallos - Manejo de imágenes ilegibles / defectuosas
// =========================================================================
test('CP-RNF-04: Resiliencia - Manejo controlado ante foto borrosa o sin datos válidos', async () => {
    // Escenario: Se envía una imagen donde no hay código ni texto identificable
    const req = {
        body: {
            photoData: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...', // imagen borrosa/ilegible
            photoMimeType: 'image/jpeg',
            query: '' // sin término de búsqueda
        }
    };
    const res = mockRes();

    await recognition(req, res);

    // La API no debe crashear (500)
    assert.notEqual(res.statusCode, 500, 'El sistema no debe arrojar un error de servidor no controlado');

    // El endpoint debe responder controladamente (200 con items vacíos o 400 pidiendo reintento)
    if (res.statusCode === 200) {
        assert.ok(Array.isArray(res.body.items));
        assert.equal(res.body.items.length, 0, 'No debe identificar productos erróneos');
    } else {
        assert.equal(res.statusCode, 400);
        assert.ok(res.body.message.includes('foto') || res.body.message.includes('capturá'));
    }
});
