import { del, get, patch, post, put } from "./http";

export type Warehouse = {
  id: number;
  name: string;
  type: "Principal" | "Sucursal" | "Depósito externo";
  address: string;
  manager: string;
  capacity: number;
  imageUrl?: string | null;
  stockTotal?: number;
  skuCount?: number;
  createdAt: string;
};

export type PriceRuleItem = {
  id?: number;
  productId?: number;
  minQuantity: number;
  priceCents: number;
  price?: number;
};

export type InventoryItem = {
  inventoryId: number;
  quantity: number;
  updatedAt: string;
  productId: number;
  productName: string;
  sku: string;
  category: string;
  priceCents: number;
  lowStockThreshold: number;
  imageUrl?: string | null;
  warehouseId: number;
  warehouseName: string;
  priceRules?: PriceRuleItem[];
  level?: "sin_stock" | "critico" | "bajo" | "saludable";
};

export const warehouseService = {
  list: () => get<{ items: Warehouse[] }>("/warehouses"),
  summary: (id: number, from = "", to = "") => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const q = params.toString() ? `?${params.toString()}` : "";
    return get<{
      deposit: Warehouse;
      stock: Array<{
        productId: number;
        productName: string;
        sku: string;
        category: string;
        priceCents: number;
        quantity: number;
        threshold: number;
        imageUrl?: string | null;
      }>;
      sales: Array<{
        id: number;
        totalCents: number;
        createdAt: string;
        customerName: string;
        itemCount: number;
        items?: Array<{
          productId: number;
          productName: string;
          sku: string;
          quantity: number;
          priceCents: number;
        }>;
      }>;
    }>(`/warehouses/${id}/summary${q}`);
  },
  create: (
    input: Omit<Warehouse, "id" | "createdAt" | "stockTotal" | "skuCount">
  ) => post<{ id: number; message: string }>("/warehouses", input),
  update: (
    id: string | number,
    input: Omit<Warehouse, "id" | "createdAt" | "stockTotal" | "skuCount">
  ) => put<{ message: string }>(`/warehouses/${id}`, input),
  remove: (id: string | number) =>
    del<{ message: string }>(`/warehouses/${id}`),
};

export const inventoryService = {
  list: (warehouseId?: string | number, lowStock?: boolean) => {
    const params = new URLSearchParams();
    if (warehouseId) params.set("warehouseId", String(warehouseId));
    if (lowStock) params.set("lowStock", "true");
    const q = params.toString() ? `?${params.toString()}` : "";
    return get<{ items: InventoryItem[] }>(`/inventory${q}`);
  },
  listLowStock: (warehouseId?: string | number) =>
    get<{ items: InventoryItem[]; count: number }>(
      warehouseId ? `/inventory/low-stock?warehouseId=${warehouseId}` : "/inventory/low-stock"
    ),
  update: (inventoryId: number, quantity: number, note: string) =>
    patch<{ message: string }>(`/inventory/${inventoryId}`, { quantity, note }),
};
