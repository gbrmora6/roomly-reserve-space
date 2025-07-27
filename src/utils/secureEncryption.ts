/**
 * Secure encryption utilities for sensitive data
 * Uses Web Crypto API for proper encryption
 */

// Generate a key for encryption/decryption
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode('roomly-security-key-v2-web-crypto'),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode('roomly-salt'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-GCM
 */
export async function encryptSecureData(data: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(data);

    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Convert to base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Secure encryption error:', error);
    return '';
  }
}

/**
 * Decrypt data encrypted with encryptSecureData
 */
export async function decryptSecureData(encryptedData: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    
    // Convert from base64
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Secure decryption error:', error);
    return '';
  }
}

/**
 * Securely store a value in session storage with proper encryption
 */
export async function secureSessionStoreV2(key: string, value: string): Promise<void> {
  const encrypted = await encryptSecureData(value);
  sessionStorage.setItem(`secure_v2_${key}`, encrypted);
}

/**
 * Retrieve and decrypt a value from session storage
 */
export async function getSecureSessionItemV2(key: string): Promise<string | null> {
  const encrypted = sessionStorage.getItem(`secure_v2_${key}`);
  if (!encrypted) return null;
  return await decryptSecureData(encrypted);
}