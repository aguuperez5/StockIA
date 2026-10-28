import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';
import { appRole, clearSession, createSession, publicUser, readSession, resetLoginAttempts, setSession } from '../middleware.js';
import { analyzeProductImage } from '../services/ai-recognition.client.js';
import { canonicalGtin, findRecognitionCatalogCandidates, rankRecognitionProducts } from '../services/catalog-match.agent.js';
import { transferStock } from '../services/stock-transfer.service.js';
import { buildRecognitionDetections } from '../services/recognition-detections.js';
import { getNextAvailableAprilTagId } from '../services/apriltag.service.js';
import { generateAprilTagSvg } from '../services/apriltag-svg.js';
import {
  TELEGRAM_STATUSES,
  assertOfferCatalog,
  buildPersonalizedMessage,
  buildWaMeLink,
  canTransition,
  enrichOffer,
  isExpired,
  isValidStatus,
  normalizeOfferInput,
  suggestOfferForCustomer,
  validateOfferShape,
  EDITABLE_STATUSES,
  DELETABLE_STATUSES,
} from '../services/telegram-offer.service.js';

const moneyToCents = n => Math.round(Number(n) * 100);
const centsToMoney = c => Number(c) / 100;
const receiptNumber = id => `V-${String(id).padStart(6, '0')}`;
const transferReceipt = id => `TR-${String(id).padStart(6, '0')}`;
const photoFields = (body) => {
  const photoData = body?.photoData ?? body?.photo;
  if (photoData === undefined || photoData === null || photoData === '') return { photoData: null, photoMimeType: null };
  if (typeof photoData !== 'string' || photoData.length > 4_000_000) {
    throw Object.assign(new Error('La foto no es válida o supera el tamaño máximo permitido.'), { status: 400 });
  }
  const photoMimeType = typeof body.photoMimeType === 'string' ? body.photoMimeType.slice(0, 100) : null;
  if (photoMimeType && !photoMimeType.startsWith('image/')) throw Object.assign(new Error('Sólo se permiten archivos de imagen.'), { status: 400 });
  return { photoData, photoMimeType };
};
const serializeProduct = p => ({ id: p.id, name: p.name, sku: p.code, apriltagId: p.apriltagId ?? null, category: p.category || '', priceCents: moneyToCents(p.price), price: Number(p.price), lowStockThreshold: p.lowStockThreshold, imageUrl: p.imageUrl || null, active: p.active, stock: (p.stocks || []).reduce((s, x) => s + x.quantity, 0), createdAt: p.createdAt, updatedAt: p.updatedAt, priceRules: (p.priceRules || []).map(r => ({ id: r.id, minQuantity: r.minQuantity, priceCents: moneyToCents(r.price), price: Number(r.price) })) });

export async function registerCompat(req, res) {
  try {
    const { fullName, name, legajo = '', email, password } = req.body;
    if (!fullName?.trim() && !name?.trim() || !email?.trim() || !password) return res.status(400).json({ message: 'Nombre, email y contraseña son obligatorios.' });
    if (typeof legajo !== 'string' || !legajo.trim()) return res.status(400).json({ message: 'El legajo es obligatorio.' });
    if (!/^\d+$/.test(legajo.trim())) return res.status(400).json({ message: 'El legajo debe ser numérico.' });
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim())) return res.status(400).json({ message: 'El correo electrónico no tiene un formato válido (ej. usuario@gmail.com).' });
    if (password.length < 6) return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' });
    const normalized = email.trim().toLowerCase();
    if (await prisma.user.findUnique({ where: { email: normalized } })) return res.status(409).json({ message: 'El email ya se encuentra registrado.' });
    const userCount = await prisma.user.count();
    const isFirst = userCount === 0;
    const user = await prisma.user.create({ data: { name: (fullName || name).trim(), legajo: legajo.trim(), email: normalized, password: await bcrypt.hash(password, 10), role: isFirst ? 'ADMIN' : 'USER', appRole: isFirst ? 'administrador' : 'caja' } });
    setSession(res, createSession(user.id));
    return res.status(201).json({ message: 'Usuario registrado exitosamente.', user: publicUser(user) });
  } catch (e) { return res.status(500).json({ message: 'No pudimos registrar el usuario.', details: e.message }); }
}
export async function login(req, res) {
  const email = req.body?.email?.trim().toLowerCase(); const password = req.body?.password;
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (!user || !(await bcrypt.compare(password || '', user.password))) return res.status(401).json({ message: 'Email o contraseña incorrectos.' });
  resetLoginAttempts(email);
  if (req.ip) resetLoginAttempts(req.ip);
  setSession(res, createSession(user.id));
  return res.json({ message: 'Sesión iniciada.', user: publicUser(user) });
}
export async function me(req, res) {
  try {
    const userId = readSession(req);
    if (!userId) return res.json({ user: null });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.json({ user: null });
    return res.json({ user: publicUser(user) });
  } catch (e) {
    return res.json({ user: null });
  }
}
export async function logout(req, res) { clearSession(res); return res.json({ message: 'Sesión cerrada.' }); }

export async function listProducts(req, res) {
  const search = String(req.query.search || '').trim(); const category = String(req.query.category || 'Todas');
  const includeInactive = String(req.query.includeInactive || '') === '1';
  const products = await prisma.product.findMany({ where: { ...(includeInactive ? {} : { active: true }), ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { code: { contains: search, mode: 'insensitive' } }] } : {}), ...(category && category !== 'Todas' ? { category } : {}) }, include: { stocks: true, priceRules: { orderBy: { minQuantity: 'asc' } } }, orderBy: { createdAt: 'desc' } });
  res.json({ items: products.map(serializeProduct) });
}
export async function getProductCompat(req, res) { const p = await prisma.product.findUnique({ where: { id: Number(req.params.id) }, include: { stocks: true, priceRules: { orderBy: { minQuantity: 'asc' } } } }); if (!p) return res.status(404).json({ message: 'Producto no encontrado.' }); res.json({ item: serializeProduct(p) }); }
function cleanImageUrl(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const url = String(value).trim();
  if (url.startsWith('data:image/')) {
    if (url.length > 5 * 1024 * 1024) throw Object.assign(new Error('La imagen capturada es demasiado pesada (máximo 5MB).'), { status: 400 });
    return url;
  }
  if (url.length > 2048) throw Object.assign(new Error('La URL de la imagen es demasiado larga.'), { status: 400 });
  if (!/^https?:\/\//i.test(url)) throw Object.assign(new Error('La imagen debe ser una URL http(s) o una fotografía válida.'), { status: 400 });
  return url;
}

export const DEFAULT_CATEGORIES = [
  'Almacén',
  'Bebidas',
  'Limpieza',
  'Hogar',
  'Ferretería',
  'Electrónica',
  'Indumentaria',
  'Salud y Cuidado',
  'Mascotas',
  'Otros',
];

function cleanCategoryName(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function validateCategoryName(name) {
  if (!name) return 'El nombre de la categoría es obligatorio.';
  if (name.length < 2) return 'El nombre de la categoría debe tener al menos 2 caracteres.';
  if (name.length > 60) return 'El nombre de la categoría no puede superar los 60 caracteres.';
  return null;
}

// Resuelve la categoría al nombre canónico registrado en el catálogo.
// Si todavía no hay categorías cargadas (instalación nueva / tests sin seed),
// acepta cualquier texto no vacío para no romper compatibilidad.
async function resolveProductCategory(db, raw) {
  const cleaned = cleanCategoryName(raw);
  if (!cleaned) return { error: 'Completá nombre, SKU, categoría y un precio válido.' };
  const catalog = await db.category.findMany({ select: { name: true } });
  if (catalog.length === 0) return { name: cleaned };
  const match = catalog.find(c => c.name.toLowerCase() === cleaned.toLowerCase());
  if (!match) return { error: 'La categoría seleccionada no existe. Elegila del listado o creala en Configuración.' };
  return { name: match.name };
}

export async function listCategories(req, res) {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    const groups = await prisma.product.groupBy({
      by: ['category'],
      _count: { category: true },
    });
    const counts = new Map(groups.map(g => [String(g.category ?? '').toLowerCase(), g._count.category]));
    res.json({
      items: categories.map(c => ({
        id: c.id,
        name: c.name,
        productCount: counts.get(c.name.toLowerCase()) ?? 0,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (e) {
    res.status(500).json({ message: 'No pudimos obtener las categorías.', details: e.message });
  }
}

export async function createCategory(req, res) {
  try {
    const name = cleanCategoryName(req.body?.name);
    const validationError = validateCategoryName(name);
    if (validationError) return res.status(400).json({ message: validationError });
    const duplicate = await prisma.category.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
    if (duplicate) return res.status(409).json({ message: `Ya existe la categoría "${duplicate.name}".` });
    const created = await prisma.category.create({ data: { name } });
    res.status(201).json({ id: created.id, message: 'Categoría creada correctamente.', item: created });
  } catch (e) {
    res.status(e.code === 'P2002' ? 409 : 500).json({ message: e.code === 'P2002' ? 'Ya existe una categoría con ese nombre.' : e.message });
  }
}

export async function updateCategory(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'El ID de la categoría no es válido.' });
    const name = cleanCategoryName(req.body?.name);
    const validationError = validateCategoryName(name);
    if (validationError) return res.status(400).json({ message: validationError });
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Categoría no encontrada.' });
    const duplicate = await prisma.category.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, NOT: { id } },
    });
    if (duplicate) return res.status(409).json({ message: `Ya existe la categoría "${duplicate.name}".` });
    await prisma.$transaction(async tx => {
      await tx.category.update({ where: { id }, data: { name } });
      // Mantener consistencia: los productos guardan la categoría como texto,
      // así que se renombra en cascada al nombre canónico nuevo.
      await tx.product.updateMany({
        where: { category: { equals: existing.name, mode: 'insensitive' } },
        data: { category: name },
      });
    });
    res.json({ message: 'Categoría actualizada correctamente.' });
  } catch (e) {
    res.status(e.code === 'P2025' ? 404 : 500).json({ message: e.code === 'P2025' ? 'Categoría no encontrada.' : e.message });
  }
}

export async function deleteCategory(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'El ID de la categoría no es válido.' });
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Categoría no encontrada.' });
    const inUse = await prisma.product.count({
      where: { category: { equals: existing.name, mode: 'insensitive' } },
    });
    if (inUse > 0) {
      return res.status(409).json({
        message: `No se puede eliminar "${existing.name}" porque tiene ${inUse} producto(s) asociado(s). Cambiales la categoría primero.`,
      });
    }
    await prisma.category.delete({ where: { id } });
    res.json({ message: 'Categoría eliminada correctamente.' });
  } catch (e) {
    res.status(e.code === 'P2025' ? 404 : 500).json({ message: e.code === 'P2025' ? 'Categoría no encontrada.' : e.message });
  }
}

