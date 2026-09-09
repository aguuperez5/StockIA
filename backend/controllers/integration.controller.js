import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';
import { appRole, clearSession, createSession, publicUser, setSession } from '../middleware.js';

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
const serializeProduct = p => ({ id: p.id, name: p.name, sku: p.code, category: p.category || '', priceCents: moneyToCents(p.price), price: Number(p.price), lowStockThreshold: p.lowStockThreshold, stock: (p.stocks || []).reduce((s, x) => s + x.quantity, 0), createdAt: p.createdAt, updatedAt: p.updatedAt, priceRules: (p.priceRules || []).map(r => ({ id: r.id, minQuantity: r.minQuantity, priceCents: moneyToCents(r.price), price: Number(r.price) })) });

export async function registerCompat(req, res) {
  try {
    const { fullName, name, email, password } = req.body;
    if (!fullName?.trim() && !name?.trim() || !email?.trim() || !password) return res.status(400).json({ message: 'Nombre, email y contraseña son obligatorios.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return res.status(400).json({ message: 'El email ingresado no tiene un formato válido.' });
    if (password.length < 6) return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' });
    const normalized = email.trim().toLowerCase();
    if (await prisma.user.findUnique({ where: { email: normalized } })) return res.status(409).json({ message: 'El email ya se encuentra registrado.' });
    const user = await prisma.user.create({ data: { name: (fullName || name).trim(), email: normalized, password: await bcrypt.hash(password, 10), role: 'USER' } });
    setSession(res, createSession(user.id));
    return res.status(201).json({ message: 'Usuario registrado exitosamente.', user: publicUser(user) });
  } catch (e) { return res.status(500).json({ message: 'No pudimos registrar el usuario.', details: e.message }); }
}
export async function login(req, res) {
  const email = req.body?.email?.trim().toLowerCase(); const password = req.body?.password;
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (!user || !(await bcrypt.compare(password || '', user.password))) return res.status(401).json({ message: 'Email o contraseña incorrectos.' });
  setSession(res, createSession(user.id)); return res.json({ message: 'Sesión iniciada.', user: publicUser(user) });
}
export async function me(req, res) { return res.json({ user: publicUser(req.user) }); }
export async function logout(req, res) { clearSession(res); return res.json({ message: 'Sesión cerrada.' }); }

export async function listProducts(req, res) {
  const search = String(req.query.search || '').trim(); const category = String(req.query.category || 'Todas');
  const products = await prisma.product.findMany({ where: { active: true, ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { code: { contains: search, mode: 'insensitive' } }] } : {}), ...(category && category !== 'Todas' ? { category } : {}) }, include: { stocks: true, priceRules: { orderBy: { minQuantity: 'asc' } } }, orderBy: { createdAt: 'desc' } });
  res.json({ items: products.map(serializeProduct) });
}
export async function getProductCompat(req, res) { const p = await prisma.product.findUnique({ where: { id: Number(req.params.id) }, include: { stocks: true, priceRules: { orderBy: { minQuantity: 'asc' } } } }); if (!p) return res.status(404).json({ message: 'Producto no encontrado.' }); res.json({ item: serializeProduct(p) }); }
export async function createProductCompat(req, res) {
  const { name, sku, category, price, lowStockThreshold = 5, initialStock = 0, warehouseId } = req.body;
  if (!name?.trim() || !sku?.trim() || !category?.trim() || !Number.isFinite(Number(price)) || Number(price) <= 0) return res.status(400).json({ message: 'Completá nombre, SKU, categoría y un precio válido.' });
  if (Number(initialStock) > 0 && !warehouseId) return res.status(400).json({ message: 'Elegí un depósito para el stock inicial.' });
  try {
    const result = await prisma.$transaction(async tx => {
      const p = await tx.product.create({ data: { name: name.trim(), code: sku.trim(), category: category.trim(), price: Number(price), lowStockThreshold: Number(lowStockThreshold) || 0 } });
      if (Number(initialStock) > 0) { const dep = await tx.deposit.findUnique({ where: { id: Number(warehouseId) } }); if (!dep) throw Object.assign(new Error('El depósito seleccionado no existe.'), { status: 400 }); await tx.stock.create({ data: { productId: p.id, depositId: dep.id, quantity: Number(initialStock) } }); await tx.stockMovement.create({ data: { productId: p.id, depositId: dep.id, quantity: Number(initialStock), type: 'IN', reason: 'Stock inicial' } }); }
      return p;
    });
    res.status(201).json({ id: result.id, message: 'Producto incorporado correctamente.' });
  } catch (e) { res.status(e.status || (e.code === 'P2002' ? 409 : 500)).json({ message: e.code === 'P2002' ? 'Ya existe un producto con ese SKU.' : e.message }); }
}
export async function updateProductCompat(req, res) { try { const id = Number(req.params.id); const { name, sku, category, price, lowStockThreshold } = req.body; const p = await prisma.product.update({ where: { id }, data: { ...(name !== undefined && { name: String(name).trim() }), ...(sku !== undefined && { code: String(sku).trim() }), ...(category !== undefined && { category: String(category).trim() }), ...(price !== undefined && { price: Number(price) }), ...(lowStockThreshold !== undefined && { lowStockThreshold: Number(lowStockThreshold) }) } }); res.json({ message: 'Producto actualizado correctamente.', item: serializeProduct(p) }); } catch (e) { res.status(e.code === 'P2002' ? 409 : e.code === 'P2025' ? 404 : 400).json({ message: e.code === 'P2002' ? 'Ya existe otro producto con ese SKU.' : e.message }); } }

