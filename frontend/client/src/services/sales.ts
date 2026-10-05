import { get, post } from "./http";

export type Sale = {
  id: number;
  receiptNumber: string;
  totalCents: number;
  status: "Confirmada";
  createdAt: string;
  itemCount: number;
  warehouseId?: number;
  warehouseName?: string;
  customerName?: string | null;
  photoData?: boolean;
};

export type SaleLine = {
  productId: number;
  warehouseId: number;
  quantity: number;
};

export type Receipt = {
  sale: {
    id: number;
    receiptNumber: string;
    totalCents: number;
    status: string;
    createdAt: string;
    photoData?: string | null;
    photoMimeType?: string | null;
    customer?: { id: number; name: string; contact: string } | null;
  };
  items: Array<{
    id: number;
    quantity: number;
    unitPriceCents: number;
    subtotalCents: number;
    productName: string;
    sku: string;
    warehouseName: string;
  }>;
};

export const saleService = {
  list: (from = "", to = "", warehouseId = "", search = "", productId = "") =>
    get<{ items: Sale[] }>(
      `/sales?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&warehouseId=${encodeURIComponent(warehouseId)}&search=${encodeURIComponent(search)}&productId=${encodeURIComponent(productId)}`
    ),
  create: (
    items: SaleLine[],
    customerId?: number,
    photo?: { data: string; mimeType: string }
  ) =>
    post<{
      sale: {
        id: number;
        receiptNumber: string;
        totalCents: number;
        photoData?: string;
      };
      message: string;
    }>("/sales", {
      items,
      customerId,
      ...(photo
        ? { photoData: photo.data, photoMimeType: photo.mimeType }
        : {}),
    }),
  scan: (photo: { data: string; mimeType: string }) =>
    post<{
      simulated: boolean;
      status?: string;
      requestId?: string;
      warnings?: string[];
      consensus?: {
        status: string;
        candidate_values?: string[];
        corroborated_values?: string[];
        quantities?: Record<string, number>;
      };
      identifiers?: Array<{
        value: string;
        source: "barcode" | "ocr";
        checksum_valid: boolean;
        occurrences?: number;
      }>;
      detections?: Array<any>;
      items: Array<any>;
    }>("/sales/scan", {
      photoData: photo.data,
      photoMimeType: photo.mimeType,
    }),
  receipt: (id: string | number) => get<Receipt>(`/sales/${id}`),
  dashboard: () =>
    get<{
      products: number;
      warehouses: number;
      inventoryValueCents: number;
      todaySalesCents: number;
      todaySaleCount: number;
      lowStock: Array<{
        id: number;
        name: string;
        sku: string;
        stock: number;
        threshold: number;
      }>;
      salesByDay: Array<{
        date: string;
        label: string;
        totalCents: number;
        count: number;
      }>;
      inventoryByCategory: Array<{
        category: string;
        units: number;
        valueCents: number;
      }>;
      inventoryStatus: Array<{ label: string; value: number; color: string }>;
    }>("/dashboard"),
};
