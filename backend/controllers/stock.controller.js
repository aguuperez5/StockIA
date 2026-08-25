import prisma from '../config/prisma.js';

const VALID_TYPES = ['IN', 'OUT', 'ADJUST'];

// SB-032: Consultar stock existente para un producto en un depósito
export const getStock = async (req, res) => {
  try {
    const productId = parseInt(req.query.productId, 10);
    const depositId = parseInt(req.query.depositId, 10);

    if (isNaN(productId) || isNaN(depositId)) {
      return res.status(400).json({ error: 'Se requiere productId y depositId válidos' });
    }

    const stock = await prisma.stock.findUnique({
      where: { productId_depositId: { productId, depositId } },
      include: { product: true, deposit: true }
    });

    return res.json({ productId, depositId, quantity: stock?.quantity ?? 0, stock });
  } catch (error) {
    return res.status(500).json({ error: 'Error al consultar el stock', details: error.message });
  }
};

// SB-034/SB-035/SB-046: Actualización manual de stock + registro de movimiento (entrada/salida/ajuste)
// Entrada: productId, depositId, quantity (>0), type ('IN' | 'OUT' | 'ADJUST'), reason (opcional)
// Resultado: stock actualizado y movimiento registrado en la misma transacción.
export const adjustStock = async (req, res) => {
  try {
    const { productId, depositId, quantity, type, reason } = req.body;

    const productIdNum = Number(productId);
    const depositIdNum = Number(depositId);
    const quantityNum = Number(quantity);

    if (!Number.isInteger(productIdNum) || !Number.isInteger(depositIdNum)) {
      return res.status(400).json({ error: 'Se requiere productId y depositId válidos' });
    }
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: `type debe ser uno de: ${VALID_TYPES.join(', ')}` });
    }
    if (!Number.isInteger(quantityNum) || quantityNum <= 0) {
      return res.status(400).json({ error: 'quantity debe ser un entero mayor a 0' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productIdNum } });
      if (!product) {
        throw Object.assign(new Error('El producto especificado no existe'), { status: 404 });
      }

      const deposit = await tx.deposit.findUnique({ where: { id: depositIdNum } });
      if (!deposit) {
        throw Object.assign(new Error('El depósito especificado no existe'), { status: 404 });
      }

      const existingStock = await tx.stock.findUnique({
        where: { productId_depositId: { productId: productIdNum, depositId: depositIdNum } }
      });

      if (type === 'OUT') {
        const available = existingStock?.quantity ?? 0;
        if (available < quantityNum) {
          throw Object.assign(
            new Error(`Stock insuficiente: disponible ${available}, solicitado ${quantityNum}`),
            { status: 400 }
          );
        }
      }

      const delta = type === 'OUT' ? -quantityNum : quantityNum;

      const stock = await tx.stock.upsert({
        where: { productId_depositId: { productId: productIdNum, depositId: depositIdNum } },
        update: { quantity: { increment: delta } },
        create: { productId: productIdNum, depositId: depositIdNum, quantity: delta < 0 ? 0 : delta }
      });

      const movement = await tx.stockMovement.create({
        data: {
          productId: productIdNum,
          depositId: depositIdNum,
          quantity: quantityNum,
          type,
          reason: reason || (type === 'ADJUST' ? 'Ajuste manual' : null)
        }
      });

      return { stock, movement };
    });

    return res.status(201).json(result);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message });
  }
};
