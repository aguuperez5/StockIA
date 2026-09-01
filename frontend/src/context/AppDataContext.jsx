import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, productFromApi, depositFromApi, saleFromApi, ApiError } from "../services/api";
import { useToast } from "./ToastContext";

const AppDataContext = createContext(null);

/* ---------- Datos iniciales (sólo modo demo: servidor inalcanzable) ---------- */

const initialDeposits = [
  { id: "dep-1", nombre: "Depósito Principal – Central", tipo: "Principal", direccion: "Av. Siempreviva 123, CABA", responsable: "Juan Martínez", capacidad: 5000, telefono: "+54 11 4000-0000" },
  { id: "dep-2", nombre: "Depósito Norte", tipo: "Secundario", direccion: "Ruta 9 Km 45, Zona Norte", responsable: "Lucía Fernández", capacidad: 2000, telefono: "+54 11 4000-0001" },
  { id: "dep-3", nombre: "Depósito Sur", tipo: "Secundario", direccion: "Calle 50 N° 900, Zona Sur", responsable: "Martín Díaz", capacidad: 1800, telefono: "+54 11 4000-0002" },
];

const initialCategorias = ["Válvulas", "Conexiones", "Cañerías", "Tanques", "Bombas", "Herramientas"];

const initialProducts = [
  { id: "prod-1", sku: "VAL-20E-ST", nombre: 'Válvula Industrial 2"', categoria: "Válvulas", unidad: "unidad", precio: 4200, stockMinimo: 10, descripcion: "Válvula esférica de acero inoxidable para uso industrial.", activo: true, stock: { "dep-1": 2, "dep-2": 4, "dep-3": 1 } },
  { id: "prod-2", sku: "FIT-07-CP", nombre: 'Conexión Cobre 3/4"', categoria: "Conexiones", unidad: "unidad", precio: 850, stockMinimo: 20, descripcion: "Conexión roscada de cobre para instalaciones hidráulicas.", activo: true, stock: { "dep-1": 5, "dep-2": 8, "dep-3": 3 } },
  { id: "prod-3", sku: "PIP-100-PV", nombre: "Caño PVC 100mm", categoria: "Cañerías", unidad: "metro", precio: 1250, stockMinimo: 15, descripcion: "Caño de PVC reforzado de 100mm de diámetro.", activo: true, stock: { "dep-1": 3, "dep-2": 6, "dep-3": 2 } },
  { id: "prod-4", sku: "TAN-500-PL", nombre: "Tanque Plástico 500L", categoria: "Tanques", unidad: "unidad", precio: 38500, stockMinimo: 4, descripcion: "Tanque de polietileno rotomoldeado, apto agua potable.", activo: true, stock: { "dep-1": 12, "dep-2": 3, "dep-3": 5 } },
  { id: "prod-5", sku: "BOM-1HP-EL", nombre: "Bomba de Agua 1HP", categoria: "Bombas", unidad: "unidad", precio: 62000, stockMinimo: 3, descripcion: "Bomba centrífuga monofásica de 1HP.", activo: true, stock: { "dep-1": 7, "dep-2": 2, "dep-3": 4 } },
  { id: "prod-6", sku: "LLA-14-AJ", nombre: 'Llave de Paso 1/4"', categoria: "Válvulas", unidad: "unidad", precio: 1580, stockMinimo: 12, descripcion: "Llave de paso de bronce con palanca.", activo: true, stock: { "dep-1": 18, "dep-2": 9, "dep-3": 6 } },
];

const initialClients = [
  { id: "cli-1", nombre: "María González" },
  { id: "cli-2", nombre: "Juan Pérez" },
  { id: "cli-3", nombre: "Constructora Del Sur S.A." },
  { id: "cli-4", nombre: "Ferretería Rivadavia" },
];

function deriveCategorias(products) {
  const set = new Set(initialCategorias);
  for (const p of products) if (p.categoria) set.add(p.categoria);
  return [...set];
}

/* ---------- Provider ---------- */

