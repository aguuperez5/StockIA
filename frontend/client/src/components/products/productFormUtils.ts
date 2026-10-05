export const parseMoney = (value: string) => {
  const clean = String(value).trim();
  return Number(
    clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean
  );
};

export function resizeImageToDataUrl(
  fileOrBlob: Blob,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(img.src);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () =>
        reject(new Error("No se pudo procesar la imagen seleccionada."));
      img.src = reader.result as string;
    };
    reader.onerror = () =>
      reject(new Error("No se pudo leer el archivo de imagen."));
    reader.readAsDataURL(fileOrBlob);
  });
}