export async function listWarehouses(req, res) { const items = await prisma.deposit.findMany({ orderBy: { createdAt: 'asc' } }); res.json({ items: items.map(d => ({ id: d.id, name: d.name, type: d.type, address: d.address || d.location || '', manager: d.manager || 'Sin asignar', createdAt: d.createdAt })) }); }
export async function createWarehouse(req, res) { const { name, type = 'Principal', address = '', manager = '' } = req.body; if (!name?.trim() || !address?.trim() || !manager?.trim()) return res.status(400).json({ message: 'Nombre, dirección y responsable son obligatorios.' }); const d = await prisma.deposit.create({ data: { name: name.trim(), type, address: address.trim(), location: address.trim(), manager: manager.trim() } }); res.status(201).json({ id: d.id, message: 'Depósito registrado correctamente.' }); }
export async function listInventory(req, res) { const warehouseId = req.query.warehouseId ? Number(req.query.warehouseId) : undefined; const stocks = await prisma.stock.findMany({ where: warehouseId ? { depositId: warehouseId } : {}, include: { product: true, deposit: true }, orderBy: { updatedAt: 'desc' } }); res.json({ items: stocks.map(s => ({ inventoryId: s.id, quantity: s.quantity, updatedAt: s.updatedAt, productId: s.productId, productName: s.product.name, sku: s.product.code, category: s.product.category || '', priceCents: moneyToCents(s.product.price), lowStockThreshold: s.product.lowStockThreshold, warehouseId: s.depositId, warehouseName: s.deposit.name })) }); }
export async function updateInventory(req, res) { const id = Number(req.params.id); const quantity = Number(req.body.quantity); if (!Number.isInteger(quantity) || quantity < 0) return res.status(400).json({ message: 'La cantidad debe ser un entero mayor o igual a cero.' }); try { await prisma.$transaction(async tx => { const stock = await tx.stock.findUnique({ where: { id } }); if (!stock) throw Object.assign(new Error('Posición de inventario no encontrada.'), { status: 404 }); const delta = quantity - stock.quantity; if (delta === 0) return; await tx.stock.update({ where: { id }, data: { quantity } }); await tx.stockMovement.create({ data: { productId: stock.productId, depositId: stock.depositId, quantity: Math.abs(delta), type: 'ADJUST', reason: req.body.note || 'Ajuste manual' } }); }); res.json({ message: 'Inventario actualizado correctamente.' }); } catch (e) { res.status(e.status || 500).json({ message: e.message }); } }

