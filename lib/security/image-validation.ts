const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export class ImageValidationError extends Error {}

function isJpeg(bytes: Uint8Array) { return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff; }
function isPng(bytes: Uint8Array) { return bytes.length >= 8 && bytes.slice(0, 8).every((value, index) => value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index]); }
function isWebp(bytes: Uint8Array) { return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"; }

function stripJpegExif(bytes: Uint8Array) {
  const result: number[] = [0xff, 0xd8];
  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) { result.push(bytes[offset++]); continue; }
    const marker = bytes[offset + 1];
    if (marker === undefined) break;
    if (marker === 0xda || marker === 0xd9) { result.push(bytes[offset], marker, ...bytes.slice(offset + 2)); break; }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { result.push(bytes[offset], marker); offset += 2; continue; }
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (!length || offset + 2 + length > bytes.length) throw new ImageValidationError("The JPEG structure is invalid.");
    if (marker !== 0xe1) result.push(...bytes.slice(offset, offset + 2 + length));
    offset += 2 + length;
  }
  return new Uint8Array(result);
}

function stripPngExif(bytes: Uint8Array) {
  const result: number[] = [...bytes.slice(0, 8)];
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0);
    const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
    const end = offset + 12 + length;
    if (end > bytes.length) throw new ImageValidationError("The PNG structure is invalid.");
    if (type !== "eXIf") result.push(...bytes.slice(offset, end));
    offset = end;
    if (type === "IEND") break;
  }
  if (offset !== bytes.length) throw new ImageValidationError("The PNG structure is invalid.");
  return new Uint8Array(result);
}

function stripWebpExif(bytes: Uint8Array) {
  const result: number[] = [...bytes.slice(0, 12)];
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const type = String.fromCharCode(...bytes.slice(offset, offset + 4));
    const size = new DataView(bytes.buffer, bytes.byteOffset + offset + 4, 4).getUint32(0, true);
    const end = offset + 8 + size + (size % 2);
    if (end > bytes.length) throw new ImageValidationError("The WebP structure is invalid.");
    if (type !== "EXIF") result.push(...bytes.slice(offset, end));
    offset = end;
  }
  if (offset !== bytes.length) throw new ImageValidationError("The WebP structure is invalid.");
  const size = result.length - 8;
  result[4] = size & 0xff; result[5] = (size >>> 8) & 0xff; result[6] = (size >>> 16) & 0xff; result[7] = (size >>> 24) & 0xff;
  return new Uint8Array(result);
}

export function validateAndStripImage(bytes: Uint8Array, claimedType: string) {
  if (!ALLOWED_TYPES.has(claimedType)) throw new ImageValidationError("Use a JPG, PNG, or WebP image.");
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES) throw new ImageValidationError("The image must be smaller than 5MB.");
  if (claimedType === "image/jpeg" && isJpeg(bytes)) return stripJpegExif(bytes);
  if (claimedType === "image/png" && isPng(bytes)) return stripPngExif(bytes);
  if (claimedType === "image/webp" && isWebp(bytes)) return stripWebpExif(bytes);
  throw new ImageValidationError("The file content does not match a supported image type.");
}
