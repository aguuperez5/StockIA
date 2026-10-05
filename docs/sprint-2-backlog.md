# Sprint Backlog — Descomposición del Trabajo (SB-056 a SB-085)

**Proyecto:** StockIA  
**Sprint:** 2  
**Cátedra:** Ingeniería y Calidad de Software (UTN FR San Francisco, 2026)  
**Objetivo del Sprint:** Integrar el pipeline de visión por computadora a la terminal de ventas asistidas, implementar autenticación con JWT y cookies HttpOnly seguras con control de acceso por roles (RBAC), habilitar transferencias atómicas entre depósitos protegidas contra sobregiros y condiciones de carrera, e incorporar precios por volumen en tiempo real y alertas de stock mínimo.

> **Nota de inconsistencias a resolver por el equipo (auditoría Sprint 2):**
> Se detectaron discrepancias entre los artefactos documentales previos del equipo:
> 1. **Fechas:** El informe preliminar del Sprint 2 consigna como fecha de cierre el 02/09/2026, mientras que las actas de backlog marcan el 14/09/2026.
> 2. **Identificadores de tareas:** La numeración de tareas `SB` en el borrador en PDF del informe no coincide unívocamente con la secuencia del backlog.
> Esta inconsistencia queda registrada explícitamente para su alineación formal por parte del equipo en la próxima retrospectiva.

---

## Índice de Fases de Trabajo

