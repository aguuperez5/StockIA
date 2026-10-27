import prisma from '../config/prisma.js';
import { getNextAvailableAprilTagId } from '../services/apriltag.service.js';

// Serializa un producto incluyendo, si viene, el stock por depósito como
// mapa { depositId: quantity } para que el frontend lo consuma directo.
function serializeProduct(p) {
  if (!p) return p;
  const { stocks, ...rest } = p;
  return {
    ...rest,
    apriltagId: p.apriltagId ?? null,
    price: Number(p.price),
    stock: Array.isArray(stocks)
      ? Object.fromEntries(stocks.map((s) => [String(s.depositId), s.quantity]))
      : undefined,
  };
}

// SB-026: Listar productos con búsqueda opcional por nombre o código
export const getProducts = async (req, res) => {
  try {
    const { search, includeInactive } = req.query;

    const products = await prisma.product.findMany({
      where: {
        ...(includeInactive === 'true' ? {} : { active: true }),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { stocks: true },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(products.map(serializeProduct));
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener productos', details: error.message });
  }
};

// SB-025: Consultar un producto puntual (con su stock por depósito)
export const getProductById = async (req, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    if (Number.isNaN(productId)) {
      return res.status(400).json({ error: 'El ID del producto no es válido' });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { stocks: true, priceRules: { orderBy: { minQuantity: 'asc' } } },
    });

    if (!product) {
      return res.status(404).json({ error: 'El producto especificado no existe' });
    }

    return res.json(serializeProduct(product));
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener el producto', details: error.message });
  }
};

// Normaliza la categoría al nombre canónico del catálogo cuando existe.
// Si el catálogo está vacío se acepta cualquier texto (compatibilidad).
async function resolveCategoryName(db, raw) {
  const cleaned = String(raw ?? '').trim().replace(/\s+/g, ' ');
  if (!cleaned) return { error: 'Campos obligatorios requeridos: name, code, price' };
  const catalog = await db.category.findMany({ select: { name: true } });
  if (catalog.length === 0) return { name: cleaned };
  const match = catalog.find(c => c.name.toLowerCase() === cleaned.toLowerCase());
  if (!match) return { error: 'La categoría seleccionada no existe en el catálogo.' };
  return { name: match.name };
}

// SB-021: Registrar nuevo producto
export const createProduct = async (req, res) => {
  try {
    const { name, code, price, category, imageUrl } = req.body;

    if (!name || !code || price === undefined || price === null || price === '') {
      return res.status(400).json({ error: 'Campos obligatorios requeridos: name, code, price' });
    }

    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      return res.status(400).json({ error: 'El precio debe ser un número mayor a 0' });
    }

    const nextTagId = await getNextAvailableAprilTagId(prisma);

    let canonicalCategory = null;
    if (category?.trim()) {
      const resolved = await resolveCategoryName(prisma, category);
      if (resolved.error) {
        return res.status(400).json({ error: resolved.error });
      }
      canonicalCategory = resolved.name;
    }

    const newProduct = await prisma.product.create({
      data: {
        name: String(name).trim(),
        code: String(code).trim(),
        price: priceNum,
        category: canonicalCategory,
        imageUrl: imageUrl?.trim() || null,
        apriltagId: nextTagId,
      },
    });

    return res.status(201).json({ message: 'Producto creado exitosamente', product: serializeProduct(newProduct) });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe un producto registrado con ese código' });
    }
    return res.status(500).json({ error: 'Error al registrar producto', details: error.message });
  }
};

// SB-024: Editar producto existente
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, price, category, imageUrl, active } = req.body;

    const productId = parseInt(id, 10);
    if (Number.isNaN(productId)) {
      return res.status(400).json({ error: 'El ID del producto no es válido' });
    }

    if (price !== undefined) {
      const priceNum = Number(price);
      if (!Number.isFinite(priceNum) || priceNum <= 0) {
        return res.status(400).json({ error: 'El precio debe ser un número mayor a 0' });
      }
    }

    let canonicalCategory;
    if (category !== undefined) {
      if (!String(category ?? '').trim()) {
        canonicalCategory = null;
      } else {
        const resolved = await resolveCategoryName(prisma, category);
        if (resolved.error) {
          return res.status(400).json({ error: resolved.error });
        }
        canonicalCategory = resolved.name;
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(code !== undefined && { code: String(code).trim() }),
        ...(price !== undefined && { price: Number(price) }),
        ...(canonicalCategory !== undefined && { category: canonicalCategory }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl?.trim() || null }),
        ...(active !== undefined && { active: Boolean(active) }),
      },
    });

    return res.json({ message: 'Producto actualizado exitosamente', product: serializeProduct(updatedProduct) });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'El producto a editar no existe' });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe otro producto registrado con ese código' });
    }
    return res.status(500).json({ error: 'Error al actualizar producto', details: error.message });
  }
};

// SB-027: Baja de producto. Se hace baja lógica (active=false) para no romper
// el histórico de ventas y movimientos que referencian al producto.
export const deleteProduct = async (req, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    if (Number.isNaN(productId)) {
      return res.status(400).json({ error: 'El ID del producto no es válido' });
    }

    const stockTotal = await prisma.stock.aggregate({
      where: { productId },
      _sum: { quantity: true },
    });
    if ((stockTotal._sum.quantity ?? 0) > 0) {
      return res.status(400).json({ error: 'No se puede dar de baja un producto con stock existente' });
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: { active: false },
    });

    return res.json({ message: 'Producto dado de baja', product: serializeProduct(product) });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'El producto a dar de baja no existe' });
    }
    return res.status(500).json({ error: 'Error al dar de baja el producto', details: error.message });
  }
};
