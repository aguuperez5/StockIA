# Muestras de Open Food Facts

`etiquetas_descargadas/` contiene tres PNG descargados del generador público
bwip-js, con barras y el número debajo. Los identificadores corresponden a los
productos consultados en Open Food Facts: Nutella, Coca-Cola y Evian.

En esta carpeta también hay 20 imágenes generadas localmente para probar barras,
números solos, giro, contraste, tamaño chico, JPEG, imagen vacía y varios códigos.
Son etiquetas sintéticas; no representan la precisión sobre fotos de envases.

`products.json` conserva nombre, marca, fecha, endpoint y enlace al producto.
Los datos de Open Food Facts están bajo ODbL / Database Contents License.
Los manifiestos distinguen las etiquetas descargadas de las generadas localmente.

Para regenerar desde la raíz:

```powershell
npm run samples:ai
ai/.venv/Scripts/python ai/scripts/download_barcode_labels.py
npm run evaluate:ai
ai/.venv/Scripts/python ai/scripts/evaluate_samples.py ai/samples/openfoodfacts/etiquetas_descargadas
```

La API pública limita las lecturas de productos a 15/minuto/IP. La descarga de
datos espera cinco segundos entre solicitudes; evitá ejecutarla junto a muchas
consultas desde el backend o notebook en la misma IP.