export async function listPriceRules(req, res) { const rules = await prisma.priceRule.findMany({ where: { productId: Number(req.params.id) }, orderBy: { minQuantity: 'asc' } }); res.json({ items: rules.map(r => ({ id: r.id, productId: r.productId, minQuantity: r.minQuantity, priceCents: moneyToCents(r.price), price: Number(r.price) })) }); }
export async function savePriceRules(req, res) { const productId = Number(req.params.id); const rules = Array.isArray(req.body.rules) ? req.body.rules : []; await prisma.$transaction(async tx => { await tx.priceRule.deleteMany({ where: { productId } }); if (rules.length) await tx.priceRule.createMany({ data: rules.map(r => ({ productId, minQuantity: Number(r.minQuantity), price: Number(r.price) })) }); }); res.json({ message: 'Precios por cantidad guardados.' }); }

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
        if (!Number.isInteger(pid)||!Number.isInteger(did)||!Number.isInteger(qty)||qty<=0) throw Object.assign(new Error('Cada artículo requiere producto, depósito y cantidad válidos.'), { status: 400 });
        const key = `${did}:${pid}`; grouped.set(key, { productId: pid, depositId: did, quantity: (grouped.get(key)?.quantity || 0) + qty });
      }
      const groups = [...grouped.values()];
      const lineItems = [];
      for (const group of groups) {
        const dep = await tx.deposit.findUnique({ where: { id: group.depositId } }); if (!dep) throw Object.assign(new Error('Uno de los depósitos no existe.'), { status: 400 });
        const product = await tx.product.findUnique({ where: { id: group.productId }, include: { priceRules: true } }); if (!product) throw Object.assign(new Error('Uno de los productos no existe.'), { status: 404 });
        const stock = await tx.stock.findUnique({ where: { productId_depositId: { productId: group.productId, depositId: group.depositId } } });
        if (!stock || stock.quantity < group.quantity) throw Object.assign(new Error(`Stock insuficiente para "${product.name}": disponible ${stock?.quantity || 0}, solicitado ${group.quantity}`), { status: 400 });
        const rule = [...product.priceRules].filter(r => r.minQuantity <= group.quantity).sort((a,b)=>b.minQuantity-a.minQuantity)[0];
        lineItems.push({ productId: product.id, warehouseId: dep.id, quantity: group.quantity, price: Number(rule?.price ?? product.price) });
      }
      const total = lineItems.reduce((n,i)=>n+i.price*i.quantity,0);
      const sale = await tx.sale.create({ data: { depositId: lineItems[0].warehouseId, customerId, userId: req.user.id, total, ...photo, items: { create: lineItems } }, include: { items: { include: { product: true, warehouse: true } }, deposit: true } });
      for (const line of lineItems) {
        await tx.stock.update({ where: { productId_depositId: { productId: line.productId, depositId: line.warehouseId } }, data: { quantity: { decrement: line.quantity } } });
        await tx.stockMovement.create({ data: { productId: line.productId, depositId: line.warehouseId, quantity: line.quantity, type: 'OUT', reason: `Venta #${sale.id}` } });
      }
      return sale;
    });
    res.status(201).json({ message: 'Venta confirmada con éxito.', sale: { id: result.id, receiptNumber: receiptNumber(result.id), totalCents: moneyToCents(result.total), photoData: result.photoData, photoMimeType: result.photoMimeType } });
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
}
export async function listSales(req, res) {
  try {
    const from = req.query.from ? new Date(`${req.query.from}T00:00:00`) : null;
    const to = req.query.to ? new Date(`${req.query.to}T23:59:59.999`) : null;
    if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) return res.status(400).json({ message: 'Las fechas del filtro no son válidas.' });
    const warehouseId = req.query.warehouseId ? Number(req.query.warehouseId) : undefined;
    const search = String(req.query.search || '').trim();
    const productId = req.query.productId ? Number(req.query.productId) : undefined;
    const searchNumber = Number(search);
    const searchFilter = search ? { OR: [...(Number.isInteger(searchNumber) ? [{ id: searchNumber }] : []), { items: { some: { product: { OR: [{ name: { contains: search, mode: 'insensitive' } }, { code: { contains: search, mode: 'insensitive' } }] } } } }] } : {};
    const sales = await prisma.sale.findMany({
      where: {
        ...(warehouseId !== undefined && Number.isInteger(warehouseId) ? { depositId: warehouseId } : {}),
        ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
        ...(Number.isInteger(productId) ? { items: { some: { productId } } } : {}),
        ...searchFilter,
      },
      include: { items: true, deposit: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ items: sales.map(s => ({ id: s.id, receiptNumber: receiptNumber(s.id), totalCents: moneyToCents(s.total), status: 'Confirmada', createdAt: s.createdAt, itemCount: s.items.reduce((n, i) => n + i.quantity, 0), warehouseId: s.depositId, warehouseName: s.deposit.name, photoData: s.photoData ? true : false })) });
  } catch (e) { return res.status(500).json({ message: 'No pudimos obtener el historial.', details: e.message }); }
}
export async function getSale(req, res) { const s = await prisma.sale.findUnique({ where: { id: Number(req.params.id) }, include: { items: { include: { product: true, warehouse: true } }, deposit: true } }); if (!s) return res.status(404).json({ message: 'Venta no encontrada.' }); res.json({ sale: { id: s.id, receiptNumber: receiptNumber(s.id), totalCents: moneyToCents(s.total), status: 'Confirmada', createdAt: s.createdAt, photoData: s.photoData, photoMimeType: s.photoMimeType }, items: s.items.map(i => ({ id:i.id, quantity:i.quantity, unitPriceCents:moneyToCents(i.price), subtotalCents:moneyToCents(i.price)*i.quantity, productName:i.product.name, sku:i.product.code, warehouseName:i.warehouse?.name || s.deposit.name })) }); }

