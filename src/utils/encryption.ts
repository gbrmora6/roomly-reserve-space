
/**
 * Simple encryption/decryption utilities for client-side data protection
 * Note: This is not meant for highly sensitive data, but provides basic obfuscation
 */

const ENCRYPTION_KEY = "roomly-security-key-v1"; // App-specific key

/**
 * Encrypts data using a simple XOR cipher
 * @param data - String to encrypt
 * @returns Encrypted base64 string
 */
export function encryptData(data: string): string {
  try {
    // Convert string to array of char codes
    const dataChars = data.split('').map(c => c.charCodeAt(0));
    const keyChars = ENCRYPTION_KEY.split('').map(c => c.charCodeAt(0));
    
    // XOR each character with the corresponding key character
    const encryptedChars = dataChars.map((char, i) => {
      return char ^ keyChars[i % keyChars.length];
    });
    
    // Convert to a string and encode with base64
    const encryptedString = String.fromCharCode(...encryptedChars);
    return btoa(encryptedString);
  } catch (error) {
    console.error("Encryption error:", error);
    return "";
  }
}

/**
 * Decrypts data that was encrypted with encryptData
 * @param encryptedData - Encrypted base64 string
 * @returns Original decrypted string
 */
export function decryptData(encryptedData: string): string {
  try {
    // Decode base64
    const decodedData = atob(encryptedData);
    const encryptedChars = decodedData.split('').map(c => c.charCodeAt(0));
    const keyChars = ENCRYPTION_KEY.split('').map(c => c.charCodeAt(0));
    
    // XOR to decrypt
    const decryptedChars = encryptedChars.map((char, i) => {
      return char ^ keyChars[i % keyChars.length];
    });
    
    // Convert back to string
    return String.fromCharCode(...decryptedChars);
  } catch (error) {
    console.error("Decryption error:", error);
    return "";
  }
}

/**
 * Securely store a value in session storage with encryption
 */
export function secureSessionStore(key: string, value: string): void {
  const encrypted = encryptData(value);
  sessionStorage.setItem(key, encrypted);
}

/**
 * Retrieve and decrypt a value from session storage
 */
export function getSecureSessionItem(key: string): string | null {
  const encrypted = sessionStorage.getItem(key);
  if (!encrypted) return null;
  return decryptData(encrypted);
}
