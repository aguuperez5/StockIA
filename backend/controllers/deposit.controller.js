import prisma from '../config/prisma.js';

// SB-029: Listar depósitos, con el total de unidades en stock de cada uno.
export const getDeposits = async (req, res) => {
  try {
    const deposits = await prisma.deposit.findMany({ orderBy: { createdAt: 'asc' } });

    const totals = await prisma.stock.groupBy({
      by: ['depositId'],
      _sum: { quantity: true },
    });
    const byDeposit = Object.fromEntries(totals.map((t) => [t.depositId, t._sum.quantity ?? 0]));

    return res.json(
      deposits.map((d) => ({ ...d, stockTotal: byDeposit[d.id] ?? 0 }))
    );
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener los depósitos', details: error.message });
  }
};

// SB-030: Registrar un nuevo depósito
export const createDeposit = async (req, res) => {
  try {
    const { name, location } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'El nombre del depósito es obligatorio' });
    }

    const newDeposit = await prisma.deposit.create({
      data: { name: String(name).trim(), location: location?.trim() || null },
    });

    return res.status(201).json({
      message: 'Depósito registrado exitosamente',
      deposit: newDeposit,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al registrar el depósito', details: error.message });
  }
};

// SB-031: Editar un depósito existente
export const updateDeposit = async (req, res) => {
  try {
    const depositId = parseInt(req.params.id, 10);
    if (Number.isNaN(depositId)) {
      return res.status(400).json({ error: 'El ID del depósito no es válido' });
    }

    const { name, location } = req.body;
    if (name !== undefined && !String(name).trim()) {
      return res.status(400).json({ error: 'El nombre del depósito no puede quedar vacío' });
    }

    const deposit = await prisma.deposit.update({
      where: { id: depositId },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(location !== undefined && { location: location?.trim() || null }),
      },
    });

    return res.json({ message: 'Depósito actualizado exitosamente', deposit });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'El depósito a editar no existe' });
    }
    return res.status(500).json({ error: 'Error al actualizar el depósito', details: error.message });
  }
};

// SB-032: Consultar el stock disponible por depósito
export const getStockByDeposit = async (req, res) => {
  try {
    const { id } = req.params;
    const depositId = parseInt(id, 10);

    if (Number.isNaN(depositId)) {
      return res.status(400).json({ error: 'El ID del depósito no es válido' });
    }

    const depositExists = await prisma.deposit.findUnique({ where: { id: depositId } });
    if (!depositExists) {
      return res.status(404).json({ error: 'El depósito especificado no existe' });
    }

    const stockList = await prisma.stock.findMany({
      where: { depositId },
      include: {
        product: {
          select: { id: true, name: true, code: true, price: true, category: true },
        },
      },
    });

    return res.json({ deposit: depositExists, stock: stockList });
  } catch (error) {
    return res.status(500).json({ error: 'Error al consultar el stock', details: error.message });
  }
};
