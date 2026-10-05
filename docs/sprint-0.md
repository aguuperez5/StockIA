# Sprint 0 — Documento Oficial de Definición de Proyecto

**Proyecto:** Sistema de Reconocimiento de Productos mediante Imágenes – **StockIA**  
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

## Índice

1. [Proyecto elegido: Sistema de reconocimiento de productos mediante imágenes – StockIA](#1-proyecto-elegido-sistema-de-reconocimiento-de-productos-mediante-imágenes--stockia)
2. [Qué construye el sistema](#2-qué-construye-el-sistema)
3. [Necesidad detectada y problema que resuelve](#3-necesidad-detectada-y-problema-que-resuelve)
4. [Usuarios objetivo](#4-usuarios-objetivo)
5. [Valor de negocio esperado](#5-valor-de-negocio-esperado)
6. [Alcance inicial](#6-alcance-inicial)
   - 6.1 [Qué entra en esta primera etapa](#61-qué-entra-en-esta-primera-etapa)
   - 6.2 [Qué no entra en esta primera etapa](#62-qué-no-entra-en-esta-primera-etapa)
7. [Herramientas de gestión de proyecto](#7-herramientas-de-gestión-de-proyecto)
8. [Arquitectura y tecnologías estimadas a utilizar](#8-arquitectura-y-tecnologías-estimadas-a-utilizar)
   - 8.1 [Arquitectura propuesta](#81-arquitectura-propuesta)
   - 8.2 [Tecnologías estimadas](#82-tecnologías-estimadas)
9. [Ambiente de trabajo e instalación](#9-ambiente-de-trabajo-e-instalación)
   - 9.1 [Componentes a instalar o configurar](#91-componentes-a-instalar-o-configurar)
   - 9.2 [Instructivo de implementación](#92-instructivo-de-implementación)
10. [Interfaz de usuario: funciones más importantes del sistema](#10-interfaz-de-usuario-funciones-más-importantes-del-sistema)
11. [Con qué calidad: Definition of Done y estrategia QA](#11-con-qué-calidad-definition-of-done-y-estrategia-qa)
    - 11.1 [Definition of Done](#111-definition-of-done)
    - 11.2 [Estrategia QA](#112-estrategia-qa)
12. [Video del prototipo en papel](#12-video-del-prototipo-en-papel)
13. [Pila de producto inicial recomendada (13.1 a 13.16)](#13-pila-de-producto-inicial-recomendada)
14. [Historias de usuario a realizar en Sprint 0 (Mapeo y Motivos)](#14-historias-de-usuario-a-realizar-en-sprint-0)
15. [Cierre](#15-cierre)

---

## 1. Proyecto elegido: Sistema de reconocimiento de productos mediante imágenes – StockIA

El proyecto consiste en el desarrollo de una aplicación que permita identificar productos a partir de una fotografía, con el objetivo de simplificar y automatizar procesos de venta, control de stock y generación de documentación operativa dentro de un negocio comercial.

La idea principal es que, al tomar una foto de los productos en el momento de una venta o de una transferencia de mercadería, el sistema sea capaz de reconocer los artículos presentes, asociarlos con una base de datos de productos cargados previamente y armar automáticamente el detalle correspondiente del ticket o del remito.

Además, al reconocer los productos, el sistema deberá traer el precio cargado de cada uno de ellos. Se contempla que un mismo producto pueda tener distintos precios según la cantidad comprada, por lo que también se deberá calcular el total de la compra de forma automática de acuerdo con las reglas de precio definidas.

Una vez concretada la venta, será necesario registrar la salida de mercadería del stock del depósito correspondiente. El negocio plantea además la existencia de más de un depósito, por lo que el sistema también deberá contemplar transferencias entre depósitos. Para ello, el usuario podrá tomar una foto de los productos a enviar y el sistema generará el remito correspondiente, registrando el movimiento de stock entre depósitos.

Como una funcionalidad complementaria, se busca que el sistema pueda enviar **ofertas personalizadas por Telegram** (*no WhatsApp porque es muy costoso*) a los clientes en función de los productos que compran habitualmente, con el objetivo de mejorar la relación comercial y aumentar las oportunidades de venta.

---

## 2. Qué construye el sistema

El sistema resuelve una necesidad concreta del entorno comercial: **reducir el tiempo y los errores asociados a la identificación manual de productos durante ventas y transferencias**.

En lugar de cargar cada producto de forma manual, el operador podrá tomar una foto y apoyarse en un sistema de reconocimiento que sugiera los productos detectados. Luego de la revisión y confirmación por parte del usuario, el sistema generará el ticket o remito correspondiente y actualizará el stock de forma automática.

De esta manera, el sistema combina:
1. **Reconocimiento visual de productos.**
2. **Gestión de inventario multi-depósito.**
3. **Automatización de procesos comerciales y fidelización** en una misma solución.

---

## 3. Necesidad detectada y problema que resuelve

En muchos negocios, la carga manual de productos durante una venta o una transferencia implica:
- **Pérdida de tiempo operativo:** Demora continua al registrar ítem por ítem.
- **Errores de tipeo:** Confusión al ingresar manualmente códigos numéricos o nombres.
- **Problemas de stock desactualizado:** Desfasajes entre el stock real y el del sistema.
- **Demoras en la atención:** Inconvenientes y filas para los clientes en el punto de venta.
- **Dificultad para registrar múltiples productos rápidamente:** Falta de mecanismos ágiles para lotes de mercadería.
- **Menor trazabilidad de los movimientos de mercadería:** Dificultad para auditar salidas y transferencias entre depósitos.

Este proyecto busca resolver esos problemas mediante una interfaz simple y un flujo apoyado por tecnología de reconocimiento de imágenes, logrando un proceso más ágil, confiable y escalable en comercios que gestionan múltiples productos y depósitos.

---

## 4. Usuarios objetivo

Los usuarios principales del sistema son:
- **Personal de caja o ventas:** Utiliza el sistema para registrar productos durante una venta.
- **Personal de depósito o logística:** Lo utiliza para transferencias de mercadería entre depósitos y control de ingresos/egresos.
- **Encargados o administradores del negocio:** Consultan stock consolidado, precios por volumen, movimientos históricos y documentación generada.
- **Eventualmente, personal de marketing o gestión comercial:** Utiliza la información histórica de compras para definir y enviar ofertas personalizadas vía Telegram.

---

## 5. Valor de negocio esperado

El sistema aporta valor al negocio en distintos niveles:
- **Reduce el tiempo de carga** de ventas y transferencias.
- **Disminuye errores humanos** en la identificación de productos.
- **Mejora el control y la trazabilidad del stock** físico.
- **Automatiza la generación de comprobantes** (tickets de venta y remitos).
- **Permite aprovechar mejor la información histórica** de compras.
- **Facilita acciones comerciales personalizadas** mediante Telegram.
- **Sienta una base tecnológica moderna y centralizada** para escalar el negocio.

Comercialmente se traduce en una operación más rápida, menor fricción en la atención al cliente y mejor control de inventarios.

---

## 6. Alcance inicial

### 6.1. Qué entra en esta primera etapa (Fase 1 / MVP)
- Identificación de productos a partir de imágenes (modelo de Machine Learning / Visión computacional).
- Base de datos central de productos con precios y reglas de precio por cantidad.
- Armado de tickets de venta con cálculo automático de subtotales y totales.
- Registro automático de salida de stock por venta confirmada.
- Generación de remitos para transferencias entre múltiples depósitos.
- Actualización de balance de stock por movimiento.
- Diseño e implementación de interfaz de usuario de las funciones principales.
- Documentación inicial del ambiente de trabajo.
- Definición del flujo de ofertas por Telegram como funcionalidad complementaria.

### 6.2. Qué no entra en esta primera etapa
- Facturación fiscal electrónica (conexión con AFIP u organismos tributarios).
- Cobros electrónicos o pasarelas de pago (Mercado Pago, POS, etc.).
- Aplicación móvil nativa (Android / iOS).
- Modelo de reconocimiento avanzado completamente entrenado y productivo para cualquier entorno no controlado.
- Automatización avanzada de campañas de marketing masivas.
- Analítica predictiva compleja de demanda.
- Integración final con la totalidad de servicios externos.
- Despliegue definitivo en producción (alta disponibilidad).

> **Objetivo del Sprint 0:** Dejar el proyecto correctamente planteado, con el ambiente definido, la arquitectura sentada y el prototipo inicial preparado, sin desarrollar aún la funcionalidad completa.

---

## 7. Herramientas de gestión de proyecto

- **GitHub:** Repositorio central, control de versiones (Git), trabajo colaborativo y branching model.
- **Jira:** Seguimiento de tareas, backlog, priorización, asignación de responsables y estado del avance.
- **Figma:** Diseño del prototipo de interfaz, wireframes y flujos de pantallas.
- **Google Drive:** Almacenamiento y resguardo de documentación compartida.
- **Markdown en GitHub:** Documentación técnica formal, instructivos de instalación y decisiones de arquitectura.
- **WhatsApp / Discord:** Canales de comunicación rápida y sincronización diaria entre los integrantes del grupo.

---

## 8. Arquitectura y tecnologías estimadas a utilizar

### 8.1. Arquitectura propuesta (Capas desacopladas)
- **Frontend:** Interfaz web interactiva para la interacción de los operadores.
- **Backend:** API REST encargada de la lógica de negocio, autenticación, cálculo de tickets, control de stock y remitos.
- **Base de Datos:** Persistencia relacional de productos, reglas de precios, clientes, depósitos, movimientos y compras.
- **Módulo de visión por computadora / IA:** Análisis de imágenes para identificar productos presentes en las fotografías.
- **Integración externa:** Envío de notificaciones y ofertas comerciales por Telegram mediante API externa.
- **Documentación:** Instructivos, decisiones técnicas y registro continuo del proyecto.

### 8.2. Tecnologías estimadas
- **Frontend:** React (TypeScript + Vite).
- **Backend:** Node.js con Express.
- **Base de Datos:** PostgreSQL con Prisma ORM.
- **Procesamiento de imágenes / IA:** Python con OpenCV, bibliotecas de visión computacional (`zxing-cpp`, `PaddleOCR`).
- **Autenticación:** JWT y OAuth 2.0 con manejo de usuarios y roles dentro del sistema.
- **Documentación técnica:** Markdown versionado en GitHub y repositorio compartido.
- **Prototipado de interfaz:** Figma y bocetos en papel.
- **Integración con Telegram:** Telegram Bot API (*se descarta WhatsApp por costos elevados*).

---

## 9. Ambiente de trabajo e instalación

Durante el Sprint 0 se preparó el ambiente de desarrollo para ser ejecutado localmente de forma reproducible:

### 9.1. Componentes a instalar o configurar
1. Git
2. Node.js (v20+)
3. npm o yarn
4. Python (3.10+)
5. PostgreSQL (mediante Docker Compose)
6. Editor de código: Visual Studio Code
7. Dependencias del frontend y del backend
8. Entorno para ejecutar pruebas locales
9. Repositorio remoto en GitHub
10. Variables de entorno (`.env`) necesarias para la configuración del proyecto

### 9.2. Instructivo de implementación
Los pasos estandarizados para desplegar el proyecto desde cero incluyen:
1. Clonación del repositorio remoto.
2. Instalación de dependencias de Backend y Frontend.
3. Configuración de variables de entorno (`.env`).
4. Inicialización del contenedor de base de datos PostgreSQL.
5. Ejecución de migraciones y carga de datos iniciales (`seed`).
6. Ejecución del backend y del frontend.
7. Verificación de conexiones y salud de los servicios.

*(Ver la guía paso a paso en [installation.md](installation.md)).*

---

## 10. Interfaz de usuario: funciones más importantes del sistema

En el Sprint 0 se prototiparon las pantallas principales del sistema, enfocándose en la experiencia de usuario (UX) y en la claridad de los flujos de trabajo:

1. **Pantalla de inicio o Dashboard:** Métricas generales y accesos rápidos a las funciones operativas.
2. **Nueva venta:** Punto de venta para cargar artículos y ver totales.
3. **Captura de foto:** Interfaz para subir o capturar imágenes de mercadería.
4. **Análisis o detección de productos:** Pantalla intermedia donde la IA procesa y muestra lo detectado.
5. **Revisión y edición de productos reconocidos:** Permite al cajero ajustar cantidades, agregar ítems no detectados o corregir detecciones erróneas.
6. **Confirmación de venta y ticket:** Resumen final, cálculo con reglas de precios y generación de comprobante.
7. **Nueva transferencia o remito:** Carga de productos a enviar entre depósitos con foto de respaldo.
8. **Consulta de stock:** Visualización de existencias consolidadas y filtradas por sucursal física.
9. **Consulta de clientes o historial de compras:** Listado de ventas y clientes registrados.
10. **Estadísticas:** Reportes de rendimiento comercial y movimientos de stock.

> Para consultar las especificaciones visuales detalladas, layouts y wireframes de las pantallas incorporadas en el Sprint 2 (Login, Captura/Venta, Transferencias y Alertas), consultar el documento [docs/disenos-ui.md](disenos-ui.md).

---

## 11. Con qué calidad: Definition of Done y estrategia QA

### 11.1. Definition of Done (DoD)

#### 11.1.1. Definition of Done en Sprint 0
- Correcta definición de la visión y alcance del proyecto.
- Ambiente de desarrollo local configurado y documentado.
- Documentación inicial de arquitectura y base de datos.
- Prototipo inicial de interfaz (wireframes en Figma y bocetos en papel) completado y validado.

#### 11.1.2. Definition of Done en el resto de Sprints
Se considerará que una tarea o Historia de Usuario está formalmente terminada cuando:
1. Los criterios de aceptación definidos hayan sido cumplidos.
2. La funcionalidad o entregable correspondiente esté implementado y funcionando correctamente.
3. La interfaz o flujo desarrollado sea comprensible y consistente con el objetivo del sistema.
4. El código desarrollado compile y funcione sin errores críticos.
5. La funcionalidad haya sido integrada correctamente con el resto del sistema.
6. La documentación técnica o funcional necesaria haya sido actualizada.
7. Se hayan realizado pruebas básicas de funcionamiento y validación manual.
8. El entregable pueda ser presentado y utilizado de forma coherente dentro del Sprint.

### 11.2. Estrategia QA

La estrategia de calidad se basa en validaciones continuas durante cada iteración:

#### 11.2.1. Estrategia QA en Sprint 0
- Revisión funcional del prototipo.
- Coherencia de los flujos de negocio.
- Correcta definición de arquitectura y tecnologías.
- Validación del alcance inicial (MVP vs. futuro).
- Correcta configuración y reproducibilidad del ambiente de trabajo.

#### 11.2.2. Estrategia QA en el resto de Sprints
- Pruebas funcionales del frontend y backend.
- Validación de APIs RESTful y conexiones con PostgreSQL.
- Pruebas del módulo de reconocimiento de imágenes (Barcode + OCR).
- Pruebas de integración entre módulos y microservicios.
- Validación transaccional de movimientos de stock y generación de tickets/remitos.
- Manejo de errores y cobertura de casos límite (edge cases).
- Revisiones periódicas de usabilidad y experiencia de usuario (UX).

---

## 12. Video del prototipo en papel

Se elaboró y registró la dinámica de interacción en papel para validar los flujos de navegación antes de la codificación:
- **Registro:** *Prototipo Stock AI Ing. y Calidad de Software*.

---

## 13. Pila de producto inicial recomendada

La pila de producto priorizada de mayor a menor relevancia técnica y funcional para el proyecto está conformada por los siguientes **16 ítems**:

### 13.1. Configuración del proyecto y ambiente
- Crear repositorio y estructura base de carpetas.
- Configurar frontend (React), backend (Express) y base de datos (PostgreSQL).
- Documentar pasos de instalación paso a paso.
- Definir variables de entorno y conexión local.

### 13.2. Modelo base de productos (base de datos)
- Cargar productos con nombre, código, imagen, precio y categoría.
- Permitir más de un precio por producto según la cantidad comprada (reglas de precio).
- Buscar, editar y borrar (CRUD) productos con borrado lógico.

### 13.3. Alta de depósitos y stock
- Registrar depósitos físicos y sucursales.
- Visualizar stock discriminado por depósito.
- Actualizar stock manualmente para pruebas y ajustes iniciales.

### 13.4. Captura de foto para reconocimiento directamente a la aplicación
- Subir foto desde la PC directamente a la aplicación web.
- Sacar o subir foto desde el dispositivo móvil.
- Guardar la foto asociada a la operación para auditoría.

### 13.5. Reconocimiento inicial de productos
- Detectar productos en una imagen capturada.
- Asociar el producto detectado con el catálogo de la base de datos.
- Mostrar nivel de confianza del resultado del reconocimiento.

### 13.6. Revisión y corrección manual
- Editar productos detectados por la IA en pantalla.
- Corregir o ajustar cantidades antes de facturar.
- Agregar manualmente productos no reconocidos por la cámara.

### 13.7. Generación de ticket de venta
- Armar detalle de venta con los productos reconocidos o seleccionados.
- Calcular total de forma automática aplicando reglas de precios vigentes.
- Confirmar y emitir el ticket de venta antes de guardarlo.

### 13.8. Descuento automático de stock por venta
- Descontar stock del depósito asignado al confirmar la venta.
- Registrar movimiento de auditoría de salida.
- Asociar el movimiento al depósito correspondiente.

### 13.9. Transferencia entre depósitos
- Crear remito formal de transferencia de mercadería.
- Tomar o subir foto de los productos a transferir.
- Detectar los productos y analizarlos automáticamente.
- Confirmar la salida del depósito origen y la entrada al depósito destino.

### 13.10. Historial de movimientos
- Visualizar ventas realizadas en el tiempo.
- Visualizar transferencias inter-sucursal completadas.
- Consultar y filtrar movimientos por fecha, producto o depósito.

### 13.11. Clientes y hábitos de compra
- Registrar clientes en el sistema (datos de contacto).
- Guardar el historial consolidado de compras por cliente.
- Identificar productos comprados frecuentemente por cada perfil.

### 13.12. Ofertas por Telegram
- Generar sugerencias automáticas de productos según patrones de compra.
- Preparar mensajes promocionales personalizados para clientes frecuentes.
- Registrar el envío de la campaña y estado de entrega.

### 13.13. Seguridad y roles
- Login y autenticación de usuarios.
- Roles diferenciados de caja, depósito y administrador.
- Acceso restringido por perfil a las pantallas y endpoints.

### 13.14. Reportes básicos
- Ventas totales acumuladas por período.
- Alertas visuales de stock bajo.
- Listado de productos más vendidos.
- Balance de transferencias por depósito.

### 13.15. QA y validación
- Pruebas funcionales del flujo de venta.
- Pruebas del flujo de transferencias entre depósitos.
- Validación de precisión del reconocimiento con dataset de imágenes de prueba.

### 13.16. Captura de foto para reconocimiento desde Telegram
- Subir foto desde la PC o dispositivo móvil al bot de Telegram.
- Guardarla automáticamente en el almacenamiento del sistema.
- Analizarla y ejecutar los movimientos de stock o venta de forma integrada.

---

## 14. Historias de usuario a realizar en Sprint 0

Mapeo explícito entre las primeras 11 Historias de Usuario priorizadas para el inicio de la construcción y los ítems de la Pila de Producto, indicando el motivo de su priorización:

| ID Historia | Título | Mapeo Pila de Producto | Justificación / Motivo |
| :--- | :--- | :--- | :--- |
| **HU-001** | Registro de usuario | **13.13 Seguridad y roles** | *Se necesitan usuarios antes de operar el sistema.* |
| **HU-002** | Registrar producto | **13.2 Modelo base de productos** | *Sin productos no existe el resto del sistema.* |
| **HU-003** | Editar producto | **13.2 Modelo base de productos** | Mantenimiento y actualización de precios y nombres del catálogo. |
| **HU-004** | Visualizar listado de productos | **13.2 Modelo base de productos** | Consulta de existencias y precios disponibles por los operadores. |
| **HU-005** | Registrar depósito | **13.3 Alta de depósitos y stock** | Soporte para múltiples sucursales y ubicaciones físicas. |
| **HU-006** | Visualizar stock por depósito | **13.3 Alta de depósitos y stock** | Visualización de existencias específicas por cada locación. |
| **HU-007** | Actualizar stock manualmente | **13.3 Alta de depósitos y stock** | *Se necesita stock cargado antes de vender.* |
| **HU-008** | Crear venta manual | **13.7 Generación de ticket de venta** | Permite: 1. Seleccionar productos manualmente, 2. Definir cantidad, 3. Calcular total. *(Sin reconocimiento todavía).* |
| **HU-009** | Confirmar venta | **13.7 Ticket & 13.8 Descuento automático** | Valida de forma atómica: Persistencia, Emisión de Ticket, Descuento de Stock y Registro de Movimiento. |
| **HU-010** | Registrar movimiento de stock | **13.8 Descuento automático de stock** | Auditoría y trazabilidad inmutable de salidas de mercadería. |
| **HU-011** | Visualizar historial de ventas | **13.10 Historial de movimientos** | Trazabilidad histórica de operaciones para la administración. |

---

## 15. Cierre

El **Sprint 0** tiene como objetivo dejar establecidas las bases sólidas del proyecto, tanto desde el punto de vista funcional como técnico y organizativo. A partir de este trabajo inicial se encara el desarrollo con:
- Una definición clara del problema y del valor de negocio.
- Una arquitectura de software estimada por capas desacopladas.
- Una propuesta de interfaz validada mediante prototipos.
- Un entorno de trabajo reproducible y documentado listo para avanzar de forma incremental en los siguientes Sprints.
