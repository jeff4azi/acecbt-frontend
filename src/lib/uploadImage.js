import imageCompression from "browser-image-compression";
import api from "./api";

/**
 * Compress an image file and upload it through the backend (service-role),
 * bypassing Supabase Storage RLS entirely.
 *
 * @param {File} file - The raw file from an <input type="file">
 * @param {'ad-images'|'question-images'|'option-images'} bucket
 * @param {{ maxSizeMB?: number, maxWidthOrHeight?: number }} [opts]
 * @returns {Promise<string>} The public URL of the uploaded image
 */
export async function uploadImage(file, bucket, opts = {}) {
  if (file.size > 6 * 1024 * 1024) {
    throw new Error(
      `File too large (${Math.round(file.size / 1024 / 1024)} MB). Max 6 MB before compression.`,
    );
  }

  // Compression defaults per bucket
  const defaults = {
    "ad-images": { maxSizeMB: 0.25, maxWidthOrHeight: 1200 },
    "question-images": { maxSizeMB: 0.15, maxWidthOrHeight: 800 },
    "option-images": { maxSizeMB: 0.12, maxWidthOrHeight: 700 },
  };

  const compressionOpts = {
    ...(defaults[bucket] ?? { maxSizeMB: 0.2, maxWidthOrHeight: 1000 }),
    ...opts,
    useWebWorker: true,
    fileType: "image/webp",
    initialQuality: 0.82,
  };

  let compressed;
  try {
    compressed = await imageCompression(file, compressionOpts);
  } catch {
    compressed = file;
  }

  // Convert compressed Blob → base64
  const base64 = await blobToBase64(compressed);

  const { data } = await api.post(`/upload/${bucket}`, {
    base64,
    contentType: "image/webp",
    fileName: "image.webp",
  });

  return data.url;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result); // includes data:...;base64, prefix — backend strips it
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
