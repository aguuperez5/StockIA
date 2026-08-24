import prisma from '../config/prisma.js';

// SB-030: Registrar un nuevo depósito[cite: 2]
export const createDeposit = async (req, res) => {
  try {
    const { name, location } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'El nombre del depósito es obligatorio' });
    }

    const newDeposit = await prisma.deposit.create({
      data: { name, location }
    });

    return res.status(201).json({
      message: 'Depósito registrado exitosamente',
      deposit: newDeposit
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al registrar el depósito', details: error.message });
  }
};

// SB-032: Consultar el stock disponible por depósito[cite: 2]
export const getStockByDeposit = async (req, res) => {
  try {
    const { id } = req.params;
    const depositId = parseInt(id, 10);

    if (isNaN(depositId)) {
      return res.status(400).json({ error: 'El ID del depósito no es válido' });
    }

    // Verificar si el depósito existe
    const depositExists = await prisma.deposit.findUnique({
      where: { id: depositId }
    });

    if (!depositExists) {
      return res.status(404).json({ error: 'El depósito especificado no existe' });
    }

    // Traer stock con datos del producto incluido
    const stockList = await prisma.stock.findMany({
      where: { depositId },
      include: {
        product: {
          select: { id: true, name: true, code: true, price: true, category: true }
        }
      }
    });

    return res.json({
      deposit: depositExists,
      stock: stockList
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al consultar el stock', details: error.message });
  }
};