export async function dashboard(req, res) {
  const [productsList, warehouses, stocks, salesToday] = await Promise.all([
    prisma.product.findMany({ where: { active: true } }),
    prisma.deposit.count(),
    prisma.stock.findMany({ include: { product: true } }),
    prisma.sale.findMany({ where: { createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) } } }),
  ]);
  const stockByProduct = new Map();
  for (const s of stocks) stockByProduct.set(s.productId, (stockByProduct.get(s.productId) || 0) + s.quantity);
  const inventoryValueCents = productsList.reduce((n, p) => n + (stockByProduct.get(p.id) || 0) * moneyToCents(p.price), 0);
  const lowStock = productsList.filter(p => (stockByProduct.get(p.id) || 0) <= p.lowStockThreshold).map(p => ({ id:p.id, name:p.name, sku:p.code, stock:stockByProduct.get(p.id)||0, threshold:p.lowStockThreshold }));
  const days=[];
  for(let i=6;i>=0;i--){
    const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-i); const next=new Date(d); next.setDate(next.getDate()+1);
    const ss=await prisma.sale.findMany({where:{createdAt:{gte:d,lt:next}}});
    days.push({date:d.toISOString().slice(0,10),label:d.toLocaleDateString('es-AR',{weekday:'short'}).replace('.',''),totalCents:ss.reduce((n,x)=>n+moneyToCents(x.total),0),count:ss.length});
  }
  const cats={};
  for(const p of productsList){const units=stockByProduct.get(p.id)||0;const c=p.category||'Sin categoría';cats[c]??={category:c,units:0,valueCents:0};cats[c].units+=units;cats[c].valueCents+=units*moneyToCents(p.price);}
  const status=[{label:'Saludable',value:0,color:'#159666'},{label:'Bajo mínimo',value:0,color:'#d88936'},{label:'Sin stock',value:0,color:'#d45b55'}];
  for(const p of productsList){const q=stockByProduct.get(p.id)||0;if(q===0)status[2].value++;else if(q<=p.lowStockThreshold)status[1].value++;else status[0].value++;}
  res.json({products:productsList.length,warehouses,inventoryValueCents,todaySalesCents:salesToday.reduce((n,x)=>n+moneyToCents(x.total),0),todaySaleCount:salesToday.length,lowStock,salesByDay:days,inventoryByCategory:Object.values(cats),inventoryStatus:status});
}
export async function createTransfer(req, res) {
  const originId = Number(req.body?.originWarehouseId), destinationId = Number(req.body?.destinationWarehouseId), items = req.body?.items;
  if (!Number.isInteger(originId) || !Number.isInteger(destinationId) || originId === destinationId || !Array.isArray(items) || !items.length) return res.status(400).json({ message: 'Completá origen, destino y al menos un artículo.' });
  try {
    const photo = photoFields(req.body);
    const grouped = new Map();
    for (const item of items) {
      const productId = Number(item.productId), quantity = Number(item.quantity);
      if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity <= 0) throw Object.assign(new Error('Cada artículo requiere producto y cantidad válidos.'), { status: 400 });
      grouped.set(productId, (grouped.get(productId) || 0) + quantity);
    }
    const t = await prisma.$transaction(async tx => {
      const [origin, destination] = await Promise.all([tx.deposit.findUnique({ where: { id: originId } }), tx.deposit.findUnique({ where: { id: destinationId } })]);
      if (!origin || !destination) throw Object.assign(new Error('Uno de los depósitos no existe.'), { status: 400 });
      for (const [productId, quantity] of grouped) {
        const product = await tx.product.findUnique({ where: { id: productId } });
        if (!product) throw Object.assign(new Error('Uno de los productos no existe.'), { status: 404 });
        const stock = await tx.stock.findUnique({ where: { productId_depositId: { productId, depositId: originId } } });
        if (!stock || stock.quantity < quantity) throw Object.assign(new Error(`Stock insuficiente para "${product.name}".`), { status: 400 });
      }
      const tr = await tx.transfer.create({ data: { originWarehouseId: originId, destinationWarehouseId: destinationId, userId: req.user?.id, ...photo, items: { create: [...grouped].map(([productId, quantity]) => ({ productId, quantity })) } } });
      for (const [productId, quantity] of grouped) {
        await tx.stock.update({ where: { productId_depositId: { productId, depositId: originId } }, data: { quantity: { decrement: quantity } } });
        await tx.stock.upsert({ where: { productId_depositId: { productId, depositId: destinationId } }, update: { quantity: { increment: quantity } }, create: { productId, depositId: destinationId, quantity } });
        await tx.stockMovement.createMany({ data: [{ productId, depositId: originId, quantity, type: 'OUT', reason: `Transferencia ${tr.id}` }, { productId, depositId: destinationId, quantity, type: 'IN', reason: `Transferencia ${tr.id}` }] });
      }
      return tr;
    });
    return res.status(201).json({ transfer: { id: t.id, receiptNumber: transferReceipt(t.id), originWarehouseId: t.originWarehouseId, destinationWarehouseId: t.destinationWarehouseId, status: t.status, createdAt: t.createdAt, photoData: t.photoData, photoMimeType: t.photoMimeType }, message: 'Transferencia registrada.' });
  } catch (e) { return res.status(e.status || 500).json({ message: e.message }); }
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
  res.json({ items: ts.map(t => ({ id:t.id, receiptNumber:transferReceipt(t.id), originWarehouseId:t.originWarehouseId, destinationWarehouseId:t.destinationWarehouseId, status:t.status, createdAt:t.createdAt, itemCount:t.items.length, originName:t.originWarehouse.name, destinationName:t.destinationWarehouse.name, photoData: t.photoData ? true : false })) });
}
export async function getTransfer(req,res){const t=await prisma.transfer.findUnique({where:{id:Number(req.params.id)},include:{originWarehouse:true,destinationWarehouse:true,items:{include:{product:true}}}});if(!t)return res.status(404).json({message:'Transferencia no encontrada.'});res.json({transfer:{id:t.id,receiptNumber:transferReceipt(t.id),originWarehouseId:t.originWarehouseId,destinationWarehouseId:t.destinationWarehouseId,status:t.status,createdAt:t.createdAt,originName:t.originWarehouse.name,destinationName:t.destinationWarehouse.name,photoData:t.photoData,photoMimeType:t.photoMimeType},items:t.items.map(i=>({productId:i.productId,productName:i.product.name,sku:i.product.code,quantity:i.quantity}))});}

