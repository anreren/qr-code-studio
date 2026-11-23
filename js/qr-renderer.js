/**
 * Custom high-precision SVG QR Code renderer, raster exporter, and scannability analyzer.
 * Uses vendored MIT qrcode-generator with full UTF-8 byte mode.
 */

import qrcode from './vendor/qrcode.js';
import { stringToBytes as utf8StringToBytes } from './vendor/qrcode-utf8.js';

qrcode.stringToBytes = utf8StringToBytes;

export const DOT_STYLES = [
  { id: 'square', label: 'Quadrado' },
  { id: 'rounded', label: 'Arredondado' },
  { id: 'dots', label: 'Pontos' },
  { id: 'extra-rounded', label: 'Orgânico' },
  { id: 'fluid', label: 'Fluido' },
  { id: 'classy', label: 'Elegante' },
  { id: 'classy-rounded', label: 'Suave' },
  { id: 'diamond', label: 'Diamante' },
];

export const EYE_OUTER_STYLES = [
  { id: 'square', label: 'Quadrado' },
  { id: 'rounded', label: 'Arredondado' },
  { id: 'extra-rounded', label: 'Extra Arred.' },
  { id: 'circle', label: 'Circular' },
  { id: 'leaf', label: 'Folha' },
];

export const EYE_INNER_STYLES = [
  { id: 'square', label: 'Quadrado' },
  { id: 'rounded', label: 'Arredondado' },
  { id: 'circle', label: 'Círculo' },
  { id: 'diamond', label: 'Diamante' },
  { id: 'leaf', label: 'Folha' },
];

export const FRAME_STYLES = [
  { id: 'none', label: 'Sem moldura' },
  { id: 'bottom-bar', label: 'Faixa inferior' },
  { id: 'top-bar', label: 'Faixa superior' },
  { id: 'card', label: 'Cartão limpo' },
  { id: 'bubble', label: 'Balão CTA' },
  { id: 'corners', label: 'Mira minimalista' },
];

export const DEFAULT_STYLE = {
  // Modules
  dotStyle: 'rounded',
  dotScale: 0.96,
  // Finder eyes
  eyeOuterStyle: 'rounded',
  eyeInnerStyle: 'rounded',
  customEyeColors: false,
  eyeOuterColor: '#111111',
  eyeInnerColor: '#111111',
  // Foreground color / gradient
  fgType: 'solid', // 'solid' | 'linear' | 'radial'
  fgColor: '#111111',
  fgColor2: '#2563EB',
  fgColor3: '',
  fgGradientAngle: 135,
  // Background
  bgType: 'solid', // 'solid' | 'gradient' | 'transparent'
  bgColor: '#FFFFFF',
  bgColor2: '#F4F4F5',
  bgGradientAngle: 135,
  // Logo
  logoDataUrl: '',
  logoPresetId: '',
  logoSize: 0.22, // fraction of QR matrix width (0.10 - 0.34)
  logoPadding: 6, // px in 1000-unit space
  logoShape: 'rounded', // 'none' | 'square' | 'rounded' | 'circle'
  logoBgAuto: true,
  logoBgColor: '#FFFFFF',
  logoExcavate: true,
  logoOpacity: 1,
  // Frame
  frameStyle: 'none',
  frameText: 'ESCANEIE-ME',
  frameColor: '#111111',
  frameTextColor: '#FFFFFF',
  frameRadius: 28,
  // Technical
  ecc: 'M', // 'L' | 'M' | 'Q' | 'H'
  margin: 4, // quiet zone in modules
  minVersion: 0, // 0 = auto, 1..40
  exportSize: 1024,
};