export async function createProductCompat(req, res) {
  const { name, sku, category, price, lowStockThreshold = 5, initialStock = 0, warehouseId, imageUrl } = req.body;
  if (!name?.trim() || !sku?.trim() || !cleanCategoryName(category) || !Number.isFinite(Number(price)) || Number(price) <= 0) return res.status(400).json({ message: 'Completá nombre, SKU, categoría y un precio válido.' });
  const resolved = await resolveProductCategory(prisma, category);
  if (resolved.error) return res.status(400).json({ message: resolved.error });
  const canonicalCategory = resolved.name;
  let image = null;
  try { image = cleanImageUrl(imageUrl); } catch (e) { return res.status(e.status || 400).json({ message: e.message }); }
  if (Number(initialStock) > 0 && !warehouseId) return res.status(400).json({ message: 'Elegí un depósito para el stock inicial.' });
  const threshold = Math.max(0, Number(lowStockThreshold) || 0);
  try {
    const result = await prisma.$transaction(async tx => {
      const nextTagId = await getNextAvailableAprilTagId(tx);
      const p = await tx.product.create({ data: { name: name.trim(), code: sku.trim(), category: canonicalCategory, price: Number(price), lowStockThreshold: threshold, imageUrl: image, apriltagId: nextTagId } });
      const deposits = await tx.deposit.findMany({ select: { id: true } });
      if (deposits.length > 0) {
        await tx.stock.createMany({
          data: deposits.map(dep => ({
            productId: p.id,
            depositId: dep.id,
            quantity: (dep.id === Number(warehouseId) && Number(initialStock) > 0) ? Number(initialStock) : 0
          })),
          skipDuplicates: true
        });
      }
      if (Number(initialStock) > 0 && warehouseId) {
        const dep = await tx.deposit.findUnique({ where: { id: Number(warehouseId) } });
        if (!dep) throw Object.assign(new Error('El depósito seleccionado no existe.'), { status: 400 });
        await tx.stockMovement.create({ data: { productId: p.id, depositId: dep.id, quantity: Number(initialStock), reason: 'Stock inicial' } });
      }
      return p;
    });
    res.status(201).json({ id: result.id, message: 'Producto incorporado correctamente.' });
  } catch (e) { res.status(e.status || (e.code === 'P2002' ? 409 : 500)).json({ message: e.code === 'P2002' ? 'Ya existe un producto con ese SKU.' : e.message }); }
}
export async function updateProductCompat(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'El ID del producto no es válido.' });
    const { name, sku, category, price, lowStockThreshold, imageUrl, active } = req.body;
    if (price !== undefined && (!Number.isFinite(Number(price)) || Number(price) <= 0)) {
      return res.status(400).json({ message: 'El precio debe ser un número mayor a cero.' });
    }
    let image;
    try { if (imageUrl !== undefined) image = cleanImageUrl(imageUrl); } catch (e) { return res.status(e.status || 400).json({ message: e.message }); }
    if (active !== undefined && typeof active !== 'boolean') return res.status(400).json({ message: 'El estado debe ser verdadero o falso.' });
    const parsedThreshold = lowStockThreshold !== undefined ? Math.max(0, Number(lowStockThreshold) || 0) : undefined;
    let canonicalCategory;
    if (category !== undefined) {
      const resolved = await resolveProductCategory(prisma, category);
      if (resolved.error) return res.status(400).json({ message: resolved.error });
      canonicalCategory = resolved.name;
    }
    const p = await prisma.product.update({ where: { id }, data: { ...(name !== undefined && { name: String(name).trim() }), ...(sku !== undefined && { code: String(sku).trim() }), ...(canonicalCategory !== undefined && { category: canonicalCategory }), ...(price !== undefined && { price: Number(price) }), ...(parsedThreshold !== undefined && { lowStockThreshold: parsedThreshold }), ...(image !== undefined && { imageUrl: image }), ...(active !== undefined && { active }) } });
    res.json({ message: 'Producto actualizado correctamente.', item: serializeProduct(p) });
  } catch (e) { res.status(e.code === 'P2002' ? 409 : e.code === 'P2025' ? 404 : 400).json({ message: e.code === 'P2002' ? 'Ya existe otro producto con ese SKU.' : e.message }); }
}

// Baja lógica: el producto se desactiva (active=false) para no romper el
// histórico de ventas y movimientos. No se permite con stock existente.
export async function deleteProductCompat(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'El ID del producto no es válido.' });
    const agg = await prisma.stock.aggregate({ where: { productId: id }, _sum: { quantity: true } });
    if ((agg._sum.quantity ?? 0) > 0) return res.status(400).json({ message: 'No se puede dar de baja un producto con stock existente.' });
    const p = await prisma.product.update({ where: { id }, data: { active: false } });
    res.json({ message: 'Producto dado de baja correctamente.', item: serializeProduct(p) });
  } catch (e) { res.status(e.code === 'P2025' ? 404 : 500).json({ message: e.code === 'P2025' ? 'Producto no encontrado.' : e.message }); }
}