export async function listCustomers(req,res){const search=String(req.query.search||'').trim();const items=await prisma.customer.findMany({where:search?{OR:[{name:{contains:search,mode:'insensitive'}},{contact:{contains:search,mode:'insensitive'}},{email:{contains:search,mode:'insensitive'}}]}:{},orderBy:{name:'asc'}});res.json({items});}
export async function createCustomer(req,res){const {name,contact,email,phone}=req.body;if(!name?.trim()||!contact?.trim())return res.status(400).json({message:'Nombre y contacto son obligatorios.'});const c=await prisma.customer.create({data:{name:name.trim(),contact:contact.trim(),email:email?.trim()||null,phone:phone?.trim()||null}});res.status(201).json({id:c.id,message:'Cliente registrado correctamente.'});}
export async function updateCustomer(req,res){const {name,contact,email,phone}=req.body;await prisma.customer.update({where:{id:Number(req.params.id)},data:{name:name.trim(),contact:contact.trim(),email:email?.trim()||null,phone:phone?.trim()||null}});res.json({message:'Cliente actualizado correctamente.'});}
export async function customerDetail(req,res){const c=await prisma.customer.findUnique({where:{id:Number(req.params.id)}});if(!c)return res.status(404).json({message:'Cliente no encontrado.'});const rows=await prisma.saleItem.findMany({where:{sale:{customerId:c.id}},include:{product:true}});const frequentMap=new Map();for(const r of rows)frequentMap.set(r.productId,(frequentMap.get(r.productId)||0)+r.quantity);const frequent=[...frequentMap].map(([productId,units])=>({productId,productName:rows.find(r=>r.productId===productId)?.product.name,units})).sort((a,b)=>b.units-a.units);res.json({customer:c,frequent});}

