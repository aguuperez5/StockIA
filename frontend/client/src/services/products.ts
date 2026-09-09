import { get, post, put } from "./http";

export type Product = {
  id: number;
  name: string;
  sku: string;
  category: string;
  priceCents: number;
  price: number;
  stock: number;
  lowStockThreshold: number;
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
  priceRules?: Array<{ minQuantity: number; price: number }>;
};

export const productService = {
  list: (search = "", category = "Todas") => get<{ items: Product[] }>(`/products?search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}`),
  get: (id: string | number) => get<{ item: Product }>(`/products/${id}`),
  create: (input: ProductInput) => post<{ id: number; message: string }>("/products", input),
  update: (id: string | number, input: ProductInput) => put<{ message: string }>(`/products/${id}`, input),
};
