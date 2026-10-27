/**
 * Lógica de negocio completa para Ofertas por Telegram.
 *
 * Una oferta es una campaña de difusión con ciclo de vida propio:
 *
 *   Borrador ──► Lista para enviar ──► Enviada ──► Archivada
 *      │               │                                ▲
 *      │               ▼                                │
 *      └────► Cancelada ──► (reabre como Borrador) ─────┘
 *             Archivada ──► Borrador (reutilizar campaña)
 *             Cancelada ──► Borrador (reabrir)
 *
 * Reglas que se garantizan acá (y se reutilizan en controller + tests):
 *  1. Título (3-80) y mensaje (5-2000) obligatorios.
 *  2. 1 a 20 productos por oferta, todos existentes y activos.
 *  3. El precio de oferta, si se informa, debe ser > 0 y < precio base.
 *  4. 0 a 200 clientes destinatarios; vacío = difusión general.
 *  5. La vigencia es opcional pero coherente (hasta >= desde).
 *  6. No se puede listar para enviar ni enviar una oferta vencida.
 *  7. No se puede enviar una oferta sin stock en TODOS sus productos.
 *  8. Enviada/Archivada son históricas: no se editan ni se eliminan.
 */

export const TELEGRAM_STATUSES = [
  'Borrador',
  'Lista para enviar',
  'Enviada',
  'Archivada',
  'Cancelada',
];

export const TELEGRAM_TRANSITIONS = {
  Borrador: ['Lista para enviar', 'Cancelada'],
  'Lista para enviar': ['Enviada', 'Borrador', 'Cancelada'],
  Enviada: ['Archivada'],
  Archivada: ['Borrador'],
  Cancelada: ['Borrador'],
};

export const TELEGRAM_LIMITS = {
  titleMin: 3,
  titleMax: 80,
  messageMin: 5,
  messageMax: 2000,
  minProducts: 1,
  maxProducts: 20,
  maxCustomers: 200,
  minDiscount: 1,
  maxDiscount: 90,
};

export const EDITABLE_STATUSES = ['Borrador', 'Lista para enviar', 'Cancelada'];
export const DELETABLE_STATUSES = ['Borrador', 'Lista para enviar', 'Cancelada'];

export function isValidStatus(status) {
  return TELEGRAM_STATUSES.includes(status);
}

export function canTransition(from, to) {
  if (from === to) return true;
  return (TELEGRAM_TRANSITIONS[from] || []).includes(to);
}

export function nextStatuses(from) {
  return TELEGRAM_TRANSITIONS[from] || [];
}

function toIntList(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const v of value) {
    const n = Number(v);
    if (Number.isInteger(n) && n > 0 && !out.includes(n)) out.push(n);
  }
  return out;
}

