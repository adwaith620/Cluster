import crypto from 'crypto';

export const PARTICIPANT_DEVICE_COOKIE = 'cluster_device_token';

/**
 * Generates a secure, cryptographically random participant device capability token.
 */
export function generateDeviceToken(): string {
  return crypto.randomBytes(24).toString('hex');
}
