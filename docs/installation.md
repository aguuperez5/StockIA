# Instructivo de Instalación y Ejecución — StockIA

Guía paso a paso para clonar, configurar, inicializar y verificar el ambiente de desarrollo completo del sistema **StockIA** (Backend, Base de Datos, Frontend y Módulo de Visión).

---

## Requisitos Previos

- **Node.js:** Versión 20+ o 22+ (recomendada v22 por soporte nativo de strips de TypeScript).
- **npm** o **yarn** instalado.
- **Docker & Docker Desktop:** Para levantar el motor de base de datos PostgreSQL de forma aislada.
- **Git:** Para clonar el repositorio y gestionar versiones.
- **Python 3.10+** (opcional para el pipeline local de IA / visión computacional).

---

## 1. Clonación del Repositorio

```bash
git clone https://github.com/aguuperez5/StockIA.git
cd StockIA
```

---

## 2. Base de Datos (PostgreSQL en Docker)

Desde la raíz del repositorio, levantar el contenedor de PostgreSQL dedicado:

```bash
docker compose up -d
```

- **Contenedor:** `stockia-postgres`
- **Puerto expuesto en host:** `5434` (diseñado para no colisionar con instalaciones locales de PostgreSQL en los puertos estándar `5432` o `5433`).
- **Base de datos / Usuario / Password:** `stockia` / `stockia` / `stockia` (ver [docker-compose.yml](../docker-compose.yml)).

---

## 3. Configuración y Puesta en Marcha del Backend

### 3.1. Navegar e instalar dependencias

```bash
cd backend
npm install
```

### 3.2. Variables de entorno

Crear el archivo `.env` a partir del ejemplo:

```bash
# En Windows PowerShell:
Copy-Item .env.example .env

# En Linux o macOS:
cp .env.example .env
```

Variables requeridas en `backend/.env`:
- `DATABASE_URL="postgresql://stockia:stockia@localhost:5434/stockia?schema=public"`
- `PORT=3001`
- `FRONTEND_URL="http://localhost:3000"`
- `SESSION_SECRET="desarrollo_secreto_seguro_stockia"`

### 3.3. Generación de Cliente Prisma y Migraciones

```bash
# 1. Generar cliente Prisma
npx prisma generate

# 2. Aplicar las migraciones existentes a la base de datos
npx prisma migrate deploy

# (Opcional en desarrollo para crear nuevas migraciones):
# npx prisma migrate dev
```

### 3.4. Carga de Datos Iniciales (Seed Idempotente)

```bash
npm run seed
```

El script de seed es reproducible e idempotente (emplea `upsert` / `findOrCreate`) y carga:
- **Usuario Administrador:** `admin@stockia.dev` | Contraseña: `test1234`
- **Depósitos iniciales:** Depósito Central y Sucursal 1.
- **Productos de catálogo:** Artículos con códigos de barra de prueba y reglas de precios por volumen (`PriceRule`).
- **Stock inicial:** Existencias asignadas por depósito con balance verificado.

### 3.5. Iniciar el Servidor Backend

```bash
npm run dev       # En modo desarrollo con hot-reload (--watch)
# o bien:
npm start         # Modo estándar
```

La API REST quedará escuchando en `http://localhost:3001/api`.

---

## 4. Configuración y Puesta en Marcha del Frontend

En una nueva terminal:

### 4.1. Navegar e instalar dependencias

```bash
cd frontend
npm install
```

### 4.2. Variables de entorno

Verificar que `frontend/.env` contenga la URL de conexión a la API:

```env
VITE_API_URL=http://localhost:3001
```

### 4.3. Iniciar el Servidor de Desarrollo (Vite)

```bash
npm run dev
```

La interfaz web quedará disponible en el navegador en `http://localhost:3000`.

---

## 5. Verificación del Ambiente de Trabajo

Para corroborar que todos los servicios operan de forma articulada:
1. Abrir `http://localhost:3000` en el navegador.
2. Iniciar sesión con el usuario de prueba cargado en el seed (`admin@stockia.dev` / `test1234`).
3. Navegar a **Productos** para validar la lectura del catálogo desde PostgreSQL.
4. Navegar a **Depósitos y Stock** para verificar existencias.
5. Acceder a **Nueva Venta** para simular la emisión de un comprobante manual con descuento automático de inventario.

---

## 6. Ejecución de Pruebas Automatizadas (QA)

Para validar la integridad de las APIs y lógica de negocio del backend:

```bash
cd backend
npm test
```

> **Nota:** La suite de pruebas de integración se ejecuta con concurrencia controlada (`--test-concurrency=1`) y limpia las tablas en cada ciclo para garantizar aislamiento total y resultados deterministas.