function parseDateInput(value) {
  if (value === undefined || value === null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return { invalid: true };
  return { date: d };
}

/**
 * Normaliza el cuerpo de creación/edición aceptando tanto el formato nuevo
 * ({ title, message, items: [{productId, offerPrice}], customerIds, ... })
 * como el formato legacy ({ message, productIds, customerIds, status }).
 */
export function normalizeOfferInput(body = {}) {
  const raw = body || {};
  let items = [];
  if (Array.isArray(raw.items) && raw.items.length) {
    items = raw.items.map(it => {
      if (typeof it === 'number') return { productId: Number(it), offerPrice: null };
      return {
        productId: Number(it?.productId),
        offerPrice:
          it?.offerPrice === undefined || it?.offerPrice === null || it?.offerPrice === ''
            ? null
            : Number(it.offerPrice),
      };
    });
  } else {
    items = toIntList(raw.productIds).map(id => ({ productId: id, offerPrice: null }));
  }
  // Deduplicar por productId quedándose con el primer precio informado.
  const seen = new Map();
  for (const it of items) {
    if (!Number.isInteger(it.productId) || it.productId <= 0) continue;
    if (!seen.has(it.productId)) seen.set(it.productId, it);
  }
  items = [...seen.values()];

  let title = typeof raw.title === 'string' ? sanitizeWhatsAppText(raw.title) : '';
  const message = typeof raw.message === 'string' ? sanitizeWhatsAppText(raw.message) : '';
  // Compatibilidad legacy: si no mandan título, se deriva del mensaje.
  if (!title && message) title = message.slice(0, TELEGRAM_LIMITS.titleMax).trim();

  const customerIds = toIntList(raw.customerIds ?? raw.customer_ids ?? []);

  const discountPercent =
    raw.discountPercent === undefined || raw.discountPercent === null || raw.discountPercent === ''
      ? null
      : Number(raw.discountPercent);

  return {
    title,
    message,
    items,
    customerIds,
    discountPercent,
    validFrom: raw.validFrom ?? null,
    validUntil: raw.validUntil ?? null,
    scheduledAt: raw.scheduledAt ?? null,
    status: typeof raw.status === 'string' ? raw.status.trim() : undefined,
  };
}

export function validateOfferShape(n) {
  const errors = [];
  if (!n.title || n.title.length < TELEGRAM_LIMITS.titleMin)
    errors.push(`El título debe tener al menos ${TELEGRAM_LIMITS.titleMin} caracteres.`);
  if (n.title && n.title.length > TELEGRAM_LIMITS.titleMax)
    errors.push(`El título no puede superar los ${TELEGRAM_LIMITS.titleMax} caracteres.`);
  if (!n.message || n.message.length < TELEGRAM_LIMITS.messageMin)
    errors.push(`El mensaje debe tener al menos ${TELEGRAM_LIMITS.messageMin} caracteres.`);
  if (n.message && n.message.length > TELEGRAM_LIMITS.messageMax)
    errors.push(`El mensaje no puede superar los ${TELEGRAM_LIMITS.messageMax} caracteres.`);
  if (!Array.isArray(n.items) || n.items.length < TELEGRAM_LIMITS.minProducts)
    errors.push('La oferta debe incluir al menos 1 producto.');
  if (n.items.length > TELEGRAM_LIMITS.maxProducts)
    errors.push(`La oferta no puede incluir más de ${TELEGRAM_LIMITS.maxProducts} productos.`);
  for (const it of n.items) {
    if (!Number.isInteger(it.productId) || it.productId <= 0) {
      errors.push('Cada producto debe tener un ID válido.');
      break;
    }
    if (it.offerPrice !== null && it.offerPrice !== undefined) {
      if (!Number.isFinite(it.offerPrice) || it.offerPrice <= 0) {
        errors.push('El precio de oferta debe ser un número mayor a cero.');
        break;
      }
    }
  }
  if (n.customerIds.length > TELEGRAM_LIMITS.maxCustomers)
    errors.push(`No se puede dirigir a más de ${TELEGRAM_LIMITS.maxCustomers} clientes por oferta.`);
  if (n.discountPercent !== null && n.discountPercent !== undefined) {
    if (
      !Number.isFinite(n.discountPercent) ||
      n.discountPercent < TELEGRAM_LIMITS.minDiscount ||
      n.discountPercent > TELEGRAM_LIMITS.maxDiscount
    )
      errors.push(
        `El descuento debe estar entre ${TELEGRAM_LIMITS.minDiscount} y ${TELEGRAM_LIMITS.maxDiscount} %.`
      );
  }
  const from = parseDateInput(n.validFrom);
  const until = parseDateInput(n.validUntil);
  const scheduled = parseDateInput(n.scheduledAt);
  if (from?.invalid) errors.push('La fecha de inicio de vigencia no es válida.');
  if (until?.invalid) errors.push('La fecha de fin de vigencia no es válida.');
  if (scheduled?.invalid) errors.push('La fecha programada no es válida.');
  if (from?.date && until?.date && until.date < from.date)
    errors.push('El fin de la vigencia debe ser posterior o igual al inicio.');
  if (n.status !== undefined && !isValidStatus(n.status))
    errors.push(`Estado inválido. Valores posibles: ${TELEGRAM_STATUSES.join(', ')}.`);
  return {
    errors,
    dates: {
      validFrom: from?.date ?? null,
      validUntil: until?.date ?? null,
      scheduledAt: scheduled?.date ?? null,
    },
  };
}

export function isExpired(validUntil, now = new Date()) {
  if (!validUntil) return false;
  const d = new Date(validUntil);
  if (Number.isNaN(d.getTime())) return false;
  const end = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999);
  return end.getTime() < now.getTime();
}

