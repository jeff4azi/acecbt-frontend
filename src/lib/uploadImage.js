import imageCompression from "browser-image-compression";
import api from "./api";

/**
 * Project spec compression targets (post-compression, before base64):
 *
 * | Bucket           | Width    | Target size  |
 * |------------------|----------|--------------|
 * | ad-images        | 1200px   | 80–250 KB    |
 * | question-images  | 800px    | 50–150 KB    |
 * | option-images    | 700px    | 40–120 KB    |
 *
 * Pre-compression input limit: 2 MB (per project spec)
 */

const BUCKET_CONFIG = {
  "ad-images": { maxSizeMB: 0.25, maxWidthOrHeight: 1200 },
  "question-images": { maxSizeMB: 0.15, maxWidthOrHeight: 800 },
  "option-images": { maxSizeMB: 0.12, maxWidthOrHeight: 700 },
};

// base64 encoding adds ~33% overhead — 250KB * 1.34 ≈ 335KB, so 1.5MB gives headroom for any bucket
const MAX_INPUT_BYTES = 2 * 1024 * 1024; // 2 MB pre-compression (per spec)
const MAX_OUTPUT_BYTES = 1.5 * 1024 * 1024; // 1.5 MB post-compression (covers base64 overhead + Express 4MB limit)

/**
 * Compress an image and upload it through the backend (service-role),
 * bypassing Supabase Storage RLS entirely.
 *
 * @param {File} file - The raw file from an <input type="file">
 * @param {'ad-images'|'question-images'|'option-images'} bucket
 * @returns {Promise<string>} The public URL of the uploaded image
 */
export async function uploadImage(file, bucket) {
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error(
      `File too large (${Math.round(file.size / 1024)} KB). Maximum is 2 MB before compression.`,
    );
  }

  const { maxSizeMB, maxWidthOrHeight } = BUCKET_CONFIG[bucket] ?? {
    maxSizeMB: 0.2,
    maxWidthOrHeight: 1000,
  };

  let compressed;
  try {
    compressed = await imageCompression(file, {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker: true,
      fileType: "image/webp",
      initialQuality: 0.8,
      maxIteration: 15, // keep iterating until target size is met
    });
  } catch {
    // If compression throws, fall back to the original —
    // the size check below will catch it if still too large
    compressed = file;
  }

  if (compressed.size > MAX_OUTPUT_BYTES) {
    throw new Error(
      `Compressed image is still too large (${Math.round(compressed.size / 1024)} KB). ` +
        `Please use a smaller or simpler image.`,
    );
  }

  // Convert compressed Blob → base64 data URL
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
    reader.onload = () => resolve(reader.result); // data:image/webp;base64,<data>
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