export async function listWarehouses(req, res) { const items = await prisma.deposit.findMany({ include: { stocks: true }, orderBy: { createdAt: 'asc' } }); res.json({ items: items.map(d => ({ id: d.id, name: d.name, type: d.type, address: d.address || d.location || '', manager: d.manager || 'Sin asignar', capacity: d.capacity, imageUrl: d.imageUrl || null, stockTotal: d.stocks.reduce((total, stock) => total + stock.quantity, 0), skuCount: d.stocks.filter(stock => stock.quantity > 0).length, createdAt: d.createdAt })) }); }
export async function warehouseSummary(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'El ID del depósito no es válido.' });
  const deposit = await prisma.deposit.findUnique({ where: { id }, include: { stocks: { include: { product: true } } } });
  if (!deposit) return res.status(404).json({ message: 'Depósito no encontrado.' });

  const { from, to } = req.query;
  const fromDate = from ? new Date(`${from}T00:00:00`) : null;
  const toDate = to ? new Date(`${to}T23:59:59.999`) : null;
  const dateFilter = (fromDate || toDate) ? {
    createdAt: {
      ...(fromDate && !Number.isNaN(fromDate.getTime()) ? { gte: fromDate } : {}),
      ...(toDate && !Number.isNaN(toDate.getTime()) ? { lte: toDate } : {})
    }
  } : {};

  const sales = await prisma.sale.findMany({
    where: { depositId: id, ...dateFilter },
    include: { customer: true, items: { include: { product: true } } },
    orderBy: { createdAt: 'desc' }
  });

  res.json({
    deposit: {
      id: deposit.id,
      name: deposit.name,
      type: deposit.type,
      address: deposit.address || deposit.location || '',
      manager: deposit.manager,
      capacity: deposit.capacity,
      imageUrl: deposit.imageUrl || null
    },
    stock: deposit.stocks.map(stock => ({
      productId: stock.productId,
      productName: stock.product.name,
      sku: stock.product.code,
      category: stock.product.category || '',
      priceCents: moneyToCents(stock.product.price),
      quantity: stock.quantity,
      threshold: stock.product.lowStockThreshold
    })),
    sales: sales.map(sale => ({
      id: sale.id,
      totalCents: moneyToCents(sale.total),
      createdAt: sale.createdAt,
      customerName: sale.customer?.name || 'Venta mostrador',
      itemCount: sale.items.reduce((total, item) => total + item.quantity, 0),
      items: sale.items.map(i => ({
        productId: i.productId,
        productName: i.product.name,
        sku: i.product.code,
        quantity: i.quantity,
        priceCents: moneyToCents(i.price)
      }))
    })),
  });
}
export async function updateWarehouse(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'El ID del depósito no es válido.' });
    const { name, type = 'Principal', address = '', manager = '', capacity = 0, imageUrl } = req.body || {};
    if (!name?.trim() || !address?.trim() || !manager?.trim()) return res.status(400).json({ message: 'Nombre, dirección y responsable son obligatorios.' });
    if (!Number.isInteger(Number(capacity)) || Number(capacity) < 0) return res.status(400).json({ message: 'La capacidad debe ser un entero mayor o igual a cero.' });
    if (await prisma.deposit.findFirst({ where: { name: { equals: name.trim(), mode: 'insensitive' }, NOT: { id } } })) return res.status(409).json({ message: 'Ya existe otro depósito registrado con ese nombre.' });
    let image;
    try { if (imageUrl !== undefined) image = cleanImageUrl(imageUrl); } catch (e) { return res.status(e.status || 400).json({ message: e.message }); }
    await prisma.deposit.update({ where: { id }, data: { name: name.trim(), type, address: address.trim(), location: address.trim(), manager: manager.trim(), capacity: Number(capacity), ...(image !== undefined && { imageUrl: image }) } });
    res.json({ message: 'Depósito actualizado correctamente.' });
  } catch (e) { res.status(e.code === 'P2025' ? 404 : 500).json({ message: e.code === 'P2025' ? 'Depósito no encontrado.' : e.message }); }
}
export async function createWarehouse(req, res) {
  const { name, type = 'Principal', address = '', manager = '', capacity = 0, imageUrl } = req.body;
  if (!name?.trim() || !address?.trim() || !manager?.trim()) return res.status(400).json({ message: 'Nombre, dirección y responsable son obligatorios.' });
  if (!Number.isInteger(Number(capacity)) || Number(capacity) < 0) return res.status(400).json({ message: 'La capacidad debe ser un entero mayor o igual a cero.' });
  if (await prisma.deposit.findFirst({ where: { name: { equals: name.trim(), mode: 'insensitive' } } })) return res.status(409).json({ message: 'Ya existe un depósito registrado con ese nombre.' });
  let image = null;
  try { image = cleanImageUrl(imageUrl); } catch (e) { return res.status(e.status || 400).json({ message: e.message }); }
  const d = await prisma.deposit.create({ data: { name: name.trim(), type, address: address.trim(), location: address.trim(), manager: manager.trim(), capacity: Number(capacity), imageUrl: image } });
  const activeProducts = await prisma.product.findMany({ where: { active: true }, select: { id: true } });
  if (activeProducts.length > 0) {
    await prisma.stock.createMany({
      data: activeProducts.map(p => ({ productId: p.id, depositId: d.id, quantity: 0 })),
      skipDuplicates: true
    });
  }
  res.status(201).json({ id: d.id, message: 'Depósito registrado correctamente.' });
}
export async function deleteWarehouse(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'El ID del depósito no es válido.' });
    const deposit = await prisma.deposit.findUnique({ where: { id } });
    if (!deposit) return res.status(404).json({ message: 'Depósito no encontrado.' });

    const [stockAgg, sales, transfers] = await Promise.all([
      prisma.stock.aggregate({ where: { depositId: id }, _sum: { quantity: true } }),
      prisma.sale.count({ where: { depositId: id } }),
      prisma.transfer.count({ where: { OR: [{ originWarehouseId: id }, { destinationWarehouseId: id }] } })
    ]);

    const totalStock = stockAgg._sum.quantity ?? 0;
    if (totalStock > 0) {
      return res.status(409).json({ message: `No se puede eliminar el depósito: posee ${totalStock} unidad(es) en stock. Transferí o ajustá el stock a 0 primero.` });
    }
    if (sales > 0 || transfers > 0) {
      return res.status(409).json({ message: 'No se puede eliminar un depósito con ventas o transferencias históricas asociadas.' });
    }

    await prisma.$transaction([
      prisma.stockMovement.deleteMany({ where: { depositId: id } }),
      prisma.stock.deleteMany({ where: { depositId: id } }),
      prisma.deposit.delete({ where: { id } })
    ]);

    res.json({ message: 'Depósito eliminado correctamente.' });
  } catch (e) {
    res.status(e.code === 'P2025' ? 404 : 500).json({ message: e.code === 'P2025' ? 'Depósito no encontrado.' : e.message });
  }
}

export function computeStockLevel(quantity, threshold) {
  if (quantity <= 0) return 'sin_stock';
  if (threshold > 1 && quantity <= Math.floor(threshold / 2)) {
    return 'critico';
  }
  return 'bajo';
}

export async function listInventory(req, res) {
  try {
    const warehouseId = req.query.warehouseId ? Number(req.query.warehouseId) : undefined;
    if (warehouseId !== undefined && !Number.isInteger(warehouseId)) return res.status(400).json({ message: 'El ID del depósito no es válido.' });

    const stocks = await prisma.stock.findMany({
      where: {
        ...(warehouseId ? { depositId: warehouseId } : {}),
        product: { active: true }
      },
      include: { product: { include: { priceRules: true } }, deposit: true },
      orderBy: [{ product: { name: 'asc' } }, { deposit: { name: 'asc' } }]
    });

    const isLowStock = req.query.lowStock === 'true';
    const resultStocks = isLowStock
      ? stocks.filter(s => s.quantity <= s.product.lowStockThreshold)
      : stocks;

    res.json({
      items: resultStocks.map(s => ({
        inventoryId: s.id,
        quantity: s.quantity,
        updatedAt: s.updatedAt,
        productId: s.productId,
        productName: s.product.name,
        sku: s.product.code,
        category: s.product.category || '',
        priceCents: moneyToCents(s.product.price),
        lowStockThreshold: s.product.lowStockThreshold,
        warehouseId: s.depositId,
        warehouseName: s.deposit.name,
        level: computeStockLevel(s.quantity, s.product.lowStockThreshold),
        priceRules: (s.product.priceRules || []).map(r => ({
          id: r.id,
          productId: r.productId,
          minQuantity: r.minQuantity,
          priceCents: moneyToCents(r.price),
          price: Number(r.price),
        })),
      }))
    });
  } catch (e) {
    res.status(500).json({ message: 'No pudimos obtener el inventario.', details: e.message });
  }
}

export async function listLowStock(req, res) {
  try {
    const warehouseId = req.query.warehouseId ? Number(req.query.warehouseId) : undefined;
    if (warehouseId !== undefined && !Number.isInteger(warehouseId)) {
      return res.status(400).json({ message: 'El ID del depósito no es válido.' });
    }

    const stocks = await prisma.stock.findMany({
      where: {
        ...(warehouseId ? { depositId: warehouseId } : {}),
        product: { active: true },
      },
      include: { product: { include: { priceRules: true } }, deposit: true },
      orderBy: [{ quantity: 'asc' }, { product: { name: 'asc' } }],
    });

    const lowStockPositions = stocks
      .filter(s => s.quantity <= s.product.lowStockThreshold)
      .map(s => ({
        inventoryId: s.id,
        quantity: s.quantity,
        updatedAt: s.updatedAt,
        productId: s.productId,
        productName: s.product.name,
        sku: s.product.code,
        category: s.product.category || '',
        priceCents: moneyToCents(s.product.price),
        lowStockThreshold: s.product.lowStockThreshold,
        warehouseId: s.depositId,
        warehouseName: s.deposit.name,
        level: computeStockLevel(s.quantity, s.product.lowStockThreshold),
        priceRules: (s.product.priceRules || []).map(r => ({
          id: r.id,
          productId: r.productId,
          minQuantity: r.minQuantity,
          priceCents: moneyToCents(r.price),
          price: Number(r.price),
        })),
      }));

    res.json({ items: lowStockPositions, count: lowStockPositions.length });
  } catch (e) {
    res.status(500).json({ message: 'No pudimos obtener las alertas de stock bajo.', details: e.message });
  }
}
export async function updateInventory(req, res) { const id = Number(req.params.id); const quantity = Number(req.body.quantity); if (!Number.isInteger(quantity) || quantity < 0) return res.status(400).json({ message: 'La cantidad debe ser un entero mayor o igual a cero.' }); try { await prisma.$transaction(async tx => { const stock = await tx.stock.findUnique({ where: { id } }); if (!stock) throw Object.assign(new Error('Posición de inventario no encontrada.'), { status: 404 }); const delta = quantity - stock.quantity; if (delta === 0) return; await tx.stock.update({ where: { id }, data: { quantity } }); await tx.stockMovement.create({ data: { productId: stock.productId, depositId: stock.depositId, quantity: delta, reason: req.body.note || 'Ajuste manual' } }); }); res.json({ message: 'Inventario actualizado correctamente.' }); } catch (e) { res.status(e.status || 500).json({ message: e.message }); } }

