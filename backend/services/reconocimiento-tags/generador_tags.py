import os
import cv2
import numpy as np

def obtener_diccionario_apriltag():
    """Obtiene el diccionario estándar tag36h11 de AprilTag en OpenCV."""
    return cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_APRILTAG_36h11)

def generar_tag_imagen(tag_id, tamaño_px=300, borde_bits=1):
    """Genera la matriz del marcador AprilTag tag36h11."""
    diccionario = obtener_diccionario_apriltag()
    if hasattr(cv2.aruco, "generateImageMarker"):
        tag_img = cv2.aruco.generateImageMarker(diccionario, tag_id, tamaño_px, borderBits=borde_bits)
    else:
        tag_img = cv2.aruco.drawMarker(diccionario, tag_id, tamaño_px, borderBits=borde_bits)
    pad = max(8, tamaño_px // 8)
    tag_con_borde = cv2.copyMakeBorder(tag_img, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=255)
    return cv2.resize(tag_con_borde, (tamaño_px, tamaño_px), interpolation=cv2.INTER_NEAREST)

def crear_tarjeta_producto(tag_id, nombre_producto, ancho=600, alto=680):
    """Genera una tarjeta individual con borde guía y AprilTag."""
    tarjeta = np.full((alto, ancho, 3), 255, dtype=np.uint8)
    
    tamaño_tag = 420
    tag_mat = generar_tag_imagen(tag_id, tamaño_px=tamaño_tag, borde_bits=1)
    tag_bgr = cv2.cvtColor(tag_mat, cv2.COLOR_GRAY2BGR)
    
    pos_x = (ancho - tamaño_tag) // 2
    pos_y = 50
    tarjeta[pos_y:pos_y + tamaño_tag, pos_x:pos_x + tamaño_tag] = tag_bgr
    
    cv2.line(tarjeta, (30, pos_y + tamaño_tag + 30), (ancho - 30, pos_y + tamaño_tag + 30), (220, 220, 220), 2)
    
    cv2.putText(tarjeta, nombre_producto, (35, pos_y + tamaño_tag + 75), cv2.FONT_HERSHEY_SIMPLEX, 0.95, (10, 10, 10), 2, cv2.LINE_AA)
    cv2.putText(tarjeta, f"AprilTag tag36h11 | ID: {tag_id}", (35, pos_y + tamaño_tag + 120), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (100, 100, 100), 2, cv2.LINE_AA)
    cv2.rectangle(tarjeta, (2, 2), (ancho - 3, alto - 3), (180, 180, 180), 2)
    return tarjeta

if __name__ == "__main__":
    print("=" * 60)
    print("      GENERADOR DE CODIGOS APRILTAG")
    print("=" * 60)
    
    entrada = input("\nIngresa los IDs de tu base de datos para generar (separados por coma, ej: 1,2,5): ")
    ids = [int(i.strip()) for i in entrada.split(",") if i.strip().isdigit()]
    
    if not ids:
        print("No se ingresaron IDs validos. Saliendo...")
        exit(1)
        
    carpeta_salida = "tags_imprimibles"
    os.makedirs(carpeta_salida, exist_ok=True)
    
    print("\n--- Generando etiquetas ---")
    for tag_id in ids:
        nombre = f"Producto ID {tag_id}"
        tarjeta = crear_tarjeta_producto(tag_id, nombre)
        ruta_archivo = os.path.join(carpeta_salida, f"tag_{tag_id}.png")
        cv2.imwrite(ruta_archivo, tarjeta)
        print(f" [✓] Guardado: {ruta_archivo}")
        
    print("\n¡Tags generados en la carpeta 'tags_imprimibles'!")
    print("Podes subir uno de esos PNG directamente al sistema StockIA para probar.")