- [1. Análisis y Arquitectura (SB-056 a SB-059)](#1-análisis-y-arquitectura)
- [2. Configuración y Servicios Base (SB-060 a SB-063)](#2-configuración-y-servicios-base)
- [3. Desarrollo — Seguridad y RBAC (HU-12: SB-064 a SB-067)](#3-desarrollo--seguridad-y-rbac)
- [4. Desarrollo — Ventas Asistidas por Imagen (HU-13: SB-068 a SB-071)](#4-desarrollo--ventas-asistidas-por-imagen)
- [5. Desarrollo — Transferencias y Concurrencia (HU-14: SB-072 a SB-075)](#5-desarrollo--transferencias-y-concurrencia)
- [6. Desarrollo — Precios por Volumen y Alertas (HU-15 y HU-16: SB-076 a SB-078)](#6-desarrollo--precios-por-volumen-y-alertas)
- [7. Pruebas, Concurrencia y QA (SB-079 a SB-082)](#7-pruebas-concurrencia-y-qa)
- [8. Documentación y Cierre de Sprint (SB-083 a SB-085)](#8-documentación-y-cierre-de-sprint)

---

## 1. Análisis y Arquitectura

| ID Tarea | Descripción de la Actividad | Responsable | Estado |
| :--- | :--- | :--- | :--- |
| **SB-056** | Analizar e integrar el pipeline de visión por computadora (decodificación primaria zxing-cpp y respaldo OCR local). | Visión / IA | Completado |
| **SB-057** | Definir el protocolo de consenso determinista, preservación de apariciones y regla anti-doble conteo barcode/OCR. | Visión / Backend | Completado |
| **SB-058** | Analizar e implementar estrategia de control de concurrencia y atomicidad para transferencias de stock y ventas. | Backend | Completado |
| **SB-059** | Diseñar la arquitectura de autenticación con JWT estándar (HS256, expiración 7 días, cookies HttpOnly) y roles RBAC. | Backend / Seguridad | Completado |

---

## 2. Configuración y Servicios Base

| ID Tarea | Descripción de la Actividad | Responsable | Estado |
| :--- | :--- | :--- | :--- |
| **SB-060** | Configurar el entorno virtual y dependencias del servicio de IA en Python (`ai[test]`, FastAPI, OpenCV, zxing-cpp). | DevOps / IA | Completado |
| **SB-061** | Sustituir el proveedor externo Codulia por el catálogo abierto de Open Food Facts para enriquecimiento de lecturas. | Backend | Completado |
| **SB-062** | Incorporar librería estándar `jsonwebtoken` en backend y configurar variables de entorno obligatorias. | Backend | Completado |
| **SB-063** | Configurar suites de pruebas automatizadas en CI para backend (`node:test`), frontend (`vitest`) e IA (`unittest`). | QA / DevOps | Completado |

---

## 3. Desarrollo — Seguridad y RBAC (HU-12)

| ID Tarea | Descripción de la Actividad | Responsable | Estado |
| :--- | :--- | :--- | :--- |
| **SB-064** | Implementar generación y verificación de JWT en cookies `stockia_session` con `HttpOnly`, `SameSite=Lax` y `Secure` en producción. | Backend | Completado |
| **SB-065** | Implementar política de seguridad estricta: abortar arranque en producción si `SESSION_SECRET` o `JWT_SECRET` es débil o por defecto. | Backend | Completado |
| **SB-066** | Reseteo del contador de rate limiting en intentos de login exitosos para evitar bloqueos espurios. | Backend | Completado |
| **SB-067** | Implementar validación accesible en tiempo real en `LoginPage.tsx` (desenfoque y escritura) y deshabilitar botón durante el envío. | Frontend | Completado |

---

## 4. Desarrollo — Ventas Asistidas por Imagen (HU-13)

| ID Tarea | Descripción de la Actividad | Responsable | Estado |
| :--- | :--- | :--- | :--- |
| **SB-068** | Preservar conteo de unidades físicas en agentes de barcode y OCR con regla determinista anti-doble conteo en consenso. | Visión / IA | Completado |
| **SB-069** | Propagar cantidades detectadas (`suggestedQuantity`) y asociarlas al catálogo local en `catalog-match.agent.js`. | Backend | Completado |
| **SB-070** | Crear endpoint `POST /api/sales/scan` con autorización por roles (`administrador` y `caja`) manteniendo retrocompatibilidad. | Backend | Completado |
| **SB-071** | Implementar precarga automática editable en el carrito de ventas (`cartPreload.ts`) con recorte por stock disponible del depósito. | Frontend | Completado |

---

## 5. Desarrollo — Transferencias y Concurrencia (HU-14)

| ID Tarea | Descripción de la Actividad | Responsable | Estado |
| :--- | :--- | :--- | :--- |
| **SB-072** | Crear servicio desacoplado `StockTransferService.transferStock` con transacción atómica en Prisma (`$transaction`). | Backend | Completado |
| **SB-073** | Implementar descuento condicional atómico (`updateMany` con `quantity: { gte: qty }`) para prevenir sobregiros en concurrencia. | Backend | Completado |
| **SB-074** | Capturar y transformar violación de constraint CHECK PostgreSQL (código `23514`) a respuesta limpia HTTP 400. | Backend | Completado |
| **SB-075** | Implementar modelo de movimientos con signo: dos `StockMovement` por producto (salida negativa, entrada positiva, un solo `depositId`). | Backend | Completado |

---

## 6. Desarrollo — Precios por Volumen y Alertas (HU-15 y HU-16)

| ID Tarea | Descripción de la Actividad | Responsable | Estado |
| :--- | :--- | :--- | :--- |
| **SB-076** | Exponer `priceRules` en `/api/inventory` y calcular precio por tramo en tiempo real en el frontend (`unitPriceForQuantity`). | Frontend / Backend | Completado |
| **SB-077** | Implementar endpoint `GET /api/inventory/low-stock` con clasificación de criticidad (`sin_stock`, `critico`, `bajo`, `saludable`). | Backend | Completado |
| **SB-078** | Unificar componente `StockBadge` y conectar filtro "Bajo mínimo" de `StockPage.tsx` al endpoint del servidor. | Frontend | Completado |

---

## 7. Pruebas, Concurrencia y QA

| ID Tarea | Descripción de la Actividad | Responsable | Estado |
| :--- | :--- | :--- | :--- |
| **SB-079** | Crear pruebas de integración del pipeline con muestras reales de Open Food Facts (`test_pipeline_samples.py`) y ejecutar evaluación. | QA / IA | Completado |
| **SB-080** | Implementar pruebas de integración y seguridad para `/api/sales/scan`, `/api/inventory/low-stock` y matriz de roles RBAC. | QA / Backend | Completado |
| **SB-081** | Implementar suite de estrés concurrente (`transfer-concurrency.test.js`) con `Promise.all` para transferencias y ventas simultáneas. | QA / Backend | Completado |
| **SB-082** | Registrar y corregir los defectos hallados durante el ciclo de pruebas (`docs/sprint-2-defectos.md`). | QA / Desarrollo | Completado |

---

## 8. Documentación y Cierre de Sprint

| ID Tarea | Descripción de la Actividad | Responsable | Estado |
| :--- | :--- | :--- | :--- |
| **SB-083** | Actualizar catálogo de Historias de Usuario (`docs/historias-de-usuario.md`) incorporando HU-12 a HU-16. | Documentación | Completado |
| **SB-084** | Actualizar modelo entidad-relación en Mermaid (`docs/data-model.md`) reflejando el esquema final de Prisma. | Documentación | Completado |
| **SB-085** | Elaborar Informe de Cierre de Sprint 2 (`docs/sprint-2-informe.md`), plan de pruebas SPACEDIRT y estándar de codificación. | Documentación / Líder | Completado |