export const STYLE_PRESETS = [
  {
    id: 'classic',
    name: 'Clássico',
    swatch: ['#111111', '#FFFFFF'],
    patch: {
      dotStyle: 'square',
      dotScale: 1,
      eyeOuterStyle: 'square',
      eyeInnerStyle: 'square',
      fgType: 'solid',
      fgColor: '#111111',
      bgType: 'solid',
      bgColor: '#FFFFFF',
      customEyeColors: false,
      frameStyle: 'none',
    },
  },
  {
    id: 'minimal-round',
    name: 'Arredondado',
    swatch: ['#18181B', '#FFFFFF'],
    patch: {
      dotStyle: 'extra-rounded',
      dotScale: 0.96,
      eyeOuterStyle: 'rounded',
      eyeInnerStyle: 'circle',
      fgType: 'solid',
      fgColor: '#18181B',
      bgType: 'solid',
      bgColor: '#FFFFFF',
      customEyeColors: false,
    },
  },
  {
    id: 'dots-soft',
    name: 'Pontos',
    swatch: ['#0F172A', '#F8FAFC'],
    patch: {
      dotStyle: 'dots',
      dotScale: 0.88,
      eyeOuterStyle: 'extra-rounded',
      eyeInnerStyle: 'circle',
      fgType: 'solid',
      fgColor: '#0F172A',
      bgType: 'solid',
      bgColor: '#FFFFFF',
      customEyeColors: true,
      eyeOuterColor: '#0F172A',
      eyeInnerColor: '#0EA5E9',
    },
  },
  {
    id: 'fluid-ocean',
    name: 'Oceano',
    swatch: ['#0F172A', '#0284C7'],
    patch: {
      dotStyle: 'fluid',
      dotScale: 0.94,
      eyeOuterStyle: 'leaf',
      eyeInnerStyle: 'rounded',
      fgType: 'linear',
      fgColor: '#0F172A',
      fgColor2: '#0284C7',
      fgColor3: '',
      fgGradientAngle: 135,
      bgType: 'solid',
      bgColor: '#FFFFFF',
      customEyeColors: false,
    },
  },
  {
    id: 'emerald-card',
    name: 'Botânico',
    swatch: ['#064E3B', '#ECFDF5'],
    patch: {
      dotStyle: 'classy-rounded',
      dotScale: 0.94,
      eyeOuterStyle: 'leaf',
      eyeInnerStyle: 'leaf',
      fgType: 'solid',
      fgColor: '#064E3B',
      bgType: 'solid',
      bgColor: '#FFFFFF',
      customEyeColors: true,
      eyeOuterColor: '#064E3B',
      eyeInnerColor: '#059669',
    },
  },
  {
    id: 'warm-editorial',
    name: 'Editorial',
    swatch: ['#292524', '#FAF8F5'],
    patch: {
      dotStyle: 'rounded',
      dotScale: 0.92,
      eyeOuterStyle: 'rounded',
      eyeInnerStyle: 'rounded',
      fgType: 'solid',
      fgColor: '#292524',
      bgType: 'solid',
      bgColor: '#FAF8F5',
      customEyeColors: true,
      eyeOuterColor: '#292524',
      eyeInnerColor: '#B45309',
    },
  },
];

/**
 * Generates the QR matrix and metadata.
 */
export function buildQrMatrix(text, ecc = 'M', minVersion = 0) {
  const payload = String(text || '').trim();
  if (!payload) {
    return { empty: true, count: 0, version: 0, byteLength: 0, isDark: () => false };
  }

  const byteLength = utf8StringToBytes(payload).length;
  const startVersion = Math.max(0, Math.min(40, Number(minVersion) || 0));

  // Try requested minVersion; if too small for payload, fall back to auto (0)
  let qr;
  try {
    qr = qrcode(startVersion, ecc);
    qr.addData(payload, 'Byte');
    qr.make();
  } catch {
    if (startVersion > 0) {
      qr = qrcode(0, ecc);
      qr.addData(payload, 'Byte');
      qr.make();
    } else {
      throw new Error('Conteúdo muito grande para o nível de correção selecionado.');
    }
  }

  const count = qr.getModuleCount();
  const version = Math.round((count - 17) / 4);

  return {
    empty: false,
    count,
    version,
    byteLength,
    isDark: (r, c) => (r >= 0 && c >= 0 && r < count && c < count ? qr.isDark(r, c) : false),
  };
}

/**
 * Checks whether module (r, c) belongs to one of the 3 finder eyes (7x7).
 */
function isFinderModule(r, c, count) {
  const inTopLeft = r < 7 && c < 7;
  const inTopRight = r < 7 && c >= count - 7;
  const inBottomLeft = r >= count - 7 && c < 7;
  return inTopLeft || inTopRight || inBottomLeft;
}

/**
 * Rounds numbers cleanly for compact SVG strings.
 */
function n(val) {
  return Number(val.toFixed(2));
}

/**
 * Generates an SVG path for a rectangle with independent corner radii [tl, tr, br, bl].
 */
function roundedRectPath(x, y, w, h, radii) {
  const maxR = Math.min(w, h) / 2;
  const [tl, tr, br, bl] = radii.map((r) => Math.max(0, Math.min(r, maxR)));
  return [
    `M${n(x + tl)},${n(y)}`,
    `H${n(x + w - tr)}`,
    tr ? `A${n(tr)},${n(tr)} 0 0 1 ${n(x + w)},${n(y + tr)}` : '',
    `V${n(y + h - br)}`,
    br ? `A${n(br)},${n(br)} 0 0 1 ${n(x + w - br)},${n(y + h)}` : '',
    `H${n(x + bl)}`,
    bl ? `A${n(bl)},${n(bl)} 0 0 1 ${n(x)},${n(y + h - bl)}` : '',
    `V${n(y + tl)}`,
    tl ? `A${n(tl)},${n(tl)} 0 0 1 ${n(x + tl)},${n(y)}` : '',
    'Z',
  ].join('');
}