export async function listPriceRules(req, res) { const rules = await prisma.priceRule.findMany({ where: { productId: Number(req.params.id) }, orderBy: { minQuantity: 'asc' } }); res.json({ items: rules.map(r => ({ id: r.id, productId: r.productId, minQuantity: r.minQuantity, priceCents: moneyToCents(r.price), price: Number(r.price) })) }); }
export async function savePriceRules(req, res) {
  const productId = Number(req.params.id);
  if (!Number.isInteger(productId)) return res.status(400).json({ message: 'El ID del producto no es válido.' });
  if (!await prisma.product.findUnique({ where: { id: productId } })) return res.status(404).json({ message: 'El producto no existe.' });
  const rules = req.body?.rules ?? [];
  if (!Array.isArray(rules) || rules.length > 50) return res.status(400).json({ message: 'Las reglas deben ser una lista de hasta 50 tramos.' });
  const seen = new Set();
  for (const r of rules) {
    const minQuantity = Number(r?.minQuantity), price = Number(r?.price);
    if (!Number.isInteger(minQuantity) || minQuantity < 1) return res.status(400).json({ message: 'Cada tramo requiere minQuantity entero mayor a 0.' });
    if (!Number.isFinite(price) || price <= 0) return res.status(400).json({ message: 'Cada tramo requiere un precio mayor a 0.' });
    if (seen.has(minQuantity)) return res.status(400).json({ message: 'Los tramos no pueden repetir la misma cantidad mínima.' });
    seen.add(minQuantity);
  }
  await prisma.$transaction(async tx => { await tx.priceRule.deleteMany({ where: { productId } }); if (rules.length) await tx.priceRule.createMany({ data: rules.map(r => ({ productId, minQuantity: Number(r.minQuantity), price: Number(r.price) })) }); });
  res.json({ message: 'Precios por cantidad guardados.' });
}

export async function createSaleCompat(req, res) {
  const items = req.body?.items; const customerId = req.body?.customerId ? Number(req.body.customerId) : null;
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ message: 'Agregá al menos un producto a la venta.' });
  try {
    const photo = photoFields(req.body);
    const result = await prisma.$transaction(async tx => {
      if (customerId && !await tx.customer.findUnique({ where: { id: customerId } })) throw Object.assign(new Error('El cliente seleccionado no existe.'), { status: 400 });
      const grouped = new Map();
      for (const item of items) {
        const pid = Number(item.productId), did = Number(item.warehouseId), qty = Number(item.quantity);
        if (!Number.isInteger(pid) || !Number.isInteger(did) || !Number.isInteger(qty) || qty <= 0) throw Object.assign(new Error('Cada artículo requiere producto, depósito y cantidad válidos.'), { status: 400 });
        const key = `${did}:${pid}`; grouped.set(key, { productId: pid, depositId: did, quantity: (grouped.get(key)?.quantity || 0) + qty });
      }
      const groups = [...grouped.values()];
      if (new Set(groups.map(group => group.depositId)).size > 1) throw Object.assign(new Error('Una venta debe corresponder a un único depósito.'), { status: 400 });
      const lineItems = [];
      for (const group of groups) {
        const dep = await tx.deposit.findUnique({ where: { id: group.depositId } }); if (!dep) throw Object.assign(new Error('Uno de los depósitos no existe.'), { status: 400 });
        const product = await tx.product.findUnique({ where: { id: group.productId }, include: { priceRules: true } }); if (!product) throw Object.assign(new Error('Uno de los productos no existe.'), { status: 404 });
        const stock = await tx.stock.findUnique({ where: { productId_depositId: { productId: group.productId, depositId: group.depositId } } });
        if (!stock || stock.quantity < group.quantity) throw Object.assign(new Error(`Stock insuficiente para "${product.name}": disponible ${stock?.quantity || 0}, solicitado ${group.quantity}`), { status: 400 });
        const rule = [...product.priceRules].filter(r => r.minQuantity <= group.quantity).sort((a, b) => b.minQuantity - a.minQuantity)[0];
        lineItems.push({ productId: product.id, quantity: group.quantity, price: Number(rule?.price ?? product.price), productName: product.name });
      }
      const total = lineItems.reduce((n, i) => n + i.price * i.quantity, 0);
      const saleDepositId = groups[0].depositId;
      const sale = await tx.sale.create({ data: { depositId: saleDepositId, customerId, userId: req.user.id, total, ...photo, items: { create: lineItems.map(l => ({ productId: l.productId, quantity: l.quantity, price: l.price })) } }, include: { items: { include: { product: true } }, deposit: true } });
      for (const line of lineItems) {
        const updateResult = await tx.stock.updateMany({
          where: {
            productId: line.productId,
            depositId: saleDepositId,
            quantity: { gte: line.quantity },
          },
          data: {
            quantity: { decrement: line.quantity },
          },
        });
        if (updateResult.count === 0) {
          throw Object.assign(
            new Error(`Stock insuficiente para "${line.productName}".`),
            { status: 400 }
          );
        }
        await tx.stockMovement.create({ data: { productId: line.productId, depositId: saleDepositId, saleId: sale.id, quantity: -line.quantity, reason: `Venta #${sale.id}` } });
      }
      return sale;
    });
    res.status(201).json({ message: 'Venta confirmada con éxito.', sale: { id: result.id, receiptNumber: receiptNumber(result.id), totalCents: moneyToCents(result.total), photoData: result.photoData, photoMimeType: result.photoMimeType } });
  } catch (e) {
    if (e.code === '23514' || String(e.message).includes('23514')) {
      return res.status(400).json({ message: 'Stock insuficiente para completar la venta.' });
    }
    res.status(e.status || 500).json({ message: e.message });
  }
}
export async function listSales(req, res) {
  try {
    const from = req.query.from ? new Date(`${req.query.from}T00:00:00`) : null;
    const to = req.query.to ? new Date(`${req.query.to}T23:59:59.999`) : null;
    if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) return res.status(400).json({ message: 'Las fechas del filtro no son válidas.' });
    const warehouseId = req.query.warehouseId ? Number(req.query.warehouseId) : undefined;
    const search = String(req.query.search || '').trim();
    const productId = req.query.productId ? Number(req.query.productId) : undefined;
    const receiptMatch = search.match(/^[vV]-0*(\d+)$/);
    const searchNumber = receiptMatch ? Number(receiptMatch[1]) : (Number.isInteger(Number(search)) ? Number(search) : null);
    const searchFilter = search ? { OR: [...(searchNumber !== null ? [{ id: searchNumber }] : []), { customer: { name: { contains: search, mode: 'insensitive' } } }, { items: { some: { product: { OR: [{ name: { contains: search, mode: 'insensitive' } }, { code: { contains: search, mode: 'insensitive' } }] } } } }] } : {};
    const sales = await prisma.sale.findMany({
      where: {
        ...(warehouseId !== undefined && Number.isInteger(warehouseId) ? { depositId: warehouseId } : {}),
        ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
        ...(Number.isInteger(productId) ? { items: { some: { productId } } } : {}),
        ...searchFilter,
      },
      include: { items: true, deposit: true, customer: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ items: sales.map(s => ({ id: s.id, receiptNumber: receiptNumber(s.id), totalCents: moneyToCents(s.total), status: 'Confirmada', createdAt: s.createdAt, itemCount: s.items.reduce((n, i) => n + i.quantity, 0), warehouseId: s.depositId, warehouseName: s.deposit.name, customerName: s.customer?.name || null, photoData: s.photoData ? true : false })) });
  } catch (e) { return res.status(500).json({ message: 'No pudimos obtener el historial.', details: e.message }); }
}
export async function getSale(req, res) { const s = await prisma.sale.findUnique({ where: { id: Number(req.params.id) }, include: { items: { include: { product: true } }, deposit: true, customer: true } }); if (!s) return res.status(404).json({ message: 'Venta no encontrada.' }); res.json({ sale: { id: s.id, receiptNumber: receiptNumber(s.id), totalCents: moneyToCents(s.total), status: 'Confirmada', createdAt: s.createdAt, photoData: s.photoData, photoMimeType: s.photoMimeType, customer: s.customer ? { id: s.customer.id, name: s.customer.name, contact: s.customer.contact } : null }, items: s.items.map(i => ({ id: i.id, quantity: i.quantity, unitPriceCents: moneyToCents(i.price), subtotalCents: moneyToCents(i.price) * i.quantity, productName: i.product.name, sku: i.product.code, warehouseName: s.deposit.name })) }); }

