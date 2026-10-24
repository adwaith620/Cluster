import crypto from 'crypto';

/**
 * Generates an unpredictable, clean alphanumeric join code.
 * Omits easily confused characters like O, 0, I, 1 to prevent human error when typing manually.
 */
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateJoinCode(length: number = 6): string {
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}