/**
 * Generates an SVG path for a single finder outer 7x7 ring (using evenodd fill-rule).
 */
function buildEyeOuterPath(ox, oy, cell, style, cornerIndex) {
  const outerSize = cell * 7;
  const innerOffset = cell;
  const innerSize = cell * 5;

  if (style === 'circle') {
    const cx = ox + outerSize / 2;
    const cy = oy + outerSize / 2;
    const rOut = outerSize / 2;
    const rIn = innerSize / 2;
    return [
      `M${n(cx - rOut)},${n(cy)}`,
      `A${n(rOut)},${n(rOut)} 0 1 0 ${n(cx + rOut)},${n(cy)}`,
      `A${n(rOut)},${n(rOut)} 0 1 0 ${n(cx - rOut)},${n(cy)}Z`,
      `M${n(cx - rIn)},${n(cy)}`,
      `A${n(rIn)},${n(rIn)} 0 1 1 ${n(cx + rIn)},${n(cy)}`,
      `A${n(rIn)},${n(rIn)} 0 1 1 ${n(cx - rIn)},${n(cy)}Z`,
    ].join('');
  }

  let rOut = [0, 0, 0, 0];
  let rIn = [0, 0, 0, 0];

  if (style === 'rounded') {
    rOut = [cell * 1.5, cell * 1.5, cell * 1.5, cell * 1.5];
    rIn = [cell * 0.85, cell * 0.85, cell * 0.85, cell * 0.85];
  } else if (style === 'extra-rounded') {
    rOut = [cell * 2.4, cell * 2.4, cell * 2.4, cell * 2.4];
    rIn = [cell * 1.45, cell * 1.45, cell * 1.45, cell * 1.45];
  } else if (style === 'leaf') {
    // Orient sharp inner corner toward QR center for symmetry
    // cornerIndex: 0=top-left, 1=top-right, 2=bottom-left
    const big = cell * 2.4;
    const small = cell * 1.4;
    if (cornerIndex === 0) {
      rOut = [big, big, 0, big];
      rIn = [small, small, 0, small];
    } else if (cornerIndex === 1) {
      rOut = [big, big, big, 0];
      rIn = [small, small, small, 0];
    } else {
      rOut = [big, 0, big, big];
      rIn = [small, 0, small, small];
    }
  }

  const outerPath = roundedRectPath(ox, oy, outerSize, outerSize, rOut);
  const innerPath = roundedRectPath(
    ox + innerOffset,
    oy + innerOffset,
    innerSize,
    innerSize,
    rIn
  );
  return `${outerPath}${innerPath}`;
}

/**
 * Generates an SVG path for a finder inner 3x3 dot.
 */
function buildEyeInnerPath(ox, oy, cell, style, cornerIndex) {
  const x = ox + cell * 2;
  const y = oy + cell * 2;
  const size = cell * 3;
  const cx = x + size / 2;
  const cy = y + size / 2;

  if (style === 'circle') {
    const r = size / 2;
    return `M${n(cx - r)},${n(cy)}A${n(r)},${n(r)} 0 1 0 ${n(cx + r)},${n(cy)}A${n(r)},${n(r)} 0 1 0 ${n(cx - r)},${n(cy)}Z`;
  }
  if (style === 'diamond') {
    const r = size * 0.54;
    return `M${n(cx)},${n(cy - r)}L${n(cx + r)},${n(cy)}L${n(cx)},${n(cy + r)}L${n(cx - r)},${n(cy)}Z`;
  }
  if (style === 'rounded') {
    const r = cell * 0.85;
    return roundedRectPath(x, y, size, size, [r, r, r, r]);
  }
  if (style === 'leaf') {
    const big = cell * 1.25;
    if (cornerIndex === 0) return roundedRectPath(x, y, size, size, [big, big, 0, big]);
    if (cornerIndex === 1) return roundedRectPath(x, y, size, size, [big, big, big, 0]);
    return roundedRectPath(x, y, size, size, [big, 0, big, big]);
  }
  return roundedRectPath(x, y, size, size, [0, 0, 0, 0]);
}

/**
 * Generates SVG path segment for an individual data module.
 */