export async function dashboard(req, res) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setHours(0, 0, 0, 0);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const [productsList, warehouses, stocks, salesToday, weekSales] = await Promise.all([
    prisma.product.findMany({ where: { active: true } }),
    prisma.deposit.count(),
    prisma.stock.findMany({ include: { product: true } }),
    prisma.sale.findMany({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    prisma.sale.findMany({ where: { createdAt: { gte: sevenDaysAgo } } }),
  ]);
  const stockByProduct = new Map();
  for (const s of stocks) stockByProduct.set(s.productId, (stockByProduct.get(s.productId) || 0) + s.quantity);
  const inventoryValueCents = productsList.reduce((n, p) => n + (stockByProduct.get(p.id) || 0) * moneyToCents(p.price), 0);
  const lowStock = productsList.filter(p => (stockByProduct.get(p.id) || 0) <= p.lowStockThreshold).map(p => ({ id: p.id, name: p.name, sku: p.code, stock: stockByProduct.get(p.id) || 0, threshold: p.lowStockThreshold }));

  const toLocalDateString = (d) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  };

  const salesByDayMap = new Map();
  for (const s of weekSales) {
    const key = toLocalDateString(s.createdAt);
    const existing = salesByDayMap.get(key) || { totalCents: 0, count: 0 };
    existing.totalCents += moneyToCents(s.total);
    existing.count += 1;
    salesByDayMap.set(key, existing);
  }

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    const dateStr = toLocalDateString(d);
    const dayData = salesByDayMap.get(dateStr) || { totalCents: 0, count: 0 };
    days.push({ date: dateStr, label: d.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', ''), totalCents: dayData.totalCents, count: dayData.count });
  }

  const cats = {};
  for (const p of productsList) { const units = stockByProduct.get(p.id) || 0; const c = p.category || 'Sin categoría'; cats[c] ??= { category: c, units: 0, valueCents: 0 }; cats[c].units += units; cats[c].valueCents += units * moneyToCents(p.price); }
  const status = [{ label: 'Saludable', value: 0, color: '#159666' }, { label: 'Bajo mínimo', value: 0, color: '#d88936' }, { label: 'Sin stock', value: 0, color: '#d45b55' }];
  for (const p of productsList) { const q = stockByProduct.get(p.id) || 0; if (q === 0) status[2].value++; else if (q <= p.lowStockThreshold) status[1].value++; else status[0].value++; }
  res.json({ products: productsList.length, warehouses, inventoryValueCents, todaySalesCents: salesToday.reduce((n, x) => n + moneyToCents(x.total), 0), todaySaleCount: salesToday.length, lowStock, salesByDay: days, inventoryByCategory: Object.values(cats), inventoryStatus: status });
}
export async function createTransfer(req, res) {
  const originId = Number(req.body?.originWarehouseId), destinationId = Number(req.body?.destinationWarehouseId), items = req.body?.items;
  if (!Number.isInteger(originId) || !Number.isInteger(destinationId) || originId === destinationId || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ message: 'Completá origen, destino y al menos un artículo.' });
  }
  try {
    const photo = photoFields(req.body);
    const t = await transferStock({
      originId,
      destinationId,
      items,
      userId: req.user?.id,
      photo,
    });
    return res.status(201).json({
      transfer: {
        id: t.id,
        receiptNumber: transferReceipt(t.id),
        originWarehouseId: t.originWarehouseId,
        destinationWarehouseId: t.destinationWarehouseId,
        status: t.status,
        createdAt: t.createdAt,
        photoData: t.photoData,
        photoMimeType: t.photoMimeType,
      },
      message: 'Transferencia registrada.',
    });
  } catch (e) {
    return res.status(e.status || 500).json({ message: e.message });
  }
}
export async function listTransfers(req, res) {
  const query = req.query || {};
  const from = query.from ? new Date(`${query.from}T00:00:00`) : null; const to = query.to ? new Date(`${query.to}T23:59:59.999`) : null;
  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) return res.status(400).json({ message: 'Las fechas del filtro no son válidas.' });
  const originWarehouseId = query.originWarehouseId ? Number(query.originWarehouseId) : undefined;
  const destinationWarehouseId = query.destinationWarehouseId ? Number(query.destinationWarehouseId) : undefined;
  const warehouseId = query.warehouseId ? Number(query.warehouseId) : undefined;
  const productId = query.productId ? Number(query.productId) : undefined;
  const status = query.status ? String(query.status) : undefined;
  const ts = await prisma.transfer.findMany({ where: { ...(Number.isInteger(originWarehouseId) ? { originWarehouseId } : {}), ...(Number.isInteger(destinationWarehouseId) ? { destinationWarehouseId } : {}), ...(Number.isInteger(warehouseId) ? { OR: [{ originWarehouseId: warehouseId }, { destinationWarehouseId: warehouseId }] } : {}), ...(Number.isInteger(productId) ? { items: { some: { productId } } } : {}), ...(status ? { status } : {}), ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}) }, include: { originWarehouse: true, destinationWarehouse: true, items: true }, orderBy: { createdAt: 'desc' } });
  res.json({ items: ts.map(t => ({ id: t.id, receiptNumber: transferReceipt(t.id), originWarehouseId: t.originWarehouseId, destinationWarehouseId: t.destinationWarehouseId, status: t.status, createdAt: t.createdAt, itemCount: t.items.length, totalUnits: t.items.reduce((acc, i) => acc + i.quantity, 0), originName: t.originWarehouse.name, destinationName: t.destinationWarehouse.name, photoData: t.photoData ? true : false })) });
}
export async function getTransfer(req, res) { const t = await prisma.transfer.findUnique({ where: { id: Number(req.params.id) }, include: { originWarehouse: true, destinationWarehouse: true, items: { include: { product: true } } } }); if (!t) return res.status(404).json({ message: 'Transferencia no encontrada.' }); res.json({ transfer: { id: t.id, receiptNumber: transferReceipt(t.id), originWarehouseId: t.originWarehouseId, destinationWarehouseId: t.destinationWarehouseId, status: t.status, createdAt: t.createdAt, originName: t.originWarehouse.name, originLocation: t.originWarehouse.location || t.originWarehouse.address || '', destinationName: t.destinationWarehouse.name, destinationLocation: t.destinationWarehouse.location || t.destinationWarehouse.address || '', photoData: t.photoData, photoMimeType: t.photoMimeType }, items: t.items.map(i => ({ productId: i.productId, productName: i.product.name, sku: i.product.code, category: i.product.category || 'General', priceCents: moneyToCents(i.product.price), quantity: i.quantity })) }); }

