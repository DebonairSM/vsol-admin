import crypto from 'crypto';

/**
 * Generate a strong temporary password suitable for one-time credentials delivery.
 *
 * Requirements:
 * - crypto-secure randomness
 * - mixed character sets
 * - avoids ambiguous characters by default (optional)
 */
export function generateStrongPassword(options?: {
  length?: number;
  allowAmbiguous?: boolean;
}): string {
  const length = options?.length ?? 18;
  if (length < 12) {
    throw new Error('Password length must be at least 12 characters');
  }

  // Exclude ambiguous characters unless explicitly allowed
  const lowercase = options?.allowAmbiguous
    ? 'abcdefghijklmnopqrstuvwxyz'
    : 'abcdefghjkmnpqrstuvwxyz'; // i, l, o removed
  const uppercase = options?.allowAmbiguous
    ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    : 'ABCDEFGHJKMNPQRSTUVWXYZ'; // I, L, O removed
  const digits = options?.allowAmbiguous ? '0123456789' : '23456789'; // 0,1 removed
  const symbols = '!@#$%^&*()-_=+[]{}:,.?';

  const all = lowercase + uppercase + digits + symbols;

  // Ensure at least one char from each required set
  const required = [
    lowercase[crypto.randomInt(lowercase.length)],
    uppercase[crypto.randomInt(uppercase.length)],
    digits[crypto.randomInt(digits.length)],
    symbols[crypto.randomInt(symbols.length)],
  ];

  const remainingCount = length - required.length;
  const chars: string[] = [...required];
  for (let i = 0; i < remainingCount; i++) {
    chars.push(all[crypto.randomInt(all.length)]);
  }

  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

