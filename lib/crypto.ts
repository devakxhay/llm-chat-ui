import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const ENCRYPTION_PASSWORD = process.env.DB_ENCRYPTION_KEY || "ilsa-secure-agent-key-default-passphrase";
const SALT = "ilsa-salt-12345";

// Derive a 32-byte key from password synchronously using PBKDF2
const KEY = crypto.pbkdf2Sync(ENCRYPTION_PASSWORD, SALT, 100000, 32, "sha256");

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const [ivHex, encryptedData] = encryptedText.split(":");
  if (!ivHex || !encryptedData) {
    throw new Error("Invalid encrypted text format");
  }
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
