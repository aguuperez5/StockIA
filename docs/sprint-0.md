# Sprint 0 — Visión, Alcance y Fundamentos Técnicos

**Proyecto:** StockIA  
**Institución:** UTN – Facultad Regional San Francisco  
**Carrera:** Ingeniería en Sistemas de Información  
**Cátedra:** Ingeniería y Calidad de Software (Ciclo Lectivo 2026)  
**Fecha de entrega:** 10/06/2026  
**Integrantes:**
- Camino Matías
- Mecchia Valentín
- Perez Agustín
- Sereno Facundo José

**Profesores:**
- Gandino Diego
- Saldarini Javier Daniel

**Repositorio oficial:** [https://github.com/aguuperez5/StockIA](https://github.com/aguuperez5/StockIA)

---

## 1. ¿Qué construye StockIA?

**StockIA** es una aplicación inteligente diseñada para automatizar los procesos de facturación, gestión de inventario y documentación logística en comercios y depósitos mediante reconocimiento visual de productos.

El sistema identifica artículos a partir de una fotografía capturada en el punto de venta o durante una transferencia de mercadería, los coteja contra el catálogo de la base de datos y genera automáticamente tickets de venta o remitos operativos, descontando o actualizando el stock en tiempo real por sucursal o depósito. Adicionalmente, incluye un módulo para el envío de ofertas comerciales personalizadas mediante Telegram basadas en los hábitos de consumo de los clientes.

```
                  ┌──────────────────────┐
                  │  Fotografía / Sticker │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │ Reconocimiento Visual│ (Barcode / OCR / IA)
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │  Catálogo & Precios  │ (Base de datos PostgreSQL)
                  └──────────┬───────────┘
                             │
       ┌─────────────────────┼─────────────────────┐
       ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ Ticket Venta │      │ Remito Transf│      │ Ofertas Pers.│
│ (Caja)       │      │ (Logística)  │      │ (Telegram)   │
└──────────────┘      └──────────────┘      └──────────────┘
```

---

## 2. Necesidad detectada y problema que resuelve

En los comercios y depósitos tradicionales, la carga manual de productos durante las operaciones de venta y transferencia genera fricciones operativas críticas:

| Dolor detectado | Impacto en el negocio | Solución de StockIA |
| :--- | :--- | :--- |
| **Pérdida de tiempo operativo** | Los operadores y cajeros deben tipear códigos manualmente o buscar ítem por ítem en listados extensos. | Captura fotográfica instantánea que agrupa y contabiliza productos en segundos. |
| **Errores de tipeo y stock desactualizado** | Confusión de variantes, omisión de unidades e inconsistencias entre el inventario físico y el sistema. | Identificación automatizada con trazabilidad fotográfica de cada transacción. |
| **Demoras en la atención al cliente** | Colas en caja y experiencia de compra deficiente ante picos de demanda. | Agilización drástica del checkout y cálculo automático de subtotales y totales. |
| **Menor trazabilidad de movimientos** | Dificultad para auditar transferencias entre depósitos o pérdidas de mercadería. | Registro unificado de movimientos con depósito origen, destino y usuario responsable. |

---

## 3. Usuarios objetivo y propuesta de valor

El sistema está concebido para cuatro perfiles de usuario principales:

1. **Personal de Caja / Ventas:**
   - *Rol:* Registra transacciones comerciales y atiende al público.
   - *Valor:* Reduce radicalmente el tiempo de atención y elimina los errores humanos de carga manual.
2. **Personal de Depósito / Logística:**
   - *Rol:* Gestiona altas, recepciones y transferencias entre depósitos.
   - *Valor:* Generación automática de remitos de transferencia y control de stock físico sin desfasajes.
3. **Encargados / Administradores:**
   - *Rol:* Supervisan el catálogo de productos, precios por volumen, stock consolidado y auditoría.
   - *Valor:* Visibilidad centralizada en tiempo real, auditoría visual y reportes de movimientos.
4. **Marketing / Gestión Comercial:**
   - *Rol:* Diseñan estrategias de fidelización y promociones.
   - *Valor:* Segmentación y envío de promociones personalizadas a través de un bot de Telegram según historial de compras.

---

## 4. Alcance inicial del proyecto

Para asegurar una entrega incremental y de alto valor (Scrum), el alcance del ciclo anual se dividió en lo que forma parte del **MVP (Fase 1)** y lo que se posterga para fases futuras:

### ✅ Entra en Fase 1 (MVP)
- Identificación de productos por imágenes (ML / Barcode / OCR).
- Base de datos centralizada de productos con reglas de precios dinámicos por volumen.
- Emisión de tickets de venta con cálculo automático de totales.
- Registro automático de salida de stock ante ventas confirmadas.
- Remitos operativos para transferencias entre múltiples depósitos.
- Interfaz web interactiva en tiempo real y documentación técnica exhaustiva.

### ❌ Fuera de alcance en Fase 1
- Facturación electrónica fiscal (AFIP / entes gubernamentales).
- Pasarelas de cobro electrónico o terminales POS integradas.
- Aplicación móvil nativa (se prioriza Web App responsive).
- Modelo de reconocimiento visual productivo con dataset masivo entrenado desde cero.
- Módulos de analítica predictiva avanzada o machine learning de demanda.
- Despliegue en infraestructura de alta disponibilidad productiva final.

> **Nota:** La Fase 1 deja un MVP 100% funcional y usable con las operaciones primordiales de negocio, asentando una arquitectura desacoplada y escalable para futuras extensiones.

---

## 5. Arquitectura por capas y tecnologías

El sistema adopta una arquitectura en capas para maximizar la mantenibilidad, desacoplamiento y testeo:

| Capa / Componente | Tecnología | Responsabilidad |
| :--- | :--- | :--- |
| **Frontend** | React + TypeScript + Vite | Interfaz de usuario reactiva, formularios con validaciones en tiempo real y comunicación REST. |
| **Backend** | Node.js + Express + Prisma ORM | API RESTful, lógica de negocio, autenticación, control transaccional de stock y ventas. |
| **Base de Datos** | PostgreSQL | Persistencia relacional, integridad referencial y soporte de transacciones ACID. |
| **Módulo IA / Visión** | Python + OpenCV + zxing-cpp + PaddleOCR | Pipeline de preprocesamiento, detección de código de barras y OCR de respaldo. |
| **Autenticación** | JWT (JSON Web Tokens) / OAuth 2.0 | Seguridad sin estado (stateless) para sesiones de usuarios y control de roles. |
| **Integración Externa** | Telegram Bot API | Notificaciones masivas, ofertas comerciales personalizadas y alertas. |

---

## 6. Herramientas de gestión y metodología

- **GitHub:** Repositorio central, control de versiones (Git), branching model, code reviews y documentación técnica en Markdown.
- **Jira:** Gestión ágil de tareas (Sprint Backlog, épicas, asignación y estimación de puntos/horas).
- **Figma:** Prototipado UX/UI, wireframes y flujos de pantallas para caja, depósitos y catálogo.
- **Google Drive:** Almacenamiento de documentación compartida, actas de reunión y material de cátedra.
- **WhatsApp / Discord:** Canales de comunicación sincrónica y coordinación rápida del equipo.

---

## 7. Definition of Done (DoD) y estrategia QA

### Definition of Done (DoD)
- **Sprint 0:** Definición del proyecto aprobada, ambiente local reproducible listo, documentación técnica inicial completa y prototipos de interfaz en Figma validados.
- **Sprints siguientes:**
  1. Todos los Criterios de Aceptación (CA) de cada Historia de Usuario cumplidos.
  2. Código integrado en la rama principal sin errores críticos de compilación ni lints.
  3. Pruebas funcionales y de endpoints ejecutadas exitosamente.
  4. Documentación técnica y modelos de datos actualizados en el repositorio.

### Estrategia de Calidad (QA)
- **Sprint 0:** Revisión de coherencia de flujos en prototipos, validación de la arquitectura por capas y verificación de entorno de desarrollo.
- **Sprints siguientes:** Pruebas funcionales de extremo a extremo (E2E), validación de endpoints de API REST, pruebas del pipeline de visión por computadora, verificación de consistencia transaccional en stock y pruebas de usabilidad en caja.

---

## 8. Pila de producto e historias del Sprint 0

El Product Backlog inicial consta de 16 ítems priorizados que abarcan desde la configuración básica de infraestructura hasta módulos avanzados de fidelización. Para las primeras iteraciones de desarrollo, el trabajo se estructuró en bloques de Historias de Usuario:

1. **Bloque 1 (HU-001 a HU-004):** Seguridad y Catálogo de Productos (Registro de usuarios, alta de producto, edición de producto y listado con stock consolidado).
2. **Bloque 2 (HU-005 a HU-007):** Gestión de Depósitos y Stock (Alta de depósitos físicos, consulta de stock por sucursal y ajustes manuales con registro de movimientos).
3. **Bloque 3 (HU-008 a HU-011):** Operaciones de Venta y Trazabilidad (Creación de venta manual, confirmación de venta con emisión de ticket, descuento automático de stock y consulta de historial transaccional).