export async function listCustomers(req, res) { const search = String(req.query.search || '').trim(); const items = await prisma.customer.findMany({ where: search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { contact: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] } : {}, orderBy: { name: 'asc' } }); res.json({ items }); }
export async function createCustomer(req, res) {
  const { name, contact, email, phone } = req.body || {};
  if (!name?.trim() || !contact?.trim()) return res.status(400).json({ message: 'Nombre y contacto son obligatorios.' });
  const trimmedEmail = email ? String(email).trim() : null;
  const trimmedPhone = phone ? String(phone).trim() : null;
  if (trimmedEmail && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmedEmail)) {
    return res.status(400).json({ message: 'El correo electrónico no tiene un formato válido (ej. cliente@gmail.com).' });
  }
  if (trimmedPhone) {
    const digits = trimmedPhone.replace(/\D/g, '');
    if (!/^\+?[0-9\s\-()]{7,25}$/.test(trimmedPhone) || digits.length < 7 || digits.length > 15) {
      return res.status(400).json({ message: 'El teléfono debe contener entre 7 y 15 dígitos válidos (ej. +54 9 11 1234-5678).' });
    }
  }
  const c = await prisma.customer.create({ data: { name: name.trim(), contact: contact.trim(), email: trimmedEmail || null, phone: trimmedPhone || null } });
  res.status(201).json({ id: c.id, message: 'Cliente registrado correctamente.' });
}
export async function updateCustomer(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'El ID del cliente no es válido.' });
    const { name, contact, email, phone } = req.body || {};
    if (!name?.trim() || !contact?.trim()) return res.status(400).json({ message: 'Nombre y contacto son obligatorios.' });
    const trimmedEmail = email ? String(email).trim() : null;
    const trimmedPhone = phone ? String(phone).trim() : null;
    if (trimmedEmail && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmedEmail)) {
      return res.status(400).json({ message: 'El correo electrónico no tiene un formato válido (ej. cliente@gmail.com).' });
    }
    if (trimmedPhone) {
      const digits = trimmedPhone.replace(/\D/g, '');
      if (!/^\+?[0-9\s\-()]{7,25}$/.test(trimmedPhone) || digits.length < 7 || digits.length > 15) {
        return res.status(400).json({ message: 'El teléfono debe contener entre 7 y 15 dígitos válidos (ej. +54 9 11 1234-5678).' });
      }
    }
    await prisma.customer.update({ where: { id }, data: { name: name.trim(), contact: contact.trim(), email: trimmedEmail || null, phone: trimmedPhone || null } });
    res.json({ message: 'Cliente actualizado correctamente.' });
  } catch (e) { res.status(e.code === 'P2025' ? 404 : 500).json({ message: e.code === 'P2025' ? 'Cliente no encontrado.' : e.message }); }
}
// Un cliente con ventas asociadas no se puede eliminar: el historial debe
// conservar a quién se vendió. Sin ventas, la baja es física.
export async function deleteCustomer(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'El ID del cliente no es válido.' });
    if (!await prisma.customer.findUnique({ where: { id } })) return res.status(404).json({ message: 'Cliente no encontrado.' });
    if (await prisma.sale.findFirst({ where: { customerId: id } })) return res.status(400).json({ message: 'No se puede eliminar un cliente con ventas asociadas.' });
    await prisma.customer.delete({ where: { id } });
    res.json({ message: 'Cliente eliminado correctamente.' });
  } catch (e) { res.status(500).json({ message: e.message }); }
}
export async function customerDetail(req, res) {
  const c = await prisma.customer.findUnique({ where: { id: Number(req.params.id) } });
  if (!c) return res.status(404).json({ message: 'Cliente no encontrado.' });
  const rows = await prisma.saleItem.findMany({ where: { sale: { customerId: c.id } }, include: { product: true } });
  const frequentMap = new Map();
  for (const r of rows) frequentMap.set(r.productId, (frequentMap.get(r.productId) || 0) + r.quantity);
  const frequent = [...frequentMap].map(([productId, units]) => ({
    productId,
    productName: rows.find(r => r.productId === productId)?.product?.name || `Producto #${productId}`,
    units
  })).sort((a, b) => b.units - a.units);
  const [sales, allSalesAgg] = await Promise.all([
    prisma.sale.findMany({
      where: { customerId: c.id },
      select: { id: true, total: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10
    }),
    prisma.sale.aggregate({
      where: { customerId: c.id },
      _count: { id: true },
      _sum: { total: true }
    })
  ]);
  const totalPurchasesCents = moneyToCents(allSalesAgg._sum.total ?? 0);
  const purchasesCount = allSalesAgg._count.id;
  res.json({
    customer: c,
    frequent,
    sales: sales.map(s => ({
      id: s.id,
      receiptNumber: receiptNumber(s.id),
      totalCents: moneyToCents(s.total),
      createdAt: s.createdAt.toISOString()
    })),
    totalPurchasesCents,
    purchasesCount
  });
}


export async function reports(req, res) {
  try {
    const { from, to } = req.query;
    const fromDate = from ? new Date(`${from}T00:00:00`) : null;
    const toDate = to ? new Date(`${to}T23:59:59.999`) : null;
    if ((fromDate && Number.isNaN(fromDate.getTime())) || (toDate && Number.isNaN(toDate.getTime()))) {
      return res.status(400).json({ message: 'Las fechas del filtro no son válidas.' });
    }
    if (fromDate && toDate && fromDate > toDate) {
      return res.status(400).json({ message: 'La fecha inicial debe ser anterior o igual a la fecha final.' });
    }
    const dateFilter = (fromDate || toDate) ? { createdAt: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } } : {};

    const [sales, allProducts, deposits, transfers] = await Promise.all([
      prisma.sale.findMany({ where: dateFilter, include: { items: { include: { product: true } } }, orderBy: { createdAt: 'asc' } }),
      prisma.product.findMany({ where: { active: true }, include: { stocks: true } }),
      prisma.deposit.findMany({ select: { id: true, name: true } }),
      prisma.transfer.count({ where: dateFilter })
    ]);

    const salesTotalCents = sales.reduce((n, s) => n + moneyToCents(s.total), 0);
    const salesCount = sales.length;
    const averageTicketCents = salesCount > 0 ? Math.round(salesTotalCents / salesCount) : 0;

    // Stock bajo y plan de reposición urgente
    const lowStock = [];
    const replenishmentList = [];
    for (const p of allProducts) {
      const currentStock = (p.stocks || []).reduce((acc, s) => acc + s.quantity, 0);
      if (currentStock <= p.lowStockThreshold) {
        lowStock.push({ id: p.id, name: p.name, stock: currentStock, threshold: p.lowStockThreshold });
        const unitsNeeded = Math.max(1, p.lowStockThreshold - currentStock);
        const referenceValueCents = unitsNeeded * moneyToCents(p.price);
        replenishmentList.push({
          productId: p.id,
          productName: p.name,
          sku: p.code,
          category: p.category || 'General',
          currentStock,
          threshold: p.lowStockThreshold,
          unitsNeeded,
          priceCents: moneyToCents(p.price),
          referenceValueCents,
          priority: currentStock === 0 ? 'CRÍTICA' : 'ALTA'
        });
      }
    }
    replenishmentList.sort((a, b) => (a.priority === b.priority ? b.unitsNeeded - a.unitsNeeded : a.priority === 'CRÍTICA' ? -1 : 1));
    const replenishment = {
      totalItems: replenishmentList.length,
      totalUnitsNeeded: replenishmentList.reduce((acc, r) => acc + r.unitsNeeded, 0),
      totalReferenceValueCents: replenishmentList.reduce((acc, r) => acc + r.referenceValueCents, 0),
      items: replenishmentList
    };

    // Ranking de más vendidos y top por facturación
    const bestSellersMap = new Map();
    const revenueMap = new Map();
    sales.forEach(s => s.items.forEach(i => {
      const bestSeller = bestSellersMap.get(i.productId) || { productId: i.productId, productName: i.product.name, units: 0 };
      bestSeller.units += i.quantity;
      bestSellersMap.set(i.productId, bestSeller);
      const existing = revenueMap.get(i.productId) || { productId: i.productId, productName: i.product.name, sku: i.product.code, units: 0, revenueCents: 0 };
      existing.units += i.quantity;
      existing.revenueCents += i.quantity * moneyToCents(i.price);
      revenueMap.set(i.productId, existing);
    }));
    const bestSellers = [...bestSellersMap.values()].sort((a, b) => b.units - a.units).slice(0, 10);
    const topRevenue = [...revenueMap.values()].sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 10);

    // Ventas diarias
    const toLocalDateString = (d) => {
      const dt = new Date(d);
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    };

    const dailyMap = new Map();
    sales.forEach(s => {
      const key = toLocalDateString(s.createdAt);
      dailyMap.set(key, (dailyMap.get(key) || 0) + moneyToCents(s.total));
    });

    let dailySales = [];
    if (fromDate && toDate) {
      const cur = new Date(fromDate);
      cur.setHours(0, 0, 0, 0);
      const end = new Date(toDate);
      end.setHours(0, 0, 0, 0);
      while (cur <= end) {
        const key = toLocalDateString(cur);
        dailySales.push({ date: key, totalCents: dailyMap.get(key) || 0 });
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      dailySales = [...dailyMap].sort(([a], [b]) => a.localeCompare(b)).map(([date, totalCents]) => ({ date, totalCents }));
    }

    // Desglose de ventas por depósito
    const depositSalesMap = new Map();
    sales.forEach(s => {
      const cur = depositSalesMap.get(s.depositId) || { count: 0, totalCents: 0 };
      cur.count += 1;
      cur.totalCents += moneyToCents(s.total);
      depositSalesMap.set(s.depositId, cur);
    });
    const warehouseBreakdown = deposits.map(d => {
      const stat = depositSalesMap.get(d.id) || { count: 0, totalCents: 0 };
      return {
        id: d.id,
        name: d.name,
        count: stat.count,
        totalCents: stat.totalCents,
        percentage: salesTotalCents > 0 ? Math.round((stat.totalCents / salesTotalCents) * 100) : 0
      };
    }).sort((a, b) => b.totalCents - a.totalCents);

    // Mercadería sin rotación (stock inmovilizado en el período)
    const soldProductIds = new Set();
    sales.forEach(s => s.items.forEach(i => soldProductIds.add(i.productId)));
    const stagnant = allProducts
      .filter(p => {
        const st = (p.stocks || []).reduce((acc, x) => acc + x.quantity, 0);
        return st > 0 && !soldProductIds.has(p.id);
      })
      .map(p => {
        const units = (p.stocks || []).reduce((acc, x) => acc + x.quantity, 0);
        return {
          id: p.id,
          name: p.name,
          sku: p.code,
          category: p.category || 'General',
          stock: units,
          referenceValueCents: units * moneyToCents(p.price)
        };
      })
      .sort((a, b) => b.referenceValueCents - a.referenceValueCents);
    const stagnantStock = {
      count: stagnant.length,
      totalUnits: stagnant.reduce((acc, x) => acc + x.stock, 0),
      totalReferenceValueCents: stagnant.reduce((acc, x) => acc + x.referenceValueCents, 0),
      items: stagnant.slice(0, 10)
    };

    res.json({
      lowStock,
      bestSellers,
      dailySales,
      sales: {
        totalCents: salesTotalCents,
        count: salesCount,
        averageTicketCents
      },
      transfers,
      replenishment,
      warehouseBreakdown,
      stagnantStock,
      topRevenue
    });
  } catch (e) {
    return res.status(500).json({ message: 'No pudimos generar los reportes.', details: e.message });
  }
}
export async function team(req, res) { const users = await prisma.user.findMany({ orderBy: { name: 'asc' } }); res.json({ items: users.map(u => ({ id: u.id, fullName: u.name, email: u.email, appRole: appRole(u) })) }); }
export async function updateRole(req, res) { const next = String(req.body.appRole || 'caja'); if (!['administrador', 'caja', 'deposito'].includes(next)) return res.status(400).json({ message: 'Rol inválido.' }); await prisma.user.update({ where: { id: Number(req.params.id) }, data: { role: next === 'administrador' ? 'ADMIN' : 'USER', appRole: next } }); res.json({ message: 'Rol actualizado correctamente.' }); }
async function processRecognitionImage(photo) {
  const analysis = await analyzeProductImage(photo);

  // Modo AprilTags
  if (Array.isArray(analysis?.tags)) {
    const tagIds = analysis.tags.map(t => t.id);
    const products = await prisma.product.findMany({
      where: { active: true, apriltagId: { in: tagIds } },
      include: {
        stocks: { include: { deposit: true } },
        priceRules: { orderBy: { minQuantity: 'asc' } },
      },
    });

    const itemsMap = new Map();
    for (const tag of analysis.tags) {
      const p = products.find(prod => prod.apriltagId === tag.id);
      if (p) {
        if (!itemsMap.has(p.id)) {
          itemsMap.set(p.id, {
            id: p.id,
            name: p.name,
            sku: p.code,
            priceCents: moneyToCents(p.price),
            quantity: 0,
            suggestedQuantity: 0,
            priceRules: (p.priceRules || []).map(r => ({
              id: r.id,
              minQuantity: r.minQuantity,
              priceCents: moneyToCents(r.price),
            })),
            stocks: p.stocks.map(s => ({
              warehouseId: s.depositId,
              warehouseName: s.deposit.name,
              quantity: s.quantity,
            })),
          });
        }
        const item = itemsMap.get(p.id);
        item.quantity += 1;
        item.suggestedQuantity += 1;
      }
    }

    return {
      simulated: false,
      status: 'success',
      tags_detected: analysis.tags,
      items: Array.from(itemsMap.values()),
      detections: [],
    };
  }

  // Fallback para respuesta OCR/Barcode legacy
  if (analysis?.text_evidence) {
    console.info(
      "[OCR]",
      JSON.stringify({
        requestId: analysis.request_id,
        state:
          analysis.timings_ms?.ocr === undefined
            ? "skipped"
            : analysis.agents?.ocr?.state,
        texts: (analysis.text_evidence || []).map(({ text, score }) => ({ text, score })),
        codes: (analysis.identifiers || [])
          .filter(item => item.source === "ocr")
          .map(({ value, checksum_valid }) => ({
            value,
            checksumValid: checksum_valid,
          })),
        warnings: (analysis.warnings || []).filter(warning =>
          warning.startsWith("ocr_"),
        ),
      }),
    );
  }
  const [catalog, detections] = await Promise.all([
    findRecognitionCatalogCandidates(prisma, analysis),
    buildRecognitionDetections(analysis),
  ]);
  const items = rankRecognitionProducts(catalog);
  const localCodes = new Set(items.map(item => canonicalGtin(item.sku)));
  return {
    simulated: false,
    status: analysis?.status,
    requestId: analysis?.request_id,
    pipelineVersion: analysis?.pipeline_version,
    quality: analysis?.quality,
    consensus: analysis?.consensus,
    identifiers: analysis?.identifiers,
    agents: analysis?.agents,
    warnings: analysis?.warnings,
    detections: (detections || []).map(detection => ({
      ...detection,
      inLocalCatalog: localCodes.has(canonicalGtin(detection.value)),
    })),
    items,
  };
}

