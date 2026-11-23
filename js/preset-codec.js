/**
 * Compact Base64URL Preset Codec for QR Studio.
 * Encodes style deltas (and optional preset name / QR content) into short,
 * URL-safe `QR1.<base64url>` tokens with strict schema sanitization on decode.
 */

import { buildPresetLogoDataUri, LOGO_PRESETS } from './icons.js';
import { QR_TYPES } from './payload-builders.js';
import {
  DEFAULT_STYLE,
  DOT_STYLES,
  EYE_INNER_STYLES,
  EYE_OUTER_STYLES,
  FRAME_STYLES,
} from './qr-renderer.js';

const PREFIX = 'QR1.';

// Compact short keys mapped to DEFAULT_STYLE properties for minimal Base64URL length
const STYLE_KEY_MAP = [
  ['ds', 'dotStyle'],
  ['dc', 'dotScale'],
  ['eo', 'eyeOuterStyle'],
  ['ei', 'eyeInnerStyle'],
  ['ce', 'customEyeColors'],
  ['oc', 'eyeOuterColor'],
  ['ic', 'eyeInnerColor'],
  ['ft', 'fgType'],
  ['fc', 'fgColor'],
  ['f2', 'fgColor2'],
  ['f3', 'fgColor3'],
  ['fa', 'fgGradientAngle'],
  ['bt', 'bgType'],
  ['bc', 'bgColor'],
  ['b2', 'bgColor2'],
  ['ba', 'bgGradientAngle'],
  ['lp', 'logoPresetId'],
  ['ls', 'logoSize'],
  ['lg', 'logoPadding'],
  ['lh', 'logoShape'],
  ['la', 'logoBgAuto'],
  ['lb', 'logoBgColor'],
  ['le', 'logoExcavate'],
  ['lo', 'logoOpacity'],
  ['fs', 'frameStyle'],
  ['fx', 'frameText'],
  ['fm', 'frameColor'],
  ['fk', 'frameTextColor'],
  ['fr', 'frameRadius'],
  ['ec', 'ecc'],
  ['mg', 'margin'],
  ['mv', 'minVersion'],
  ['es', 'exportSize'],
];

