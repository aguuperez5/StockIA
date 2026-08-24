import prisma from '../config/prisma.js';

// SB-026: Listar productos con búsqueda opcional por nombre o código
export const getProducts = async (req, res) => {
  try {
    const { search } = req.query;

    const products = await prisma.product.findMany({
      where: search ? {
        OR: [
          { name: { contains: search } },
          { code: { contains: search } }
        ]
      } : {},
      orderBy: { createdAt: 'desc' }
    });

    return res.json(products);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener productos', details: error.message });
  }
};

// SB-021: Registrar nuevo producto[cite: 2]
export const createProduct = async (req, res) => {
  try {
    const { name, code, price, category, imageUrl } = req.body;

    if (!name || !code || price === undefined) {
      return res.status(400).json({ error: 'Campos obligatorios requeridos: name, code, price' });
    }

    const existingProduct = await prisma.product.findUnique({
      where: { code }
    });

    if (existingProduct) {
      return res.status(400).json({ error: 'Ya existe un producto registrado con ese código' });
    }

    const newProduct = await prisma.product.create({
      data: {
        name,
        code,
        price: parseFloat(price),
        category,
        imageUrl
      }
    });

    return res.status(201).json({ message: 'Producto creado exitosamente', product: newProduct });
  } catch (error) {
    return res.status(500).json({ error: 'Error al registrar producto', details: error.message });
  }
};

// SB-024: Editar producto existente[cite: 2]
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, price, category, imageUrl } = req.body;

    const productId = parseInt(id, 10);
    if (isNaN(productId)) {
      return res.status(400).json({ error: 'El ID del producto no es válido' });
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        ...(name && { name }),
        ...(code && { code }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(category !== undefined && { category }),
        ...(imageUrl !== undefined && { imageUrl })
      }
    });

    return res.json({ message: 'Producto actualizado exitosamente', product: updatedProduct });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'El producto a editar no existe' });
    }
    return res.status(500).json({ error: 'Error al actualizar producto', details: error.message });
  }
};