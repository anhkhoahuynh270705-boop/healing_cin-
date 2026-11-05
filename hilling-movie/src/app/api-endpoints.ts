/** Resolve backend URLs for local development, browser deployments, and SSR. */
export function apiBaseUrl(): string {
  if (typeof window === 'undefined') return 'https://healing-cin.onrender.com';
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    return `${location.protocol}//${location.hostname}:8080`;
  }
  // Production browser requests go through the Vercel /api rewrite.
  return '';
}

export function backendWebSocketUrl(): string {
  if (typeof window === 'undefined') return 'wss://healing-cin.onrender.com/ws';
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
    return `${scheme}://${location.hostname}:8080/ws`;
  }
  return 'wss://healing-cin.onrender.com/ws';
}
