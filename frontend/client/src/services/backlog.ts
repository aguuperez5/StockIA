import { get, patch, post, put, remove } from "./http";
export type RecognitionMatchMethod =
  "barcode_ocr" | "barcode" | "ocr_code" | "ocr_name";
export type ProductCatalogLookup = { provider: "openfoodfacts" } & (
  | {
      status: "found";
      httpStatus?: number;
      product: {
        code: string;
        name: string | null;
        brand: string | null;
        url: string;
      };
    }
  | {
      status:
        | "not_found"
        | "rate_limited"
        | "timeout"
        | "unavailable"
        | "invalid_response";
      httpStatus?: number;
      retryAfterSeconds?: number;
      product?: never;
    }
);
export type RecognitionDetection = {
  value: string;
  sources: Array<"barcode" | "ocr">;
  matchMethod: Exclude<RecognitionMatchMethod, "ocr_name">;
  reviewRequired: boolean;
  inLocalCatalog: boolean;
  catalogLookup: ProductCatalogLookup;
};
export type PriceRule = {
  id?: number;
  productId?: number;
  minQuantity: number;
  priceCents?: number;
  price?: number;
};
export type Customer = {
  id: number;
  name: string;
  contact: string;
  email?: string | null;
  phone?: string | null;
  createdAt: string;
  updatedAt: string;
};
export type Transfer = {
  id: number;
  receiptNumber: string;
  originWarehouseId: number;
  destinationWarehouseId: number;
  status: string;
  createdAt: string;
  itemCount?: number;
  totalUnits?: number;
  originName?: string;
  originLocation?: string;
  destinationName?: string;
  destinationLocation?: string;
  photoData?: boolean | string;
  photoMimeType?: string;
};
export const priceRuleService = {
  list: (id: string | number) =>
    get<{ items: PriceRule[] }>(`/price-rules/${id}`),
  save: (
    id: string | number,
    rules: Array<{ minQuantity: number; price: number }>
  ) => put<{ message: string }>(`/price-rules/${id}`, { rules }),
};
export const recognitionService = {
  analyze: (query = "", photo?: { data: string; mimeType: string }) =>
    post<{
      simulated: boolean;
      status?: string;
      warnings?: string[];
      identifiers?: Array<{
        value: string;
        source: "barcode" | "ocr";
        checksum_valid: boolean;
      }>;
      agents?: Record<string, { state: string; detail: string }>;
      detections?: RecognitionDetection[];
      items: Array<{
        id: number;
        name: string;
        sku: string;
        priceCents: number;
        quantity?: number;
        matchScore?: number;
        matchMethod?: "barcode_ocr" | "barcode" | "ocr_code" | "ocr_name";
        reviewRequired?: boolean;
        stocks?: Array<{
          warehouseId: number;
          warehouseName: string;
          quantity: number;
        }>;
      }>;
    }>("/recognition/analyze", {
      query,
      ...(photo
        ? { photoData: photo.data, photoMimeType: photo.mimeType }
        : {}),
    }),
};
export const transferService = {
  list: (
    filters: {
      from?: string;
      to?: string;
      warehouseId?: string;
      productId?: string;
      originWarehouseId?: string;
      destinationWarehouseId?: string;
      status?: string;
    } = {}
  ) =>
    get<{ items: Transfer[] }>(
      `/transfers?${new URLSearchParams(filters).toString()}`
    ),
  get: (id: string | number) =>
    get<{
      transfer: Transfer;
      items: Array<{
        productId: number;
        productName: string;
        sku: string;
        quantity: number;
        category?: string;
        priceCents?: number;
      }>;
    }>(`/transfers/${id}`),
  create: (input: {
    originWarehouseId: number;
    destinationWarehouseId: number;
    items: Array<{ productId: number; quantity: number }>;
    photo?: { data: string; mimeType: string };
  }) =>
    post<{ transfer: Transfer; message: string }>("/transfers", {
      ...input,
      ...(input.photo
        ? { photoData: input.photo.data, photoMimeType: input.photo.mimeType }
        : {}),
    }),
};
export type CustomerDetail = {
  customer: Customer;
  frequent: Array<{
    productId: number;
    productName: string;
    units: number;
  }>;
  sales?: Array<{
    id: number;
    receiptNumber: string;
    totalCents: number;
    createdAt: string;
  }>;
  totalPurchasesCents?: number;
  purchasesCount?: number;
};

export const customerService = {
  list: (search = "") =>
    get<{ items: Customer[] }>(
      `/customers?search=${encodeURIComponent(search)}`
    ),
  get: (id: string | number) =>
    get<CustomerDetail>(`/customers/${id}`),
  create: (input: Omit<Customer, "id" | "createdAt" | "updatedAt">) =>
    post<{ id: number; message: string }>("/customers", input),
  update: (
    id: string | number,
    input: Omit<Customer, "id" | "createdAt" | "updatedAt">
  ) => put<{ message: string }>(`/customers/${id}`, input),
  remove: (id: string | number) =>
    remove<{ message: string }>(`/customers/${id}`),
};
export type TelegramOfferItem = {
  productId: number;
  name?: string;
  sku?: string;
  category?: string;
  price?: number;
  offerPrice?: number | null;
  effectivePrice?: number;
  active?: boolean;
  stock?: number;
  missing?: boolean;
  imageUrl?: string | null;
};