const VALID_DOTS = new Set(DOT_STYLES.map((d) => d.id));
const VALID_EYE_OUTER = new Set(EYE_OUTER_STYLES.map((e) => e.id));
const VALID_EYE_INNER = new Set(EYE_INNER_STYLES.map((e) => e.id));
const VALID_FRAMES = new Set(FRAME_STYLES.map((f) => f.id));
const VALID_LOGO_PRESETS = new Set(LOGO_PRESETS.map((p) => p.id));
const VALID_TYPES = new Set(QR_TYPES.map((t) => t.id));
const VALID_FG_TYPES = new Set(['solid', 'linear', 'radial']);
const VALID_BG_TYPES = new Set(['solid', 'gradient', 'transparent']);
const VALID_LOGO_SHAPES = new Set(['none', 'square', 'rounded', 'circle']);
const VALID_ECC = new Set(['L', 'M', 'Q', 'H']);
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function bytesToBase64Url(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 =
    typeof btoa === 'function'
      ? btoa(binary)
      : Buffer.from(bytes).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(b64url) {
  const padded = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  const full = padded + '='.repeat(padLen);

  if (typeof atob === 'function') {
    const binary = atob(full);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  return new Uint8Array(Buffer.from(full, 'base64'));
}

function encodeUtf8(str) {
  return new TextEncoder().encode(str);
}

function decodeUtf8(bytes) {
  return new TextDecoder().decode(bytes);
}

function clamp(val, min, max, fallback) {
  const num = Number(val);
  if (Number.isNaN(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

/**
 * Sanitizes any untrusted style object against DEFAULT_STYLE bounds and enums.
 */
export function sanitizeStyle(raw = {}) {
  const s = { ...DEFAULT_STYLE };
  if (!raw || typeof raw !== 'object') return s;

  if (VALID_DOTS.has(raw.dotStyle)) s.dotStyle = raw.dotStyle;
  s.dotScale = clamp(raw.dotScale, 0.6, 1, s.dotScale);

  if (VALID_EYE_OUTER.has(raw.eyeOuterStyle)) s.eyeOuterStyle = raw.eyeOuterStyle;
  if (VALID_EYE_INNER.has(raw.eyeInnerStyle)) s.eyeInnerStyle = raw.eyeInnerStyle;
  if (typeof raw.customEyeColors === 'boolean') s.customEyeColors = raw.customEyeColors;
  if (HEX_RE.test(raw.eyeOuterColor)) s.eyeOuterColor = raw.eyeOuterColor;
  if (HEX_RE.test(raw.eyeInnerColor)) s.eyeInnerColor = raw.eyeInnerColor;

  if (VALID_FG_TYPES.has(raw.fgType)) s.fgType = raw.fgType;
  if (HEX_RE.test(raw.fgColor)) s.fgColor = raw.fgColor;
  if (HEX_RE.test(raw.fgColor2)) s.fgColor2 = raw.fgColor2;
  if (raw.fgColor3 === '' || HEX_RE.test(raw.fgColor3)) s.fgColor3 = raw.fgColor3;
  s.fgGradientAngle = clamp(raw.fgGradientAngle, 0, 360, s.fgGradientAngle);

  if (VALID_BG_TYPES.has(raw.bgType)) s.bgType = raw.bgType;
  if (HEX_RE.test(raw.bgColor)) s.bgColor = raw.bgColor;
  if (HEX_RE.test(raw.bgColor2)) s.bgColor2 = raw.bgColor2;
  s.bgGradientAngle = clamp(raw.bgGradientAngle, 0, 360, s.bgGradientAngle);

  if (typeof raw.logoPresetId === 'string' && VALID_LOGO_PRESETS.has(raw.logoPresetId)) {
    s.logoPresetId = raw.logoPresetId;
    s.logoDataUrl = buildPresetLogoDataUri(raw.logoPresetId) || '';
  } else if (
    typeof raw.logoDataUrl === 'string' &&
    raw.logoDataUrl.startsWith('data:image/') &&
    raw.logoDataUrl.length <= 260000
  ) {
    s.logoPresetId = '';
    s.logoDataUrl = raw.logoDataUrl;
  } else if (raw.logoPresetId === '' && raw.logoDataUrl === '') {
    s.logoPresetId = '';
    s.logoDataUrl = '';
  }

  s.logoSize = clamp(raw.logoSize, 0.1, 0.34, s.logoSize);
  s.logoPadding = clamp(raw.logoPadding, 0, 36, s.logoPadding);
  if (VALID_LOGO_SHAPES.has(raw.logoShape)) s.logoShape = raw.logoShape;
  if (typeof raw.logoBgAuto === 'boolean') s.logoBgAuto = raw.logoBgAuto;
  if (HEX_RE.test(raw.logoBgColor)) s.logoBgColor = raw.logoBgColor;
  if (typeof raw.logoExcavate === 'boolean') s.logoExcavate = raw.logoExcavate;
  s.logoOpacity = clamp(raw.logoOpacity, 0.4, 1, s.logoOpacity);

  if (VALID_FRAMES.has(raw.frameStyle)) s.frameStyle = raw.frameStyle;
  if (typeof raw.frameText === 'string') s.frameText = raw.frameText.slice(0, 32);
  if (HEX_RE.test(raw.frameColor)) s.frameColor = raw.frameColor;
  if (HEX_RE.test(raw.frameTextColor)) s.frameTextColor = raw.frameTextColor;
  s.frameRadius = clamp(raw.frameRadius, 0, 80, s.frameRadius);

  if (VALID_ECC.has(raw.ecc)) s.ecc = raw.ecc;
  s.margin = clamp(raw.margin, 0, 10, s.margin);
  s.minVersion = clamp(raw.minVersion, 0, 40, s.minVersion);
  s.exportSize = clamp(raw.exportSize, 256, 4096, s.exportSize);

  return s;
}

/**
 * Encodes a preset (style delta, optional name, optional QR type + form data)
 * into a compact `QR1.<base64url>` code.
 */
export function encodePresetCode({ style, name = '', type = '', values = null, includeCustomLogo = false } = {}) {
  const cleanStyle = sanitizeStyle(style);
  const compactStyle = {};

  for (const [shortKey, fullKey] of STYLE_KEY_MAP) {
    if (cleanStyle[fullKey] !== DEFAULT_STYLE[fullKey]) {
      compactStyle[shortKey] = cleanStyle[fullKey];
    }
  }

  let omittedCustomLogo = false;
  if (cleanStyle.logoDataUrl && !cleanStyle.logoPresetId) {
    if (includeCustomLogo && cleanStyle.logoDataUrl.length <= 16000) {
      compactStyle.ld = cleanStyle.logoDataUrl;
    } else {
      omittedCustomLogo = true;
    }
  }

  const envelope = { s: compactStyle };
  const cleanName = String(name || '').trim().slice(0, 40);
  if (cleanName) envelope.n = cleanName;

  if (type && VALID_TYPES.has(type) && values && typeof values === 'object') {
    envelope.t = type;
    envelope.v = values;
  }

  const json = JSON.stringify(envelope);
  const token = `${PREFIX}${bytesToBase64Url(encodeUtf8(json))}`;
  return {
    code: token,
    omittedCustomLogo,
    hasContent: Boolean(envelope.t),
  };
}

/**
 * Extracts a `QR1.<...>` token from either a raw code string or a full URL (#preset=... or ?preset=...).
 */
export function extractPresetToken(rawInput) {
  const text = String(rawInput || '').trim();
  if (!text) return '';

  if (text.startsWith(PREFIX)) {
    return text.split(/\s+/)[0];
  }

  // Try parsing as URL (#preset=... or ?preset=...)
  try {
    const url = new URL(text);
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
    const fromHash = hashParams.get('preset');
    if (fromHash) return fromHash.trim();
    const fromQuery = url.searchParams.get('preset');
    if (fromQuery) return fromQuery.trim();
  } catch {
    // Not a full URL; check regex fallback
  }

  const match = text.match(/QR1\.[A-Za-z0-9_-]+/);
  return match ? match[0] : '';
}

/**
 * Decodes a `QR1.<base64url>` token (or full shared URL) into a sanitized preset object.
 */
export function decodePresetCode(rawInput) {
  const token = extractPresetToken(rawInput);
  if (!token || !token.startsWith(PREFIX)) {
    throw new Error('Código inválido. Use um código QR1... ou link compartilhado do QR Studio.');
  }

  const b64Part = token.slice(PREFIX.length);
  if (!b64Part || !/^[A-Za-z0-9_-]+$/.test(b64Part)) {
    throw new Error('Código Base64URL malformado.');
  }

  let parsed;
  try {
    const json = decodeUtf8(base64UrlToBytes(b64Part));
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Não foi possível decodificar o preset. Verifique se o código está completo.');
  }

  if (!parsed || typeof parsed !== 'object' || typeof parsed.s !== 'object') {
    throw new Error('Estrutura de preset inválida.');
  }

  const expandedStyle = {};
  for (const [shortKey, fullKey] of STYLE_KEY_MAP) {
    if (Object.prototype.hasOwnProperty.call(parsed.s, shortKey)) {
      expandedStyle[fullKey] = parsed.s[shortKey];
    }
  }
  if (typeof parsed.s.ld === 'string') {
    expandedStyle.logoDataUrl = parsed.s.ld;
    expandedStyle.logoPresetId = '';
  }

  const style = sanitizeStyle(expandedStyle);
  const name = typeof parsed.n === 'string' ? parsed.n.trim().slice(0, 40) : '';
  const type = typeof parsed.t === 'string' && VALID_TYPES.has(parsed.t) ? parsed.t : '';
  const values =
    type && parsed.v && typeof parsed.v === 'object' && !Array.isArray(parsed.v)
      ? parsed.v
      : null;

  return { style, name, type, values };
}

/**
 * Builds a clean shareable URL using the URL hash (#preset=...) for GitHub Pages compatibility.
 */
export function buildShareUrl(code, currentHref) {
  const url = new URL(currentHref);
  url.hash = `preset=${code}`;
  return url.toString();
}
