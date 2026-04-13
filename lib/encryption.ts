import CryptoJS from "crypto-js";

const SECRET_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || "default-secret-key-change-this!!";

export function encryptMessage(message: string): string {
  try {
    return CryptoJS.AES.encrypt(message, SECRET_KEY).toString();
  } catch {
    return message;
  }
}

export function decryptMessage(cipherText: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || cipherText;
  } catch {
    return cipherText;
  }
}

export function hashUserId(userId: string): string {
  return CryptoJS.SHA256(userId).toString().slice(0, 8);
}