export function AppDataProvider({ children }) {
  const [products, setProducts] = useState(initialProducts);
  const [deposits, setDeposits] = useState(initialDeposits);
  const [clients] = useState(initialClients);
  const [categorias, setCategorias] = useState(initialCategorias);
  const [sales, setSales] = useState([]);
  const [apiStatus, setApiStatus] = useState("checking"); // "checking" | "online" | "demo"
  const { push: notify } = useToast();

  const online = apiStatus === "online";

  // Trae del backend productos (con stock por depósito), depósitos y ventas.
  const reload = useCallback(async () => {
    const [prodRes, depRes, salesRes] = await Promise.all([
      api.products.list(),
      api.deposits.list(),
      api.sales.list(),
    ]);
    const prods = prodRes.map(productFromApi);
    setProducts(prods);
    setDeposits(depRes.map(depositFromApi));
    setSales(salesRes.map(saleFromApi));
    setCategorias(deriveCategorias(prods));
  }, []);

  useEffect(() => {
    let cancelled = false;
    reload()
      .then(() => { if (!cancelled) setApiStatus("online"); })
      .catch((err) => {
        if (cancelled) return;
        setApiStatus("demo");
        if (err instanceof ApiError) {
          notify(`El servidor respondió con un error (${err.message}). Trabajando en modo demo.`, "error");
        }
      });
    return () => { cancelled = true; };
  }, [reload, notify]);

  function getProduct(id) {
    return products.find((p) => p.id === id) || null;
  }

  function skuExists(sku, ignoreId) {
    const norm = String(sku).trim().toLowerCase();
    return products.some((p) => p.sku.toLowerCase() === norm && p.id !== ignoreId);
  }

  /* ----- Productos ----- */

  async function addProduct(data) {
    const categoria = data.categoria?.trim();
    if (categoria && !categorias.includes(categoria)) setCategorias((prev) => [...prev, categoria]);

    if (online) {
      const res = await api.products.create(data);
      const creado = productFromApi(res.product || res);
      const stockInicial = Number(data.stockInicial);
      if (data.depositoInicial && Number.isInteger(stockInicial) && stockInicial > 0) {
        try {
          await api.stock.adjust({
            productId: Number(creado.id),
            depositId: Number(data.depositoInicial),
            quantity: stockInicial,
            type: "IN",
            reason: "Stock inicial",
          });
        } catch (err) {
          notify(`Producto creado, pero no se pudo cargar el stock inicial: ${err.message}`, "error");
        }
      }
      await reload();
      notify(`Producto "${creado.nombre}" guardado en el servidor.`, "success");
      return creado;
    }
    const nuevo = {
      id: `prod-${Date.now()}`,
      sku: data.sku.trim(),
      nombre: data.nombre.trim(),
      categoria,
      unidad: data.unidad,
      precio: Number(data.precio),
      stockMinimo: Number(data.stockMinimo) || 0,
      descripcion: data.descripcion?.trim() || "",
      activo: true,
      stock: data.depositoInicial && Number(data.stockInicial) > 0
        ? { [data.depositoInicial]: Number(data.stockInicial) }
        : {},
    };
    setProducts((prev) => [nuevo, ...prev]);
    notify(`Producto "${nuevo.nombre}" guardado en modo demo.`, "info");
    return nuevo;
  }

  async function updateProduct(id, data) {
    const patch = {
      sku: data.sku.trim(),
      nombre: data.nombre.trim(),
      categoria: data.categoria?.trim(),
      unidad: data.unidad,
      precio: Number(data.precio),
      stockMinimo: Number(data.stockMinimo) || 0,
      descripcion: data.descripcion?.trim() || "",
    };
    if (online) {
      await api.products.update(id, data);
      await reload();
      notify(`Producto "${patch.nombre}" actualizado en el servidor.`, "success");
      return;
    }
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    notify(`Producto "${patch.nombre}" actualizado en modo demo.`, "info");
  }

  async function deleteProduct(id) {
    if (online) {
      await api.products.remove(id);
      await reload();
      notify("Producto dado de baja.", "success");
      return;
    }
    setProducts((prev) => prev.filter((p) => p.id !== id));
    notify("Producto eliminado en modo demo.", "info");
  }

  /* ----- Depósitos ----- */

  async function addDeposit(data) {
    if (online) {
      const res = await api.deposits.create(data);
      await reload();
      notify(`Depósito "${data.nombre}" guardado en el servidor.`, "success");
      return depositFromApi(res.deposit || res);
    }
    const nuevo = {
      id: `dep-${Date.now()}`,
      nombre: data.nombre.trim(),
      tipo: data.tipo,
      direccion: data.direccion.trim(),
      responsable: data.responsable.trim(),
      capacidad: data.capacidad ? Number(data.capacidad) : null,
      telefono: data.telefono?.trim() || "",
      stockTotal: 0,
    };
    setDeposits((prev) => [...prev, nuevo]);
    notify(`Depósito "${nuevo.nombre}" guardado en modo demo.`, "info");
    return nuevo;
  }

  async function updateDeposit(id, data) {
    if (online) {
      await api.deposits.update(id, data);
      await reload();
      notify(`Depósito "${data.nombre}" actualizado en el servidor.`, "success");
      return;
    }
    setDeposits((prev) => prev.map((d) => (d.id === id ? { ...d, ...data } : d)));
    notify(`Depósito actualizado en modo demo.`, "info");
  }

  /* ----- Stock ----- */

  // type: 'IN' | 'OUT' | 'ADJUST'
  async function adjustStock({ productId, depositId, quantity, type, reason }) {
    if (online) {
      await api.stock.adjust({
        productId: Number(productId),
        depositId: Number(depositId),
        quantity: Number(quantity),
        type,
        reason,
      });
      await reload();
      notify("Stock actualizado en el servidor.", "success");
      return;
    }
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        const actual = p.stock[depositId] || 0;
        const delta = type === "OUT" ? -Number(quantity) : Number(quantity);
        return { ...p, stock: { ...p.stock, [depositId]: Math.max(0, actual + delta) } };
      })
    );
    notify("Stock actualizado en modo demo.", "info");
  }

  async function transferStock({ productId, fromDepositId, toDepositId, quantity, reason }) {
    if (online) {
      await api.stock.transfer({
        productId: Number(productId),
        fromDepositId: Number(fromDepositId),
        toDepositId: Number(toDepositId),
        quantity: Number(quantity),
        reason,
      });
      await reload();
      notify("Transferencia registrada en el servidor.", "success");
      return;
    }
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        const q = Number(quantity);
        const origen = p.stock[fromDepositId] || 0;
        return {
          ...p,
          stock: {
            ...p.stock,
            [fromDepositId]: Math.max(0, origen - q),
            [toDepositId]: (p.stock[toDepositId] || 0) + q,
          },
        };
      })
    );
    notify("Transferencia registrada en modo demo.", "info");
  }

  /* ----- Ventas ----- */

  async function addSale(data) {
    if (online) {
      const res = await api.sales.create({ depositoId: data.depositoId, items: data.items });
      await reload();
      const numero = String(res.sale?.id ?? res.id ?? "");
      notify(`Venta #${numero} registrada en el servidor.`, "success");
      return saleFromApi(res.sale || res);
    }

    // Modo demo: registra la venta en memoria y descuenta stock local.
    const subtotal = data.items.reduce((a, it) => a + it.precio * it.cantidad, 0);
    const total = subtotal * 1.21;
    const numero = String(Date.now()).slice(-6);
    const byId = Object.fromEntries(products.map((p) => [p.id, p]));
    const items = data.items.map((it) => {
      const prod = byId[it.productId] || {};
      return { productId: it.productId, nombre: prod.nombre || "Producto", cantidad: it.cantidad, precio: it.precio, subtotal: it.precio * it.cantidad };
    });
    const sale = {
      numero,
      cliente: data.cliente?.trim() || "Mostrador",
      depositoId: data.depositoId,
      metodoPago: data.metodoPago,
      notas: data.notas?.trim() || "",
      fecha: new Date().toISOString(),
      estado: "Completado",
      items,
      total,
    };
    setSales((prev) => [sale, ...prev]);
    setProducts((prev) =>
      prev.map((p) => {
        const item = data.items.find((it) => it.productId === p.id);
        if (!item) return p;
        const actual = p.stock[data.depositoId] || 0;
        return { ...p, stock: { ...p.stock, [data.depositoId]: Math.max(0, actual - item.cantidad) } };
      })
    );
    notify(`Venta #${numero} registrada en modo demo.`, "info");
    return sale;
  }

  /* ----- Helpers de stock ----- */

  function totalStock(product) {
    return Object.values(product.stock || {}).reduce((a, b) => a + b, 0);
  }

  function stockLevel(product) {
    const total = totalStock(product);
    const min = product.stockMinimo || 0;
    if (total <= 0) return "Sin stock";
    if (min > 0 && total <= min) return "Crítico";
    if (min > 0 && total <= min * 1.5) return "Bajo";
    return "Normal";
  }

  const value = useMemo(
    () => ({
      products,
      deposits,
      clients,
      categorias,
      sales,
      getProduct,
      addProduct,
      updateProduct,
      deleteProduct,
      addDeposit,
      updateDeposit,
      adjustStock,
      transferStock,
      addSale,
      skuExists,
      totalStock,
      stockLevel,
      reload,
      apiStatus,
    }),
    [products, deposits, clients, categorias, sales, apiStatus] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData debe usarse dentro de <AppDataProvider>");
  return ctx;
}
