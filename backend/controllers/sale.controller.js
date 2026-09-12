import prisma from '../config/prisma.js';

// Precio aplicable a una cantidad: la regla de mayor minQuantity <= cantidad,
// o el precio base del producto si no hay ninguna.
function priceForQuantity(product, quantity) {
  const rules = (product.priceRules || [])
    .filter((r) => r.minQuantity <= quantity)
    .sort((a, b) => b.minQuantity - a.minQuantity);
  return Number(rules[0]?.price ?? product.price);
}

// SB-044: arma el ticket de una venta ya confirmada (Sale + SaleItem persistidos,
// dentro de la transacción exitosa). No persiste nada nuevo: es una proyección de
// datos que ya existen en el modelo (Sale, SaleItem, Product, Deposit).
function buildTicket(sale, deposit) {
  return {
    saleId: sale.id,
    createdAt: sale.createdAt,
    deposit: { id: deposit.id, name: deposit.name },
    photoData: sale.photoData,
    photoMimeType: sale.photoMimeType,
    items: sale.items.map((it) => ({
      productId: it.productId,
      productName: it.product?.name ?? null,
      productCode: it.product?.code ?? null,
      quantity: it.quantity,
      price: Number(it.price),
      subtotal: Number(it.price) * it.quantity,
    })),
    total: Number(sale.total),
  };
}
// Historial de ventas
export const getSales = async (req, res) => {
  try {
    const query = req.query || {};
    const from = query.from ? new Date(`${query.from}T00:00:00`) : undefined;
    const to = query.to ? new Date(`${query.to}T23:59:59.999`) : undefined;
    if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
      return res.status(400).json({ error: 'Las fechas del filtro no son válidas' });
    }
    const depositId = query.depositId ? Number(query.depositId) : undefined;
    const sales = await prisma.sale.findMany({
      where: {
        ...(depositId !== undefined && Number.isInteger(depositId) ? { depositId } : {}),
        ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      include: { items: { include: { product: true } }, deposit: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(sales);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener el historial de ventas', details: error.message });
  }
};

// SB-042: Confirmar la venta, persistir detalle, descontar stock y registrar salida.
// El precio unitario y el total se calculan en el servidor (no se confía en el cliente).
export const createSale = async (req, res) => {
  try {
    const { depositId, items, photoData, photoMimeType } = req.body; // items: [{ productId, quantity }]
    const depositIdNum = Number(depositId);

    if (!Number.isInteger(depositIdNum) || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Datos incompletos. Se requiere depositId y una lista de items.',
      });
    }
    if (photoData !== undefined && (typeof photoData !== 'string' || photoData.length > 4_000_000)) {
      return res.status(400).json({ error: 'La foto no es válida o supera el tamaño máximo permitido.' });
    }
    if (photoMimeType && (typeof photoMimeType !== 'string' || !photoMimeType.startsWith('image/'))) {
      return res.status(400).json({ error: 'Sólo se permiten archivos de imagen.' });
    }

    // Consolida cantidades por producto y valida el formato de cada ítem.
    const wanted = new Map();
    for (const item of items) {
      const pid = Number(item.productId);
      const qty = Number(item.quantity);
      if (!Number.isInteger(pid) || !Number.isInteger(qty) || qty <= 0) {
        return res.status(400).json({ error: 'Cada ítem requiere productId válido y quantity entero mayor a 0' });
      }
      wanted.set(pid, (wanted.get(pid) ?? 0) + qty);
    }

    const saleResult = await prisma.$transaction(async (tx) => {
      const deposit = await tx.deposit.findUnique({ where: { id: depositIdNum } });
      if (!deposit) throw Object.assign(new Error('El depósito especificado no existe'), { status: 404 });

      const lineItems = [];
      for (const [productId, quantity] of wanted) {
        const product = await tx.product.findUnique({
          where: { id: productId },
          include: { priceRules: true },
        });
        if (!product) {
          throw Object.assign(new Error(`El producto ID ${productId} no existe`), { status: 404 });
        }

        const stockRecord = await tx.stock.findUnique({
          where: { productId_depositId: { productId, depositId: depositIdNum } },
        });
        if (!stockRecord || stockRecord.quantity < quantity) {
          throw Object.assign(
            new Error(`Stock insuficiente para "${product.name}": disponible ${stockRecord?.quantity ?? 0}, solicitado ${quantity}`),
            { status: 400 }
          );
        }

        lineItems.push({ productId, quantity, price: priceForQuantity(product, quantity) });
      }

      const total = lineItems.reduce((acc, it) => acc + it.price * it.quantity, 0);

      const sale = await tx.sale.create({
        data: {
          depositId: depositIdNum,
          userId: req.user?.id,
          total,
          photoData: photoData || null,
          photoMimeType: photoMimeType || null,
          items: { create: lineItems },
        },
        include: { items: { include: { product: true } } },
      });

      for (const it of lineItems) {
        await tx.stock.update({
          where: { productId_depositId: { productId: it.productId, depositId: depositIdNum } },
          data: { quantity: { decrement: it.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: it.productId,
            depositId: depositIdNum,
            quantity: it.quantity,
            type: 'OUT',
            saleId: sale.id,
            reason: `Venta #${sale.id}`,
          },
        });
      }

      return { sale, deposit };
    });

    const ticket = buildTicket(saleResult.sale, saleResult.deposit);

    return res.status(201).json({ message: 'Venta confirmada con éxito', sale: saleResult.sale, ticket });
  } catch (error) {
    const status = error.status || 500;
    if (status === 500) {
      return res.status(500).json({ error: 'Error al procesar la venta', details: error.message });
    }
    return res.status(status).json({ error: error.message });
  }
};
