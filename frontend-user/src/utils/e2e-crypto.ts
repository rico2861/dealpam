// ECDH P-256 + AES-GCM end-to-end encryption
// Key pair is generated per-session and the public key is uploaded to the server.
// Encrypted messages are base64-encoded for transport over socket/HTTP.

const EC_ALGO  = { name: 'ECDH', namedCurve: 'P-256' } as const;
const AES_ALGO = 'AES-GCM';
const AES_LEN  = 256;

// ─── persist keys in sessionStorage (ephemeral per tab) ────────────────────
const PRIV_KEY = 'e2e_priv';
const PUB_KEY  = 'e2e_pub';

function b64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function unb64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

// ─── Generate + persist an ECDH key pair ───────────────────────────────────
export async function generateKeyPair(): Promise<string> {
  const pair = await crypto.subtle.generateKey(EC_ALGO, true, ['deriveKey', 'deriveBits']);

  const rawPriv = await crypto.subtle.exportKey('pkcs8', pair.privateKey);
  const rawPub  = await crypto.subtle.exportKey('spki',  pair.publicKey);

  sessionStorage.setItem(PRIV_KEY, b64(rawPriv));
  const pubB64 = b64(rawPub);
  sessionStorage.setItem(PUB_KEY, pubB64);
  return pubB64; // return to upload to server
}

// ─── Return our own public key (generate if missing) ───────────────────────
export async function getOrCreatePublicKey(): Promise<string> {
  const cached = sessionStorage.getItem(PUB_KEY);
  if (cached) return cached;
  return generateKeyPair();
}

// ─── Derive a shared AES key from our private key + peer public key ─────────
async function deriveShared(peerPubB64: string): Promise<CryptoKey> {
  const privRaw = sessionStorage.getItem(PRIV_KEY);
  if (!privRaw) throw new Error('No private key — call generateKeyPair() first');

  const privKey = await crypto.subtle.importKey('pkcs8', unb64(privRaw), EC_ALGO, false, ['deriveKey', 'deriveBits']);
  const peerKey = await crypto.subtle.importKey('spki',  unb64(peerPubB64), EC_ALGO, false, []);

  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: peerKey },
    privKey,
    { name: AES_ALGO, length: AES_LEN },
    false,
    ['encrypt', 'decrypt'],
  );
}

// ─── Encrypt a plaintext string ─────────────────────────────────────────────
// Returns a base64 string: iv(12B) + ciphertext, safe to send over socket/HTTP.
export async function encryptMsg(plaintext: string, peerPubB64: string): Promise<string> {
  const aes = await deriveShared(peerPubB64);
  const iv  = crypto.getRandomValues(new Uint8Array(12));
  const ct  = await crypto.subtle.encrypt(
    { name: AES_ALGO, iv },
    aes,
    new TextEncoder().encode(plaintext),
  );
  // Prepend IV so decryptor can recover it
  const buf = new Uint8Array(12 + ct.byteLength);
  buf.set(iv);
  buf.set(new Uint8Array(ct), 12);
  return b64(buf.buffer);
}

// ─── Decrypt a base64 ciphertext string ─────────────────────────────────────
export async function decryptMsg(cipherB64: string, peerPubB64: string): Promise<string> {
  const aes = await deriveShared(peerPubB64);
  const buf = unb64(cipherB64);
  const iv  = buf.slice(0, 12);
  const ct  = buf.slice(12);
  const pt  = await crypto.subtle.decrypt({ name: AES_ALGO, iv }, aes, ct);
  return new TextDecoder().decode(pt);
}

// ─── Check whether a payload looks encrypted (base64, not plain UTF-8) ──────
export function isEncrypted(s: string): boolean {
  return /^[A-Za-z0-9+/]{20,}={0,2}$/.test(s);
}
