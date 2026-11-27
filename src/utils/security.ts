export type LockMode = 'pin' | 'password';

export interface LockConfig {
  enabled: boolean;
  mode: LockMode;
  passwordHash: string;
  passwordSalt: string;
  encryptNotes: boolean;
  noteEncSalt: string;
  biometricEnabled: boolean;
  biometricCredentialId: string | null;
  autoLockOnHide: boolean;
}

export const DEFAULT_LOCK_CONFIG: LockConfig = {
  enabled: false,
  mode: 'pin',
  passwordHash: '',
  passwordSalt: '',
  encryptNotes: true,
  noteEncSalt: '',
  biometricEnabled: false,
  biometricCredentialId: null,
  autoLockOnHide: true,
};

const LOCK_LS_KEY = 'murshid_al_nafs_lock_v1';
const PBKDF2_ITERATIONS = 150000;
const ENC_PREFIX = 'enc:v1:';

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function loadLockConfig(): LockConfig {
  try {
    const raw = localStorage.getItem(LOCK_LS_KEY);
    if (!raw) return { ...DEFAULT_LOCK_CONFIG };
    const parsed = JSON.parse(raw) as Partial<LockConfig>;
    return {
      enabled: Boolean(parsed.enabled && parsed.passwordHash && parsed.passwordSalt),
      mode: parsed.mode === 'password' ? 'password' : 'pin',
      passwordHash: typeof parsed.passwordHash === 'string' ? parsed.passwordHash : '',
      passwordSalt: typeof parsed.passwordSalt === 'string' ? parsed.passwordSalt : '',
      encryptNotes: parsed.encryptNotes !== false,
      noteEncSalt: typeof parsed.noteEncSalt === 'string' ? parsed.noteEncSalt : '',
      biometricEnabled: Boolean(parsed.biometricEnabled && parsed.biometricCredentialId),
      biometricCredentialId:
        typeof parsed.biometricCredentialId === 'string' ? parsed.biometricCredentialId : null,
      autoLockOnHide: parsed.autoLockOnHide !== false,
    };
  } catch {
    return { ...DEFAULT_LOCK_CONFIG };
  }
}

export function saveLockConfig(config: LockConfig): void {
  try {
    localStorage.setItem(LOCK_LS_KEY, JSON.stringify(config));
  } catch {
    // ignore storage errors
  }
}

export function clearLockConfig(): void {
  try {
    localStorage.removeItem(LOCK_LS_KEY);
  } catch {
    // ignore
  }
}

export function generateSalt(): string {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(16)));
}

export async function hashPassword(
  secret: string,
  existingSalt?: string
): Promise<{ hash: string; salt: string }> {
  const saltBytes = existingSalt
    ? base64UrlToBytes(existingSalt)
    : crypto.getRandomValues(new Uint8Array(16));
  const salt = existingSalt || bytesToBase64Url(saltBytes);

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(saltBytes),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const hash = bytesToBase64Url(new Uint8Array(derivedBits));
  return { hash, salt };
}

export async function verifyPassword(
  secret: string,
  expectedHash: string,
  salt: string
): Promise<boolean> {
  if (!secret || !expectedHash || !salt) return false;
  try {
    const { hash } = await hashPassword(secret, salt);
    return constantTimeEqual(hash, expectedHash);
  } catch {
    return false;
  }
}

/**
 * Derive an in-memory AES-GCM-256 key for private notes encryption.
 * When unlocked with PIN/password or biometric (using stored verifier salt),
 * notes stored on disk are AES-GCM encrypted with random 12-byte IVs.
 */
export async function deriveNoteKey(secretOrHash: string, noteSalt: string): Promise<CryptoKey | null> {
  try {
    if (!secretOrHash || !noteSalt || typeof crypto === 'undefined' || !crypto.subtle) {
      return null;
    }
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(secretOrHash),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: toArrayBuffer(base64UrlToBytes(noteSalt)),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  } catch {
    return null;
  }
}

export function isEncryptedNote(text: string): boolean {
  return typeof text === 'string' && text.startsWith(ENC_PREFIX);
}

export async function encryptNoteText(plainText: string, key: CryptoKey | null): Promise<string> {
  if (!plainText || !key || isEncryptedNote(plainText)) return plainText;
  try {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plainText);
    const cipherBuf = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: toArrayBuffer(iv) },
      key,
      encoded
    );
    return `${ENC_PREFIX}${bytesToBase64Url(iv)}:${bytesToBase64Url(new Uint8Array(cipherBuf))}`;
  } catch {
    return plainText;
  }
}

