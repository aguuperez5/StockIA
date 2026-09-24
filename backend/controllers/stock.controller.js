import prisma from '../config/prisma.js';



// SB-032: Consultar stock existente.
// - ?productId=&depositId=  -> stock puntual de un producto en un depósito
// - ?productId=             -> stock del producto en todos los depósitos
export const getStock = async (req, res) => {
  try {
    const productId = parseInt(req.query.productId, 10);
    const depositId = req.query.depositId !== undefined ? parseInt(req.query.depositId, 10) : undefined;

    if (Number.isNaN(productId)) {
      return res.status(400).json({ error: 'Se requiere un productId válido' });
    }

    if (depositId === undefined) {
      const stocks = await prisma.stock.findMany({
        where: { productId },
        include: { deposit: true },
      });
      const total = stocks.reduce((acc, s) => acc + s.quantity, 0);
      return res.json({ productId, total, stocks });
    }

    if (Number.isNaN(depositId)) {
      return res.status(400).json({ error: 'depositId no es válido' });
    }

    const stock = await prisma.stock.findUnique({
      where: { productId_depositId: { productId, depositId } },
      include: { product: true, deposit: true },
    });

    return res.json({ productId, depositId, quantity: stock?.quantity ?? 0, stock });
  } catch (error) {
    return res.status(500).json({ error: 'Error al consultar el stock', details: error.message });
  }
};

// SB-034/SB-035/SB-046: Actualización manual de stock + registro de movimiento.
// Entrada: productId, depositId, quantity (>0), type ('IN' | 'OUT' | 'ADJUST'), reason?
export const adjustStock = async (req, res) => {
  try {
    const { productId, depositId, quantity, reason } = req.body;

    const productIdNum = Number(productId);
    const depositIdNum = Number(depositId);
    const quantityNum = Number(quantity);

    if (!Number.isInteger(productIdNum) || !Number.isInteger(depositIdNum)) {
      return res.status(400).json({ error: 'Se requiere productId y depositId válidos' });
    }
    if (!Number.isInteger(quantityNum) || quantityNum === 0) {
      return res.status(400).json({ error: 'quantity debe ser un entero distinto de 0' });
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
        where: { productId_depositId: { productId: productIdNum, depositId: depositIdNum } },
      });
      const available = existingStock?.quantity ?? 0;

      if (quantityNum < 0 && available < Math.abs(quantityNum)) {
        throw Object.assign(
          new Error(`Stock insuficiente: disponible ${available}, solicitado ${Math.abs(quantityNum)}`),
          { status: 400 }
        );
      }

      const delta = quantityNum;

      const stock = await tx.stock.upsert({
        where: { productId_depositId: { productId: productIdNum, depositId: depositIdNum } },
        update: { quantity: { increment: delta } },
        create: { productId: productIdNum, depositId: depositIdNum, quantity: delta < 0 ? 0 : delta },
      });

      const movement = await tx.stockMovement.create({
        data: {
          productId: productIdNum,
          depositId: depositIdNum,
          quantity: quantityNum,
          reason: reason || 'Ajuste de stock',
        },
      });

      return { stock, movement };
    });

    return res.status(201).json(result);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message });
  }
};

// SB-036: Transferir stock de un depósito a otro. Genera un movimiento OUT en
// el origen y uno IN en el destino dentro de la misma transacción.
export const transferStock = async (req, res) => {
  try {
    const { productId, fromDepositId, toDepositId, quantity, reason } = req.body;

    const productIdNum = Number(productId);
    const fromId = Number(fromDepositId);
    const toId = Number(toDepositId);
    const quantityNum = Number(quantity);

    if (!Number.isInteger(productIdNum) || !Number.isInteger(fromId) || !Number.isInteger(toId)) {
      return res.status(400).json({ error: 'Se requiere productId, fromDepositId y toDepositId válidos' });
    }
    if (fromId === toId) {
      return res.status(400).json({ error: 'El depósito de destino debe ser distinto al de origen' });
    }
    if (!Number.isInteger(quantityNum) || quantityNum <= 0) {
      return res.status(400).json({ error: 'quantity debe ser un entero mayor a 0' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productIdNum } });
      if (!product) throw Object.assign(new Error('El producto especificado no existe'), { status: 404 });

      for (const depId of [fromId, toId]) {
        const dep = await tx.deposit.findUnique({ where: { id: depId } });
        if (!dep) throw Object.assign(new Error(`El depósito ${depId} no existe`), { status: 404 });
      }

      const origin = await tx.stock.findUnique({
        where: { productId_depositId: { productId: productIdNum, depositId: fromId } },
      });
      const available = origin?.quantity ?? 0;
      if (available < quantityNum) {
        throw Object.assign(
          new Error(`Stock insuficiente en el depósito de origen: disponible ${available}, solicitado ${quantityNum}`),
          { status: 400 }
        );
      }

      const fromStock = await tx.stock.update({
        where: { productId_depositId: { productId: productIdNum, depositId: fromId } },
        data: { quantity: { decrement: quantityNum } },
      });

      const toStock = await tx.stock.upsert({
        where: { productId_depositId: { productId: productIdNum, depositId: toId } },
        update: { quantity: { increment: quantityNum } },
        create: { productId: productIdNum, depositId: toId, quantity: quantityNum },
      });

      const motivo = reason?.trim() || `Transferencia ${fromId} → ${toId}`;
      await tx.stockMovement.createMany({
        data: [
          { productId: productIdNum, depositId: fromId, quantity: -quantityNum, reason: motivo },
          { productId: productIdNum, depositId: toId, quantity: quantityNum, reason: motivo },
        ],
      });

      return { from: fromStock, to: toStock };
    });

    return res.status(201).json({ message: 'Transferencia registrada', ...result });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message });
  }
};
