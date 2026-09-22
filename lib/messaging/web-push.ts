import { createCipheriv, createHmac, createPrivateKey, createPublicKey, diffieHellman, generateKeyPairSync, randomBytes, sign as signBytes } from "node:crypto";

function base64Url(value: Buffer) {
  return value.toString("base64").replaceAll("+", "-").replaceAll("/", "_").replaceAll(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Buffer.from(normalized, "base64");
}

function hkdfExpand(prk: Buffer, info: Buffer, length: number) {
  const blocks: Buffer[] = [];
  let previous = Buffer.alloc(0);
  for (let counter = 1; Buffer.concat(blocks).length < length; counter += 1) {
    previous = createHmac("sha256", prk).update(Buffer.concat([previous, info, Buffer.from([counter])])).digest();
    blocks.push(previous);
  }
  return Buffer.concat(blocks).subarray(0, length);
}

function hmac(key: Buffer, value: Buffer) {
  return createHmac("sha256", key).update(value).digest();
}

function publicKeyBytes(publicKey: ReturnType<typeof generateKeyPairSync>["publicKey"]) {
  const jwk = publicKey.export({ format: "jwk" }) as { x: string; y: string };
  return Buffer.concat([Buffer.from([4]), fromBase64Url(jwk.x), fromBase64Url(jwk.y)]);
}

export function encryptWebPushPayload(payload: string, p256dh: string, auth: string) {
  const userAgentPublicBytes = fromBase64Url(p256dh);
  const authSecret = fromBase64Url(auth);
  if (userAgentPublicBytes.length !== 65 || userAgentPublicBytes[0] !== 4 || authSecret.length !== 16) throw new Error("The web push subscription keys are invalid.");
  const applicationServer = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const userAgentPublicKey = createPublicKey({ format: "jwk", key: { kty: "EC", crv: "P-256", x: base64Url(userAgentPublicBytes.subarray(1, 33)), y: base64Url(userAgentPublicBytes.subarray(33, 65)) } });
  const sharedSecret = diffieHellman({ privateKey: applicationServer.privateKey, publicKey: userAgentPublicKey });
  const keyInfo = Buffer.concat([Buffer.from("WebPush: info\0", "ascii"), userAgentPublicBytes, publicKeyBytes(applicationServer.publicKey)]);
  const ikm = hkdfExpand(hmac(authSecret, sharedSecret), keyInfo, 32);
  const salt = randomBytes(16);
  const prk = hmac(salt, ikm);
  const contentEncryptionKey = hkdfExpand(prk, Buffer.from("Content-Encoding: aes128gcm\0", "ascii"), 16);
  const nonce = hkdfExpand(prk, Buffer.from("Content-Encoding: nonce\0", "ascii"), 12);
  const plaintext = Buffer.concat([Buffer.from(payload, "utf8"), Buffer.from([2])]);
  const cipher = createCipheriv("aes-128-gcm", contentEncryptionKey, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
  const recordSize = 4096;
  const header = Buffer.alloc(16 + 4 + 1 + 65);
  salt.copy(header, 0);
  header.writeUInt32BE(recordSize, 16);
  header[20] = 65;
  publicKeyBytes(applicationServer.publicKey).copy(header, 21);
  return Buffer.concat([header, ciphertext]);
}

export function createVapidAuthorization(endpoint: string) {
  const privateKeyValue = process.env.VAPID_PRIVATE_KEY;
  const publicKeyValue = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!privateKeyValue || !publicKeyValue || !subject) throw new Error("VAPID environment variables are not configured.");
  const privateKeyBytes = fromBase64Url(privateKeyValue);
  if (privateKeyBytes.length !== 32) throw new Error("VAPID_PRIVATE_KEY has an invalid length.");
  const privateKey = createPrivateKey({ format: "jwk", key: { kty: "EC", crv: "P-256", d: base64Url(privateKeyBytes), x: publicKeyValue.length ? base64Url(fromBase64Url(publicKeyValue).subarray(1, 33)) : "", y: publicKeyValue.length ? base64Url(fromBase64Url(publicKeyValue).subarray(33, 65)) : "" } });
  const audience = new URL(endpoint).origin;
  const header = base64Url(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = base64Url(Buffer.from(JSON.stringify({ aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, sub: subject })));
  const unsigned = `${header}.${body}`;
  const signature = signBytes("sha256", Buffer.from(unsigned), { key: privateKey, dsaEncoding: "ieee-p1363" });
  return `vapid t=${unsigned}.${base64Url(signature)}, k=${publicKeyValue}`;
}

export async function sendWebPush(subscription: { endpoint: string; p256dh: string; auth: string }, payload: { title: string; body: string; linkUrl?: string | null }) {
  const body = encryptWebPushPayload(JSON.stringify(payload), subscription.p256dh, subscription.auth);
  const response = await fetch(subscription.endpoint, { method: "POST", headers: { Authorization: createVapidAuthorization(subscription.endpoint), "Content-Type": "application/octet-stream", "Content-Encoding": "aes128gcm", "Content-Length": String(body.byteLength), TTL: "86400" }, body });
  if (response.status === 404 || response.status === 410) return { status: "GONE" as const };
  if (!response.ok) throw new Error(`Push service returned HTTP ${response.status}.`);
  return { status: "SENT" as const };
}