/**
 * Verifica existencia/estado de productos y clientes contra la base.
 * Devuelve { products, customers, stockByProduct, warnings, errors }.
 */
export async function assertOfferCatalog(db, items, customerIds) {
  const errors = [];
  const warnings = [];
  const productIds = items.map(i => i.productId);
  const products = productIds.length
    ? await db.product.findMany({ where: { id: { in: productIds } } })
    : [];
  const byId = new Map(products.map(p => [p.id, p]));
  const missing = productIds.filter(id => !byId.has(id));
  if (missing.length) errors.push(`Productos inexistentes: ${missing.join(', ')}.`);
  const inactive = products.filter(p => !p.active);
  if (inactive.length)
    errors.push(`No se puede ofertar productos dados de baja: ${inactive.map(p => p.name).join(', ')}.`);

  // Precio de oferta coherente con el precio base.
  for (const it of items) {
    const p = byId.get(it.productId);
    if (!p || it.offerPrice === null || it.offerPrice === undefined) continue;
    if (Number(it.offerPrice) >= Number(p.price))
      errors.push(
        `El precio de oferta de "${p.name}" debe ser menor al precio base ($${Number(p.price)}).`
      );
  }

  // Stock agregado por producto para advertir quiebres.
  let stockByProduct = new Map();
  if (productIds.length) {
    const stocks = await db.stock.groupBy({
      by: ['productId'],
      where: { productId: { in: productIds } },
      _sum: { quantity: true },
    });
    stockByProduct = new Map(stocks.map(s => [s.productId, s._sum.quantity ?? 0]));
  }
  const withoutStock = productIds.filter(id => (stockByProduct.get(id) ?? 0) <= 0);
  if (withoutStock.length && withoutStock.length < productIds.length) {
    const names = withoutStock.map(id => byId.get(id)?.name ?? `#${id}`).join(', ');
    warnings.push(`Sin stock actual: ${names}. Se van a mostrar igual pero conviene reponer.`);
  }

  let customers = [];
  if (customerIds.length) {
    customers = await db.customer.findMany({ where: { id: { in: customerIds } } });
    const found = new Set(customers.map(c => c.id));
    const missingC = customerIds.filter(id => !found.has(id));
    if (missingC.length) errors.push(`Clientes inexistentes: ${missingC.join(', ')}.`);
  }
  return { products, customers, stockByProduct, warnings, errors, withoutStock };
}

export function offerSavings(items, productsById, discountPercent = null) {
  let base = 0;
  let offer = 0;
  const pct = Number(discountPercent);
  const hasDiscount = Number.isFinite(pct) && pct > 0 && pct <= 90;
  for (const it of items) {
    const p = productsById.get(it.productId);
    if (!p) continue;
    const basePrice = Number(p.price);
    base += basePrice;
    if (it.offerPrice !== null && it.offerPrice !== undefined) {
      offer += Number(it.offerPrice);
    } else if (hasDiscount) {
      offer += Math.round(basePrice * (1 - pct / 100));
    } else {
      offer += basePrice;
    }
  }
  return { base, offer, savings: Math.max(0, base - offer) };
}

function fmtMoney(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d) {
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  const localDate = new Date(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(localDate);
}

/**
 * Normaliza un teléfono para links wa.me (solo dígitos, formato internacional).
 */
export function normalizeWhatsAppPhone(raw) {
  if (!raw) return '';
  let digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === 10) {
    digits = `549${digits}`;
  }
  return digits.length >= 7 && digits.length <= 15 ? digits : '';
}

/**
 * Construye el enlace oficial https://wa.me/<tel>?text=<mensaje> sin API externa.
 */
export function buildWaMeLink(phone, message) {
  const cleanPhone = normalizeWhatsAppPhone(phone);
  const encoded = encodeURIComponent(sanitizeWhatsAppText(message || '').trim());
  return cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encoded}`
    : `https://api.whatsapp.com/send?text=${encoded}`;
}

