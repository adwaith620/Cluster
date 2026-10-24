import { describe, it, expect } from 'vitest';
import {
  createSessionSchema,
  joinCodeSchema,
  registerParticipantSchema,
  validateMediaFile,
  getMediaTypeFromMime,
  MAX_MEDIA_FILE_SIZE,
} from '@/lib/validators';

describe('Validation Schemas', () => {
  describe('createSessionSchema', () => {
    it('accepts valid session data', () => {
      const res = createSessionSchema.safeParse({
        title: 'Freshers Orientation 2026',
        capacity: 120,
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.title).toBe('Freshers Orientation 2026');
        expect(res.data.capacity).toBe(120);
      }
    });

    it('defaults capacity to 100 if omitted', () => {
      const res = createSessionSchema.safeParse({
        title: 'Team Workshop',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.capacity).toBe(100);
      }
    });

    it('rejects too short or long titles', () => {
      expect(createSessionSchema.safeParse({ title: 'Hi' }).success).toBe(false);
      expect(createSessionSchema.safeParse({ title: 'A'.repeat(101) }).success).toBe(false);
    });

    it('rejects invalid capacities', () => {
      expect(createSessionSchema.safeParse({ title: 'Test', capacity: 1 }).success).toBe(false);
      expect(createSessionSchema.safeParse({ title: 'Test', capacity: 501 }).success).toBe(false);
      expect(createSessionSchema.safeParse({ title: 'Test', capacity: 10.5 }).success).toBe(false);
    });
  });

  describe('joinCodeSchema', () => {
    it('normalizes uppercase and accepts valid codes', () => {
      const res = joinCodeSchema.safeParse('abc123');
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data).toBe('ABC123');
      }
    });

    it('rejects invalid characters and lengths', () => {
      expect(joinCodeSchema.safeParse('ab').success).toBe(false);
      expect(joinCodeSchema.safeParse('code with spaces').success).toBe(false);
      expect(joinCodeSchema.safeParse('special#$!').success).toBe(false);
    });
  });

  describe('registerParticipantSchema', () => {
    it('accepts valid registration payload', () => {
      const res = registerParticipantSchema.safeParse({
        join_code: 'CAMPUS26',
        name: ' Alex Morgan ',
        device_token: 'uuid-1234-5678-abcdef',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.name).toBe('Alex Morgan');
        expect(res.data.join_code).toBe('CAMPUS26');
      }
    });

    it('rejects empty name or invalid token', () => {
      expect(
        registerParticipantSchema.safeParse({
          join_code: 'CAMPUS26',
          name: '   ',
          device_token: 'uuid-1234-5678-abcdef',
        }).success
      ).toBe(false);

      expect(
        registerParticipantSchema.safeParse({
          join_code: 'CAMPUS26',
          name: 'Alex',
          device_token: 'short',
        }).success
      ).toBe(false);
    });
  });

  describe('validateMediaFile', () => {
    it('accepts valid image formats', () => {
      const res = validateMediaFile({
        name: 'tiger.png',
        type: 'image/png',
        size: 2 * 1024 * 1024,
      });
      expect(res.valid).toBe(true);
      expect(res.mediaType).toBe('image');
    });

    it('accepts valid video and audio formats', () => {
      const vid = validateMediaFile({
        name: 'intro.mp4',
        type: 'video/mp4',
        size: 15 * 1024 * 1024,
      });
      expect(vid.valid).toBe(true);
      expect(vid.mediaType).toBe('video');

      const aud = validateMediaFile({
        name: 'soundtrack.mp3',
        type: 'audio/mp3',
        size: 3 * 1024 * 1024,
      });
      expect(aud.valid).toBe(true);
      expect(aud.mediaType).toBe('audio');
    });

    it('rejects files exceeding size limit', () => {
      const res = validateMediaFile({
        name: 'huge.mp4',
        type: 'video/mp4',
        size: MAX_MEDIA_FILE_SIZE + 10,
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('exceeds maximum limit');
    });

    it('rejects unapproved mime types', () => {
      const res = validateMediaFile({
        name: 'malware.exe',
        type: 'application/x-msdownload',
        size: 1000,
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Unsupported media format');
    });
  });

  describe('getMediaTypeFromMime', () => {
    it('correctly categorizes types', () => {
      expect(getMediaTypeFromMime('image/jpeg')).toBe('image');
      expect(getMediaTypeFromMime('video/webm')).toBe('video');
      expect(getMediaTypeFromMime('audio/ogg')).toBe('audio');
      expect(getMediaTypeFromMime('application/pdf')).toBe(null);
    });
  });
});
