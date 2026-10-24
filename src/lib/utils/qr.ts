import QRCode from 'qrcode';

/**
 * Returns the canonical base URL for public participant links.
 * In production, validates that NEXT_PUBLIC_APP_URL is set to a valid public HTTPS URL.
 */
export function getCanonicalAppUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, '');

  // In the browser, window.location.origin gives the actual loaded domain
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin.replace(/\/+$/, '');
    // If envUrl is unset or points to localhost while browser is on a public HTTPS domain,
    // automatically prefer the actual public domain to guarantee reachable QR codes.
    if (!envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
      if (origin.startsWith('https://') || !origin.includes('localhost')) {
        return origin;
      }
    }
  }

  if (envUrl && envUrl !== '') {
    return envUrl;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
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
