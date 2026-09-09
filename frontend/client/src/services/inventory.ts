import { get, patch, post } from "./http";

export type Warehouse = {
  id: number;
  name: string;
  type: "Principal" | "Sucursal" | "Depósito externo";
  address: string;
  manager: string;
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
  create: (input: Omit<Warehouse, "id" | "createdAt">) => post<{ id: number; message: string }>("/warehouses", input),
};

export const inventoryService = {
  list: (warehouseId?: string | number) => get<{ items: InventoryItem[] }>(warehouseId ? `/inventory?warehouseId=${warehouseId}` : "/inventory"),
  update: (inventoryId: number, quantity: number, note: string) => patch<{ message: string }>(`/inventory/${inventoryId}`, { quantity, note }),
};
