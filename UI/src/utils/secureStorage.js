// Secure Client-Side Encrypted Session Storage Utility for ananda Admin Portal
const SECRET_SALT = 'ananda_ADMIN_PORTAL_ENCRYPTION_SALT_2026_x89';

/**
 * Encrypts plaintext string using XOR + Base64 obfuscation
 */
function encrypt(text) {
  if (text === null || text === undefined || text === '') return '';
  try {
    const textChars = String(text).split('');
    const saltChars = SECRET_SALT.split('');
    const encrypted = textChars.map((char, index) => {
      const code = char.charCodeAt(0) ^ saltChars[index % saltChars.length].charCodeAt(0);
      return String.fromCharCode(code);
    }).join('');
    return 'ENC_' + btoa(encodeURIComponent(encrypted));
  } catch (e) {
    return text;
  }
}

/**
 * Decrypts encrypted cipher string
 */
function decrypt(cipher) {
  if (!cipher) return '';
  // Fallback if legacy unencrypted string exists
  if (typeof cipher === 'string' && !cipher.startsWith('ENC_')) {
    return cipher;
  }
  try {
    const rawCipher = decodeURIComponent(atob(cipher.slice(4)));
    const cipherChars = rawCipher.split('');
    const saltChars = SECRET_SALT.split('');
    const decrypted = cipherChars.map((char, index) => {
      const code = char.charCodeAt(0) ^ saltChars[index % saltChars.length].charCodeAt(0);
      return String.fromCharCode(code);
    }).join('');
    return decrypted;
  } catch (e) {
    return '';
  }
}

export const secureStorage = {
  setItem: (key, value) => {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      const encryptedValue = encrypt(stringValue);
      sessionStorage.setItem(key, encryptedValue);
    } catch (e) {
      console.error('Failed to set encrypted item in sessionStorage:', e);
    }
  },

  getItem: (key) => {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const decrypted = decrypt(raw);
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (e) {
      return null;
    }
  },

  removeItem: (key) => {
    try {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    } catch (e) {
      // ignore
    }
  },

  clearAll: () => {
    try {
      sessionStorage.clear();
      localStorage.clear();
    } catch (e) {
      // ignore
    }
  }
};
