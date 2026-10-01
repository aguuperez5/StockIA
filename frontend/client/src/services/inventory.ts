import { del, get, patch, post, put } from "./http";

export type Warehouse = {
  id: number;
  name: string;
  type: "Principal" | "Sucursal" | "Depósito externo";
  address: string;
  manager: string;
  capacity: number;
  stockTotal?: number;
  skuCount?: number;
  createdAt: string;
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
  warehouseId: number;
  warehouseName: string;
};

export const warehouseService = {
  list: () => get<{ items: Warehouse[] }>("/warehouses"),
  summary: (id: number) =>
    get<{
      deposit: Warehouse;
      stock: Array<{
        productId: number;
        productName: string;
        sku: string;
        category: string;
        priceCents: number;
        quantity: number;
        threshold: number;
      }>;
      sales: Array<{
        id: number;
        totalCents: number;
        createdAt: string;
        customerName: string;
        itemCount: number;
      }>;
    }>(`/warehouses/${id}/summary`),
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
  list: (warehouseId?: string | number) =>
    get<{ items: InventoryItem[] }>(
      warehouseId ? `/inventory?warehouseId=${warehouseId}` : "/inventory"
    ),
  update: (inventoryId: number, quantity: number, note: string) =>
    patch<{ message: string }>(`/inventory/${inventoryId}`, { quantity, note }),
};