export async function decryptNoteText(storedText: string, key: CryptoKey | null): Promise<string> {
  if (!isEncryptedNote(storedText)) return storedText;
  if (!key) return '🔒 ملاحظة مشفّرة (افتح القفل لعرضها)';
  try {
    const payload = storedText.slice(ENC_PREFIX.length);
    const [ivB64, cipherB64] = payload.split(':');
    if (!ivB64 || !cipherB64) return storedText;
    const iv = base64UrlToBytes(ivB64);
    const cipher = base64UrlToBytes(cipherB64);
    const plainBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: toArrayBuffer(iv) },
      key,
      toArrayBuffer(cipher)
    );
    return new TextDecoder().decode(plainBuf);
  } catch {
    return '🔒 تعذّر فك تشفير هذه الملاحظة';
  }
}

export async function checkBiometricSupport(): Promise<boolean> {
  try {
    if (
      typeof window === 'undefined' ||
      !window.isSecureContext ||
      !('PublicKeyCredential' in window) ||
      !navigator.credentials
    ) {
      return false;
    }
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
    return false;
  } catch {
    return false;
  }
}

export async function registerBiometric(): Promise<{
  ok: boolean;
  credentialId?: string;
  error?: string;
}> {
  try {
    const supported = await checkBiometricSupport();
    if (!supported) {
      return {
        ok: false,
        error:
          'جهازك أو المتصفح الحالي لا يدعم البصمة المباشرة هنا. جرّب تثبيت التطبيق على الشاشة الرئيسية (PWA) على هاتف يدعم البصمة أو التعرف على الوجه.',
      };
    }

    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: toArrayBuffer(challenge),
        rp: {
          name: 'مرشد النفس والتأثير',
          id: window.location.hostname,
        },
        user: {
          id: toArrayBuffer(userId),
          name: 'local-owner@murshid.offline',
          displayName: 'صاحب التطبيق',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null;

    if (!credential || !credential.rawId) {
      return { ok: false, error: 'تم إلغاء تسجيل البصمة قبل اكتماله.' };
    }

    const credentialId = bytesToBase64Url(new Uint8Array(credential.rawId));
    return { ok: true, credentialId };
  } catch (err) {
    const name = err instanceof Error ? err.name : '';
    if (name === 'NotAllowedError') {
      return {
        ok: false,
        error:
          'تم إلغاء عملية البصمة أو حُجبت داخل نافذة المعاينة. افتح التطبيق في نافذة متصفح مستقلة أو ثبّته كتطبيق (PWA) لتعمل البصمة مباشرة.',
      };
    }
    if (name === 'SecurityError') {
      return {
        ok: false,
        error:
          'يتطلب تفعيل البصمة فتح التطبيق في رابط مستقل آمن (HTTPS) أو بعد التثبيت على الشاشة الرئيسية.',
      };
    }
    return {
      ok: false,
      error: 'تعذّر تفعيل البصمة على هذا المتصفح حالياً. يمكنك استخدام رمز PIN أو كلمة المرور بأمان كامل.',
    };
  }
}

export async function verifyBiometric(credentialId: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    if (!credentialId) {
      return { ok: false, error: 'لم يتم العثور على بصمة مسجّلة.' };
    }
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const credBytes = base64UrlToBytes(credentialId);

    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge: toArrayBuffer(challenge),
        rpId: window.location.hostname,
        allowCredentials: [
          {
            type: 'public-key',
            id: toArrayBuffer(credBytes),
            transports: ['internal'],
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (!assertion) {
      return { ok: false, error: 'لم تكتمل مطابقة البصمة.' };
    }
    return { ok: true };
  } catch (err) {
    const name = err instanceof Error ? err.name : '';
    if (name === 'NotAllowedError') {
      return {
        ok: false,
        error: 'تم إلغاء التحقق بالبصمة أو انتهت المهلة. يمكنك المحاولة مجدداً أو إدخال الرمز.',
      };
    }
    return {
      ok: false,
      error: 'تعذّر التحقق بالبصمة الآن. افتح التطبيق باستخدام رمز PIN أو كلمة المرور.',
    };
  }
}