function buildDataModulePath(r, c, x, y, cell, scale, style, isDarkFn) {
  const pad = (cell * (1 - scale)) / 2;
  const mx = x + pad;
  const my = y + pad;
  const s = cell * scale;

  if (style === 'square') {
    // Slight bleed when scale is 1 eliminates hairline gaps in SVG anti-aliasing
    const bleed = scale >= 0.99 ? 0.15 : 0;
    return `M${n(mx - bleed)},${n(my - bleed)}h${n(s + bleed * 2)}v${n(s + bleed * 2)}h${n(-(s + bleed * 2))}Z`;
  }

  if (style === 'dots') {
    const cx = x + cell / 2;
    const cy = y + cell / 2;
    const rad = (s / 2) * 0.94;
    return `M${n(cx - rad)},${n(cy)}A${n(rad)},${n(rad)} 0 1 0 ${n(cx + rad)},${n(cy)}A${n(rad)},${n(rad)} 0 1 0 ${n(cx - rad)},${n(cy)}Z`;
  }

  if (style === 'rounded') {
    const rad = s * 0.34;
    return roundedRectPath(mx, my, s, s, [rad, rad, rad, rad]);
  }

  if (style === 'diamond') {
    const cx = x + cell / 2;
    const cy = y + cell / 2;
    const half = s * 0.52;
    return `M${n(cx)},${n(cy - half)}L${n(cx + half)},${n(cy)}L${n(cx)},${n(cy + half)}L${n(cx - half)},${n(cy)}Z`;
  }

  const top = isDarkFn(r - 1, c);
  const right = isDarkFn(r, c + 1);
  const bottom = isDarkFn(r + 1, c);
  const left = isDarkFn(r, c - 1);

  if (style === 'classy') {
    const rad = s * 0.45;
    const tl = !top && !left ? rad : 0;
    const br = !bottom && !right ? rad : 0;
    return roundedRectPath(mx, my, s, s, [tl, 0, br, 0]);
  }

  if (style === 'classy-rounded') {
    const rad = s * 0.5;
    const tl = !top && !left ? rad : s * 0.08;
    const tr = !top && !right ? s * 0.2 : 0;
    const br = !bottom && !right ? rad : s * 0.08;
    const bl = !bottom && !left ? s * 0.2 : 0;
    return roundedRectPath(mx, my, s, s, [tl, tr, br, bl]);
  }

  if (style === 'extra-rounded') {
    const bleed = scale >= 0.94 ? 0.12 : 0;
    const rad = s * 0.46;
    const tl = !top && !left ? rad : 0;
    const tr = !top && !right ? rad : 0;
    const br = !bottom && !right ? rad : 0;
    const bl = !bottom && !left ? rad : 0;
    return roundedRectPath(mx - bleed, my - bleed, s + bleed * 2, s + bleed * 2, [tl, tr, br, bl]);
  }

  if (style === 'fluid') {
    // Connects smoothly to horizontal & vertical neighbors while keeping pill ends
    const thickness = s * 0.92;
    const offset = (cell - thickness) / 2;
    const rad = thickness / 2;
    const rx = x + offset;
    const ry = y + offset;
    const connectLeft = left ? offset + 0.2 : 0;
    const connectRight = right ? offset + 0.2 : 0;
    const connectTop = top ? offset + 0.2 : 0;
    const connectBottom = bottom ? offset + 0.2 : 0;

    let path = '';
    if (left || right) {
      path += roundedRectPath(
        rx - connectLeft,
        ry,
        thickness + connectLeft + connectRight,
        thickness,
        [left ? 0 : rad, right ? 0 : rad, right ? 0 : rad, left ? 0 : rad]
      );
    }
    if (top || bottom) {
      path += roundedRectPath(
        rx,
        ry - connectTop,
        thickness,
        thickness + connectTop + connectBottom,
        [top ? 0 : rad, top ? 0 : rad, bottom ? 0 : rad, bottom ? 0 : rad]
      );
    }
    if (!left && !right && !top && !bottom) {
      const cx = x + cell / 2;
      const cy = y + cell / 2;
      path += `M${n(cx - rad)},${n(cy)}A${n(rad)},${n(rad)} 0 1 0 ${n(cx + rad)},${n(cy)}A${n(rad)},${n(rad)} 0 1 0 ${n(cx - rad)},${n(cy)}Z`;
    }
    return path;
  }

  return roundedRectPath(mx, my, s, s, [0, 0, 0, 0]);
}

/**
 * Escapes XML text content safely.
 */
function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Builds SVG gradient definition in userSpaceOnUse coordinates.
 */
function buildGradientDef(id, type, angleDeg, color1, color2, color3, x, y, size) {
  const stops = [
    `<stop offset="0%" stop-color="${color1}"/>`,
    color3
      ? `<stop offset="50%" stop-color="${color2}"/><stop offset="100%" stop-color="${color3}"/>`
      : `<stop offset="100%" stop-color="${color2}"/>`,
  ].join('');

  if (type === 'radial') {
    const cx = x + size / 2;
    const cy = y + size / 2;
    const r = size * 0.62;
    return `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}">${stops}</radialGradient>`;
  }

  const rad = ((angleDeg - 90) * Math.PI) / 180;
  const cx = x + size / 2;
  const cy = y + size / 2;
  const half = size / 2;
  const x1 = cx - Math.cos(rad) * half;
  const y1 = cy - Math.sin(rad) * half;
  const x2 = cx + Math.cos(rad) * half;
  const y2 = cy + Math.sin(rad) * half;
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}">${stops}</linearGradient>`;
}

