# StockIA

Sistema inteligente de reconocimiento visual de productos para automatizar puntos de venta (caja), control de inventario multi-sucursal y emisión de documentación operativa (tickets y remitos).

**Cátedra:** Ingeniería y Calidad de Software — Ciclo Lectivo 2026  
**Institución:** UTN – Facultad Regional San Francisco  
**Carrera:** Ingeniería en Sistemas de Información  

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

## Estructura del Repositorio

- `frontend/` — Single Page Application en React, TypeScript y Vite.
- `backend/` — API RESTful en Node.js, Express y Prisma ORM sobre PostgreSQL.
- `ai/` — Pipeline de visión computacional y PoC en Python (zxing-cpp + PaddleOCR).
- `docs/` — Documentación académica, metodológica y técnica de arquitectura.

---

## Documentación del Proyecto

### Metodología Ágil y Entregas de Sprint
- 📄 [Sprint 0 — Visión, Alcance, DoD y Calidad QA](docs/sprint-0.md)
- 📄 [Sprint 1 — Informe de Entrega, Pivot Tecnológico y Retrospectiva](docs/sprint-1-informe.md)
- 📄 [Sprint 2 — Informe de Entrega, Visión y Cierre de Arquitectura](docs/sprint-2-informe.md)
- 📋 [Historias de Usuario (HU-01 a HU-16)](docs/historias-de-usuario.md)
- 📝 [Sprint 1 Backlog — Descomposición de Tareas (SB-001 a SB-055)](docs/sprint-1-backlog.md)
- 📝 [Sprint 2 Backlog — Descomposición de Tareas (SB-056 a SB-085)](docs/sprint-2-backlog.md)
- 🧪 [Plan de Pruebas SPACEDIRT — Alcance, Casos y Matriz ISO 29119-3](docs/plan-de-pruebas.md)
- 📊 [Matriz de Ejecución de Pruebas de QA — Sprint 2](docs/sprint-2-pruebas-ejecucion.md)
- 🐛 [Registro de Defectos y Ciclo de Vida (Bug Tracker) — Sprint 2](docs/sprint-2-defectos.md)

### Arquitectura Técnica y Estándares de Ingeniería
- 📐 [Estándar de Codificación y Checklist de Code Review](docs/estandar-de-codificacion.md)
- 🗄️ [Modelo de Datos y Diagrama Entidad-Relación (DER)](docs/data-model.md)
- 📦 [Reglas de Negocio de Stock, Concurrencia y Multi-Sucursal](docs/stock-rules.md)
- 🏷️ [Reglas de Precios Dinámicos por Volumen](docs/pricing.md)
- 🛒 [Flujo Transaccional de Venta Asistida](docs/flujo-venta-manual.md)
- 🔌 [Contrato de Integración y Endpoints de API Backend](docs/backend-integration.md)
- ⚙️ [Instructivo de Instalación y Puesta en Marcha](docs/installation.md)

---

## Arranque Rápido del Entorno Local

### 1. Base de Datos y Backend

```bash
# 1. Iniciar PostgreSQL en Docker (puerto 5434)
docker compose up -d

# 2. Configurar dependencias y esquema
cd backend
npm install
# En Windows: Copy-Item .env.example .env (o copiar manualmente)
# En Linux/macOS: cp .env.example .env

npx prisma generate
npx prisma migrate deploy
npm run seed
npm start
```

La API quedará accesible en `http://localhost:3001`.

### 2. Frontend

En una terminal independiente:

```bash
cd frontend
npm install
npm run dev
```

La aplicación web estará disponible en `http://localhost:3000`.