export async function salesScan(req, res) {
  try {
    const photo = photoFields(req.body);
    if (!photo.photoData) {
      return res.status(400).json({ message: 'Se requiere una imagen para el escaneo de venta.' });
    }
    const result = await processRecognitionImage(photo);
    return res.json(result);
  } catch (e) {
    return res.status(e.statusCode || e.status || 500).json({ message: e.message || 'No se pudo analizar la solicitud.' });
  }
}

export async function recognition(req, res) {
  try {
    const q = String(req.body.query || '').trim();
    const photo = photoFields(req.body);
    if (!q && !photo.photoData) {
      return res.status(400).json({ message: 'Ingresá un término de búsqueda o capturá una foto para analizar.' });
    }

    if (photo.photoData) {
      const result = await processRecognitionImage(photo);
      return res.json(result);
    }

    const products = await prisma.product.findMany({
      where: { active: true, OR: [{ name: { contains: q, mode: 'insensitive' } }, { code: { contains: q, mode: 'insensitive' } }] },
      include: {
        stocks: {
          include: { deposit: true }
        }
      },
      take: 8
    });
    res.json({
      simulated: false,
      status: 'catalog_search',
      items: products.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.code,
        priceCents: moneyToCents(p.price),
        suggestedQuantity: 1,
        stocks: p.stocks.map(s => ({
          warehouseId: s.depositId,
          warehouseName: s.deposit.name,
          quantity: s.quantity
        }))
      }))
    });
  } catch (e) {
    res.status(e.statusCode || e.status || 500).json({ message: e.message || 'No se pudo analizar la solicitud.' });
  }
}
// ─── Ofertas por Telegram: CRUD completo con lógica de campaña ───
// Ciclo de vida: Borrador → Lista para enviar → Enviada → Archivada
// (con Cancelada como vía de escape y reapertura como Borrador).
export async function listTelegram(req, res) {
  try {
    const status = String(req.query.status || '').trim();
    const search = String(req.query.search || '').trim();
    if (status && !isValidStatus(status))
      return res.status(400).json({ message: `Estado inválido. Valores posibles: ${TELEGRAM_STATUSES.join(', ')}.` });
    const rows = await prisma.telegramOffer.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(search
          ? { OR: [{ title: { contains: search, mode: 'insensitive' } }, { message: { contains: search, mode: 'insensitive' } }] }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    const items = await Promise.all(rows.map(r => enrichOffer(prisma, r)));
    res.json({ items });
  } catch (e) {
    res.status(500).json({ message: 'No pudimos obtener las ofertas.', details: e.message });
  }
}

export async function getTelegram(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'El ID de la oferta no es válido.' });
    const offer = await prisma.telegramOffer.findUnique({ where: { id } });
    if (!offer) return res.status(404).json({ message: 'Oferta no encontrada.' });
    res.json({ offer: await enrichOffer(prisma, offer) });
  } catch (e) {
    res.status(500).json({ message: 'No pudimos obtener la oferta.', details: e.message });
  }
}

export async function createTelegram(req, res) {
  try {
    const input = normalizeOfferInput(req.body);
    const initialStatus = input.status || 'Borrador';
    if (!isValidStatus(initialStatus))
      return res.status(400).json({ message: `Estado inválido. Valores posibles: ${TELEGRAM_STATUSES.join(', ')}.` });
    if (!['Borrador', 'Lista para enviar'].includes(initialStatus))
      return res.status(400).json({ message: 'Una oferta nueva solo puede nacer como Borrador o Lista para enviar.' });
    const { errors, dates } = validateOfferShape({ ...input, status: initialStatus });
    if (errors.length) return res.status(400).json({ message: errors[0], errors });
    const catalog = await assertOfferCatalog(prisma, input.items, input.customerIds);
    if (catalog.errors.length) return res.status(400).json({ message: catalog.errors[0], errors: catalog.errors });
    if (initialStatus === 'Lista para enviar') {
      if (isExpired(dates.validUntil))
        return res.status(400).json({ message: 'No se puede listar para enviar una oferta con vigencia finalizada.' });
      if (catalog.withoutStock.length === input.items.length && input.items.length)
        return res.status(400).json({ message: 'Ningún producto tiene stock disponible. Reponé antes de listar la oferta.' });
    }
    const productIds = input.items.map(i => i.productId);
    const created = await prisma.telegramOffer.create({
      data: {
        title: input.title,
        message: input.message,
        status: initialStatus,
        productIds,
        customerIds: input.customerIds,
        items: input.items,
        discountPercent: input.discountPercent,
        validFrom: dates.validFrom,
        validUntil: dates.validUntil,
        scheduledAt: dates.scheduledAt,
        userId: req.user?.id ?? null,
      },
    });
    const enriched = await enrichOffer(prisma, created);
    res.status(201).json({ id: created.id, message: 'Oferta creada correctamente.', item: enriched, warnings: catalog.warnings });
  } catch (e) {
    res.status(500).json({ message: 'No pudimos crear la oferta.', details: e.message });
  }
}

export async function updateTelegramFull(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'El ID de la oferta no es válido.' });
    const existing = await prisma.telegramOffer.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Oferta no encontrada.' });
    if (!EDITABLE_STATUSES.includes(existing.status))
      return res.status(409).json({ message: `Una oferta ${existing.status} no se puede editar. Duplicala para reutilizarla.` });
    const requestedStatus = typeof req.body?.status === 'string' && req.body.status.trim()
      ? req.body.status.trim()
      : existing.status;
    if (requestedStatus !== existing.status && !canTransition(existing.status, requestedStatus))
      return res.status(409).json({ message: `No se puede pasar de "${existing.status}" a "${requestedStatus}".` });
    const input = normalizeOfferInput({ ...req.body, status: requestedStatus });
    const { errors, dates } = validateOfferShape({ ...input, status: requestedStatus });
    if (errors.length) return res.status(400).json({ message: errors[0], errors });
    const catalog = await assertOfferCatalog(prisma, input.items, input.customerIds);
    if (catalog.errors.length) return res.status(400).json({ message: catalog.errors[0], errors: catalog.errors });
    if (requestedStatus === 'Lista para enviar') {
      if (isExpired(dates.validUntil))
        return res.status(400).json({ message: 'No se puede listar para enviar una oferta con vigencia finalizada.' });
      if (catalog.withoutStock.length === input.items.length && input.items.length)
        return res.status(400).json({ message: 'Ningún producto tiene stock disponible. Reponé antes de listar la oferta.' });
    }
    const updated = await prisma.telegramOffer.update({
      where: { id },
      data: {
        title: input.title,
        message: input.message,
        status: requestedStatus,
        productIds: input.items.map(i => i.productId),
        customerIds: input.customerIds,
        items: input.items,
        discountPercent: input.discountPercent,
        validFrom: dates.validFrom,
        validUntil: dates.validUntil,
        scheduledAt: dates.scheduledAt,
      },
    });
    res.json({ message: 'Oferta actualizada correctamente.', item: await enrichOffer(prisma, updated), warnings: catalog.warnings });
  } catch (e) {
    res.status(e.code === 'P2025' ? 404 : 500).json({ message: e.code === 'P2025' ? 'Oferta no encontrada.' : e.message });
  }
}

