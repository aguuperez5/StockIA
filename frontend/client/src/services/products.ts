import { get, post, put, remove } from "./http";

export type Product = {
  id: number;
  name: string;
  sku: string;
  category: string;
  priceCents: number;
  price: number;
  stock: number;
  lowStockThreshold: number;
  active: boolean;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  priceRules?: Array<{ minQuantity: number; priceCents: number }>;
};

export type ProductInput = {
  name: string;
  sku: string;
  category: string;
  price: number;
  lowStockThreshold: number;
  initialStock?: number;
  warehouseId?: number;
  imageUrl?: string | null;
  active?: boolean;
  priceRules?: Array<{ minQuantity: number; price: number }>;
};

export const productService = {
  list: (search = "", category = "Todas", includeInactive = false) =>
    get<{ items: Product[] }>(
      `/products?search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}${includeInactive ? "&includeInactive=1" : ""}`
    ),
  get: (id: string | number) => get<{ item: Product }>(`/products/${id}`),
  create: (input: ProductInput) =>
    post<{ id: number; message: string }>("/products", input),
  update: (id: string | number, input: ProductInput) =>
    put<{ message: string }>(`/products/${id}`, input),
  setActive: (id: string | number, active: boolean) =>
    put<{ message: string }>(`/products/${id}`, { active }),
  remove: (id: string | number) =>
    remove<{ message: string }>(`/products/${id}`),
};