/**
 * Renders the full QR Code (including frame, gradients, custom eyes, dots, and logo) as an SVG string.
 */
export function renderQrSvg(payload, rawStyle = {}) {
  const style = { ...DEFAULT_STYLE, ...rawStyle };
  const matrix = buildQrMatrix(payload, style.ecc, style.minVersion);

  if (matrix.empty) {
    return { svg: '', matrix, width: 1000, height: 1000 };
  }

  const qrCanvasSize = 1000;
  const quiet = Math.max(0, Math.min(10, Number(style.margin) ?? 4));
  const totalModules = matrix.count + quiet * 2;
  const cell = qrCanvasSize / totalModules;
  const matrixOffset = quiet * cell;
  const matrixPixelSize = matrix.count * cell;

  // Frame layout calculations
  const frameStyle = style.frameStyle || 'none';
  const frameText = String(style.frameText || '').trim().slice(0, 32);
  const frameRadius = Math.max(0, Math.min(80, Number(style.frameRadius) || 28));

  let viewW = qrCanvasSize;
  let viewH = qrCanvasSize;
  let qrX = 0;
  let qrY = 0;

  if (frameStyle === 'bottom-bar') {
    viewW = 1080;
    viewH = 1230;
    qrX = 40;
    qrY = 40;
  } else if (frameStyle === 'top-bar') {
    viewW = 1080;
    viewH = 1230;
    qrX = 40;
    qrY = 190;
  } else if (frameStyle === 'card') {
    viewW = 1080;
    viewH = 1210;
    qrX = 40;
    qrY = 40;
  } else if (frameStyle === 'bubble') {
    viewW = 1040;
    viewH = 1240;
    qrX = 20;
    qrY = 20;
  } else if (frameStyle === 'corners') {
    viewW = 1080;
    viewH = frameText ? 1200 : 1080;
    qrX = 40;
    qrY = 40;
  }

  const defs = [];
  const uid = 'qr';

  // Foreground fill
  let fgFill = style.fgColor;
  if (style.fgType === 'linear' || style.fgType === 'radial') {
    defs.push(
      buildGradientDef(
        `${uid}-fg`,
        style.fgType,
        Number(style.fgGradientAngle) || 135,
        style.fgColor,
        style.fgColor2 || '#2563EB',
        style.fgColor3 || '',
        qrX + matrixOffset,
        qrY + matrixOffset,
        matrixPixelSize
      )
    );
    fgFill = `url(#${uid}-fg)`;
  }

  // Background fill
  let bgFill = 'none';
  if (style.bgType === 'solid') {
    bgFill = style.bgColor || '#FFFFFF';
  } else if (style.bgType === 'gradient') {
    defs.push(
      buildGradientDef(
        `${uid}-bg`,
        'linear',
        Number(style.bgGradientAngle) || 135,
        style.bgColor || '#FFFFFF',
        style.bgColor2 || '#F4F4F5',
        '',
        qrX,
        qrY,
        qrCanvasSize
      )
    );
    bgFill = `url(#${uid}-bg)`;
  }

  // Logo safe excavation bounds in QR canvas coordinates
  const hasLogo = Boolean(style.logoDataUrl);
  const logoFraction = Math.max(0.1, Math.min(0.34, Number(style.logoSize) || 0.22));
  const logoBoxSize = matrixPixelSize * logoFraction;
  const logoPad = Math.max(0, Math.min(36, Number(style.logoPadding) ?? 8));
  const logoTotalSize = logoBoxSize + logoPad * 2;
  const logoCenterX = qrX + qrCanvasSize / 2;
  const logoCenterY = qrY + qrCanvasSize / 2;
  const excHalf = logoTotalSize / 2;

  const isExcavated = (r, c) => {
    if (!hasLogo || !style.logoExcavate) return false;
    if (isFinderModule(r, c, matrix.count)) return false;
    const modCenterX = qrX + matrixOffset + (c + 0.5) * cell;
    const modCenterY = qrY + matrixOffset + (r + 0.5) * cell;
    if (style.logoShape === 'circle') {
      const dx = modCenterX - logoCenterX;
      const dy = modCenterY - logoCenterY;
      return Math.hypot(dx, dy) < excHalf + cell * 0.25;
    }
    return (
      Math.abs(modCenterX - logoCenterX) < excHalf + cell * 0.15 &&
      Math.abs(modCenterY - logoCenterY) < excHalf + cell * 0.15
    );
  };

  const isEffectiveDataDark = (r, c) => {
    if (r < 0 || c < 0 || r >= matrix.count || c >= matrix.count) return false;
    if (isFinderModule(r, c, matrix.count)) return false;
    if (isExcavated(r, c)) return false;
    return matrix.isDark(r, c);
  };

  // Build data modules SVG path
  const dataPathParts = [];
  const dotScale = Math.max(0.6, Math.min(1.0, Number(style.dotScale) || 0.96));
  for (let r = 0; r < matrix.count; r++) {
    for (let c = 0; c < matrix.count; c++) {
      if (!isEffectiveDataDark(r, c)) continue;
      const mx = qrX + matrixOffset + c * cell;
      const my = qrY + matrixOffset + r * cell;
      dataPathParts.push(
        buildDataModulePath(r, c, mx, my, cell, dotScale, style.dotStyle, isEffectiveDataDark)
      );
    }
  }

  // Build 3 finder eyes
  const eyePositions = [
    [0, 0],
    [0, matrix.count - 7],
    [matrix.count - 7, 0],
  ];
  const eyeOuterPaths = [];
  const eyeInnerPaths = [];
  eyePositions.forEach(([er, ec], idx) => {
    const ex = qrX + matrixOffset + ec * cell;
    const ey = qrY + matrixOffset + er * cell;
    eyeOuterPaths.push(buildEyeOuterPath(ex, ey, cell, style.eyeOuterStyle, idx));
    eyeInnerPaths.push(buildEyeInnerPath(ex, ey, cell, style.eyeInnerStyle, idx));
  });

  const eyeOuterFill = style.customEyeColors ? style.eyeOuterColor || style.fgColor : fgFill;
  const eyeInnerFill = style.customEyeColors ? style.eyeInnerColor || style.fgColor : fgFill;

  // Build frame layers
  const frameBackLayer = [];
  const frameFrontLayer = [];
  const frameColor = style.frameColor || '#111111';
  const frameTextColor = style.frameTextColor || '#FFFFFF';
  const safeText = escapeXml(frameText || 'ESCANEIE-ME');
  const fontSize = frameText.length > 20 ? 44 : frameText.length > 14 ? 52 : 58;

  if (frameStyle === 'bottom-bar') {
    frameBackLayer.push(
      `<rect x="0" y="0" width="${viewW}" height="${viewH}" rx="${frameRadius + 10}" fill="${frameColor}"/>`
    );
    if (bgFill !== 'none') {
      frameBackLayer.push(
        `<rect x="${qrX}" y="${qrY}" width="${qrCanvasSize}" height="${qrCanvasSize}" rx="${Math.max(0, frameRadius - 4)}" fill="${bgFill}"/>`
      );
    }
    frameFrontLayer.push(
      `<text x="${viewW / 2}" y="1150" text-anchor="middle" fill="${frameTextColor}" font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" font-size="${fontSize}" font-weight="700" letter-spacing="2.4">${safeText}</text>`
    );
  } else if (frameStyle === 'top-bar') {
    frameBackLayer.push(
      `<rect x="0" y="0" width="${viewW}" height="${viewH}" rx="${frameRadius + 10}" fill="${frameColor}"/>`
    );
    if (bgFill !== 'none') {
      frameBackLayer.push(
        `<rect x="${qrX}" y="${qrY}" width="${qrCanvasSize}" height="${qrCanvasSize}" rx="${Math.max(0, frameRadius - 4)}" fill="${bgFill}"/>`
      );
    }
    frameFrontLayer.push(
      `<text x="${viewW / 2}" y="122" text-anchor="middle" fill="${frameTextColor}" font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" font-size="${fontSize}" font-weight="700" letter-spacing="2.4">${safeText}</text>`
    );
  } else if (frameStyle === 'card') {
    const cardBg = bgFill !== 'none' ? bgFill : '#FFFFFF';
    frameBackLayer.push(
      `<rect x="8" y="8" width="${viewW - 16}" height="${viewH - 16}" rx="${frameRadius + 8}" fill="${cardBg}" stroke="${frameColor}" stroke-width="14"/>`
    );
    frameFrontLayer.push(
      `<line x1="72" y1="1064" x2="${viewW - 72}" y2="1064" stroke="${frameColor}" stroke-opacity="0.16" stroke-width="4"/>`,
      `<text x="${viewW / 2}" y="1148" text-anchor="middle" fill="${frameColor}" font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" font-size="${fontSize}" font-weight="700" letter-spacing="2.2">${safeText}</text>`
    );
  } else if (frameStyle === 'bubble') {
    if (bgFill !== 'none') {
      frameBackLayer.push(
        `<rect x="${qrX}" y="${qrY}" width="${qrCanvasSize}" height="${qrCanvasSize}" rx="${frameRadius}" fill="${bgFill}"/>`
      );
    }
    const pillY = 1090;
    const pillH = 122;
    const pillW = Math.min(920, Math.max(460, safeText.length * 38 + 140));
    const pillX = (viewW - pillW) / 2;
    frameFrontLayer.push(
      `<polygon points="${viewW / 2 - 26},${pillY + 4} ${viewW / 2 + 26},${pillY + 4} ${viewW / 2},${pillY - 34}" fill="${frameColor}"/>`,
      `<rect x="${n(pillX)}" y="${pillY}" width="${n(pillW)}" height="${pillH}" rx="${Math.min(61, frameRadius + 16)}" fill="${frameColor}"/>`,
      `<text x="${viewW / 2}" y="${pillY + 80}" text-anchor="middle" fill="${frameTextColor}" font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" font-size="${Math.min(52, fontSize)}" font-weight="700" letter-spacing="2">${safeText}</text>`
    );
  } else if (frameStyle === 'corners') {
    if (bgFill !== 'none') {
      frameBackLayer.push(
        `<rect x="0" y="0" width="${viewW}" height="${viewH}" rx="${frameRadius}" fill="${bgFill}"/>`
      );
    }
    const bLen = 110;
    const bPad = 24;
    const bR = Math.min(36, frameRadius);
    const sw = 16;
    const bx1 = bPad;
    const by1 = bPad;
    const bx2 = viewW - bPad;
    const by2 = qrY + qrCanvasSize + 16;
    frameFrontLayer.push(
      `<g fill="none" stroke="${frameColor}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">`,
      `<path d="M${bx1},${by1 + bLen}V${by1 + bR}A${bR},${bR} 0 0 1 ${bx1 + bR},${by1}H${bx1 + bLen}"/>`,
      `<path d="M${bx2 - bLen},${by1}H${bx2 - bR}A${bR},${bR} 0 0 1 ${bx2},${by1 + bR}V${by1 + bLen}"/>`,
      `<path d="M${bx1},${by2 - bLen}V${by2 - bR}A${bR},${bR} 0 0 0 ${bx1 + bR},${by2}H${bx1 + bLen}"/>`,
      `<path d="M${bx2 - bLen},${by2}H${bx2 - bR}A${bR},${bR} 0 0 0 ${bx2},${by2 - bR}V${by2 - bLen}"/>`,
      `</g>`
    );
    if (frameText) {
      frameFrontLayer.push(
        `<text x="${viewW / 2}" y="1148" text-anchor="middle" fill="${frameColor}" font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" font-size="${fontSize - 4}" font-weight="700" letter-spacing="2.4">${safeText}</text>`
      );
    }
  } else if (bgFill !== 'none') {
    frameBackLayer.push(
      `<rect x="0" y="0" width="${viewW}" height="${viewH}" fill="${bgFill}"/>`
    );
  }

  // Logo layer
  const logoLayer = [];
  if (hasLogo) {
    const boxX = logoCenterX - logoTotalSize / 2;
    const boxY = logoCenterY - logoTotalSize / 2;
    const imgX = logoCenterX - logoBoxSize / 2;
    const imgY = logoCenterY - logoBoxSize / 2;
    const containerFill = style.logoBgAuto
      ? style.bgType === 'transparent'
        ? '#FFFFFF'
        : style.bgColor || '#FFFFFF'
      : style.logoBgColor || '#FFFFFF';

    let clipShape = '';
    if (style.logoShape === 'circle') {
      logoLayer.push(
        `<circle cx="${n(logoCenterX)}" cy="${n(logoCenterY)}" r="${n(logoTotalSize / 2)}" fill="${containerFill}"/>`
      );
      clipShape = `<circle cx="${n(logoCenterX)}" cy="${n(logoCenterY)}" r="${n(logoBoxSize / 2)}"/>`;
    } else if (style.logoShape === 'rounded') {
      const rr = Math.max(12, logoTotalSize * 0.22);
      const ir = Math.max(8, logoBoxSize * 0.18);
      logoLayer.push(
        `<rect x="${n(boxX)}" y="${n(boxY)}" width="${n(logoTotalSize)}" height="${n(logoTotalSize)}" rx="${n(rr)}" fill="${containerFill}"/>`
      );
      clipShape = `<rect x="${n(imgX)}" y="${n(imgY)}" width="${n(logoBoxSize)}" height="${n(logoBoxSize)}" rx="${n(ir)}"/>`;
    } else if (style.logoShape === 'square') {
      logoLayer.push(
        `<rect x="${n(boxX)}" y="${n(boxY)}" width="${n(logoTotalSize)}" height="${n(logoTotalSize)}" fill="${containerFill}"/>`
      );
      clipShape = `<rect x="${n(imgX)}" y="${n(imgY)}" width="${n(logoBoxSize)}" height="${n(logoBoxSize)}"/>`;
    } else {
      clipShape = `<rect x="${n(imgX)}" y="${n(imgY)}" width="${n(logoBoxSize)}" height="${n(logoBoxSize)}"/>`;
    }

    defs.push(`<clipPath id="${uid}-logo-clip">${clipShape}</clipPath>`);
    const opacityAttr = style.logoOpacity < 1 ? ` opacity="${n(style.logoOpacity)}"` : '';
    logoLayer.push(
      `<image href="${style.logoDataUrl}" x="${n(imgX)}" y="${n(imgY)}" width="${n(logoBoxSize)}" height="${n(logoBoxSize)}" preserveAspectRatio="xMidYMid meet" clip-path="url(#${uid}-logo-clip)"${opacityAttr}/>`
    );
  }

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewW} ${viewH}" width="${viewW}" height="${viewH}" role="img" aria-label="Código QR gerado">`,
    defs.length ? `<defs>${defs.join('')}</defs>` : '',
    frameBackLayer.join(''),
    `<path d="${dataPathParts.join('')}" fill="${fgFill}"/>`,
    `<path d="${eyeOuterPaths.join('')}" fill="${eyeOuterFill}" fill-rule="evenodd"/>`,
    `<path d="${eyeInnerPaths.join('')}" fill="${eyeInnerFill}"/>`,
    logoLayer.join(''),
    frameFrontLayer.join(''),
    `</svg>`,
  ].join('');

  return { svg, matrix, width: viewW, height: viewH };
}

