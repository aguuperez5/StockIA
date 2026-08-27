import prisma from '../config/prisma.js';

// Historial de ventas
export const getSales = async (req, res) => {
  try {
    const sales = await prisma.sale.findMany({
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(sales);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener el historial de ventas', details: error.message });
  }
};

// SB-042: Confirmar la venta, persistir detalle, descontar stock y registrar salida[cite: 2]
export const createSale = async (req, res) => {
  try {
    const { depositId, items, total } = req.body; // items: [{ productId, quantity, price }]

    if (!depositId || !items || !Array.isArray(items) || items.length === 0 || total === undefined) {
      return res.status(400).json({ 
        error: 'Datos incompletos. Se requiere depositId, total y una lista de items.' 
      });
    }

    // Transacción para asegurar la integridad de la operación
    const saleResult = await prisma.$transaction(async (tx) => {
      // 1. Validar stock suficiente antes de procesar
      for (const item of items) {
        const productId = Number(item.productId);
        const quantity = Number(item.quantity);
        const stockRecord = await tx.stock.findUnique({
          where: {
            productId_depositId: {
              productId,
              depositId: Number(depositId) 
            }
          }
        });

        if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity <= 0 ||
            !stockRecord || stockRecord.quantity < quantity) {
          throw new Error(`Stock insuficiente para el producto ID ${item.productId}`);
        }
      }

      // 2. Persistir Venta y DetalleVenta
      const sale = await tx.sale.create({
        data: {
          depositId: Number(depositId),
          total: parseFloat(total),
          items: {
            create: items.map(item => ({
              productId: Number(item.productId),
              quantity: Number(item.quantity),
              price: parseFloat(item.price)
            }))
          }
        },
        include: { items: true }
      });

      // 3. Descontar stock y registrar movimiento de salida por cada ítem
      for (const item of items) {
        await tx.stock.update({
          where: {
            productId_depositId: { 
              productId: Number(item.productId), 
              depositId: Number(depositId) 
            }
          },
          data: { 
            quantity: { decrement: Number(item.quantity) } 
          }
        });

        await tx.stockMovement.create({
          data: {
            productId: Number(item.productId),
            depositId: Number(depositId),
            quantity: Number(item.quantity),
            type: 'OUT',
            reason: `Venta #${sale.id}`
          }
        });
      }

      return sale;
    });

    return res.status(201).json({
      message: 'Venta confirmada con éxito',
      sale: saleResult
    });

  } catch (error) {
    return res.status(400).json({ 
      error: 'Error al procesar la venta', 
      details: error.message 
    });
  }
};