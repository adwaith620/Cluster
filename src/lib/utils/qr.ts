import QRCode from 'qrcode';

/**
 * Returns the canonical base URL for public participant links.
 * In production, validates that NEXT_PUBLIC_APP_URL is set to a valid public HTTPS URL.
 */
export function getCanonicalAppUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (envUrl && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // If in browser, use window.location.origin
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  // Development fallback only
  return 'http://localhost:3000';
}

/**
 * Constructs the canonical public join URL for a session code.
 */
export function getSessionJoinUrl(joinCode: string): string {
  const baseUrl = getCanonicalAppUrl();
  const cleanCode = encodeURIComponent(joinCode.trim().toUpperCase());
  return `${baseUrl}/join/${cleanCode}`;
}

/**
 * Generates a high-quality Data URL PNG for a given text/URL.
 */
export async function generateQrDataUrl(
  url: string,
  options: QRCode.QRCodeToDataURLOptions = {}
): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: options.width || 512,
    color: {
      dark: '#000000',
      light: '#ffffff',
      ...options.color,
    },
    ...options,
  });
}

/**
 * Generates an SVG string for clean, scalable rendering.
 */
export async function generateQrSvg(
  url: string,
  options: QRCode.QRCodeToStringOptions = {}
): Promise<string> {
  return QRCode.toString(url, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 2,
    ...options,
  });
}
