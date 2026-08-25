import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, productFromApi, depositFromApi, ApiError } from "../services/api";
import { useToast } from "./ToastContext";

const AppDataContext = createContext(null);

/* ---------- Datos iniciales (mock, en memoria) ---------- */

const initialDeposits = [
  {
    id: "dep-1",
    nombre: "Depósito Principal – Central",
    tipo: "Principal",
    direccion: "Av. Siempreviva 123, CABA",
    responsable: "Juan Martínez",
    capacidad: 5000,
    telefono: "+54 11 4000-0000",
  },
  {
    id: "dep-2",
    nombre: "Depósito Norte",
    tipo: "Secundario",
    direccion: "Ruta 9 Km 45, Zona Norte",
    responsable: "Lucía Fernández",
    capacidad: 2000,
    telefono: "+54 11 4000-0001",
  },
  {
    id: "dep-3",
    nombre: "Depósito Sur",
    tipo: "Secundario",
    direccion: "Calle 50 N° 900, Zona Sur",
    responsable: "Martín Díaz",
    capacidad: 1800,
    telefono: "+54 11 4000-0002",
  },
];

const initialCategorias = ["Válvulas", "Conexiones", "Cañerías", "Tanques", "Bombas", "Herramientas"];

const initialProducts = [
  {
    id: "prod-1",
    sku: "VAL-20E-ST",
    nombre: "Válvula Industrial 2\"",
    categoria: "Válvulas",
    unidad: "unidad",
    precio: 4200,
    stockMinimo: 10,
    descripcion: "Válvula esférica de acero inoxidable para uso industrial.",
    stock: { "dep-1": 2, "dep-2": 4, "dep-3": 1 },
  },
  {
    id: "prod-2",
    sku: "FIT-07-CP",
    nombre: "Conexión Cobre 3/4\"",
    categoria: "Conexiones",
    unidad: "unidad",
    precio: 850,
    stockMinimo: 20,
    descripcion: "Conexión roscada de cobre para instalaciones hidráulicas.",
    stock: { "dep-1": 5, "dep-2": 8, "dep-3": 3 },
  },
  {
    id: "prod-3",
    sku: "PIP-100-PV",
    nombre: "Caño PVC 100mm",
    categoria: "Cañerías",
    unidad: "metro",
    precio: 1250,
    stockMinimo: 15,
    descripcion: "Caño de PVC reforzado de 100mm de diámetro.",
    stock: { "dep-1": 3, "dep-2": 6, "dep-3": 2 },
  },
  {
    id: "prod-4",
    sku: "TAN-500-PL",
    nombre: "Tanque Plástico 500L",
    categoria: "Tanques",
    unidad: "unidad",
    precio: 38500,
    stockMinimo: 4,
    descripcion: "Tanque de polietileno rotomoldeado, apto agua potable.",
    stock: { "dep-1": 12, "dep-2": 3, "dep-3": 5 },
  },
  {
    id: "prod-5",
    sku: "BOM-1HP-EL",
    nombre: "Bomba de Agua 1HP",
    categoria: "Bombas",
    unidad: "unidad",
    precio: 62000,
    stockMinimo: 3,
    descripcion: "Bomba centrífuga monofásica de 1HP.",
    stock: { "dep-1": 7, "dep-2": 2, "dep-3": 4 },
  },
  {
    id: "prod-6",
    sku: "LLA-14-AJ",
    nombre: "Llave de Paso 1/4\"",
    categoria: "Válvulas",
    unidad: "unidad",
    precio: 1580,
    stockMinimo: 12,
    descripcion: "Llave de paso de bronce con palanca.",
    stock: { "dep-1": 18, "dep-2": 9, "dep-3": 6 },
  },
];

const initialClients = [
  { id: "cli-1", nombre: "María González" },
  { id: "cli-2", nombre: "Juan Pérez" },
  { id: "cli-3", nombre: "Constructora Del Sur S.A." },
  { id: "cli-4", nombre: "Ferretería Rivadavia" },
];

