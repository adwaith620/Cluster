import { z } from 'zod';

export const ALLOWED_MEDIA_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
] as const;

export const MAX_MEDIA_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const createSessionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title cannot exceed 100 characters'),
  capacity: z
    .number()
    .int('Capacity must be an integer')
    .min(2, 'Capacity must be at least 2')
    .max(500, 'Capacity cannot exceed 500')
    .default(100),
});

export const joinCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{4,10}$/, 'Session code must be 4-10 alphanumeric characters');

export const registerParticipantSchema = z.object({
  join_code: joinCodeSchema,
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(60, 'Name cannot exceed 60 characters'),
  device_token: z
    .string()
    .trim()
    .min(10, 'A valid device token is required'),
});

export const assignTeamsSchema = z.object({
  team_count: z
    .number()
    .int('Team count must be an integer')
    .min(2, 'Must create at least 2 teams')
    .max(100, 'Cannot exceed 100 teams'),
});

export const updateTeamNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Team name cannot be empty')
    .max(50, 'Team name cannot exceed 50 characters'),
});

export function getMediaTypeFromMime(mime: string): 'image' | 'video' | 'audio' | null {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return null;
}

export function validateMediaFile(file: { size: number; type: string; name: string }) {
  if (file.size > MAX_MEDIA_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum limit of 50MB (got ${(file.size / (1024 * 1024)).toFixed(1)}MB)`,
    };
  }

  const mime = file.type.toLowerCase();
  const isAllowedMime = (ALLOWED_MEDIA_MIME_TYPES as readonly string[]).includes(mime);
  if (!isAllowedMime) {
    return {
      valid: false,
      error: `Unsupported media format "${mime}". Allowed: JPEG, PNG, WebP, GIF, MP4, WebM, MP3, WAV, OGG`,
    };
  }

  const mediaType = getMediaTypeFromMime(mime);
  if (!mediaType) {
    return { valid: false, error: 'Could not categorize media type' };
  }

  return { valid: true, mediaType };
}
