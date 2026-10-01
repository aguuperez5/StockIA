# Códigos con el número debajo

12 PNG distintos descargados del [generador público bwip-js](https://github.com/metafloor/bwip-js/wiki/Online-Barcode-API). Cada imagen contiene un EAN-13 y su número impreso debajo. El lector valida el valor de cada archivo antes de guardarlo.

Dos identificadores son ejemplos públicos de Codulia y los demás vienen del catálogo de pruebas del notebook. No se afirma que los otros productos estén en Codulia: esa API sigue requiriendo una suscripción activa.

Para probarlos, entrar en Nueva venta y elegir un PNG. La app debe mostrar el código leído; si no está registrado en el catálogo, lo indicará. No se inventan precios ni existencias.

Descargar de nuevo: `ai/.venv/Scripts/python ai/scripts/download_barcode_labels.py`.

Evaluar con barcode y OCR reales: `ai/.venv/Scripts/python ai/scripts/evaluate_samples.py ai/samples/codigos_con_numero`.
