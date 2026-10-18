import { validateData, type Data } from '../domain.js';
const encoder = new TextEncoder();
const b64 = (bytes: Uint8Array): string => { let s = ''; for (const n of bytes) s += String.fromCharCode(n); return btoa(s); };
const bytes = (s: string): Uint8Array => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function key(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export async function exportBackup(data: Data, password: string): Promise<string> {
  const text = JSON.stringify(validateData(data));
  if (!password) return text;
  if (password.length < 10) throw new Error('Heslo zálohy musí mať aspoň 10 znakov.');
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(password, salt), encoder.encode(text));
  return JSON.stringify({ format: 'spektra-encrypted-v1', salt: b64(salt), iv: b64(iv), content: b64(new Uint8Array(encrypted)) });
}
export async function importBackup(text: string, password: string): Promise<Data> {
  if (encoder.encode(text).length > 25 * 1024 * 1024) throw new Error('Záloha je príliš veľká (maximum 25 MB).');
  let raw: unknown; try { raw = JSON.parse(text); } catch { throw new Error('Súbor nie je platná záloha JSON.'); }
  if (raw && typeof raw === 'object' && 'format' in raw) {
    const o = raw as Record<string, unknown>;
    if (o.format !== 'spektra-encrypted-v1' || typeof o.salt !== 'string' || typeof o.iv !== 'string' || typeof o.content !== 'string' || !password) throw new Error('Zadajte heslo šifrovanej zálohy.');
    try {
      const salt = bytes(o.salt), iv = bytes(o.iv); if (salt.length !== 16 || iv.length !== 12) throw new Error();
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, await key(password, salt), bytes(o.content));
      raw = JSON.parse(new TextDecoder().decode(plain));
    } catch { throw new Error('Nesprávne heslo alebo poškodená záloha. Pôvodné údaje zostali nezmenené.'); }
  }
  return validateData(raw);
}
export function download(name: string, content: string, type = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}
