import { get, patch, post, put, remove } from "./http";
export type PriceRule = { id?: number; productId?: number; minQuantity: number; priceCents?: number; price?: number };
export type Customer = { id: number; name: string; contact: string; email?: string | null; phone?: string | null; createdAt: string; updatedAt: string };
export type Transfer = { id: number; receiptNumber: string; originWarehouseId: number; destinationWarehouseId: number; status: string; createdAt: string; itemCount?: number; originName?: string; destinationName?: string; photoData?: boolean };
export const priceRuleService = { list: (id: string | number) => get<{ items: PriceRule[] }>(`/price-rules/${id}`), save: (id: string | number, rules: Array<{ minQuantity: number; price: number }>) => put<{ message: string }>(`/price-rules/${id}`, { rules }) };
export const recognitionService = {
  analyze: (query = "", photo?: { data: string; mimeType: string }) =>
    post<{
      simulated: boolean;
      items: Array<{
        id: number;
        name: string;
        sku: string;
        priceCents: number;
        confidence: number;
        stocks?: Array<{ warehouseId: number; warehouseName: string; quantity: number }>;
      }>;
      photoData?: string;
      photoMimeType?: string;
    }>(
      "/recognition/analyze",
      { query, ...(photo ? { photoData: photo.data, photoMimeType: photo.mimeType } : {}) },
    ),
};
export const transferService = { list: (filters: { from?: string; to?: string; warehouseId?: string; productId?: string; originWarehouseId?: string; destinationWarehouseId?: string; status?: string } = {}) => get<{ items: Transfer[] }>(`/transfers?${new URLSearchParams(filters).toString()}`), get: (id: string | number) => get<{ transfer: Transfer & { photoData?: string; photoMimeType?: string }; items: Array<{ productId: number; productName: string; sku: string; quantity: number }> }>(`/transfers/${id}`), create: (input: { originWarehouseId: number; destinationWarehouseId: number; items: Array<{ productId: number; quantity: number }>; photo?: { data: string; mimeType: string } }) => post<{ transfer: Transfer; message: string }>("/transfers", { ...input, ...(input.photo ? { photoData: input.photo.data, photoMimeType: input.photo.mimeType } : {}) }) };
export const customerService = { list: (search = "") => get<{ items: Customer[] }>(`/customers?search=${encodeURIComponent(search)}`), get: (id: string | number) => get<{ customer: Customer; frequent: Array<{ productId: number; productName: string; units: number }> }>(`/customers/${id}`), create: (input: Omit<Customer, "id" | "createdAt" | "updatedAt">) => post<{ id: number; message: string }>("/customers", input), update: (id: string | number, input: Omit<Customer, "id" | "createdAt" | "updatedAt">) => put<{ message: string }>(`/customers/${id}`, input), remove: (id: string | number) => remove<{ message: string }>(`/customers/${id}`) };
export const telegramService = { list: () => get<{ items: Array<{ id: number; message: string; status: string; createdAt: string }> }>("/telegram"), create: (input: { message: string; productIds: number[]; customerIds: number[]; status: string }) => post<{ id: number; message: string }>("/telegram", input), updateStatus: (id: number, status: string) => patch<{ message: string }>(`/telegram/${id}`, { status }) };
export const reportService = {
  get: (from = "", to = "") =>
    get<{
      lowStock: Array<{ id: number; name: string; stock: number; threshold: number }>;
      bestSellers: Array<{ productName: string; units: number }>;
      dailySales: Array<{ date: string; totalCents: number }>;
      sales: { totalCents: number; count: number; averageTicketCents?: number };
      transfers: number;
      replenishment?: {
        totalItems: number;
        totalUnitsNeeded: number;
        totalEstimatedCostCents: number;
        items: Array<{
          productId: number;
          productName: string;
          sku: string;
          category: string;
          currentStock: number;
          threshold: number;
          unitsNeeded: number;
          priceCents: number;
          costCents: number;
          priority: string;
        }>;
      };
      warehouseBreakdown?: Array<{
        id: number;
        name: string;
        count: number;
        totalCents: number;
        percentage: number;
      }>;
      stagnantStock?: {
        count: number;
        totalUnits: number;
        totalValueCents: number;
        items: Array<{
          id: number;
          name: string;
          sku: string;
          category: string;
          stock: number;
          valueCents: number;
        }>;
      };
      topRevenue?: Array<{
        productName: string;
        sku?: string;
        units: number;
        revenueCents: number;
      }>;
    }>(`/reports?from=${from}&to=${to}`)
};
export const teamService = { list: () => get<{ items: Array<{ id: number; fullName: string; email: string; appRole: string }> }>("/team"), updateRole: (id: number, appRole: string) => patch<{ message: string }>(`/team/${id}`, { appRole }) };
