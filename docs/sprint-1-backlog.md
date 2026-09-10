# Sprint Backlog — Descomposición del Trabajo (SB-001 a SB-055)

**Proyecto:** StockIA  
**Sprint:** 1  
**Cátedra:** Ingeniería y Calidad de Software (UTN FR San Francisco, 2026)  
**Objetivo del Sprint:** Implementar la primera versión funcional del sistema que permita administrar productos, depósitos y stock, registrar ventas manuales y actualizar automáticamente el inventario, dejando preparada la base para incorporar el reconocimiento automático de productos en los siguientes sprints.

---

## Índice de Fases de Trabajo

- [1. Análisis (SB-001 - SB-004)](#1-análisis)
- [2. Diseño (SB-005 - SB-008)](#2-diseño)
- [3. Configuración del Ambiente (SB-009 - SB-015)](#3-configuración-del-ambiente)
- [4. Desarrollo — Seguridad (HU-001: SB-016 - SB-019)](#4-desarrollo--seguridad)
- [5. Desarrollo — Productos (HU-002 a HU-004: SB-020 - SB-028)](#5-desarrollo--productos)
- [6. Desarrollo — Depósitos y Stock (HU-005 a HU-007: SB-029 - SB-035)](#6-desarrollo--depósitos-y-stock)
- [7. Desarrollo — Ventas (HU-008 a HU-011: SB-036 - SB-048)](#7-desarrollo--ventas)
- [8. Pruebas y QA (SB-049 - SB-052)](#8-pruebas-y-qa)
- [9. Documentación Técnica (SB-053 - SB-055)](#9-documentación-técnica)

---

## 1. Análisis

| ID Tarea | Descripción de la Actividad | Estado |
| :--- | :--- | :--- |
| **SB-001** | Analizar las reglas de negocio para la gestión de productos (códigos de barra únicos, categorías, precios base). | Completado |
| **SB-002** | Analizar las reglas de negocio para la gestión de depósitos y stock (multi-sucursal, restricciones de eliminación, stock no negativo). | Completado |
| **SB-003** | Analizar el flujo de una venta manual (selección, cálculo de totales, emisión de comprobante y descuento de inventario). | Completado |
| **SB-004** | Definir las entidades y relaciones necesarias para el modelo de datos. | Completado |

---

## 2. Diseño

| ID Tarea | Descripción de la Actividad | Estado |
| :--- | :--- | :--- |
| **SB-005** | Diseñar el modelo entidad-relación (DER) de la base de datos PostgreSQL. | Completado |
| **SB-006** | Diseñar la estructura del proyecto Frontend (React + Vite) y Backend (Node.js + Express). | Completado |
| **SB-007** | Diseñar la API RESTful necesaria para las funcionalidades del Sprint. | Completado |
| **SB-008** | Diseñar las interfaces de usuario (wireframes Figma): Registro de productos, Listado de productos, Gestión de stock y Nueva venta. | Completado |

---

## 3. Configuración del Ambiente

| ID Tarea | Descripción de la Actividad | Estado |
| :--- | :--- | :--- |
| **SB-009** | Crear el repositorio del proyecto en GitHub (`https://github.com/aguuperez5/StockIA`). | Completado |
| **SB-010** | Configurar la estrategia de ramas del repositorio (branching model). | Completado |
| **SB-011** | Crear el proyecto Frontend utilizando React, TypeScript y Vite. | Completado |
| **SB-012** | Crear el proyecto Backend utilizando Node.js y Express. | Completado |
| **SB-013** | Configurar contenedor y servicio de base de datos PostgreSQL (Docker Compose). | Completado |
| **SB-014** | Configurar el ORM (Prisma) y migraciones iniciales. | Completado |
| **SB-015** | Configurar las variables de entorno (`.env` frontend y backend). | Completado |

---

## 4. Desarrollo — Seguridad

### HU-001: Registro de usuario

| ID Tarea | Descripción de la Actividad | Estado |
| :--- | :--- | :--- |
| **SB-016** | Implementar la entidad `User` en el esquema de Prisma y migraciones de base de datos. | Completado |
| **SB-017** | Desarrollar el formulario visual de registro de usuarios en React. | Completado |
| **SB-018** | Implementar el endpoint `POST /api/users` (API REST) para registrar usuarios con hashing de contraseña. | Completado |
| **SB-019** | Validar datos obligatorios del registro (nombre, legajo, email, coincidencia de contraseñas). | Completado |

---

## 5. Desarrollo — Productos

### HU-002: Registrar producto

| ID Tarea | Descripción de la Actividad | Estado |
| :--- | :--- | :--- |
| **SB-020** | Implementar la entidad `Product` y `PriceRule` en la base de datos mediante Prisma. | Completado |
| **SB-021** | Implementar el endpoint `POST /api/products` para registrar productos en el catálogo. | Completado |
| **SB-022** | Desarrollar el formulario visual de alta de productos en React. | Completado |
| **SB-023** | Implementar validaciones del formulario (código único, campos obligatorios, precio mayor a cero). | Completado |

### HU-003: Editar producto

| ID Tarea | Descripción de la Actividad | Estado |
| :--- | :--- | :--- |
| **SB-024** | Implementar el endpoint `PUT /api/products/:id` para editar productos existentes. | Completado |
| **SB-025** | Desarrollar la pantalla y modal de edición de productos en el Frontend. | Completado |

### HU-004: Visualizar listado de productos

| ID Tarea | Descripción de la Actividad | Estado |
| :--- | :--- | :--- |
| **SB-026** | Implementar el endpoint `GET /api/products` para listar productos con stock consolidado. | Completado |
| **SB-027** | Desarrollar la pantalla de listado de productos en React con formato tabular interactivo. | Completado |
| **SB-028** | Incorporar búsqueda en tiempo real y filtrado básico por nombre, categoría y código de barras. | Completado |

---

## 6. Desarrollo — Depósitos y Stock

### HU-005: Registrar depósito

| ID Tarea | Descripción de la Actividad | Estado |
| :--- | :--- | :--- |
| **SB-029** | Implementar la entidad `Deposit` en Prisma y base de datos. | Completado |
| **SB-030** | Implementar el endpoint `POST /api/deposits` para registrar depósitos o sucursales físicas. | Completado |
| **SB-031** | Desarrollar el formulario de alta de depósitos en el Frontend con validaciones de unicidad. | Completado |

### HU-006: Visualizar stock por depósito

| ID Tarea | Descripción de la Actividad | Estado |
| :--- | :--- | :--- |
| **SB-032** | Implementar el endpoint `GET /api/deposits/:id/stock` para consultar stock por depósito. | Completado |
| **SB-033** | Desarrollar la pantalla y selector para consulta de existencias por depósito específico. | Completado |

### HU-007: Actualización manual de stock

| ID Tarea | Descripción de la Actividad | Estado |
| :--- | :--- | :--- |
| **SB-034** | Implementar el endpoint `POST /api/stock/adjust` para actualizar manualmente el stock. | Completado |
| **SB-035** | Registrar el movimiento correspondiente (`StockMovement` tipo `IN`/`OUT`/`ADJUST`) al modificar existencias. | Completado |

---

## 7. Desarrollo — Ventas

### HU-008: Creación de venta manual

| ID Tarea | Descripción de la Actividad | Estado |
| :--- | :--- | :--- |
| **SB-036** | Implementar la entidad `Sale` en la base de datos. | Completado |
| **SB-037** | Implementar la entidad `SaleItem` (Detalle Venta) para normalizar la relación con productos. | Completado |
| **SB-038** | Desarrollar la pantalla de punto de venta (nueva venta) en el Frontend. | Completado |
| **SB-039** | Programar la lógica visual para permitir seleccionar productos manualmente desde el catálogo. | Completado |
| **SB-040** | Añadir funcionalidad para permitir indicar y modificar cantidades por ítem con validación de stock disponible. | Completado |
| **SB-041** | Programar la lógica de negocio para calcular automáticamente el subtotal, reglas de precios y total de la operación. | Completado |

### HU-009: Confirmación de venta

| ID Tarea | Descripción de la Actividad | Estado |
| :--- | :--- | :--- |
| **SB-042** | Implementar el endpoint transaccional `POST /api/sales` para confirmar la venta. | Completado |
| **SB-043** | Persistir atómicamente la venta y sus ítems de detalle en la base de datos PostgreSQL. | Completado |
| **SB-044** | Generar y visualizar el ticket o comprobante de venta tras la confirmación exitosa. | Completado |

### HU-10: Descuento automático de stock por venta

| ID Tarea | Descripción de la Actividad | Estado |
| :--- | :--- | :--- |
| **SB-045** | Descontar automáticamente las cantidades vendidas del stock del depósito correspondiente dentro de la transacción. | Completado |
| **SB-046** | Registrar los movimientos de salida de stock (`StockMovement` con tipo `OUT` y referencia a la venta). | Completado |

### HU-11: Visualización de historial de ventas

| ID Tarea | Descripción de la Actividad | Estado |
| :--- | :--- | :--- |
| **SB-047** | Implementar el endpoint `GET /api/sales` para consultar el historial de ventas con filtros de fecha y depósito. | Completado |
| **SB-048** | Desarrollar la pantalla de historial de transacciones con visualización del detalle de comprobantes emitidos. | Completado |

---

## 8. Pruebas y QA

| ID Tarea | Descripción de la Actividad | Estado |
| :--- | :--- | :--- |
| **SB-049** | Realizar pruebas funcionales del módulo de Catálogo de Productos (altas, bajas lógicas, edición, validación de códigos). | Completado |
| **SB-050** | Realizar pruebas funcionales del módulo de Depósitos y Stock (multi-sucursal, consistencia ante ajustes manuales). | Completado |
| **SB-051** | Realizar pruebas del flujo transaccional completo de ventas (carrito, precios por volumen, tickets, descuento de stock). | Completado |
| **SB-052** | Corregir los errores y edge cases detectados durante el ciclo de pruebas QA. | Completado |

---

## 9. Documentación Técnica

| ID Tarea | Descripción de la Actividad | Estado |
| :--- | :--- | :--- |
| **SB-053** | Actualizar la documentación técnica del proyecto y contratos de API REST. | Completado |
| **SB-054** | Actualizar el instructivo de instalación y ejecución del sistema (`docs/installation.md`). | Completado |
| **SB-055** | Actualizar el Product Backlog y registrar el estado de las Historias de Usuario implementadas. | Completado |
