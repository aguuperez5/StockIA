# Pruebas de reconocimiento

Los códigos se descargaron de los ejemplos públicos de [Codulia](https://codulia.com/):

- `7791337603615`: Yogur entero vainilla, La Serenísima (ejemplo publicado por Codulia).
- `7790070410115`: identificador del ejemplo de consulta; no se asignó un nombre inventado.

La API respondió `402 SUBSCRIPTION_REQUIRED` con la clave local: terminó el período de prueba. `products.json` registra la fuente real de cada código. Con una suscripción activa, `npm run samples:ai` descarga más identificadores usando `CODULIA_API_KEY` de `backend/.env`.

Las 14 imágenes son etiquetas **generadas localmente a partir de esos códigos**, no fotografías descargadas de envases: limpio, girado, poco contraste, poca altura, JPEG, solo números para OCR, un control sin código y varios códigos juntos. `manifest.jsonl` contiene los valores esperados; `evaluation.json` guarda el resultado de `npm run evaluate:ai`. Estos casos verifican regresiones, no la precisión con fotografías reales.

Para probar en StockIA:

1. Ejecutar `npm run dev:ai`, `npm run dev` y `npm run dev:frontend` en terminales distintas.
2. En una nueva venta, elegir una de las imágenes de esta carpeta.
3. La pantalla muestra el código leído. Para obtener una sugerencia vendible, registrar previamente el producto en el catálogo con ese código como SKU y cargar sus precios y existencias reales.

No se crean productos, precios ni movimientos de stock automáticamente. Los archivos `solo-numeros` requieren OCR; `varios-codigos` debe pedir revisión; `sin-codigo` no debe producir un identificador.