function buildInitialSales(products) {
  const byId = Object.fromEntries(products.map(p => [p.id, p]));
  const raw = [
    {
      numero: "1247",
      cliente: "María González",
      depositoId: "dep-1",
      metodoPago: "Efectivo",
      notas: "",
      fecha: "2026-05-07T14:30:00",
      estado: "Completado",
      items: [
        { productId: "prod-1", cantidad: 2 },
        { productId: "prod-2", cantidad: 2 },
      ],
    },
    {
      numero: "1246",
      cliente: "Mostrador",
      depositoId: "dep-1",
      metodoPago: "Tarjeta de débito",
      notas: "",
      fecha: "2026-05-07T14:02:00",
      estado: "Completado",
      items: [{ productId: "prod-6", cantidad: 2 }],
    },
    {
      numero: "1245",
      cliente: "Juan Pérez",
      depositoId: "dep-2",
      metodoPago: "Efectivo",
      notas: "Entrega en obra",
      fecha: "2026-05-07T13:45:00",
      estado: "Completado",
      items: [
        { productId: "prod-3", cantidad: 4 },
        { productId: "prod-2", cantidad: 3 },
      ],
    },
    {
      numero: "1244",
      cliente: "Constructora Del Sur S.A.",
      depositoId: "dep-1",
      metodoPago: "Transferencia",
      notas: "Cliente corporativo — factura A",
      fecha: "2026-05-06T11:15:00",
      estado: "Completado",
      items: [
        { productId: "prod-4", cantidad: 1 },
        { productId: "prod-5", cantidad: 1 },
      ],
    },
  ];
  return raw.map(s => hydrateSale(s, byId));
}

function hydrateSale(sale, byId) {
  const items = sale.items.map(it => {
    const prod = byId[it.productId] || {};
    const precio = it.precio ?? prod.precio ?? 0;
    return {
      ...it,
      nombre: it.nombre || prod.nombre || "Producto eliminado",
      precio,
      subtotal: precio * it.cantidad,
    };
  });
  const total = items.reduce((acc, it) => acc + it.subtotal, 0);
  return { ...sale, items, total };
}

/* ---------- Provider ---------- */

