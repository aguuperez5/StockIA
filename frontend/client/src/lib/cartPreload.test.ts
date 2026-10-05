import { describe, expect, it } from "vitest";
import { preloadCartFromDetections } from "./cartPreload";
import type { InventoryItem } from "@/services/inventory";
import type { DetectedProduct } from "@/components/PhotoCapture";

const mockInventory: InventoryItem[] = [
  {
    inventoryId: 101,
    productId: 1,
    productName: "Aceite Girasol 1.5L",
    sku: "7791337603615",
    category: "Almacén",
    priceCents: 85000,
    quantity: 10,
    lowStockThreshold: 3,
    warehouseId: 1,
    warehouseName: "Central",
    updatedAt: new Date().toISOString(),
  },
  {
    inventoryId: 102,
    productId: 2,
    productName: "Harina 000 1kg",
    sku: "7790070410115",
    category: "Almacén",
    priceCents: 12000,
    quantity: 4,
    lowStockThreshold: 5,
    warehouseId: 1,
    warehouseName: "Central",
    updatedAt: new Date().toISOString(),
  },
  {
    inventoryId: 201,
    productId: 3,
    productName: "Arroz Largo Fino 1kg",
    sku: "7790040047006",
    category: "Almacén",
    priceCents: 15000,
    quantity: 15,
    lowStockThreshold: 2,
    warehouseId: 2,
    warehouseName: "Sucursal Norte",
    updatedAt: new Date().toISOString(),
  },
];

describe("preloadCartFromDetections", () => {
  it("precarga el carrito con las cantidades sugeridas del catálogo local", () => {
    const detected: DetectedProduct[] = [
      {
        id: 1,
        name: "Aceite Girasol 1.5L",
        sku: "7791337603615",
        suggestedQuantity: 3,
        matchMethod: "barcode_ocr",
        reviewRequired: false,
      },
    ];

    const result = preloadCartFromDetections({
      detectedItems: detected,
      availableInventory: mockInventory,
      currentWarehouseId: 1,
    });

    expect(result.cart).toHaveLength(1);
    expect(result.cart[0].productId).toBe(1);
    expect(result.cart[0].cartQuantity).toBe(3);
    expect(result.cart[0].reviewRequired).toBe(false);
    expect(result.trimmed).toHaveLength(0);
  });

  it("recorta la cantidad cuando supera el stock disponible en el depósito e informa el recorte", () => {
    const detected: DetectedProduct[] = [
      {
        id: 2,
        name: "Harina 000 1kg",
        sku: "7790070410115",
        suggestedQuantity: 8, // Stock disponible es 4
        matchMethod: "barcode",
        reviewRequired: true,
      },
    ];

    const result = preloadCartFromDetections({
      detectedItems: detected,
      availableInventory: mockInventory,
      currentWarehouseId: 1,
    });

    expect(result.cart).toHaveLength(1);
    expect(result.cart[0].cartQuantity).toBe(4); // Tope de stock
    expect(result.cart[0].reviewRequired).toBe(true);
    expect(result.trimmed).toHaveLength(1);
    expect(result.trimmed[0].requested).toBe(8);
    expect(result.trimmed[0].available).toBe(4);
  });

  it("identifica productos distribuidos en depósitos distintos", () => {
    const detected: DetectedProduct[] = [
      {
        id: 1, // Está en depósito 1
        name: "Aceite Girasol 1.5L",
        sku: "7791337603615",
        suggestedQuantity: 2,
      },
      {
        id: 3, // Solo está en depósito 2
        name: "Arroz Largo Fino 1kg",
        sku: "7790040047006",
        suggestedQuantity: 1,
      },
    ];

    const result = preloadCartFromDetections({
      detectedItems: detected,
      availableInventory: mockInventory,
      currentWarehouseId: null,
    });

    expect(result.hasDifferentWarehouses).toBe(true);
    // Uno se precarga en el depósito seleccionado y el otro queda como unmatched para ese depósito
    expect(result.cart.length + result.unmatchedProducts.length).toBe(2);
  });

  it("marca reviewRequired en la línea cuando el análisis es ambiguo", () => {
    const detected: DetectedProduct[] = [
      {
        id: 1,
        name: "Aceite Girasol 1.5L",
        sku: "7791337603615",
        suggestedQuantity: 1,
        reviewRequired: false,
      },
    ];

    const result = preloadCartFromDetections({
      detectedItems: detected,
      availableInventory: mockInventory,
      currentWarehouseId: 1,
      isAmbiguous: true,
    });

    expect(result.cart).toHaveLength(1);
    expect(result.cart[0].reviewRequired).toBe(true);
    expect(result.cart[0].isAmbiguous).toBe(true);
  });
});