/**
 * Parses a hex color (#RRGGBB or #RGB) to relative WCAG luminance [0..1].
 */
function hexToLuminance(hex) {
  let clean = String(hex || '#000000').replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const int = parseInt(clean, 16);
  if (Number.isNaN(int)) return 0;
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  const linear = [r, g, b].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(lum1, lum2) {
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Evaluates contrast, polarity, quiet zone, and logo error correction safety.
 */
export function analyzeScannability(style) {
  const bgHex = style.bgType === 'transparent' ? '#FFFFFF' : style.bgColor || '#FFFFFF';
  const bgLum = hexToLuminance(bgHex);
  const fgColors = [style.fgColor || '#111111'];
  if (style.fgType !== 'solid' && style.fgColor2) fgColors.push(style.fgColor2);
  if (style.fgType !== 'solid' && style.fgColor3) fgColors.push(style.fgColor3);

  const fgLums = fgColors.map(hexToLuminance);
  const minContrast = Math.min(...fgLums.map((l) => contrastRatio(l, bgLum)));
  const avgFgLum = fgLums.reduce((a, b) => a + b, 0) / fgLums.length;
  const isInverted = avgFgLum > bgLum + 0.1;

  const warnings = [];
  let level = 'good'; // 'good' | 'warn' | 'bad'

  if (minContrast < 2.6) {
    level = 'bad';
    warnings.push({
      code: 'contrast',
      text: `Contraste muito baixo (${minContrast.toFixed(1)}:1). Escureça os módulos ou clareie o fundo.`,
    });
  } else if (minContrast < 4.2) {
    level = 'warn';
    warnings.push({
      code: 'contrast',
      text: `Contraste moderado (${minContrast.toFixed(1)}:1). Recomendado ≥ 4.5:1 para câmeras rápidas.`,
    });
  }

  if (isInverted) {
    if (level === 'good') level = 'warn';
    warnings.push({
      code: 'inverted',
      text: 'Cores invertidas (código claro em fundo escuro) podem falhar em leitores mais antigos.',
    });
  }

  if (style.logoDataUrl && (style.ecc === 'L' || style.ecc === 'M') && style.logoSize >= 0.18) {
    if (level === 'good') level = 'warn';
    warnings.push({
      code: 'logo-ecc',
      text: 'Logo central ativo: recomendamos correção de erro H (30%) para leitura confiável.',
      action: 'fix-ecc',
    });
  }

  if (Number(style.margin) < 2) {
    if (level === 'good') level = 'warn';
    warnings.push({
      code: 'margin',
      text: 'Margem externa (quiet zone) muito pequena pode dificultar o foco da câmera.',
    });
  }

  return {
    level,
    contrast: minContrast,
    isInverted,
    warnings,
  };
}

/**
 * Converts an SVG string into a crisp raster Blob (PNG, WebP, or JPEG) via HTML5 Canvas.
 */
export async function exportQrRaster(svgString, { width, height, targetWidth = 1024, format = 'image/png', backgroundFallback = '#FFFFFF' }) {
  const aspect = height / width;
  const canvasW = targetWidth;
  const canvasH = Math.round(targetWidth * aspect);

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');

  if (format === 'image/jpeg') {
    ctx.fillStyle = backgroundFallback;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Falha ao rasterizar o SVG.'));
      image.src = url;
    });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvasW, canvasH);
  } finally {
    URL.revokeObjectURL(url);
  }

  return await new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Falha ao gerar imagem.'))),
      format,
      format === 'image/png' ? undefined : 0.94
    );
  });
}