export async function reports(req,res){const sales=await prisma.sale.findMany({include:{items:{include:{product:true}}}});const stocks=await prisma.stock.findMany({include:{product:true}});const lowStock=stocks.filter(s=>s.quantity<=s.product.lowStockThreshold).map(s=>({id:s.product.id,name:s.product.name,stock:s.quantity,threshold:s.product.lowStockThreshold}));const map=new Map();sales.forEach(s=>s.items.forEach(i=>map.set(i.product.name,(map.get(i.product.name)||0)+i.quantity)));const bestSellers=[...map].map(([productName,units])=>({productName,units})).sort((a,b)=>b.units-a.units).slice(0,10);const transfers=await prisma.transfer.count();res.json({lowStock,bestSellers,sales:{totalCents:sales.reduce((n,s)=>n+moneyToCents(s.total),0),count:sales.length},transfers});}
export async function team(req,res){const users=await prisma.user.findMany({orderBy:{name:'asc'}});res.json({items:users.map(u=>({id:u.id,fullName:u.name,email:u.email,appRole:appRole(u)}))});}
export async function updateRole(req,res){const next=String(req.body.appRole||'caja');if(!['administrador','caja','deposito'].includes(next))return res.status(400).json({message:'Rol inválido.'});await prisma.user.update({where:{id:Number(req.params.id)},data:{role:next==='administrador'?'ADMIN':'USER',appRole:next}});res.json({message:'Rol actualizado correctamente.'});}
export async function recognition(req,res){try{const q=String(req.body.query||'').trim();const photo=photoFields(req.body);const products=await prisma.product.findMany({where:q?{OR:[{name:{contains:q,mode:'insensitive'}},{code:{contains:q,mode:'insensitive'}}]}:{},take:8});res.json({simulated:true,photoData:photo.photoData,photoMimeType:photo.photoMimeType,items:products.map(p=>({id:p.id,name:p.name,sku:p.code,priceCents:moneyToCents(p.price),confidence:q?0.96:0.7}))});}catch(e){res.status(e.status||400).json({message:e.message});}}
export async function listTelegram(req,res){const items=await prisma.telegramOffer.findMany({orderBy:{createdAt:'desc'}});res.json({items});}
export async function createTelegram(req,res){const {message,productIds=[],customerIds=[],status='Lista para enviar'}=req.body;if(!message?.trim())return res.status(400).json({message:'El mensaje no puede estar vacío.'});const x=await prisma.telegramOffer.create({data:{message:message.trim(),productIds,customerIds,status,userId:req.user.id}});res.status(201).json({id:x.id,message:'Campaña guardada correctamente.'});}
export async function updateTelegram(req,res){await prisma.telegramOffer.update({where:{id:Number(req.params.id)},data:{status:String(req.body.status)}});res.json({message:'Estado actualizado.'});}
