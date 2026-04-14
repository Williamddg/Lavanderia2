import crypto from 'node:crypto';

const HASH_PREFIX = 'scrypt';
const KEY_LENGTH = 64;

const toBuffer = (value: string) => Buffer.from(value, 'hex');

export const isSecurePasswordHash = (value: string) => value.startsWith(`${HASH_PREFIX}$`);

export const hashPassword = (plainText: string) => {
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.scryptSync(plainText, salt, KEY_LENGTH);
  return `${HASH_PREFIX}$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
};

export const verifyPasswordHash = (plainText: string, storedValue: string) => {
  if (!isSecurePasswordHash(storedValue)) {
    return plainText === storedValue;
  }

  const [, saltHex, hashHex] = storedValue.split('$');

  if (!saltHex || !hashHex) {
    return false;
  }

  const derivedKey = crypto.scryptSync(plainText, toBuffer(saltHex), KEY_LENGTH);
  const storedHash = toBuffer(hashHex);

  if (derivedKey.length !== storedHash.length) {
    return false;
  }

  return crypto.timingSafeEqual(derivedKey, storedHash);
};
