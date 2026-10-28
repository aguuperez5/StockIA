import { del, get, post, put } from "./http";

export type Category = {
  id: number;
  name: string;
  productCount: number;
  createdAt: string;
  updatedAt: string;
};

export const categoryService = {
  list: () => get<{ items: Category[] }>("/categories"),
  create: (name: string) =>
    post<{ id: number; message: string }>("/categories", { name }),
  update: (id: number | string, name: string) =>
    put<{ message: string }>(`/categories/${id}`, { name }),
  remove: (id: number | string) =>
    del<{ message: string }>(`/categories/${id}`),
};

export function normalizeCategoryName(value: string): string {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}
