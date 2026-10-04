// ─── Backend selection ────────────────────────────────────────────────────────
//
// Flip BACKEND to choose which server the app talks to:
//
//   'local'  → the Django + MySQL stack on this Mac (start it with run-all.command).
//   'remote' → Prince's ngrok tunnel. Free ngrok URLs are regenerated every time he
//              restarts the tunnel, so REMOTE_BASE_URL goes stale — paste the new
//              one here when he sends it.
//
// Host auto-detection (local only): the app runs in Expo Go on a physical phone, so
// `localhost` would mean the PHONE, not this Mac. Metro serves the JS bundle from the
// Mac's LAN IP and RN exposes that URL via SourceCode.scriptURL, e.g.
//   "http://192.168.1.6:8081/index.bundle?platform=ios&dev=true"
// We reuse that same IP for Django on port 8000, so the API host always matches
// whatever IP the app actually connected over — survives Wi-Fi/IP changes with no edit.

import { NativeModules } from 'react-native';

export type BackendTarget = 'local' | 'remote' | 'production';

// `as BackendTarget` keeps the type wide — without it TS narrows this to the literal
// and flags the other branch below as unreachable.
//
// NOTE for release builds: 'local' does NOT work in a release APK as-is. Android 9+
// blocks cleartext HTTP outside debug (usesCleartextTraffic is set only in
// android/app/src/debug/AndroidManifest.xml), and host auto-detection needs Metro,
// which a release build has no access to. 'remote' is HTTPS with a fixed URL, so it
// works in release. Use 'local' for dev in Expo Go.
// 'remote' = Prince's ngrok backend (live again as of this change). Switch to
// 'local' for offline dev against the Mac's Django; note a release APK can only
// use 'remote' (Android blocks cleartext HTTP and there is no Metro to detect
// the LAN IP from).
export const BACKEND = 'production' as BackendTarget;

const REMOTE_BASE_URL = 'https://shininess-magnifier-fructose.ngrok-free.dev/api/v1';
const PROD_BASE_URL = 'https://api.zeelinfotech.co.in/api/v1';

// Only used if auto-detection fails (e.g. a production build). Keep this at the
// Mac's current LAN IP as a safety net for when scriptURL detection returns
// localhost (USB / adb-reverse connections).
const FALLBACK_HOST = '192.168.1.3';
const BACKEND_PORT = 8000;

function detectHost(): string {
  try {
    const scriptURL: string | undefined = (NativeModules as any)?.SourceCode?.scriptURL;
    if (scriptURL) {
      const host = /^https?:\/\/([^:/]+)/.exec(scriptURL)?.[1];
      if (host && host !== 'localhost' && host !== '127.0.0.1') return host;
    }
  } catch {
    // fall through to the fallback
  }
  return FALLBACK_HOST;
}

export const API_HOST = detectHost();

export const API_BASE_URL =
  BACKEND === 'production'
    ? PROD_BASE_URL
    : BACKEND === 'remote'
    ? REMOTE_BASE_URL
    : `http://${API_HOST}:${BACKEND_PORT}/api/v1`;

export const API_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
  // Skips ngrok's HTML interstitial. Ignored by local Django, so it's safe to always send.
  'ngrok-skip-browser-warning': 'true',
};
