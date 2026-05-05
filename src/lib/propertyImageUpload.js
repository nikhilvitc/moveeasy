import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "./firebase";

function buildUniqueImageName(file) {
  const originalName = String(file?.name || "property-image")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-");
  const extension = originalName.includes(".") ? originalName.slice(originalName.lastIndexOf(".")) : ".jpg";
  const nonce = Math.random().toString(36).slice(2, 10);
  return `${Date.now()}-${nonce}${extension}`;
}

export async function uploadPropertyImageFile(imageFile) {
  if (!imageFile) {
    throw new Error("Please select an image file first.");
  }
  if (!String(imageFile.type || "").startsWith("image/")) {
    throw new Error("Only image files are allowed.");
  }

  const uniqueName = buildUniqueImageName(imageFile);
  const storageRef = ref(storage, `properties/${uniqueName}`);
  await uploadBytes(storageRef, imageFile, {
    contentType: imageFile.type || "image/jpeg",
  });
  return getDownloadURL(storageRef);
}