export type TelegramOffer = {
  id: number;
  title: string;
  message: string;
  status: string;
  items: TelegramOfferItem[];
  productIds: number[];
  customerIds: number[];
  customers?: Array<{
    id: number;
    name: string;
    contact: string;
    phone?: string | null;
    email?: string | null;
  }>;
  customerCount: number;
  isBroadcast: boolean;
  discountPercent?: number | null;
  validFrom?: string | null;
  validUntil?: string | null;
  scheduledAt?: string | null;
  sentAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  expired?: boolean;
  outOfStockCount?: number;
  baseTotal?: number;
  offerTotal?: number;
  totalSavings?: number;
  waMeLink?: string;
  warnings?: string[];
  canEdit?: boolean;
  canDelete?: boolean;
  nextStatuses?: string[];
};

export type TelegramOfferInput = {
  title: string;
  message: string;
  items: Array<{ productId: number; offerPrice?: number | null }>;
  customerIds: number[];
  discountPercent?: number | null;
  validFrom?: string | null;
  validUntil?: string | null;
  scheduledAt?: string | null;
  status?: string;
};

export type TelegramSuggestion = {
  title: string;
  message: string;
  discountPercent?: number | null;
  items: Array<{ productId: number; offerPrice?: number | null }>;
  products: Array<{
    productId: number;
    name: string;
    sku: string;
    price: number;
    units: number;
  }>;
  customerId: number | null;
};

export const TELEGRAM_STATUSES = [
  "Borrador",
  "Lista para enviar",
  "Enviada",
  "Archivada",
  "Cancelada",
] as const;

export const telegramService = {
  list: (filters: { status?: string; search?: string } = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.search) params.set("search", filters.search);
    const q = params.toString() ? `?${params.toString()}` : "";
    return get<{
      items: TelegramOffer[];
    }>(`/telegram${q}`);
  },
  get: (id: string | number) =>
    get<{ offer: TelegramOffer }>(`/telegram/${id}`),
  // Compat legacy: acepta productIds o items.
  create: (
    input:
      | TelegramOfferInput
      | { message: string; productIds: number[]; customerIds: number[]; status: string }
  ) => post<{ id: number; message: string; item?: TelegramOffer }>(`/telegram`, input),
  update: (id: string | number, input: TelegramOfferInput) =>
    put<{ message: string; item?: TelegramOffer }>(`/telegram/${id}`, input),
  updateStatus: (id: number, status: string, customerIds?: number[]) =>
    patch<{ message: string; item?: TelegramOffer }>(`/telegram/${id}`, {
      status,
      ...(customerIds !== undefined ? { customerIds } : {}),
    }),
  duplicate: (id: string | number) =>
    post<{ id: number; message: string; item?: TelegramOffer }>(
      `/telegram/${id}/duplicate`,
      {}
    ),
  broadcast: (id: string | number) =>
    post<{ message: string; item?: TelegramOffer }>(
      `/telegram/${id}/broadcast`,
      {}
    ),
  remove: (id: string | number) =>
    remove<{ message: string }>(`/telegram/${id}`),
  preview: (id: string | number, customerId?: string | number) =>
    get<{
      preview: string;
      waMeLink?: string;
      customer: {
        id: number;
        name: string;
        phone?: string | null;
        contact?: string;
      } | null;
      offer: TelegramOffer;
    }>(
      `/telegram/${id}/preview${customerId ? `?customerId=${customerId}` : ""}`
    ),
  suggest: (customerId?: string | number) =>
    get<TelegramSuggestion>(
      `/telegram/suggest${customerId ? `?customerId=${customerId}` : ""}`
    ),
};
export const reportService = {
  get: (from = "", to = "") =>
    get<{
      lowStock: Array<{
        id: number;
        name: string;
        stock: number;
        threshold: number;
      }>;
      bestSellers: Array<{
        productId: number;
        productName: string;
        units: number;
      }>;
      dailySales: Array<{ date: string; totalCents: number }>;
      sales: { totalCents: number; count: number; averageTicketCents?: number };
      transfers: number;
      replenishment?: {
        totalItems: number;
        totalUnitsNeeded: number;
        totalReferenceValueCents: number;
        items: Array<{
          productId: number;
          productName: string;
          sku: string;
          category: string;
          currentStock: number;
          threshold: number;
          unitsNeeded: number;
          priceCents: number;
          referenceValueCents: number;
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
        totalReferenceValueCents: number;
        items: Array<{
          id: number;
          name: string;
          sku: string;
          category: string;
          stock: number;
          referenceValueCents: number;
        }>;
      };
      topRevenue?: Array<{
        productId: number;
        productName: string;
        sku?: string;
        units: number;
        revenueCents: number;
      }>;
    }>(
      `/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    ),
};
