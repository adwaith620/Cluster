import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { normalizeSupabaseUrl, getSupabaseConfig, createClient } from '@/lib/supabase/client';

describe('Supabase Configuration & URL Normalization', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('normalizeSupabaseUrl', () => {
    it('returns empty string for undefined or null input', () => {
      expect(normalizeSupabaseUrl(undefined)).toBe('');
      expect(normalizeSupabaseUrl('')).toBe('');
    });

    it('strips trailing slashes correctly', () => {
      expect(normalizeSupabaseUrl('https://example.supabase.co/')).toBe('https://example.supabase.co');
      expect(normalizeSupabaseUrl('https://example.supabase.co///')).toBe('https://example.supabase.co');
    });

    it('automatically corrects lowercase "l" to "i" in project ref typo (atlj -> atij)', () => {
      expect(normalizeSupabaseUrl('https://atljpayqntezmnqbprzn.supabase.co')).toBe(
        'https://atijpayqntezmnqbprzn.supabase.co'
      );
      expect(normalizeSupabaseUrl('https://atljpayqntezmnqbprzn.supabase.co/')).toBe(
        'https://atijpayqntezmnqbprzn.supabase.co'
      );
    });

    it('preserves valid URLs as-is', () => {
      expect(normalizeSupabaseUrl('https://atijpayqntezmnqbprzn.supabase.co')).toBe(
        'https://atijpayqntezmnqbprzn.supabase.co'
      );
    });
  });

  describe('getSupabaseConfig', () => {
    it('reports isConfigured: false when NEXT_PUBLIC_SUPABASE_URL is missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'valid-anon-key';

      const config = getSupabaseConfig();
      expect(config.isConfigured).toBe(false);
    });

    it('reports isConfigured: false when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://atijpayqntezmnqbprzn.supabase.co';
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const config = getSupabaseConfig();
      expect(config.isConfigured).toBe(false);
    });

    it('reports isConfigured: false when URL contains placeholder', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'placeholder-anon-key';

      const config = getSupabaseConfig();
      expect(config.isConfigured).toBe(false);
    });

    it('reports isConfigured: true when valid credentials are provided', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://atijpayqntezmnqbprzn.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJh...mock.key';

      const config = getSupabaseConfig();
      expect(config.isConfigured).toBe(true);
      expect(config.supabaseUrl).toBe('https://atijpayqntezmnqbprzn.supabase.co');
    });

    it('auto-corrects typo in URL while reporting isConfigured: true', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://atljpayqntezmnqbprzn.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJh...mock.key';

      const config = getSupabaseConfig();
      expect(config.isConfigured).toBe(true);
      expect(config.supabaseUrl).toBe('https://atijpayqntezmnqbprzn.supabase.co');
    });
  });

  describe('createClient', () => {
    it('throws descriptive error in browser environment when unconfigured', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      // Mock window
      (globalThis as any).window = {};

      try {
        expect(() => createClient()).toThrow(/Supabase client is not configured/);
      } finally {
        delete (globalThis as any).window;
      }
    });

    it('creates client successfully when configured', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://atijpayqntezmnqbprzn.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJh...mock.key';

      const client = createClient();
      expect(client).toBeDefined();
      expect(client.auth).toBeDefined();
    });
  });
});
