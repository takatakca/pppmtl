/**
 * BMO Open API payload encryption. SERVER ONLY (node:crypto).
 *
 * Body: { "SECURE": { "encrypted": true, "data": base64(AES-256-GCM ciphertext ‖ 16-byte tag) } }
 * Header x-crypto-key: base64(keyId) . base64(RSA-OAEP(CEK)) . base64(SHA-256(CEK)) . base64(IV) [. "GCM"]
 *
 * From BMO's published specs ("Instant Payments - CA" 4.3.1 and "Push Notifications" 1.1.0, developer.bmo.com):
 * a fresh 256-bit content key (CEK) per message, wrapped with the receiver's RSA public key
 * (RSA_PKCS1_OAEP_PADDING), its SHA-256 hash, and the IV. To confirm on the sandbox: the OAEP hash (BMO_OAEP_HASH,
 * default sha1 = OpenSSL's default for that padding) and where the GCM tag goes (here: after the ciphertext, the
 * Java/Node default; a 5th header part holding a 16-byte value is also read as the tag).
 */
import {
  constants,
  createCipheriv,
  createDecipheriv,
  createHash,
  privateDecrypt,
  publicEncrypt,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export interface BmoEncryptionKeys {
  /** The receiver's RSA public key (PEM): BMO's for requests, ours for what BMO sends us. */
  publicKeyPem: string;
  /** The id the receiver gave that public key. */
  keyId: string;
  oaepHash?: "sha1" | "sha256";
}

export interface SecureEnvelope {
  SECURE: { encrypted: boolean; data: unknown };
}

const b64 = (b: Buffer | string) => Buffer.from(b).toString("base64");

/** Encrypts a JSON message for the receiver of `keys`. */
export function encryptForBmo(
  message: unknown,
  keys: BmoEncryptionKeys,
): { cryptoKey: string; body: SecureEnvelope } {
  const cek = randomBytes(32);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", cek, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(message), "utf8"),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  const wrapped = publicEncrypt(
    {
      key: keys.publicKeyPem,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: keys.oaepHash ?? "sha1",
    },
    cek,
  );
  const cryptoKey = [
    b64(keys.keyId),
    b64(wrapped),
    b64(createHash("sha256").update(cek).digest()),
    b64(iv),
    "GCM",
  ].join(".");
  return { cryptoKey, body: { SECURE: { encrypted: true, data: b64(ciphertext) } } };
}

export type DecryptResult = { ok: true; message: unknown } | { ok: false; error: string };

/** Opens a SECURE envelope sent to us. A plain (`encrypted: false`) envelope is returned as is. */
export function decryptFromBmo(
  body: unknown,
  cryptoKey: string | null,
  privateKeyPem: string | null,
  oaepHash: "sha1" | "sha256" = "sha1",
): DecryptResult {
  const secure = (body as Partial<SecureEnvelope> | null)?.SECURE;
  if (!secure || typeof secure !== "object") return { ok: false, error: "no SECURE envelope" };
  if (secure.encrypted === false) {
    if (typeof secure.data !== "string") return { ok: true, message: secure.data };
    try {
      return { ok: true, message: JSON.parse(secure.data) };
    } catch {
      return { ok: false, error: "plain data is not JSON" };
    }
  }
  if (typeof secure.data !== "string")
    return { ok: false, error: "encrypted data is not a string" };
  if (!cryptoKey || !privateKeyPem)
    return { ok: false, error: "missing x-crypto-key or private key" };
  const parts = cryptoKey.split(".");
  if (parts.length < 4) return { ok: false, error: "x-crypto-key has fewer than 4 parts" };
  try {
    const cek = privateDecrypt(
      { key: privateKeyPem, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash },
      Buffer.from(parts[1]!, "base64"),
    );
    const hash = Buffer.from(parts[2]!, "base64");
    const expected = createHash("sha256").update(cek).digest();
    if (cek.length !== 32 || hash.length !== expected.length || !timingSafeEqual(hash, expected)) {
      return { ok: false, error: "content key hash mismatch" };
    }
    const iv = Buffer.from(parts[3]!, "base64");
    const raw = Buffer.from(secure.data, "base64");
    const fifth = parts[4] ? Buffer.from(parts[4], "base64") : null;
    const separateTag = fifth && fifth.length === 16 && parts[4] !== "GCM" ? fifth : null;
    const tag = separateTag ?? raw.subarray(raw.length - 16);
    const ciphertext = separateTag ? raw : raw.subarray(0, raw.length - 16);
    const decipher = createDecipheriv("aes-256-gcm", cek, iv);
    decipher.setAuthTag(tag);
    const text = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    return { ok: true, message: JSON.parse(text) };
  } catch (error) {
    return {
      ok: false,
      error: `decrypt failed (${error instanceof Error ? error.name : "error"})`,
    };
  }
}