// PATCH /telegram/:id — solo cambia el estado respetando la máquina de estados.
export async function updateTelegram(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'El ID de la oferta no es válido.' });
    const next = String(req.body?.status || '').trim();
    if (!next || !isValidStatus(next))
      return res.status(400).json({ message: `Estado inválido. Valores posibles: ${TELEGRAM_STATUSES.join(', ')}.` });
    const existing = await prisma.telegramOffer.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Oferta no encontrada.' });
    const hasCustomRecipients = Array.isArray(req.body?.customerIds);
    const cleanedCustomerIds = hasCustomRecipients
      ? [...new Set(req.body.customerIds.map(Number).filter(n => Number.isInteger(n) && n > 0))]
      : undefined;
    const isUpdatingSentRecipients = existing.status === 'Enviada' && next === 'Enviada' && hasCustomRecipients;
    if (!isUpdatingSentRecipients && !canTransition(existing.status, next))
      return res.status(409).json({ message: `No se puede pasar de "${existing.status}" a "${next}".` });
    if (['Lista para enviar', 'Enviada'].includes(next)) {
      if (isExpired(existing.validUntil))
        return res.status(400).json({ message: 'La vigencia finalizó: actualizá las fechas antes de avanzar la oferta.' });
      const items = Array.isArray(existing.items) && existing.items.length
        ? existing.items
        : (Array.isArray(existing.productIds) ? existing.productIds : []).map(pid => ({ productId: Number(pid) }));
      const catalog = await assertOfferCatalog(prisma, items, cleanedCustomerIds ?? []);
      if (catalog.errors.length)
        return res.status(400).json({ message: catalog.errors[0], errors: catalog.errors });
      if (catalog.withoutStock.length === items.length && items.length)
        return res.status(400).json({ message: 'Ningún producto tiene stock disponible. Reponé antes de enviar.' });
    }
    const updated = await prisma.telegramOffer.update({
      where: { id },
      data: {
        status: next,
        ...(next === 'Enviada' ? { sentAt: new Date() } : {}),
        ...(cleanedCustomerIds !== undefined ? { customerIds: cleanedCustomerIds } : {}),
      },
    });
    res.json({ message: 'Estado actualizado.', item: await enrichOffer(prisma, updated) });
  } catch (e) {
    res.status(e.code === 'P2025' ? 404 : 500).json({ message: e.code === 'P2025' ? 'Oferta no encontrada.' : e.message });
  }
}

export async function duplicateTelegram(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'El ID de la oferta no es válido.' });
    const existing = await prisma.telegramOffer.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Oferta no encontrada.' });
    const baseTitle = (existing.title || 'Oferta').replace(/\s*\(copia(?:\s+\d+)?\)$/i, '').trim() || 'Oferta';
    const suffix = ' (copia)';
    const copyTitle = `${baseTitle.slice(0, 80 - suffix.length).trim()}${suffix}`;
    const copy = await prisma.telegramOffer.create({
      data: {
        title: copyTitle,
        message: existing.message,
        status: 'Borrador',
        productIds: existing.productIds,
        customerIds: existing.customerIds,
        items: existing.items,
        discountPercent: existing.discountPercent ?? null,
        validFrom: null,
        validUntil: null,
        scheduledAt: null,
        sentAt: null,
        userId: req.user?.id ?? null,
      },
    });
    res.status(201).json({ id: copy.id, message: 'Oferta duplicada como borrador.', item: await enrichOffer(prisma, copy) });
  } catch (e) {
    res.status(500).json({ message: 'No pudimos duplicar la oferta.', details: e.message });
  }
}

// POST /telegram/:id/broadcast — difusión inmediata a TODOS los clientes.
// A diferencia de "Enviar" (que respeta los destinatarios elegidos y exige
// haber pasado por "Lista para enviar"), difundir limpia los destinatarios y
// marca Enviada en un solo paso deliberado (el frontend pide confirmación).
export async function broadcastTelegram(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'El ID de la oferta no es válido.' });
    const existing = await prisma.telegramOffer.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Oferta no encontrada.' });
    if (!['Borrador', 'Lista para enviar'].includes(existing.status))
      return res.status(409).json({ message: `Solo se puede difundir una oferta en Borrador o Lista para enviar (actual: ${existing.status}).` });
    if (isExpired(existing.validUntil))
      return res.status(400).json({ message: 'La vigencia finalizó: actualizá las fechas antes de difundir.' });
    const items = Array.isArray(existing.items) && existing.items.length
      ? existing.items
      : (Array.isArray(existing.productIds) ? existing.productIds : []).map(pid => ({ productId: Number(pid) }));
    if (!items.length) return res.status(400).json({ message: 'La oferta no tiene productos para difundir.' });
    const catalog = await assertOfferCatalog(prisma, items, []);
    if (catalog.errors.length) return res.status(400).json({ message: catalog.errors[0], errors: catalog.errors });
    if (catalog.withoutStock.length === items.length)
      return res.status(400).json({ message: 'Ningún producto tiene stock disponible. Reponé antes de difundir.' });
    const updated = await prisma.telegramOffer.update({
      where: { id },
      data: { customerIds: [], status: 'Enviada', sentAt: new Date() },
    });
    res.json({ message: 'Difusión enviada a todos los clientes.', item: await enrichOffer(prisma, updated), warnings: catalog.warnings });
  } catch (e) {
    res.status(e.code === 'P2025' ? 404 : 500).json({ message: e.code === 'P2025' ? 'Oferta no encontrada.' : e.message });
  }
}

export async function deleteTelegram(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'El ID de la oferta no es válido.' });
    const existing = await prisma.telegramOffer.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Oferta no encontrada.' });
    if (!DELETABLE_STATUSES.includes(existing.status))
      return res.status(409).json({ message: `Una oferta ${existing.status} es histórico y no se puede eliminar. Archivarla la conserva sin mostrarla como activa.` });
    await prisma.telegramOffer.delete({ where: { id } });
    res.json({ message: 'Oferta eliminada correctamente.' });
  } catch (e) {
    res.status(e.code === 'P2025' ? 404 : 500).json({ message: e.code === 'P2025' ? 'Oferta no encontrada.' : e.message });
  }
}

export async function previewTelegram(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'El ID de la oferta no es válido.' });
    const offer = await prisma.telegramOffer.findUnique({ where: { id } });
    if (!offer) return res.status(404).json({ message: 'Oferta no encontrada.' });
    const enriched = await enrichOffer(prisma, offer);
    const customerId = req.query.customerId ? Number(req.query.customerId) : null;
    let customer = null;
    if (customerId) {
      if (!Number.isInteger(customerId)) return res.status(400).json({ message: 'El ID del cliente no es válido.' });
      customer = enriched.customers.find(c => c.id === customerId)
        || await prisma.customer.findUnique({ where: { id: customerId } });
      if (!customer) return res.status(404).json({ message: 'Cliente no encontrado.' });
    } else if (enriched.customers.length === 1) {
      customer = enriched.customers[0];
    }
    const realProducts = enriched.items.filter(i => !i.missing).map(i => ({ id: i.productId, name: i.name, price: i.price }));
    const text = buildPersonalizedMessage({
      baseMessage: enriched.message,
      customerName: customer?.name?.split(' ')[0] || null,
      products: realProducts,
      items: enriched.items.map(i => ({ productId: i.productId, offerPrice: i.offerPrice ?? null })),
      discountPercent: enriched.discountPercent,
      validUntil: enriched.validUntil,
    });
    const waMeLink = buildWaMeLink(customer?.phone || customer?.contact || '', text);
    res.json({
      preview: text,
      waMeLink,
      customer: customer ? { id: customer.id, name: customer.name, phone: customer.phone ?? null, contact: customer.contact } : null,
      offer: enriched,
    });
  } catch (e) {
    res.status(500).json({ message: 'No pudimos generar la vista previa.', details: e.message });
  }
}

export async function suggestTelegram(req, res) {
  try {
    const customerId = req.query.customerId ? Number(req.query.customerId) : null;
    if (req.query.customerId && !Number.isInteger(customerId))
      return res.status(400).json({ message: 'El ID del cliente no es válido.' });
    const suggestion = await suggestOfferForCustomer(prisma, customerId);
    if (suggestion.error) return res.status(404).json({ message: suggestion.error });
    res.json(suggestion);
  } catch (e) {
    res.status(500).json({ message: 'No pudimos generar la sugerencia.', details: e.message });
  }
}

export async function getAprilTagImage(req, res) {
  const tagId = Number(req.params.tagId);
  if (!Number.isInteger(tagId) || tagId < 0 || tagId > 586) {
    return res.status(400).json({ message: 'El ID de AprilTag debe estar entre 0 y 586.' });
  }

  const tagServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
  const size = Math.min(1200, Math.max(50, Number(req.query.size) || 300));

  try {
    const response = await fetch(`${tagServiceUrl}/api/tags/${tagId}/image?size=${size}`);
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.send(Buffer.from(arrayBuffer));
    }
  } catch (error) {
    // Si el microservicio Python está offline o cargando, generamos el SVG matemático real determinista
  }

  const svg = generateAprilTagSvg(tagId, size);
  if (svg) {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.send(svg);
  }

  return res.status(404).json({ message: 'Tag no encontrado' });
}

