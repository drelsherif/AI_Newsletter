export interface UploadResult {
  dataUrl: string;
  width: number;
  height: number;
  fileSizeKb: number;
  warning?: string;
}

export function readImageFile(file: File): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("File is not an image"));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const fileSizeKb = Math.round(file.size / 1024);

      const img = new Image();
      img.onerror = () => reject(new Error("Failed to decode image"));
      img.onload = () => {
        const warning =
          fileSizeKb > 500
            ? `Large image (${fileSizeKb}KB) — consider compressing before use. Base64 images increase JSON export size.`
            : fileSizeKb > 200
            ? `Image is ${fileSizeKb}KB. Exported JSON will be larger.`
            : undefined;

        resolve({
          dataUrl,
          width: img.naturalWidth,
          height: img.naturalHeight,
          fileSizeKb,
          warning,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export function formatBytes(kb: number): string {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)}MB` : `${kb}KB`;
}
