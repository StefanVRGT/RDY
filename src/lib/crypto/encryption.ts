import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Get the encryption key from environment variable
 * Falls back to a default for development, but should be set in production
 */
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY environment variable must be set in production');
    }
    // Development fallback - NOT secure, only for development
    return 'dev-encryption-key-not-for-production-use';
  }
  return key;
}

/**
 * Derive a key from the password and salt using scrypt
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, KEY_LENGTH);
}

/**
 * Encrypt a plaintext string
 * Returns a base64-encoded string containing salt + iv + tag + ciphertext
 */
export function encrypt(plaintext: string): string {
  const password = getEncryptionKey();
  const salt = randomBytes(SALT_LENGTH);
  const key = deriveKey(password, salt);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Combine: salt + iv + tag + ciphertext
  const combined = Buffer.concat([salt, iv, tag, encrypted]);
  return combined.toString('base64');
}

/**
 * Decrypt a base64-encoded encrypted string
 * Expects the format: salt + iv + tag + ciphertext
 */
export function decrypt(encryptedBase64: string): string {
  const password = getEncryptionKey();
  const combined = Buffer.from(encryptedBase64, 'base64');

  // Extract components
  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const ciphertext = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

  const key = deriveKey(password, salt);

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Safely encrypt an API key, returning null if the input is null/undefined
 */
export function encryptApiKey(apiKey: string | null | undefined): string | null {
  if (!apiKey) return null;
  return encrypt(apiKey);
}

/**
 * Safely decrypt an API key, returning null if the input is null/undefined
 */
export function decryptApiKey(encryptedKey: string | null | undefined): string | null {
  if (!encryptedKey) return null;
  try {
    return decrypt(encryptedKey);
  } catch {
    console.error('Failed to decrypt API key');
    return null;
  }
}

/**
 * Mask an API key for display purposes (show first 4 and last 4 characters)
 */
export function maskApiKey(apiKey: string | null | undefined): string {
  if (!apiKey) return '';
  if (apiKey.length <= 8) return '****';
  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
}