/**
 * Limpia y normaliza texto para WhatsApp:
 * - Elimina emojis y pictogramas de todos los planos Unicode para evitar
 *   que aparezcan como signo de pregunta (?) al abrir WhatsApp Web o Desktop.
 * - Reemplaza viñetas decorativas (▸, •, 🔹) por '-' estándar, que WhatsApp formatea nativamente como lista.
 * - Reemplaza flechas decorativas (➜, →) por '> ' o texto claro.
 * - Reemplaza divisores decorativos (━, ─, ═) por líneas estándar ASCII (---).
 * - Conserva texto alfanumérico, puntuación estándar, caracteres en español (á, é, í, ó, ú, ñ, ¿, ¡)
 *   y formato markdown nativo de WhatsApp (*negrita*, _cursiva_, ~tachado~).
 */
export function sanitizeWhatsAppText(text) {
  if (!text) return '';
  return String(text)
    .replace(/[━─═―—]{3,}/g, '---')
    .replaceAll('▸', '-')
    .replaceAll('🔹', '-')
    .replaceAll('•', '-')
    .replaceAll('✦', '')
    .replaceAll('➜', '>')
    .replaceAll('→', '>')
    .replaceAll('\uFFFD', '')
    .replaceAll('\u00A0', ' ')
    .replaceAll('\uFE0F', '')
    .replaceAll('\uFE0E', '')
    .replaceAll('\u200D', '')
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
    .replace(/[\u2300-\u23FF\u25A0-\u25FF\u2600-\u27BF\u2B00-\u2BFF]/g, '')
    .replace(/[\uD800-\uDFFF]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/^[ \t]+/gm, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Construye el texto final a enviar, resolviendo placeholders:
 * {{nombre}}, {{productos}}, {{descuento}}, {{vigencia}}.
 * Si el mensaje no incluye {{productos}}, se le anexa el detalle de productos.
 */
export function buildPersonalizedMessage({ baseMessage, customerName, products, items, discountPercent, validUntil }) {
  const rawMessage = sanitizeWhatsAppText(baseMessage || '');
  const hasProductsPlaceholder = rawMessage.includes('{{productos}}');
  const hasVigenciaPlaceholder = rawMessage.includes('{{vigencia}}');
  const hasDescuentoPlaceholder = rawMessage.includes('{{descuento}}');

  const productLines = products.map(p => {
    const it = items.find(i => i.productId === p.id);
    const offer = it?.offerPrice !== null && it?.offerPrice !== undefined ? Number(it.offerPrice) : null;
    const base = Number(p.price);
    if (offer !== null) return `- *${p.name}*: *${fmtMoney(offer)}* _(antes ${fmtMoney(base)})_`;
    if (discountPercent) {
      const withDiscount = Math.round(base * (1 - discountPercent / 100));
      return hasDescuentoPlaceholder
        ? `- *${p.name}*: *${fmtMoney(withDiscount)}* _(antes ${fmtMoney(base)})_`
        : `- *${p.name}*: *${fmtMoney(withDiscount)}* _(-${discountPercent}%)_`;
    }
    return `- *${p.name}*: *${fmtMoney(base)}*`;
  });

  const vigenciaText = validUntil ? `Válido hasta el ${fmtDate(validUntil)}` : 'Por tiempo limitado';

  let text = rawMessage
    .replaceAll('{{vigencia}}.', '{{vigencia}}')
    .replaceAll('{{nombre}}', customerName || 'cliente')
    .replaceAll('{{productos}}', productLines.join('\n'))
    .replaceAll('{{descuento}}', discountPercent ? `${discountPercent}% OFF` : 'precio especial')
    .replaceAll('{{vigencia}}', vigenciaText);
  if (!hasProductsPlaceholder && productLines.length) {
    text = `${text}\n\n${productLines.join('\n')}`;
  }
  if (!hasVigenciaPlaceholder && validUntil) {
    text += `\n\n${vigenciaText}`;
  }
  return sanitizeWhatsAppText(text).trim();
}

/**
 * Enriquece una oferta cruda de Prisma con productos, clientes,
 * advertencias y permisos derivados del estado.
 */
export async function enrichOffer(db, offer) {
  const items = Array.isArray(offer.items) ? offer.items : [];
  const productIds = items.length
    ? items.map(i => i?.productId).filter(Number.isInteger)
    : toIntList(offer.productIds);
  const customerIds = toIntList(offer.customerIds);
  const [products, customers, stocks] = await Promise.all([
    productIds.length ? db.product.findMany({ where: { id: { in: productIds } } }) : [],
    customerIds.length ? db.customer.findMany({ where: { id: { in: customerIds } } }) : [],
    productIds.length
      ? db.stock.groupBy({ by: ['productId'], where: { productId: { in: productIds } }, _sum: { quantity: true } })
      : [],
  ]);
  const stockByProduct = new Map(stocks.map(s => [s.productId, s._sum.quantity ?? 0]));
  const productsById = new Map(products.map(p => [p.id, p]));
  const pct = Number(offer.discountPercent);
  const hasDiscount = Number.isFinite(pct) && pct > 0 && pct <= 90;
  const detailedProducts = productIds.map(id => {
    const p = productsById.get(id);
    const it = items.find(i => i?.productId === id);
    if (!p) return { productId: id, missing: true, stock: 0 };
    const basePrice = Number(p.price);
    const explicitOfferPrice = it?.offerPrice !== null && it?.offerPrice !== undefined ? Number(it.offerPrice) : null;
    const effectivePrice = explicitOfferPrice !== null
      ? explicitOfferPrice
      : hasDiscount
        ? Math.round(basePrice * (1 - pct / 100))
        : basePrice;
    return {
      productId: p.id,
      name: p.name,
      sku: p.code,
      category: p.category || '',
      price: basePrice,
      offerPrice: explicitOfferPrice,
      effectivePrice,
      active: p.active,
      stock: stockByProduct.get(p.id) ?? 0,
      imageUrl: p.imageUrl || null,
    };
  });
  const expired = isExpired(offer.validUntil);
  const outOfStockCount = detailedProducts.filter(p => !p.missing && p.stock <= 0).length;
  const warnings = [];
  if (expired) warnings.push('La vigencia de esta oferta ya finalizó.');
  if (detailedProducts.some(p => p.missing)) warnings.push('Algún producto fue eliminado del catálogo.');
  if (detailedProducts.some(p => !p.missing && !p.active)) warnings.push('Algún producto está dado de baja.');
  if (outOfStockCount === detailedProducts.length && detailedProducts.length)
    warnings.push('Ningún producto tiene stock disponible.');
  else if (outOfStockCount > 0) warnings.push(`${outOfStockCount} producto(s) sin stock disponible.`);
  const { base, offer: offerTotal, savings } = offerSavings(items, productsById, offer.discountPercent);
  const realProducts = detailedProducts
    .filter(p => !p.missing)
    .map(p => ({ id: p.productId, name: p.name, price: p.price }));
  const defaultPreview = buildPersonalizedMessage({
    baseMessage: offer.message,
    customerName: 'cliente',
    products: realProducts,
    items: detailedProducts.map(p => ({ productId: p.productId, offerPrice: p.offerPrice ?? null })),
    discountPercent: offer.discountPercent ?? null,
    validUntil: offer.validUntil ?? null,
  });
  return {
    id: offer.id,
    title: sanitizeWhatsAppText(offer.title || ''),
    message: sanitizeWhatsAppText(offer.message),
    status: offer.status,
    items: detailedProducts,
    productIds,
    customerIds,
    customers: customers.map(c => ({
      id: c.id,
      name: c.name,
      contact: c.contact,
      phone: c.phone ?? null,
      email: c.email ?? null,
    })),
    customerCount: customerIds.length,
    isBroadcast: customerIds.length === 0,
    discountPercent: offer.discountPercent ?? null,
    validFrom: offer.validFrom ?? null,
    validUntil: offer.validUntil ?? null,
    scheduledAt: offer.scheduledAt ?? null,
    sentAt: offer.sentAt ?? null,
    createdAt: offer.createdAt,
    updatedAt: offer.updatedAt ?? offer.createdAt,
    userId: offer.userId ?? null,
    expired,
    outOfStockCount,
    baseTotal: base,
    offerTotal,
    totalSavings: savings,
    waMeLink: buildWaMeLink(null, defaultPreview),
    warnings,
    canEdit: EDITABLE_STATUSES.includes(offer.status),
    canDelete: DELETABLE_STATUSES.includes(offer.status),
    nextStatuses: nextStatuses(offer.status),
  };
}

/**
 * Sugiere una oferta a partir del historial: top 3 productos más comprados
 * por el cliente, o los más vendidos globalmente si no hay historial.
 */
export async function suggestOfferForCustomer(db, customerId) {
  let customer = null;
  let candidates = [];
  if (customerId) {
    customer = await db.customer.findUnique({ where: { id: Number(customerId) } });
    if (!customer) return { error: 'El cliente seleccionado no existe.' };
    const rows = await db.saleItem.findMany({
      where: { sale: { customerId: customer.id } },
      include: { product: true },
    });
    const map = new Map();
    for (const r of rows) {
      if (!r.product || !r.product.active) continue;
      const prev = map.get(r.productId) || { product: r.product, units: 0 };
      prev.units += r.quantity;
      map.set(r.productId, prev);
    }
    candidates = [...map.values()].sort((a, b) => b.units - a.units);
  }
  if (!candidates.length) {
    // Fallback global: más vendidos de los últimos 90 días.
    const since = new Date();
    since.setDate(since.getDate() - 90);
    const rows = await db.saleItem.findMany({
      where: { sale: { createdAt: { gte: since } } },
      include: { product: true },
    });
    const map = new Map();
    for (const r of rows) {
      if (!r.product || !r.product.active) continue;
      const prev = map.get(r.productId) || { product: r.product, units: 0 };
      prev.units += r.quantity;
      map.set(r.productId, prev);
    }
    candidates = [...map.values()].sort((a, b) => b.units - a.units);
  }

  let frequent = [];
  if (candidates.length) {
    const candidateIds = candidates.map(c => c.product.id);
    const stocks = await db.stock.groupBy({
      by: ['productId'],
      where: { productId: { in: candidateIds } },
      _sum: { quantity: true },
    });
    const stockMap = new Map(stocks.map(s => [s.productId, s._sum.quantity ?? 0]));
    const withStock = candidates.filter(c => (stockMap.get(c.product.id) ?? 0) > 0);
    frequent = (withStock.length ? withStock : candidates).slice(0, 3);
  }

  if (!frequent.length) {
    // Último fallback: productos activos con stock (deduplicados por producto).
    const withStock = await db.stock.findMany({
      where: { quantity: { gt: 0 }, product: { active: true } },
      include: { product: true },
      orderBy: { quantity: 'desc' },
      take: 15,
    });
    const map = new Map();
    for (const s of withStock) {
      if (!s.product || !s.product.active) continue;
      const prev = map.get(s.productId) || { product: s.product, units: 0 };
      prev.units += s.quantity;
      map.set(s.productId, prev);
    }
    frequent = [...map.values()].sort((a, b) => b.units - a.units).slice(0, 3);
  }
  if (!frequent.length) return { error: 'Todavía no hay productos con historial para sugerir.' };
  return {
    title: customer ? `Oferta especial para ${customer.name}`.slice(0, 80) : 'Destacados con Descuento',
    message: customer
      ? `¡Hola *{{nombre}}*!\nPreparamos un *{{descuento}}* especial en tus productos más llevados:\n\n{{productos}}\n\n{{vigencia}}\n_Respondé a este mensaje para sumarlos a tu pedido._`
      : `¡Hola *{{nombre}}*!\nAprovechá *{{descuento}}* en nuestros productos más pedidos:\n\n{{productos}}\n\n{{vigencia}}\n_Respondé con las cantidades deseadas para reservar._`,
    discountPercent: 15,
    items: frequent.map(f => ({ productId: f.product.id, offerPrice: null })),
    products: frequent.map(f => ({
      productId: f.product.id,
      name: f.product.name,
      sku: f.product.code,
      price: Number(f.product.price),
      units: f.units,
    })),
    customerId: customer?.id ?? null,
  };
}