export function AppDataProvider({ children }) {
  const [products, setProducts] = useState(initialProducts);
  const [deposits, setDeposits] = useState(initialDeposits);
  const [clients] = useState(initialClients);
  const [categorias, setCategorias] = useState(initialCategorias);
  const [sales, setSales] = useState(() => buildInitialSales(initialProducts));
  const [nextSaleNumber, setNextSaleNumber] = useState(1248);
  const [apiStatus, setApiStatus] = useState("checking"); // "checking" | "online" | "demo"
  const { push: notify } = useToast();

  useEffect(() => {
    let cancelled = false;
    api.products.list().then(() => {
      if (!cancelled) setApiStatus("online");
    }).catch(() => {
      if (!cancelled) setApiStatus("demo");
    });
    return () => { cancelled = true; };
  }, []);

  function getProduct(id) {
    return products.find(p => p.id === id) || null;
  }

  function skuExists(sku, ignoreId) {
    const norm = String(sku).trim().toLowerCase();
    return products.some(p => p.sku.toLowerCase() === norm && p.id !== ignoreId);
  }

  function buildLocalProduct(data) {
    const id = `prod-${Date.now()}`;
    return {
      id,
      sku: data.sku.trim(),
      nombre: data.nombre.trim(),
      categoria: data.categoria?.trim(),
      unidad: data.unidad,
      precio: Number(data.precio),
      stockMinimo: Number(data.stockMinimo) || 0,
      descripcion: data.descripcion?.trim() || "",
      stock: data.depositoInicial ? { [data.depositoInicial]: Number(data.stockInicial) || 0 } : {},
    };
  }

  async function addProduct(data) {
    const categoria = data.categoria?.trim();
    if (categoria && !categorias.includes(categoria)) {
      setCategorias(prev => [...prev, categoria]);
    }
    try {
      const res = await api.products.create(data);
      const creado = { ...productFromApi(res.product || res), stockMinimo: Number(data.stockMinimo) || 0, stock: {} };
      setProducts(prev => [creado, ...prev]);
      notify(`Producto "${creado.nombre}" guardado en el servidor.`, "success");
      return creado;
    } catch (err) {
      if (err instanceof ApiError) {
        // El servidor respondió y rechazó la operación (p.ej. SKU duplicado):
        // no lo guardamos localmente, hay que mostrar el error real y no fingir éxito.
        throw err;
      }
      const nuevo = buildLocalProduct(data);
      setProducts(prev => [nuevo, ...prev]);
      notify(`No se pudo conectar con el servidor (${err.message}). Se guardó en modo demo.`, "error");
      return nuevo;
    }
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
    try {
      await api.products.update(id, data);
      setProducts(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)));
      notify(`Producto "${patch.nombre}" actualizado en el servidor.`, "success");
    } catch (err) {
      if (err instanceof ApiError) {
        throw err;
      }
      setProducts(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)));
      notify(`No se pudo conectar con el servidor (${err.message}). Cambios guardados en modo demo.`, "error");
    }
  }

  async function addDeposit(data) {
    const buildLocal = () => ({
      id: `dep-${Date.now()}`,
      nombre: data.nombre.trim(),
      tipo: data.tipo,
      direccion: data.direccion.trim(),
      responsable: data.responsable.trim(),
      capacidad: data.capacidad ? Number(data.capacidad) : null,
      telefono: data.telefono?.trim() || "",
    });
    try {
      const res = await api.deposits.create(data);
      const creado = { ...depositFromApi(res.deposit || res), tipo: data.tipo, responsable: data.responsable.trim(), telefono: data.telefono?.trim() || "", capacidad: data.capacidad ? Number(data.capacidad) : null };
      setDeposits(prev => [...prev, creado]);
      notify(`Depósito "${creado.nombre}" guardado en el servidor.`, "success");
      return creado;
    } catch (err) {
      if (err instanceof ApiError) {
        throw err;
      }
      const nuevo = buildLocal();
      setDeposits(prev => [...prev, nuevo]);
      notify(`No se pudo conectar con el servidor (${err.message}). Se guardó en modo demo.`, "error");
      return nuevo;
    }
  }

  async function addSale(data) {
    const byId = Object.fromEntries(products.map(p => [p.id, p]));
    const total = data.items.reduce((a, it) => a + it.precio * it.cantidad, 0) * 1.21;
    let numero = String(nextSaleNumber);

    try {
      const res = await api.sales.create({ depositoId: data.depositoId, items: data.items, total });
      numero = String(res.sale?.id ?? res.id ?? numero);
      notify(`Venta #${numero} registrada en el servidor.`, "success");
    } catch (err) {
      if (err instanceof ApiError) {
        // El servidor rechazó la venta (p.ej. stock insuficiente): no la
        // registramos como completada ni descontamos stock local.
        throw err;
      }
      notify(`No se pudo conectar con el servidor (${err.message}). Venta guardada en modo demo.`, "error");
    }

    const sale = hydrateSale(
      {
        numero,
        cliente: data.cliente?.trim() || "Mostrador",
        depositoId: data.depositoId,
        metodoPago: data.metodoPago,
        notas: data.notas?.trim() || "",
        fecha: new Date().toISOString(),
        estado: "Completado",
        items: data.items.map(it => ({ productId: it.productId, cantidad: it.cantidad, precio: it.precio })),
      },
      byId
    );

    setSales(prev => [sale, ...prev]);
    setNextSaleNumber(n => n + 1);

    // Descuenta stock del depósito de origen (localmente; el backend lo hace en su transacción)
    setProducts(prev =>
      prev.map(p => {
        const item = data.items.find(it => it.productId === p.id);
        if (!item) return p;
        const actual = p.stock[data.depositoId] || 0;
        return {
          ...p,
          stock: { ...p.stock, [data.depositoId]: Math.max(0, actual - item.cantidad) },
        };
      })
    );

    return sale;
  }

  function totalStock(product) {
    return Object.values(product.stock || {}).reduce((a, b) => a + b, 0);
  }

  function stockLevel(product) {
    const total = totalStock(product);
    const min = product.stockMinimo || 0;
    if (total <= 0) return "Sin stock";
    if (total <= min) return "Crítico";
    if (total <= min * 1.5) return "Bajo";
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
      addDeposit,
      addSale,
      skuExists,
      totalStock,
      stockLevel,
      apiStatus,
    }),
    [products, deposits, clients, categorias, sales, apiStatus]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData debe usarse dentro de <AppDataProvider>");
  return ctx;
}
