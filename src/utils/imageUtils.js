// utils/imageUtils.js

export async function resizeImageFile(file, maxSizeMB = 2, maxWidth = 1024) {
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("ไม่ใช่ไฟล์รูปภาพที่รองรับ");
  }

  const fileType = file.type;

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });

  const scaleFactor = Math.min(maxWidth / img.width, 1);
  const canvas = document.createElement("canvas");
  canvas.width = img.width * scaleFactor;
  canvas.height = img.height * scaleFactor;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob), fileType, 0.8)
  );

  if (!blob) {
    throw new Error("ปรับขนาดไม่สำเร็จ");
  }

  const newFile = new File([blob], file.name, { type: fileType });
  const newSizeMB = newFile.size / (1024 * 1024);

  if (newSizeMB > maxSizeMB) {
    throw new Error(`แม้ปรับขนาดแล้ว ยังเกิน ${maxSizeMB} MB`);
  }

  return newFile;
}
