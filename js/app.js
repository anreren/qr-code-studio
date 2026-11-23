/**
 * QR Studio — Main Application Controller
 * Manages Simple & Complete modes, 16 specific QR types, real-time rendering,
 * logo upload/paste/presets, local history, and high-res exports.
 */

import { UI_ICONS, LOGO_PRESETS, buildPresetLogoDataUri } from './icons.js';
import { QR_CATEGORIES, QR_TYPES, getQrType } from './payload-builders.js';
import {
  buildShareUrl,
  decodePresetCode,
  encodePresetCode,
  extractPresetToken,
  sanitizeStyle,
} from './preset-codec.js';
import {
  DEFAULT_STYLE,
  DOT_STYLES,
  EYE_INNER_STYLES,
  EYE_OUTER_STYLES,
  FRAME_STYLES,
  STYLE_PRESETS,
  analyzeScannability,
  exportQrRaster,
  renderQrSvg,
} from './qr-renderer.js';

const STORAGE_KEYS = {
  theme: 'qrstudio_theme_v1',
  mode: 'qrstudio_mode_v1',
  history: 'qrstudio_history_v1',
  workspace: 'qrstudio_workspace_v1',
  presets: 'qrstudio_presets_v1',
};

const QUICK_FG_SWATCHES = ['#111111', '#1E3A8A', '#065F46', '#7C2D12', '#3F3F46', '#0369A1'];
const QUICK_BG_SWATCHES = ['#FFFFFF', '#FAF8F5', '#F0F9FF', '#ECFDF5', '#FEF9C3', '#18181B'];

const TYPE_EXAMPLES = {
  url: { url: 'https://github.com/features' },
  wifi: { ssid: 'Cafe_Minimal_5G', password: 'cafequentinho2026', encryption: 'WPA', hidden: false },
  pix: {
    key: 'pagamentos@qrstudio.com.br',
    name: 'QR STUDIO LTDA',
    city: 'SAO PAULO',
    amount: '49.90',
    txid: 'PEDIDO2026',
    description: 'Assinatura mensal',
  },
  vcard: {
    firstName: 'Marina',
    lastName: 'Costa',
    org: 'Estúdio Forma',
    title: 'Diretora de Design',
    mobile: '+55 11 98765-4321',
    phone: '+55 11 3210-4455',
    email: 'marina@estudioforma.com.br',
    website: 'https://estudioforma.com.br',
    street: 'Av. Paulista, 1578',
    city: 'São Paulo',
    state: 'SP',
    zip: '01310-200',
    country: 'Brasil',
    note: 'Atendimento com hora marcada',
  },
  whatsapp: {
    countryCode: '55',
    phone: '11 98765-4321',
    message: 'Olá! Vi seu QR Code e gostaria de conversar.',
  },
  text: { text: 'Cupom de boas-vindas: MINIMAL15 — 15% OFF no primeiro pedido.' },
  email: {
    to: 'contato@empresa.com.br',
    cc: '',
    subject: 'Orçamento de projeto',
    body: 'Olá equipe, gostaria de solicitar um orçamento.',
  },
  phone: { phone: '+55 11 98765-4321' },
  sms: { phone: '+55 11 98765-4321', message: 'Confirmo minha presença no evento!' },
  social: { platform: 'github', handle: 'octocat' },
  mecard: {
    name: 'Rafael Mendes',
    phone: '+55 21 99888-7766',
    email: 'rafael@studio.dev',
    org: 'Studio Dev',
    url: 'https://studio.dev',
    address: 'Rio de Janeiro, RJ',
    note: 'Engenheiro Front-end',
  },
  event: {
    title: 'Workshop de Design Minimalista',
    start: '2026-12-10T19:00',
    end: '2026-12-10T21:30',
    allDay: false,
    location: 'Espaço Cultural Paulista — Sala 3',
    description: 'Traga seu notebook para a sessão prática.',
  },
  geo: { lat: '-23.561414', lng: '-46.655881', label: 'MASP — Av. Paulista', format: 'maps' },
  meeting: { provider: 'zoom', meetingId: '812 3456 7890', password: 'design2026', customUrl: '' },
  crypto: {
    currency: 'bitcoin',
    address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    amount: '0.0025',
    label: 'Apoio ao projeto',
  },
  app: { store: 'play', appId: 'com.github.android' },
};

// Application State
const state = {
  mode: loadStorage(STORAGE_KEYS.mode, 'simple') === 'complete' ? 'complete' : 'simple',
  theme: loadStorage(STORAGE_KEYS.theme, 'light') === 'dark' ? 'dark' : 'light',
  activeType: 'url',
  activeCategory: 'all',
  activeStudioTab: 'pattern',
  formValues: {},
  style: { ...DEFAULT_STYLE },
  lastRender: { svg: '', matrix: null, width: 1000, height: 1000, payload: '' },
  history: loadJsonStorage(STORAGE_KEYS.history, []),
  savedPresets: loadJsonStorage(STORAGE_KEYS.presets, []),
  presetModal: {
    tab: 'share', // 'share' | 'import'
    name: '',
    includeContent: false,
    sourceStyle: null, // optional override when sharing a saved preset card
    importText: '',
  },
  saveTimer: null,
  toastTimer: null,
};

// Initialize default form values for all 16 types
QR_TYPES.forEach((t) => {
  state.formValues[t.id] = { ...t.defaults };
});

// DOM Cache
const dom = {
  modeSimpleBtn: document.getElementById('mode-simple-btn'),
  modeCompleteBtn: document.getElementById('mode-complete-btn'),
  themeToggleBtn: document.getElementById('theme-toggle-btn'),
  themeIcon: document.getElementById('theme-icon'),
  historyOpenBtn: document.getElementById('history-open-btn'),
  historyIcon: document.getElementById('history-icon'),
  historyCount: document.getElementById('history-count'),
  historyBackdrop: document.getElementById('history-backdrop'),
  historyCloseBtn: document.getElementById('history-close-btn'),
  historyDoneBtn: document.getElementById('history-done-btn'),
  historyList: document.getElementById('history-list'),
  clearHistoryBtn: document.getElementById('clear-history-btn'),
  closeIcon: document.getElementById('close-icon'),

  presetModalBackdrop: document.getElementById('preset-modal-backdrop'),
  presetModalCloseBtn: document.getElementById('preset-modal-close-btn'),
  presetCloseIcon: document.getElementById('preset-close-icon'),
  presetTabShare: document.getElementById('preset-tab-share'),
  presetTabImport: document.getElementById('preset-tab-import'),
  presetModalBody: document.getElementById('preset-modal-body'),
  sharePresetBtn: document.getElementById('share-preset-btn'),
  shareIcon: document.getElementById('share-icon'),
  autosaveStatus: document.getElementById('autosave-status'),

  categoryBar: document.getElementById('category-bar'),
  typeSelector: document.getElementById('type-selector'),
  typeDescription: document.getElementById('type-description'),
  contentForm: document.getElementById('qr-content-form'),
  fillExampleBtn: document.getElementById('fill-example-btn'),

  styleSubtitle: document.getElementById('style-panel-subtitle'),
  studioTabs: document.getElementById('studio-tabs'),
  customizationBody: document.getElementById('customization-body'),
  randomizeStyleBtn: document.getElementById('randomize-style-btn'),
  resetStyleBtn: document.getElementById('reset-style-btn'),
  shuffleIcon: document.getElementById('shuffle-icon'),
  resetIcon: document.getElementById('reset-icon'),

  previewPanel: document.getElementById('preview-panel'),
  scanStatusPill: document.getElementById('scan-status-pill'),
  previewMeta: document.getElementById('preview-meta'),
  qrStage: document.getElementById('qr-stage'),
  qrCanvasWrap: document.getElementById('qr-canvas-wrap'),
  warningList: document.getElementById('warning-list'),

  downloadPngBtn: document.getElementById('download-png-btn'),
  downloadSvgBtn: document.getElementById('download-svg-btn'),
  downloadWebpBtn: document.getElementById('download-webp-btn'),
  downloadJpegBtn: document.getElementById('download-jpeg-btn'),
  copyImgBtn: document.getElementById('copy-img-btn'),
  saveHistoryBtn: document.getElementById('save-history-btn'),
  printQrBtn: document.getElementById('print-qr-btn'),
  dlIcon: document.getElementById('dl-icon'),
  copyIcon: document.getElementById('copy-icon'),
  printIcon: document.getElementById('print-icon'),

  mobileDock: document.getElementById('mobile-dock'),
  mobileDockThumb: document.getElementById('mobile-dock-thumb'),
  mobileDockStatus: document.getElementById('mobile-dock-status'),
  mobileScrollPreviewBtn: document.getElementById('mobile-scroll-preview-btn'),
  mobileDownloadBtn: document.getElementById('mobile-download-btn'),

  logoFileInput: document.getElementById('logo-file-input'),
  configImportInput: document.getElementById('config-import-input'),
  toast: document.getElementById('toast'),
};

function loadStorage(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function loadJsonStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage quota errors
  }
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.add('is-visible');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => {
    dom.toast.classList.remove('is-visible');
  }, 2600);
}

/* ============================================================================
   Local Storage Workspace Persistence & Custom Saved Presets
   ============================================================================ */
function restoreWorkspaceFromStorage() {
  const saved = loadJsonStorage(STORAGE_KEYS.workspace, null);
  if (!saved || typeof saved !== 'object') return false;

  if (saved.activeType && QR_TYPES.some((t) => t.id === saved.activeType)) {
    state.activeType = saved.activeType;
  }
  if (saved.activeCategory && QR_CATEGORIES.some((c) => c.id === saved.activeCategory)) {
    state.activeCategory = saved.activeCategory;
  }
  if (
    saved.activeStudioTab &&
    ['pattern', 'colors', 'logo', 'frame', 'technical'].includes(saved.activeStudioTab)
  ) {
    state.activeStudioTab = saved.activeStudioTab;
  }
  if (saved.formValues && typeof saved.formValues === 'object') {
    QR_TYPES.forEach((t) => {
      if (saved.formValues[t.id] && typeof saved.formValues[t.id] === 'object') {
        state.formValues[t.id] = { ...t.defaults, ...saved.formValues[t.id] };
      }
    });
  }
  if (saved.style && typeof saved.style === 'object') {
    state.style = sanitizeStyle(saved.style);
  }
  return true;
}

function persistWorkspaceNow() {
  const safeStyle = { ...state.style };
  // Guard localStorage quota if user uploaded a huge raw binary image (>180 KB)
  if (safeStyle.logoDataUrl && !safeStyle.logoPresetId && safeStyle.logoDataUrl.length > 180000) {
    safeStyle.logoDataUrl = '';
  }

  const snapshot = {
    v: 1,
    activeType: state.activeType,
    activeCategory: state.activeCategory,
    activeStudioTab: state.activeStudioTab,
    formValues: state.formValues,
    style: safeStyle,
    updatedAt: Date.now(),
  };

  try {
    localStorage.setItem(STORAGE_KEYS.workspace, JSON.stringify(snapshot));
    if (dom.autosaveStatus) {
      const hhmm = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      dom.autosaveStatus.textContent = `Salvo automaticamente às ${hhmm} · 100% local no navegador.`;
    }
  } catch {
    // Retry without custom uploaded logo if quota exceeded
    snapshot.style.logoDataUrl = '';
    try {
      localStorage.setItem(STORAGE_KEYS.workspace, JSON.stringify(snapshot));
    } catch {
      // Ignore if storage is disabled
    }
  }
}

function scheduleWorkspaceSave() {
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(persistWorkspaceNow, 260);
}

function clearSavedWorkspace() {
  try {
    localStorage.removeItem(STORAGE_KEYS.workspace);
  } catch {
    // Ignore
  }
  QR_TYPES.forEach((t) => {
    state.formValues[t.id] = { ...t.defaults };
  });
  state.activeType = 'url';
  state.activeCategory = 'all';
  state.style = { ...DEFAULT_STYLE };
  renderTypeSelector();
  renderContentForm();
  renderCustomization();
  updateQrPreview();
  showToast('Rascunho local restaurado para o padrão.');
}

function persistSavedPresets() {
  saveStorage(STORAGE_KEYS.presets, JSON.stringify(state.savedPresets));
}

function saveCustomPreset(nameInput, styleOverride = null) {
  const cleanName =
    String(nameInput || '').trim().slice(0, 40) ||
    `Preset ${state.savedPresets.length + 1}`;
  const cleanStyle = sanitizeStyle(styleOverride || state.style);
  // Keep saved presets lightweight for localStorage
  if (cleanStyle.logoDataUrl && !cleanStyle.logoPresetId && cleanStyle.logoDataUrl.length > 80000) {
    cleanStyle.logoDataUrl = '';
  }

  const entry = {
    id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: cleanName,
    style: cleanStyle,
    createdAt: Date.now(),
  };

  state.savedPresets = [entry, ...state.savedPresets].slice(0, 24);
  persistSavedPresets();
  renderCustomization();
  return entry;
}

function deleteCustomPreset(presetId) {
  state.savedPresets = state.savedPresets.filter((p) => p.id !== presetId);
  persistSavedPresets();
  renderCustomization();
  showToast('Preset removido.');
}

function applyDecodedPreset(decoded, { saveAlso = false } = {}) {
  state.style = sanitizeStyle(decoded.style);

  if (decoded.type && decoded.values) {
    state.activeType = decoded.type;
    state.formValues[decoded.type] = {
      ...getQrType(decoded.type).defaults,
      ...decoded.values,
    };
  }

  if (saveAlso) {
    saveCustomPreset(decoded.name || 'Preset importado', state.style);
  }

  renderTypeSelector();
  renderContentForm();
  renderCustomization();
  updateQrPreview();
  persistWorkspaceNow();
}

function renderSavedPresetsMarkup() {
  const items = state.savedPresets;
  return `
    <div class="saved-presets-wrap">
      <div class="control-heading">
        <span class="control-label">Meus presets (${items.length})</span>
        <div style="display:flex; gap:10px; align-items:center;">
          <button type="button" class="link-btn" data-action="save-current-preset">+ Salvar atual</button>
          <button type="button" class="link-btn" data-action="open-import-modal">Importar código</button>
        </div>
      </div>
      ${
        items.length
          ? `
        <div class="saved-presets-list">
          ${items
            .map((p) => {
              const c1 = p.style?.fgColor || '#111111';
              const c2 = p.style?.fgType !== 'solid' && p.style?.fgColor2 ? p.style.fgColor2 : p.style?.bgColor || '#FFFFFF';
              return `
                <div class="saved-preset-card">
                  <button type="button" class="saved-preset-apply" data-apply-saved-preset="${p.id}" title="Aplicar preset ${escapeHtml(p.name)}">
                    <span class="preset-dot" style="background: linear-gradient(135deg, ${c1} 50%, ${c2} 50%);"></span>
                    <span>${escapeHtml(p.name)}</span>
                  </button>
                  <button type="button" class="mini-icon-btn" data-share-saved-preset="${p.id}" title="Compartilhar preset (Base64URL)" aria-label="Compartilhar ${escapeHtml(p.name)}">
                    ${UI_ICONS.share}
                  </button>
                  <button type="button" class="mini-icon-btn is-danger" data-delete-saved-preset="${p.id}" title="Remover preset" aria-label="Remover ${escapeHtml(p.name)}">
                    ${UI_ICONS.close}
                  </button>
                </div>
              `;
            })
            .join('')}
        </div>
      `
          : `<p class="panel-hint" style="margin:0;">Salve seu estilo favorito no navegador ou importe um código <code>QR1.</code> compartilhado.</p>`
      }
    </div>
  `;
}

/* ============================================================================
   Preset Share & Import Modal (Base64URL + Direct Hash Link)
   ============================================================================ */
function openPresetModal({ tab = 'share', name = '', sourceStyle = null } = {}) {
  state.presetModal.tab = tab;
  state.presetModal.name = name;
  state.presetModal.sourceStyle = sourceStyle;
  state.presetModal.includeContent = false;
  if (tab === 'import') {
    state.presetModal.importText = '';
  }

  renderPresetModal();
  dom.presetModalBackdrop.classList.add('is-open');
  dom.presetModalBackdrop.setAttribute('aria-hidden', 'false');
}

function closePresetModal() {
  dom.presetModalBackdrop.classList.remove('is-open');
  dom.presetModalBackdrop.setAttribute('aria-hidden', 'true');
  state.presetModal.sourceStyle = null;
}

function renderPresetModal() {
  const tab = state.presetModal.tab;
  dom.presetTabShare.classList.toggle('is-active', tab === 'share');
  dom.presetTabShare.setAttribute('aria-selected', String(tab === 'share'));
  dom.presetTabImport.classList.toggle('is-active', tab === 'import');
  dom.presetTabImport.setAttribute('aria-selected', String(tab === 'import'));

  if (tab === 'share') {
    renderPresetShareTab();
  } else {
    renderPresetImportTab();
  }
}

function computeModalShareData() {
  const styleToEncode = state.presetModal.sourceStyle || state.style;
  const includeContent = !state.presetModal.sourceStyle && state.presetModal.includeContent;
  const encoded = encodePresetCode({
    style: styleToEncode,
    name: state.presetModal.name,
    type: includeContent ? state.activeType : '',
    values: includeContent ? state.formValues[state.activeType] : null,
  });
  const shareUrl = buildShareUrl(encoded.code, window.location.href);
  return { ...encoded, shareUrl };
}

function renderPresetShareTab() {
  const data = computeModalShareData();
  const isFromSaved = Boolean(state.presetModal.sourceStyle);

  dom.presetModalBody.innerHTML = `
    <div class="field">
      <label class="field-label" for="share-preset-name">Nome do preset (opcional)</label>
      <input
        id="share-preset-name"
        class="field-input"
        type="text"
        maxlength="40"
        value="${escapeHtml(state.presetModal.name)}"
        placeholder="Ex: Identidade da Marca, PIX Balcão..."
      />
    </div>

    ${
      !isFromSaved
        ? `
      <label class="check-row">
        <input id="share-include-content" type="checkbox" ${state.presetModal.includeContent ? 'checked' : ''} />
        <span>Incluir também o conteúdo atual (${escapeHtml(getQrType(state.activeType).shortLabel)})</span>
      </label>
    `
        : ''
    }

    ${
      data.omittedCustomLogo
        ? `<p class="panel-hint" style="margin:0;">Nota: imagens de upload personalizado são omitidas do código curto para manter o link compacto. Ícones prontos são incluídos automaticamente.</p>`
        : ''
    }

    <div class="field">
      <label class="field-label" for="share-url-field">Link compartilhável</label>
      <div class="code-copy-row">
        <input id="share-url-field" class="code-field" type="text" readonly value="${escapeHtml(data.shareUrl)}" />
        <button type="button" class="btn btn-primary btn-sm" data-modal-action="copy-share-url">Copiar link</button>
      </div>
    </div>

    <div class="field">
      <label class="field-label" for="share-code-field">
        <span>Código Base64URL</span>
        <span id="share-code-len" class="control-value">${data.code.length} chars</span>
      </label>
      <div class="code-copy-row">
        <input id="share-code-field" class="code-field" type="text" readonly value="${escapeHtml(data.code)}" />
        <button type="button" class="btn btn-secondary btn-sm" data-modal-action="copy-share-code">Copiar código</button>
      </div>
    </div>

    <div class="modal-actions">
      ${
        !isFromSaved
          ? `<button type="button" class="btn btn-secondary btn-sm" data-modal-action="save-from-modal">Salvar em Meus Presets</button>`
          : ''
      }
      <button type="button" class="btn btn-primary btn-sm" data-modal-action="close-modal">Concluir</button>
    </div>
  `;
}

function updateShareTabOutputsInPlace() {
  const data = computeModalShareData();
  const urlField = document.getElementById('share-url-field');
  const codeField = document.getElementById('share-code-field');
  const lenEl = document.getElementById('share-code-len');
  if (urlField) urlField.value = data.shareUrl;
  if (codeField) codeField.value = data.code;
  if (lenEl) lenEl.textContent = `${data.code.length} chars`;
}

function renderImportPreviewMarkup(rawText) {
  const trimmed = String(rawText || '').trim();
  if (!trimmed) return '';

  try {
    const decoded = decodePresetCode(trimmed);
    const thumbSvg = renderQrSvg('https://github.com', {
      ...decoded.style,
      frameStyle: 'none',
      margin: 2,
    }).svg;
    const dotLabel = DOT_STYLES.find((d) => d.id === decoded.style.dotStyle)?.label || decoded.style.dotStyle;
    const extra = decoded.type
      ? `Inclui conteúdo (${getQrType(decoded.type).shortLabel})`
      : 'Somente estilo visual';

    return `
      <div class="import-preview">
        <span class="import-preview-thumb">${thumbSvg}</span>
        <div class="import-preview-meta">
          <strong>${escapeHtml(decoded.name || 'Preset sem nome')}</strong>
          <span>Módulos: ${escapeHtml(dotLabel)} · ECC ${decoded.style.ecc} · ${escapeHtml(extra)}</span>
        </div>
      </div>
    `;
  } catch (err) {
    return `<div class="import-preview is-error">${escapeHtml(err.message)}</div>`;
  }
}

function renderPresetImportTab() {
  const raw = state.presetModal.importText;
  let valid = false;
  if (raw.trim()) {
    try {
      decodePresetCode(raw);
      valid = true;
    } catch {
      valid = false;
    }
  }

  dom.presetModalBody.innerHTML = `
    <div class="field">
      <label class="field-label" for="import-code-input">Cole o código Base64URL (<code>QR1...</code>) ou o link compartilhado</label>
      <textarea
        id="import-code-input"
        class="code-textarea"
        placeholder="QR1.eyJzIjp7... ou https://...#preset=QR1...."
      >${escapeHtml(raw)}</textarea>
    </div>

    <div id="import-preview-slot">${renderImportPreviewMarkup(raw)}</div>

    <div class="modal-actions">
      <button type="button" class="btn btn-secondary btn-sm" id="import-apply-save-btn" data-modal-action="import-apply-save" ${!valid ? 'disabled' : ''}>
        Aplicar e salvar
      </button>
      <button type="button" class="btn btn-primary btn-sm" id="import-apply-btn" data-modal-action="import-apply" ${!valid ? 'disabled' : ''}>
        Aplicar agora
      </button>
    </div>
  `;
}

function tryLoadPresetFromUrl() {
  const token = extractPresetToken(window.location.href);
  if (!token) return false;

  try {
    const decoded = decodePresetCode(token);
    applyDecodedPreset(decoded, { saveAlso: false });
    const label = decoded.name ? ` "${decoded.name}"` : '';
    showToast(`Preset compartilhado${label} carregado!`);
    return true;
  } catch {
    showToast('Link de preset inválido ou incompleto.');
    return false;
  }
}

/* ============================================================================
   Theme & Mode Management
   ============================================================================ */
function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  dom.themeIcon.innerHTML = state.theme === 'dark' ? UI_ICONS.sun : UI_ICONS.moon;
  saveStorage(STORAGE_KEYS.theme, state.theme);
}

function setMode(nextMode) {
  state.mode = nextMode === 'complete' ? 'complete' : 'simple';
  saveStorage(STORAGE_KEYS.mode, state.mode);

  dom.modeSimpleBtn.setAttribute('aria-pressed', String(state.mode === 'simple'));
  dom.modeCompleteBtn.setAttribute('aria-pressed', String(state.mode === 'complete'));

  dom.categoryBar.hidden = state.mode === 'simple';
  dom.studioTabs.hidden = state.mode === 'simple';
  dom.styleSubtitle.textContent =
    state.mode === 'simple'
      ? 'Ajustes rápidos de estilo, cores e logo.'
      : 'Controle total: módulos, cantos, gradientes, logo, moldura e correção de erro.';

  renderTypeSelector();
  renderCustomization();
}

/* ============================================================================
   Type Selector & Dynamic Content Form
   ============================================================================ */
function renderCategoryBar() {
  dom.categoryBar.innerHTML = QR_CATEGORIES.map(
    (cat) => `
      <button
        type="button"
        class="cat-chip ${state.activeCategory === cat.id ? 'is-active' : ''}"
        data-category="${cat.id}"
      >
        ${escapeHtml(cat.label)}
      </button>
    `
  ).join('');
}

function renderTypeSelector() {
  if (state.mode === 'simple') {
    dom.typeSelector.className = 'type-grid is-simple';
    const featured = QR_TYPES.filter((t) => t.featured);
    const extra = QR_TYPES.filter((t) => !t.featured);
    const activeInExtra = extra.some((t) => t.id === state.activeType);

    const pillsHtml = featured
      .map(
        (t) => `
        <button
          type="button"
          role="tab"
          aria-selected="${state.activeType === t.id}"
          class="type-pill ${state.activeType === t.id ? 'is-active' : ''}"
          data-type="${t.id}"
        >
          ${UI_ICONS[t.icon] || UI_ICONS.url}
          <span>${escapeHtml(t.shortLabel)}</span>
        </button>
      `
      )
      .join('');

    const moreSelectHtml = `
      <div class="more-types-wrap">
        <select id="more-types-select" class="type-select-native" aria-label="Mais tipos de QR Code">
          <option value="" ${!activeInExtra ? 'selected' : ''}>+ ${extra.length} tipos</option>
          ${extra
            .map(
              (t) =>
                `<option value="${t.id}" ${state.activeType === t.id ? 'selected' : ''}>${escapeHtml(t.label)}</option>`
            )
            .join('')}
        </select>
      </div>
    `;

    dom.typeSelector.innerHTML = pillsHtml + moreSelectHtml;
    const moreSelect = document.getElementById('more-types-select');
    if (moreSelect) {
      moreSelect.addEventListener('change', (e) => {
        if (e.target.value) selectType(e.target.value);
      });
    }
    return;
  }

  // Complete Mode: Full categorized grid of all 16 types
  renderCategoryBar();
  dom.typeSelector.className = 'type-grid';
  const filtered =
    state.activeCategory === 'all'
      ? QR_TYPES
      : QR_TYPES.filter((t) => t.category === state.activeCategory);

  dom.typeSelector.innerHTML = filtered
    .map(
      (t) => `
      <button
        type="button"
        role="tab"
        aria-selected="${state.activeType === t.id}"
        class="type-pill ${state.activeType === t.id ? 'is-active' : ''}"
        data-type="${t.id}"
      >
        ${UI_ICONS[t.icon] || UI_ICONS.url}
        <span>${escapeHtml(t.shortLabel)}</span>
      </button>
    `
    )
    .join('');
}

function selectType(typeId) {
  const prevType = getQrType(state.activeType);
  state.activeType = typeId;
  const nextType = getQrType(typeId);

  // If frame CTA text was still the previous type's default, smartly update it
  if (
    !state.style.frameText ||
    state.style.frameText === 'ESCANEIE-ME' ||
    state.style.frameText === prevType.defaultCta
  ) {
    state.style.frameText = nextType.defaultCta;
  }

  renderTypeSelector();
  renderContentForm();
  updateQrPreview();
  if (state.mode === 'complete' && state.activeStudioTab === 'frame') {
    renderCustomization();
  }
}

function renderContentForm() {
  const typeDef = getQrType(state.activeType);
  const values = state.formValues[typeDef.id];
  dom.typeDescription.textContent = typeDef.description;

  const html = typeDef.fields
    .map((field) => {
      if (field.showWhen && !field.showWhen(values)) return '';
      const val = values[field.name] ?? '';
      const fieldId = `field-${typeDef.id}-${field.name}`;
      const cls = `field ${field.fullWidth ? 'is-full' : ''}`;

      if (field.type === 'checkbox') {
        return `
          <div class="${cls}">
            <label class="check-row" for="${fieldId}">
              <input
                id="${fieldId}"
                type="checkbox"
                data-field="${field.name}"
                ${val ? 'checked' : ''}
              />
              <span>${escapeHtml(field.label)}</span>
            </label>
          </div>
        `;
      }

      if (field.type === 'geo-action') {
        return `
          <div class="${cls}">
            <button id="geo-locate-btn" type="button" class="btn btn-secondary btn-sm">
              ${UI_ICONS.geo}
              <span>${escapeHtml(field.label)}</span>
            </button>
          </div>
        `;
      }

      if (field.type === 'select') {
        return `
          <div class="${cls}">
            <label class="field-label" for="${fieldId}">${escapeHtml(field.label)}</label>
            <select id="${fieldId}" class="field-select" data-field="${field.name}">
              ${field.options
                .map(
                  (opt) =>
                    `<option value="${escapeHtml(opt.value)}" ${val === opt.value ? 'selected' : ''}>${escapeHtml(opt.label)}</option>`
                )
                .join('')}
            </select>
          </div>
        `;
      }

      if (field.type === 'textarea') {
        return `
          <div class="${cls}">
            <label class="field-label" for="${fieldId}">
              <span>${escapeHtml(field.label)}</span>
            </label>
            <textarea
              id="${fieldId}"
              class="field-textarea"
              rows="${field.rows || 3}"
              data-field="${field.name}"
              placeholder="${escapeHtml(field.placeholder || '')}"
            >${escapeHtml(val)}</textarea>
          </div>
        `;
      }

      if (field.type === 'password-toggle') {
        return `
          <div class="${cls}">
            <label class="field-label" for="${fieldId}">${escapeHtml(field.label)}</label>
            <div class="password-wrap">
              <input
                id="${fieldId}"
                class="field-input"
                type="password"
                data-field="${field.name}"
                value="${escapeHtml(val)}"
                placeholder="${escapeHtml(field.placeholder || '')}"
                autocomplete="off"
              />
              <button type="button" class="password-toggle" data-toggle-pwd="${fieldId}">
                Mostrar
              </button>
            </div>
          </div>
        `;
      }

      return `
        <div class="${cls}">
          <label class="field-label" for="${fieldId}">${escapeHtml(field.label)}</label>
          <input
            id="${fieldId}"
            class="field-input"
            type="${field.type || 'text'}"
            data-field="${field.name}"
            value="${escapeHtml(val)}"
            placeholder="${escapeHtml(field.placeholder || '')}"
            ${field.step ? `step="${field.step}"` : ''}
            ${field.min ? `min="${field.min}"` : ''}
          />
        </div>
      `;
    })
    .join('');

  dom.contentForm.innerHTML = html;

  // Bind geo button if present
  const geoBtn = document.getElementById('geo-locate-btn');
  if (geoBtn) {
    geoBtn.addEventListener('click', () => {
      if (!navigator.geolocation) {
        showToast('Geolocalização não suportada neste navegador.');
        return;
      }
      geoBtn.disabled = true;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          state.formValues.geo.lat = pos.coords.latitude.toFixed(6);
          state.formValues.geo.lng = pos.coords.longitude.toFixed(6);
          renderContentForm();
          updateQrPreview();
          showToast('Localização preenchida.');
        },
        () => {
          geoBtn.disabled = false;
          showToast('Não foi possível obter sua localização.');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  }
}

/* ============================================================================
   Customization UI (Simple Mode vs Complete 5-Tab Studio)
   ============================================================================ */
function renderCustomization() {
  if (state.mode === 'simple') {
    renderSimpleCustomization();
    return;
  }

  // Highlight active studio tab
  dom.studioTabs.querySelectorAll('.studio-tab').forEach((btn) => {
    const active = btn.dataset.tab === state.activeStudioTab;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-selected', String(active));
  });

  if (state.activeStudioTab === 'pattern') renderPatternTab();
  else if (state.activeStudioTab === 'colors') renderColorsTab();
  else if (state.activeStudioTab === 'logo') renderLogoTab();
  else if (state.activeStudioTab === 'frame') renderFrameTab();
  else if (state.activeStudioTab === 'technical') renderTechnicalTab();
}

function renderSimpleCustomization() {
  const s = state.style;
  const currentType = getQrType(state.activeType);
  const hasLogo = Boolean(s.logoDataUrl);

  dom.customizationBody.innerHTML = `
    <div class="control-group">
      <div class="control-heading">
        <span class="control-label">Estilos prontos</span>
      </div>
      <div class="preset-strip">
        ${STYLE_PRESETS.map(
          (p) => `
          <button type="button" class="preset-btn" data-preset="${p.id}">
            <span class="preset-dot" style="background: linear-gradient(135deg, ${p.swatch[0]} 50%, ${p.swatch[1]} 50%);"></span>
            <span>${escapeHtml(p.name)}</span>
          </button>
        `
        ).join('')}
      </div>
      ${renderSavedPresetsMarkup()}
    </div>

    <div class="control-group">
      <div class="color-pair">
        <div class="color-field">
          <label class="control-label" for="simple-fg-color">Cor do código</label>
          <div class="color-input-box">
            <input id="simple-fg-color" type="color" data-style-color="fgColor" value="${escapeHtml(s.fgColor)}" />
            <input type="text" class="color-hex" data-style-hex="fgColor" value="${escapeHtml(s.fgColor)}" maxlength="7" aria-label="Hexadecimal cor do código" />
          </div>
          <div class="swatch-row">
            ${QUICK_FG_SWATCHES.map(
              (c) =>
                `<button type="button" class="swatch ${s.fgColor.toLowerCase() === c.toLowerCase() ? 'is-active' : ''}" style="background:${c}" data-swatch-target="fgColor" data-swatch="${c}" aria-label="Cor ${c}"></button>`
            ).join('')}
          </div>
        </div>

        <div class="color-field">
          <label class="control-label" for="simple-bg-color">Cor de fundo</label>
          <div class="color-input-box">
            <input id="simple-bg-color" type="color" data-style-color="bgColor" value="${escapeHtml(s.bgColor)}" />
            <input type="text" class="color-hex" data-style-hex="bgColor" value="${escapeHtml(s.bgColor)}" maxlength="7" aria-label="Hexadecimal cor de fundo" />
          </div>
          <div class="swatch-row">
            ${QUICK_BG_SWATCHES.map(
              (c) =>
                `<button type="button" class="swatch ${s.bgType === 'solid' && s.bgColor.toLowerCase() === c.toLowerCase() ? 'is-active' : ''}" style="background:${c}" data-swatch-target="bgColor" data-swatch="${c}" aria-label="Fundo ${c}"></button>`
            ).join('')}
          </div>
        </div>
      </div>
    </div>

    <div class="control-group">
      <div class="control-heading">
        <span class="control-label">Logo central (opcional)</span>
        ${
          hasLogo
            ? `<button type="button" class="link-btn" data-action="remove-logo">Remover logo</button>`
            : `<button type="button" class="link-btn" data-action="use-suggested-logo" data-preset-logo="${currentType.suggestedLogo}">Usar ícone de ${escapeHtml(currentType.shortLabel)}</button>`
        }
      </div>
      <div class="dropzone" id="logo-dropzone" role="button" tabindex="0" aria-label="Enviar logo para o centro do QR Code">
        <div class="dropzone-info">
          <div class="dropzone-thumb">
            ${hasLogo ? `<img src="${s.logoDataUrl}" alt="Logo selecionado" />` : UI_ICONS.upload}
          </div>
          <div class="dropzone-text">
            <strong>${hasLogo ? 'Logo aplicado — clique para trocar' : 'Enviar logo ou imagem'}</strong>
            <span>PNG, SVG, JPG ou cole (Ctrl+V)</span>
          </div>
        </div>
        <span class="btn btn-secondary btn-sm">Escolher</span>
      </div>
    </div>

    <div class="mode-upsell">
      <span>Quer gradientes, cantos personalizados, molduras, fundo transparente ou controle técnico?</span>
      <button type="button" class="link-btn" data-action="go-complete">Modo Completo →</button>
    </div>
  `;
  bindDropzone();
}

function renderPatternTab() {
  const s = state.style;
  dom.customizationBody.innerHTML = `
    <div class="control-group">
      <div class="control-heading">
        <span class="control-label">Estilos rápidos</span>
      </div>
      <div class="preset-strip">
        ${STYLE_PRESETS.map(
          (p) => `
          <button type="button" class="preset-btn" data-preset="${p.id}">
            <span class="preset-dot" style="background: linear-gradient(135deg, ${p.swatch[0]} 50%, ${p.swatch[1]} 50%);"></span>
            <span>${escapeHtml(p.name)}</span>
          </button>
        `
        ).join('')}
      </div>
      ${renderSavedPresetsMarkup()}
    </div>

    <div class="control-group">
      <div class="control-heading">
        <span class="control-label">Formato dos módulos (corpo)</span>
      </div>
      <div class="option-grid">
        ${DOT_STYLES.map(
          (opt) => `
          <button type="button" class="option-btn ${s.dotStyle === opt.id ? 'is-active' : ''}" data-set-style="dotStyle" data-value="${opt.id}">
            ${escapeHtml(opt.label)}
          </button>
        `
        ).join('')}
      </div>
    </div>

    <div class="control-group">
      <div class="control-heading">
        <label class="control-label" for="dot-scale-range">Espessura / densidade dos módulos</label>
        <span class="control-value" data-val-for="dotScale">${Math.round(s.dotScale * 100)}%</span>
      </div>
      <input
        id="dot-scale-range"
        class="range-input"
        type="range"
        min="0.65"
        max="1"
        step="0.02"
        value="${s.dotScale}"
        data-range="dotScale"
        data-format="percent"
      />
    </div>

    <div class="control-group">
      <div class="control-heading">
        <span class="control-label">Cantos externos (moldura dos olhos)</span>
      </div>
      <div class="option-grid">
        ${EYE_OUTER_STYLES.map(
          (opt) => `
          <button type="button" class="option-btn ${s.eyeOuterStyle === opt.id ? 'is-active' : ''}" data-set-style="eyeOuterStyle" data-value="${opt.id}">
            ${escapeHtml(opt.label)}
          </button>
        `
        ).join('')}
      </div>
    </div>

    <div class="control-group">
      <div class="control-heading">
        <span class="control-label">Centro dos cantos (ponto interno)</span>
      </div>
      <div class="option-grid">
        ${EYE_INNER_STYLES.map(
          (opt) => `
          <button type="button" class="option-btn ${s.eyeInnerStyle === opt.id ? 'is-active' : ''}" data-set-style="eyeInnerStyle" data-value="${opt.id}">
            ${escapeHtml(opt.label)}
          </button>
        `
        ).join('')}
      </div>
    </div>
  `;
}

function renderColorsTab() {
  const s = state.style;
  dom.customizationBody.innerHTML = `
    <div class="control-group">
      <div class="control-heading">
        <span class="control-label">Preenchimento dos módulos</span>
        <button type="button" class="btn btn-secondary btn-sm" data-action="swap-colors">
          ${UI_ICONS.swap}
          <span>Inverter</span>
        </button>
      </div>
      <div class="seg-row">
        <button type="button" class="seg-btn ${s.fgType === 'solid' ? 'is-active' : ''}" data-set-style="fgType" data-value="solid">Sólido</button>
        <button type="button" class="seg-btn ${s.fgType === 'linear' ? 'is-active' : ''}" data-set-style="fgType" data-value="linear">Gradiente Linear</button>
        <button type="button" class="seg-btn ${s.fgType === 'radial' ? 'is-active' : ''}" data-set-style="fgType" data-value="radial">Radial</button>
      </div>

      <div class="color-pair">
        <div class="color-field">
          <label class="field-label">${s.fgType === 'solid' ? 'Cor principal' : 'Cor inicial'}</label>
          <div class="color-input-box">
            <input type="color" data-style-color="fgColor" value="${escapeHtml(s.fgColor)}" />
            <input type="text" class="color-hex" data-style-hex="fgColor" value="${escapeHtml(s.fgColor)}" maxlength="7" />
          </div>
        </div>
        ${
          s.fgType !== 'solid'
            ? `
          <div class="color-field">
            <label class="field-label">Segunda cor</label>
            <div class="color-input-box">
              <input type="color" data-style-color="fgColor2" value="${escapeHtml(s.fgColor2 || '#2563EB')}" />
              <input type="text" class="color-hex" data-style-hex="fgColor2" value="${escapeHtml(s.fgColor2 || '#2563EB')}" maxlength="7" />
            </div>
          </div>
        `
            : ''
        }
      </div>

      ${
        s.fgType !== 'solid'
          ? `
        <div class="color-pair">
          <div class="color-field">
            <label class="check-row">
              <input type="checkbox" data-action="toggle-fg3" ${s.fgColor3 ? 'checked' : ''} />
              <span>Terceira cor no gradiente</span>
            </label>
          </div>
          ${
            s.fgColor3
              ? `
            <div class="color-field">
              <div class="color-input-box">
                <input type="color" data-style-color="fgColor3" value="${escapeHtml(s.fgColor3)}" />
                <input type="text" class="color-hex" data-style-hex="fgColor3" value="${escapeHtml(s.fgColor3)}" maxlength="7" />
              </div>
            </div>
          `
              : ''
          }
        </div>
      `
          : ''
      }

      ${
        s.fgType === 'linear'
          ? `
        <div class="control-heading">
          <label class="field-label" for="fg-angle-range">Ângulo do gradiente</label>
          <span class="control-value" data-val-for="fgGradientAngle">${s.fgGradientAngle}°</span>
        </div>
        <input id="fg-angle-range" class="range-input" type="range" min="0" max="360" step="5" value="${s.fgGradientAngle}" data-range="fgGradientAngle" data-format="deg" />
      `
          : ''
      }
    </div>

    <div class="control-group">
      <div class="control-heading">
        <span class="control-label">Cores independentes dos cantos (olhos)</span>
      </div>
      <label class="check-row">
        <input type="checkbox" data-toggle-style="customEyeColors" ${s.customEyeColors ? 'checked' : ''} />
        <span>Personalizar cores dos 3 cantos separadamente</span>
      </label>
      ${
        s.customEyeColors
          ? `
        <div class="color-pair">
          <div class="color-field">
            <label class="field-label">Moldura externa do canto</label>
            <div class="color-input-box">
              <input type="color" data-style-color="eyeOuterColor" value="${escapeHtml(s.eyeOuterColor)}" />
              <input type="text" class="color-hex" data-style-hex="eyeOuterColor" value="${escapeHtml(s.eyeOuterColor)}" maxlength="7" />
            </div>
          </div>
          <div class="color-field">
            <label class="field-label">Ponto interno do canto</label>
            <div class="color-input-box">
              <input type="color" data-style-color="eyeInnerColor" value="${escapeHtml(s.eyeInnerColor)}" />
              <input type="text" class="color-hex" data-style-hex="eyeInnerColor" value="${escapeHtml(s.eyeInnerColor)}" maxlength="7" />
            </div>
          </div>
        </div>
      `
          : ''
      }
    </div>

    <div class="control-group">
      <div class="control-heading">
        <span class="control-label">Plano de fundo</span>
      </div>
      <div class="seg-row">
        <button type="button" class="seg-btn ${s.bgType === 'solid' ? 'is-active' : ''}" data-set-style="bgType" data-value="solid">Sólido</button>
        <button type="button" class="seg-btn ${s.bgType === 'gradient' ? 'is-active' : ''}" data-set-style="bgType" data-value="gradient">Gradiente</button>
        <button type="button" class="seg-btn ${s.bgType === 'transparent' ? 'is-active' : ''}" data-set-style="bgType" data-value="transparent">Transparente</button>
      </div>

      ${
        s.bgType !== 'transparent'
          ? `
        <div class="color-pair">
          <div class="color-field">
            <label class="field-label">${s.bgType === 'solid' ? 'Cor de fundo' : 'Fundo cor 1'}</label>
            <div class="color-input-box">
              <input type="color" data-style-color="bgColor" value="${escapeHtml(s.bgColor)}" />
              <input type="text" class="color-hex" data-style-hex="bgColor" value="${escapeHtml(s.bgColor)}" maxlength="7" />
            </div>
          </div>
          ${
            s.bgType === 'gradient'
              ? `
            <div class="color-field">
              <label class="field-label">Fundo cor 2</label>
              <div class="color-input-box">
                <input type="color" data-style-color="bgColor2" value="${escapeHtml(s.bgColor2 || '#F4F4F5')}" />
                <input type="text" class="color-hex" data-style-hex="bgColor2" value="${escapeHtml(s.bgColor2 || '#F4F4F5')}" maxlength="7" />
              </div>
            </div>
          `
              : ''
          }
        </div>
      `
          : `<p class="panel-hint">O fundo será exportado totalmente transparente em PNG, SVG e WebP.</p>`
      }
    </div>
  `;
}

function renderLogoTab() {
  const s = state.style;
  const hasLogo = Boolean(s.logoDataUrl);

  dom.customizationBody.innerHTML = `
    <div class="control-group">
      <div class="control-heading">
        <span class="control-label">Upload de logo personalizado</span>
        ${hasLogo ? `<button type="button" class="link-btn" data-action="remove-logo">Remover logo</button>` : ''}
      </div>
      <div class="dropzone" id="logo-dropzone" role="button" tabindex="0" aria-label="Arraste ou clique para enviar um logo">
        <div class="dropzone-info">
          <div class="dropzone-thumb">
            ${hasLogo ? `<img src="${s.logoDataUrl}" alt="Logo atual" />` : UI_ICONS.upload}
          </div>
          <div class="dropzone-text">
            <strong>${hasLogo ? 'Logo ativo — clique ou arraste para substituir' : 'Arraste sua imagem aqui ou clique'}</strong>
            <span>Suporta PNG, SVG, JPG, WebP ou colar (Ctrl+V)</span>
          </div>
        </div>
        <span class="btn btn-secondary btn-sm">Enviar</span>
      </div>
    </div>

    <div class="control-group">
      <div class="control-heading">
        <span class="control-label">Ícones minimalistas prontos</span>
      </div>
      <div class="logo-presets-grid">
        ${LOGO_PRESETS.map((preset) => {
          const uri = buildPresetLogoDataUri(preset.id);
          return `
            <button
              type="button"
              class="logo-preset-btn ${s.logoPresetId === preset.id ? 'is-active' : ''}"
              data-action="use-suggested-logo"
              data-preset-logo="${preset.id}"
            >
              <img src="${uri}" alt="${escapeHtml(preset.label)}" />
              <span>${escapeHtml(preset.label)}</span>
            </button>
          `;
        }).join('')}
      </div>
    </div>

    ${
      hasLogo
        ? `
      <div class="control-group">
        <div class="control-heading">
          <label class="control-label" for="logo-size-range">Tamanho do logo</label>
          <span class="control-value" data-val-for="logoSize">${Math.round(s.logoSize * 100)}%</span>
        </div>
        <input id="logo-size-range" class="range-input" type="range" min="0.12" max="0.34" step="0.01" value="${s.logoSize}" data-range="logoSize" data-format="percent" />

        <div class="control-heading" style="margin-top:8px;">
          <label class="control-label" for="logo-pad-range">Margem interna do logo</label>
          <span class="control-value" data-val-for="logoPadding">${s.logoPadding}px</span>
        </div>
        <input id="logo-pad-range" class="range-input" type="range" min="0" max="28" step="1" value="${s.logoPadding}" data-range="logoPadding" data-format="px" />

        <div class="control-heading" style="margin-top:8px;">
          <label class="control-label" for="logo-opacity-range">Opacidade do logo</label>
          <span class="control-value" data-val-for="logoOpacity">${Math.round(s.logoOpacity * 100)}%</span>
        </div>
        <input id="logo-opacity-range" class="range-input" type="range" min="0.4" max="1" step="0.05" value="${s.logoOpacity}" data-range="logoOpacity" data-format="percent" />
      </div>

      <div class="control-group">
        <div class="control-heading">
          <span class="control-label">Base / recorte do logo</span>
        </div>
        <div class="seg-row">
          <button type="button" class="seg-btn ${s.logoShape === 'none' ? 'is-active' : ''}" data-set-style="logoShape" data-value="none">Livre</button>
          <button type="button" class="seg-btn ${s.logoShape === 'square' ? 'is-active' : ''}" data-set-style="logoShape" data-value="square">Quadrado</button>
          <button type="button" class="seg-btn ${s.logoShape === 'rounded' ? 'is-active' : ''}" data-set-style="logoShape" data-value="rounded">Arredondado</button>
          <button type="button" class="seg-btn ${s.logoShape === 'circle' ? 'is-active' : ''}" data-set-style="logoShape" data-value="circle">Círculo</button>
        </div>

        <label class="check-row">
          <input type="checkbox" data-toggle-style="logoExcavate" ${s.logoExcavate ? 'checked' : ''} />
          <span>Limpar pontos do QR atrás do logo (recomendado)</span>
        </label>

        ${
          s.logoShape !== 'none'
            ? `
          <label class="check-row">
            <input type="checkbox" data-toggle-style="logoBgAuto" ${s.logoBgAuto ? 'checked' : ''} />
            <span>Usar mesma cor de fundo do QR na base do logo</span>
          </label>
          ${
            !s.logoBgAuto
              ? `
            <div class="color-input-box" style="max-width:220px;">
              <input type="color" data-style-color="logoBgColor" value="${escapeHtml(s.logoBgColor)}" />
              <input type="text" class="color-hex" data-style-hex="logoBgColor" value="${escapeHtml(s.logoBgColor)}" maxlength="7" />
            </div>
          `
              : ''
          }
        `
            : ''
        }
      </div>
    `
        : ''
    }
  `;
  bindDropzone();
}

function renderFrameTab() {
  const s = state.style;
  const activeFrame = s.frameStyle !== 'none';

  dom.customizationBody.innerHTML = `
    <div class="control-group">
      <div class="control-heading">
        <span class="control-label">Estilo da moldura</span>
      </div>
      <div class="option-grid">
        ${FRAME_STYLES.map(
          (f) => `
          <button type="button" class="option-btn ${s.frameStyle === f.id ? 'is-active' : ''}" data-set-style="frameStyle" data-value="${f.id}">
            ${escapeHtml(f.label)}
          </button>
        `
        ).join('')}
      </div>
    </div>

    ${
      activeFrame
        ? `
      <div class="control-group">
        <div class="field">
          <label class="control-label" for="frame-text-input">Texto da etiqueta (CTA)</label>
          <input
            id="frame-text-input"
            class="field-input"
            type="text"
            maxlength="32"
            value="${escapeHtml(s.frameText)}"
            placeholder="ESCANEIE-ME"
            data-style-text="frameText"
          />
        </div>
        <div class="swatch-row">
          ${['ESCANEIE-ME', 'CONECTE-SE', 'PAGUE COM PIX', 'SALVAR CONTATO', 'ACESSE AQUI']
            .map(
              (cta) =>
                `<button type="button" class="btn btn-secondary btn-sm" data-set-style="frameText" data-value="${cta}">${cta}</button>`
            )
            .join('')}
        </div>
      </div>

      <div class="control-group">
        <div class="color-pair">
          <div class="color-field">
            <label class="field-label">Cor da moldura</label>
            <div class="color-input-box">
              <input type="color" data-style-color="frameColor" value="${escapeHtml(s.frameColor)}" />
              <input type="text" class="color-hex" data-style-hex="frameColor" value="${escapeHtml(s.frameColor)}" maxlength="7" />
            </div>
          </div>
          <div class="color-field">
            <label class="field-label">Cor do texto</label>
            <div class="color-input-box">
              <input type="color" data-style-color="frameTextColor" value="${escapeHtml(s.frameTextColor)}" />
              <input type="text" class="color-hex" data-style-hex="frameTextColor" value="${escapeHtml(s.frameTextColor)}" maxlength="7" />
            </div>
          </div>
        </div>

        <div class="control-heading" style="margin-top:8px;">
          <label class="control-label" for="frame-radius-range">Arredondamento da moldura</label>
          <span class="control-value" data-val-for="frameRadius">${s.frameRadius}px</span>
        </div>
        <input id="frame-radius-range" class="range-input" type="range" min="0" max="64" step="2" value="${s.frameRadius}" data-range="frameRadius" data-format="px" />
      </div>
    `
        : `<p class="panel-hint" style="margin-top:12px;">Escolha uma moldura acima para adicionar uma chamada para ação (CTA) ao seu QR Code.</p>`
    }
  `;
}

function renderTechnicalTab() {
  const s = state.style;
  const payload = state.lastRender.payload || '';
  const matrix = state.lastRender.matrix;

  dom.customizationBody.innerHTML = `
    <div class="control-group">
      <div class="control-heading">
        <span class="control-label">Nível de correção de erro (ECC)</span>
      </div>
      <div class="option-grid">
        ${[
          { id: 'L', label: 'L · 7% (Leve)' },
          { id: 'M', label: 'M · 15% (Padrão)' },
          { id: 'Q', label: 'Q · 25% (Alto)' },
          { id: 'H', label: 'H · 30% (Logos)' },
        ]
          .map(
            (e) => `
          <button type="button" class="option-btn ${s.ecc === e.id ? 'is-active' : ''}" data-set-style="ecc" data-value="${e.id}">
            ${e.label}
          </button>
        `
          )
          .join('')}
      </div>
      <p class="panel-hint">Níveis maiores permitem que o código continue funcionando mesmo com logo central ou desgaste físico.</p>
    </div>

    <div class="control-group">
      <div class="control-heading">
        <label class="control-label" for="margin-range">Margem externa (Quiet Zone)</label>
        <span class="control-value" data-val-for="margin">${s.margin} mód.</span>
      </div>
      <input id="margin-range" class="range-input" type="range" min="0" max="10" step="1" value="${s.margin}" data-range="margin" data-format="mod" />

      <div class="control-heading" style="margin-top:10px;">
        <label class="control-label" for="version-range">Versão mínima do QR (densidade)</label>
        <span class="control-value" data-val-for="minVersion">${s.minVersion === 0 ? 'Auto' : `v${s.minVersion}`}</span>
      </div>
      <input id="version-range" class="range-input" type="range" min="0" max="20" step="1" value="${s.minVersion}" data-range="minVersion" data-format="version" />
    </div>

    <div class="control-group">
      <div class="control-heading">
        <span class="control-label">Resolução de exportação (PNG / WebP / JPEG)</span>
      </div>
      <div class="option-grid">
        ${[256, 512, 1024, 2048, 4096]
          .map(
            (px) => `
          <button type="button" class="option-btn ${Number(s.exportSize) === px ? 'is-active' : ''}" data-set-style="exportSize" data-value="${px}" data-numeric="true">
            ${px} px
          </button>
        `
          )
          .join('')}
      </div>
    </div>

    <div class="control-group">
      <div class="control-heading">
        <span class="control-label">Payload codificado (${matrix ? `${matrix.byteLength} bytes · v${matrix.version}` : 'vazio'})</span>
        <button type="button" class="link-btn" data-action="copy-payload">Copiar texto</button>
      </div>
      <pre id="raw-payload-box" class="payload-box">${escapeHtml(payload || 'Preencha os campos de conteúdo para visualizar o código bruto.')}</pre>
    </div>

    <div class="control-group">
      <div class="control-heading">
        <span class="control-label">Presets, Base64URL &amp; Armazenamento Local</span>
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button type="button" class="btn btn-secondary btn-sm" data-action="open-share-modal">Compartilhar Base64URL</button>
        <button type="button" class="btn btn-secondary btn-sm" data-action="open-import-modal">Importar código</button>
        <button type="button" class="btn btn-secondary btn-sm" data-action="export-config">Exportar JSON</button>
        <button type="button" class="btn btn-secondary btn-sm" data-action="import-config">Importar JSON</button>
        <button type="button" class="btn btn-secondary btn-sm" data-action="clear-workspace">Limpar rascunho salvo</button>
      </div>
    </div>
  `;
}

/* ============================================================================
   Core Live Preview Renderer
   ============================================================================ */
function buildCurrentPayload() {
  const typeDef = getQrType(state.activeType);
  return typeDef.build(state.formValues[typeDef.id] || {});
}

function updateQrPreview() {
  scheduleWorkspaceSave();
  const payload = buildCurrentPayload();
  dom.qrStage.classList.toggle('is-transparent', state.style.bgType === 'transparent');

  if (!payload) {
    state.lastRender = { svg: '', matrix: null, width: 1000, height: 1000, payload: '' };
    dom.qrCanvasWrap.innerHTML = `
      <div class="qr-empty">
        <strong>Aguardando conteúdo</strong>
        Preencha os campos ao lado para gerar seu QR Code instantaneamente.
      </div>
    `;
    dom.previewMeta.textContent = '—';
    dom.scanStatusPill.className = 'scan-pill is-warn';
    dom.scanStatusPill.textContent = 'Sem conteúdo';
    dom.warningList.hidden = true;
    dom.mobileDockThumb.innerHTML = '';
    dom.mobileDockStatus.textContent = 'Preencha o conteúdo';
    setExportButtonsDisabled(true);
    updateRawPayloadBox('');
    return;
  }

  try {
    const rendered = renderQrSvg(payload, state.style);
    state.lastRender = { ...rendered, payload };

    dom.qrCanvasWrap.innerHTML = rendered.svg;
    dom.mobileDockThumb.innerHTML = rendered.svg;
    dom.previewMeta.textContent = `v${rendered.matrix.version} · ${state.style.ecc} · ${rendered.matrix.count}×${rendered.matrix.count}`;
    setExportButtonsDisabled(false);

    // Scannability check
    const scan = analyzeScannability(state.style);
    dom.scanStatusPill.className = `scan-pill is-${scan.level}`;
    dom.scanStatusPill.textContent =
      scan.level === 'good'
        ? `Ótima leitura · ${scan.contrast.toFixed(1)}:1`
        : scan.level === 'warn'
          ? 'Atenção à leitura'
          : 'Baixo contraste';

    dom.mobileDockStatus.textContent =
      scan.level === 'good' ? `Pronto · ${state.style.exportSize}px` : dom.scanStatusPill.textContent;

    if (scan.warnings.length) {
      dom.warningList.hidden = false;
      dom.warningList.innerHTML = scan.warnings
        .map(
          (w) => `
          <div class="warning-item ${scan.level === 'bad' && w.code === 'contrast' ? 'is-bad' : ''}">
            <span>${escapeHtml(w.text)}</span>
            ${
              w.action === 'fix-ecc'
                ? `<button type="button" class="warning-fix-btn" data-action="fix-ecc">Usar H</button>`
                : ''
            }
          </div>
        `
        )
        .join('');
    } else {
      dom.warningList.hidden = true;
      dom.warningList.innerHTML = '';
    }

    updateRawPayloadBox(payload);
  } catch (err) {
    state.lastRender = { svg: '', matrix: null, width: 1000, height: 1000, payload };
    dom.qrCanvasWrap.innerHTML = `
      <div class="qr-empty">
        <strong>Limite de capacidade excedido</strong>
        ${escapeHtml(err.message || 'Reduza o texto ou use correção de erro L.')}
      </div>
    `;
    dom.scanStatusPill.className = 'scan-pill is-bad';
    dom.scanStatusPill.textContent = 'Excede capacidade';
    setExportButtonsDisabled(true);
  }
}

function updateRawPayloadBox(payload) {
  const box = document.getElementById('raw-payload-box');
  if (box) {
    box.textContent = payload || 'Preencha os campos de conteúdo para visualizar o código bruto.';
  }
}

function setExportButtonsDisabled(disabled) {
  dom.downloadPngBtn.disabled = disabled;
  dom.downloadSvgBtn.disabled = disabled;
  dom.downloadWebpBtn.disabled = disabled;
  dom.downloadJpegBtn.disabled = disabled;
  dom.copyImgBtn.disabled = disabled;
  dom.saveHistoryBtn.disabled = disabled;
  dom.printQrBtn.disabled = disabled;
  dom.mobileDownloadBtn.disabled = disabled;
}

/* ============================================================================
   Logo Upload / Drag & Drop / Paste
   ============================================================================ */
function handleLogoFile(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('Selecione um arquivo de imagem válido (PNG, SVG, JPG ou WebP).');
    return;
  }
  if (file.size > 4 * 1024 * 1024) {
    showToast('Imagem muito grande. Use um arquivo de até 4 MB.');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    applyLogoDataUrl(String(reader.result || ''), '');
    showToast('Logo adicionado! Correção de erro ajustada para H.');
  };
  reader.readAsDataURL(file);
}

function applyLogoDataUrl(dataUrl, presetId = '') {
  state.style.logoDataUrl = dataUrl;
  state.style.logoPresetId = presetId;
  if (dataUrl && (state.style.ecc === 'L' || state.style.ecc === 'M')) {
    state.style.ecc = 'H';
  }
  renderCustomization();
  updateQrPreview();
}

function bindDropzone() {
  const dz = document.getElementById('logo-dropzone');
  if (!dz) return;

  dz.addEventListener('click', () => dom.logoFileInput.click());
  dz.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      dom.logoFileInput.click();
    }
  });
  dz.addEventListener('dragover', (e) => {
    e.preventDefault();
    dz.classList.add('is-dragover');
  });
  dz.addEventListener('dragleave', () => dz.classList.remove('is-dragover'));
  dz.addEventListener('drop', (e) => {
    e.preventDefault();
    dz.classList.remove('is-dragover');
    const file = e.dataTransfer?.files?.[0];
    if (file) handleLogoFile(file);
  });
}

/* ============================================================================
   Export & Clipboard Actions
   ============================================================================ */
function buildFilename(ext) {
  const typeId = state.activeType;
  const stamp = new Date().toISOString().slice(0, 10);
  return `qr-${typeId}-${stamp}.${ext}`;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadRaster(format, ext) {
  const { svg, width, height, payload } = state.lastRender;
  if (!svg) return;
  try {
    const blob = await exportQrRaster(svg, {
      width,
      height,
      targetWidth: Number(state.style.exportSize) || 1024,
      format,
      backgroundFallback: state.style.bgColor || '#FFFFFF',
    });
    triggerDownload(blob, buildFilename(ext));
    saveCurrentToHistory(payload, true);
    showToast(`Baixado em ${ext.toUpperCase()} (${state.style.exportSize}px)`);
  } catch (err) {
    showToast(err.message || 'Erro ao exportar imagem.');
  }
}

function downloadSvg() {
  const { svg, payload } = state.lastRender;
  if (!svg) return;
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  triggerDownload(blob, buildFilename('svg'));
  saveCurrentToHistory(payload, true);
  showToast('Vetor SVG baixado!');
}

async function copyQrToClipboard() {
  const { svg, width, height } = state.lastRender;
  if (!svg) return;
  try {
    if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
      throw new Error('Navegador sem suporte a cópia de imagem.');
    }
    const blob = await exportQrRaster(svg, {
      width,
      height,
      targetWidth: Math.min(1024, Number(state.style.exportSize) || 1024),
      format: 'image/png',
    });
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    showToast('Imagem PNG copiada para a área de transferência!');
  } catch {
    showToast('Não foi possível copiar imagem — use Baixar PNG.');
  }
}

/* ============================================================================
   Local History
   ============================================================================ */
function saveCurrentToHistory(payloadOverride, silent = false) {
  const payload = payloadOverride || state.lastRender.payload;
  if (!payload) return;

  const typeDef = getQrType(state.activeType);
  // Avoid exact duplicate at top of history
  const top = state.history[0];
  if (top && top.payload === payload && top.type === state.activeType) {
    if (!silent) showToast('Este QR Code já está no topo do histórico.');
    return;
  }

  // Strip huge uploaded binary logo from history if > 60KB to protect localStorage quota
  const safeStyle = { ...state.style };
  if (safeStyle.logoDataUrl && safeStyle.logoDataUrl.length > 65000) {
    safeStyle.logoDataUrl = '';
  }

  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: state.activeType,
    typeLabel: typeDef.shortLabel,
    payload,
    values: { ...state.formValues[state.activeType] },
    style: safeStyle,
    createdAt: new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
  };

  state.history = [entry, ...state.history].slice(0, 20);
  saveStorage(STORAGE_KEYS.history, JSON.stringify(state.history));
  updateHistoryBadge();
  if (!silent) showToast('Salvo no histórico local!');
}

function updateHistoryBadge() {
  const count = state.history.length;
  dom.historyCount.textContent = String(count);
  dom.historyCount.hidden = count === 0;
}

function renderHistoryDrawer() {
  if (!state.history.length) {
    dom.historyList.innerHTML = `
      <div class="qr-empty">
        <strong>Histórico vazio</strong>
        Os QR Codes que você baixar ou salvar aparecerão aqui (armazenados apenas neste navegador).
      </div>
    `;
    return;
  }

  dom.historyList.innerHTML = state.history
    .map((item) => {
      let thumbSvg = '';
      try {
        thumbSvg = renderQrSvg(item.payload, { ...item.style, frameStyle: 'none', margin: 2 }).svg;
      } catch {
        thumbSvg = '';
      }
      return `
        <button type="button" class="history-item" data-history-id="${item.id}">
          <span class="history-thumb">${thumbSvg}</span>
          <span class="history-info">
            <span class="history-type">${escapeHtml(item.typeLabel)}</span>
            <div class="history-payload">${escapeHtml(item.payload)}</div>
            <div class="history-date">${escapeHtml(item.createdAt)}</div>
          </span>
        </button>
      `;
    })
    .join('');
}

function openHistoryDrawer() {
  renderHistoryDrawer();
  dom.historyBackdrop.classList.add('is-open');
  dom.historyBackdrop.setAttribute('aria-hidden', 'false');
}

function closeHistoryDrawer() {
  dom.historyBackdrop.classList.remove('is-open');
  dom.historyBackdrop.setAttribute('aria-hidden', 'true');
}

/* ============================================================================
   Harmonious Randomizer & Reset
   ============================================================================ */
function randomizeStyle() {
  const palettes = [
    { fg: '#111111', fg2: '#3F3F46', bg: '#FFFFFF', eyeIn: '#18181B' },
    { fg: '#0F172A', fg2: '#0284C7', bg: '#FFFFFF', eyeIn: '#0369A1' },
    { fg: '#064E3B', fg2: '#059669', bg: '#FFFFFF', eyeIn: '#047857' },
    { fg: '#1E1B4B', fg2: '#1D4ED8', bg: '#FFFFFF', eyeIn: '#2563EB' },
    { fg: '#451A03', fg2: '#B45309', bg: '#FFFDF7', eyeIn: '#B45309' },
    { fg: '#1F2937', fg2: '#0F766E', bg: '#F8FAFC', eyeIn: '#0D9488' },
  ];
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const pal = pick(palettes);
  const useGrad = state.mode === 'complete' && Math.random() > 0.45;

  Object.assign(state.style, {
    dotStyle: pick(DOT_STYLES).id,
    dotScale: pick([0.88, 0.92, 0.96, 1]),
    eyeOuterStyle: pick(EYE_OUTER_STYLES).id,
    eyeInnerStyle: pick(EYE_INNER_STYLES).id,
    fgType: useGrad ? 'linear' : 'solid',
    fgColor: pal.fg,
    fgColor2: pal.fg2,
    fgColor3: '',
    fgGradientAngle: pick([45, 120, 135, 180]),
    bgType: 'solid',
    bgColor: pal.bg,
    customEyeColors: Math.random() > 0.5,
    eyeOuterColor: pal.fg,
    eyeInnerColor: pal.eyeIn,
  });

  renderCustomization();
  updateQrPreview();
  showToast('Estilo harmonioso aplicado.');
}

function resetStyle() {
  const keepLogo = state.style.logoDataUrl;
  const keepPreset = state.style.logoPresetId;
  state.style = {
    ...DEFAULT_STYLE,
    frameText: getQrType(state.activeType).defaultCta,
    logoDataUrl: keepLogo,
    logoPresetId: keepPreset,
    ecc: keepLogo ? 'H' : DEFAULT_STYLE.ecc,
  };
  renderCustomization();
  updateQrPreview();
  showToast('Estilo restaurado para o padrão.');
}

/* ============================================================================
   Event Delegation & Initialization
   ============================================================================ */
function bindEvents() {
  // Mode buttons
  dom.modeSimpleBtn.addEventListener('click', () => setMode('simple'));
  dom.modeCompleteBtn.addEventListener('click', () => setMode('complete'));

  // Theme
  dom.themeToggleBtn.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
  });

  // Categories
  dom.categoryBar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-category]');
    if (!btn) return;
    state.activeCategory = btn.dataset.category;
    renderTypeSelector();
  });

  // Type selection
  dom.typeSelector.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-type]');
    if (!btn) return;
    selectType(btn.dataset.type);
  });

  // Fill example button
  dom.fillExampleBtn.addEventListener('click', () => {
    const ex = TYPE_EXAMPLES[state.activeType];
    if (!ex) return;
    state.formValues[state.activeType] = { ...state.formValues[state.activeType], ...ex };
    renderContentForm();
    updateQrPreview();
    showToast('Dados de exemplo preenchidos.');
  });

  // Dynamic form input
  dom.contentForm.addEventListener('input', (e) => {
    const fieldName = e.target.dataset?.field;
    if (!fieldName) return;
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    state.formValues[state.activeType][fieldName] = val;
    updateQrPreview();
  });

  dom.contentForm.addEventListener('change', (e) => {
    const fieldName = e.target.dataset?.field;
    if (!fieldName) return;
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    state.formValues[state.activeType][fieldName] = val;
    // Re-render form if conditional visibility fields exist (e.g., Wi-Fi encryption or Meeting provider)
    const typeDef = getQrType(state.activeType);
    if (typeDef.fields.some((f) => f.showWhen)) {
      renderContentForm();
    }
    updateQrPreview();
  });

  dom.contentForm.addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('[data-toggle-pwd]');
    if (!toggleBtn) return;
    const input = document.getElementById(toggleBtn.dataset.togglePwd);
    if (!input) return;
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    toggleBtn.textContent = showing ? 'Mostrar' : 'Ocultar';
  });

  // Studio tabs (Complete mode)
  dom.studioTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-tab]');
    if (!tab) return;
    state.activeStudioTab = tab.dataset.tab;
    renderCustomization();
    scheduleWorkspaceSave();
  });

  // Customization actions & controls
  dom.customizationBody.addEventListener('click', (e) => {
    const presetBtn = e.target.closest('[data-preset]');
    if (presetBtn) {
      const preset = STYLE_PRESETS.find((p) => p.id === presetBtn.dataset.preset);
      if (preset) {
        Object.assign(state.style, preset.patch);
        renderCustomization();
        updateQrPreview();
      }
      return;
    }

    const styleBtn = e.target.closest('[data-set-style]');
    if (styleBtn) {
      const key = styleBtn.dataset.setStyle;
      const val = styleBtn.dataset.numeric ? Number(styleBtn.dataset.value) : styleBtn.dataset.value;
      state.style[key] = val;
      if (key === 'fgType' && val !== 'solid' && !state.style.fgColor2) {
        state.style.fgColor2 = '#2563EB';
      }
      renderCustomization();
      updateQrPreview();
      return;
    }

    const swatchBtn = e.target.closest('[data-swatch]');
    if (swatchBtn) {
      const target = swatchBtn.dataset.swatchTarget;
      state.style[target] = swatchBtn.dataset.swatch;
      if (target === 'bgColor') state.style.bgType = 'solid';
      if (target === 'fgColor') state.style.fgType = 'solid';
      renderCustomization();
      updateQrPreview();
      return;
    }

    const applySavedBtn = e.target.closest('[data-apply-saved-preset]');
    if (applySavedBtn) {
      const preset = state.savedPresets.find((p) => p.id === applySavedBtn.dataset.applySavedPreset);
      if (preset) {
        state.style = sanitizeStyle(preset.style);
        renderCustomization();
        updateQrPreview();
        showToast(`Preset "${preset.name}" aplicado.`);
      }
      return;
    }

    const shareSavedBtn = e.target.closest('[data-share-saved-preset]');
    if (shareSavedBtn) {
      const preset = state.savedPresets.find((p) => p.id === shareSavedBtn.dataset.shareSavedPreset);
      if (preset) {
        openPresetModal({ tab: 'share', name: preset.name, sourceStyle: preset.style });
      }
      return;
    }

    const deleteSavedBtn = e.target.closest('[data-delete-saved-preset]');
    if (deleteSavedBtn) {
      deleteCustomPreset(deleteSavedBtn.dataset.deleteSavedPreset);
      return;
    }

    const actionBtn = e.target.closest('[data-action]');
    if (actionBtn) {
      const action = actionBtn.dataset.action;
      if (action === 'go-complete') {
        setMode('complete');
      } else if (action === 'save-current-preset') {
        openPresetModal({ tab: 'share', name: '' });
        setTimeout(() => document.getElementById('share-preset-name')?.focus(), 50);
      } else if (action === 'open-share-modal') {
        openPresetModal({ tab: 'share', name: '' });
      } else if (action === 'open-import-modal') {
        openPresetModal({ tab: 'import' });
        setTimeout(() => document.getElementById('import-code-input')?.focus(), 50);
      } else if (action === 'clear-workspace') {
        clearSavedWorkspace();
      } else if (action === 'remove-logo') {
        applyLogoDataUrl('', '');
        showToast('Logo removido.');
      } else if (action === 'use-suggested-logo') {
        const presetId = actionBtn.dataset.presetLogo;
        const uri = buildPresetLogoDataUri(presetId);
        if (uri) {
          applyLogoDataUrl(uri, presetId);
          showToast('Ícone aplicado ao centro do QR Code.');
        }
      } else if (action === 'swap-colors') {
        const oldFg = state.style.fgColor;
        state.style.fgColor = state.style.bgColor;
        state.style.bgColor = oldFg;
        state.style.bgType = 'solid';
        renderCustomization();
        updateQrPreview();
      } else if (action === 'copy-payload') {
        if (state.lastRender.payload && navigator.clipboard) {
          navigator.clipboard.writeText(state.lastRender.payload);
          showToast('Payload copiado!');
        }
      } else if (action === 'export-config') {
        const exportObj = {
          version: 1,
          type: state.activeType,
          style: state.style,
        };
        const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
        triggerDownload(blob, 'qr-studio-estilo.json');
        showToast('Configuração JSON exportada!');
      } else if (action === 'import-config') {
        dom.configImportInput.click();
      }
    }
  });

  // Live non-destructive inputs (color pickers, hex inputs, range sliders, frame text)
  dom.customizationBody.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.styleColor) {
      const key = el.dataset.styleColor;
      state.style[key] = el.value;
      if (key === 'bgColor' && state.mode === 'simple') state.style.bgType = 'solid';
      if (key === 'fgColor' && state.mode === 'simple') state.style.fgType = 'solid';
      const hexSibling = el.parentElement?.querySelector(`[data-style-hex="${key}"]`);
      if (hexSibling) hexSibling.value = el.value.toUpperCase();
      updateQrPreview();
      return;
    }

    if (el.dataset.styleHex) {
      const key = el.dataset.styleHex;
      const cleaned = el.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(cleaned)) {
        state.style[key] = cleaned;
        const colorSibling = el.parentElement?.querySelector(`[data-style-color="${key}"]`);
        if (colorSibling) colorSibling.value = cleaned;
        updateQrPreview();
      }
      return;
    }

    if (el.dataset.range) {
      const key = el.dataset.range;
      const num = Number(el.value);
      state.style[key] = num;
      const valSpan = dom.customizationBody.querySelector(`[data-val-for="${key}"]`);
      if (valSpan) {
        const fmt = el.dataset.format;
        if (fmt === 'percent') valSpan.textContent = `${Math.round(num * 100)}%`;
        else if (fmt === 'px') valSpan.textContent = `${num}px`;
        else if (fmt === 'deg') valSpan.textContent = `${num}°`;
        else if (fmt === 'mod') valSpan.textContent = `${num} mód.`;
        else if (fmt === 'version') valSpan.textContent = num === 0 ? 'Auto' : `v${num}`;
      }
      updateQrPreview();
      return;
    }

    if (el.dataset.styleText) {
      state.style[el.dataset.styleText] = el.value;
      updateQrPreview();
    }
  });

  dom.customizationBody.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.toggleStyle) {
      state.style[el.dataset.toggleStyle] = el.checked;
      renderCustomization();
      updateQrPreview();
    } else if (el.dataset.action === 'toggle-fg3') {
      state.style.fgColor3 = el.checked ? '#0EA5E9' : '';
      renderCustomization();
      updateQrPreview();
    }
  });

  // Warning quick-fix buttons
  dom.warningList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="fix-ecc"]');
    if (!btn) return;
    state.style.ecc = 'H';
    if (state.mode === 'complete' && state.activeStudioTab === 'technical') {
      renderCustomization();
    }
    updateQrPreview();
    showToast('Correção de erro alterada para H (30%).');
  });

  // Share/Import Preset Modal triggers & interactions
  dom.sharePresetBtn.addEventListener('click', () => openPresetModal({ tab: 'share' }));
  dom.presetModalCloseBtn.addEventListener('click', closePresetModal);
  dom.presetModalBackdrop.addEventListener('click', (e) => {
    if (e.target === dom.presetModalBackdrop) closePresetModal();
  });
  dom.presetTabShare.addEventListener('click', () => {
    state.presetModal.tab = 'share';
    renderPresetModal();
  });
  dom.presetTabImport.addEventListener('click', () => {
    state.presetModal.tab = 'import';
    renderPresetModal();
    setTimeout(() => document.getElementById('import-code-input')?.focus(), 40);
  });

  dom.presetModalBody.addEventListener('input', (e) => {
    const el = e.target;
    if (el.id === 'share-preset-name') {
      state.presetModal.name = el.value;
      updateShareTabOutputsInPlace();
    } else if (el.id === 'import-code-input') {
      state.presetModal.importText = el.value;
      const previewSlot = document.getElementById('import-preview-slot');
      if (previewSlot) previewSlot.innerHTML = renderImportPreviewMarkup(el.value);
      let valid = false;
      if (el.value.trim()) {
        try {
          decodePresetCode(el.value);
          valid = true;
        } catch {
          valid = false;
        }
      }
      const applyBtn = document.getElementById('import-apply-btn');
      const saveBtn = document.getElementById('import-apply-save-btn');
      if (applyBtn) applyBtn.disabled = !valid;
      if (saveBtn) saveBtn.disabled = !valid;
    }
  });

  dom.presetModalBody.addEventListener('change', (e) => {
    if (e.target.id === 'share-include-content') {
      state.presetModal.includeContent = e.target.checked;
      updateShareTabOutputsInPlace();
    }
  });

  const copyFieldText = async (inputId, successMsg) => {
    const field = document.getElementById(inputId);
    if (!field) return;
    const text = field.value;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        field.select();
        document.execCommand('copy');
      }
      showToast(successMsg);
    } catch {
      field.select();
      document.execCommand('copy');
      showToast(successMsg);
    }
  };

  dom.presetModalBody.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-modal-action]');
    if (!btn) return;
    const action = btn.dataset.modalAction;

    if (action === 'copy-share-url') {
      copyFieldText('share-url-field', 'Link compartilhável copiado!');
    } else if (action === 'copy-share-code') {
      copyFieldText('share-code-field', 'Código Base64URL copiado!');
    } else if (action === 'save-from-modal') {
      const saved = saveCustomPreset(state.presetModal.name, state.style);
      showToast(`Preset "${saved.name}" salvo localmente!`);
      closePresetModal();
    } else if (action === 'close-modal') {
      closePresetModal();
    } else if (action === 'import-apply' || action === 'import-apply-save') {
      try {
        const decoded = decodePresetCode(state.presetModal.importText);
        const saveAlso = action === 'import-apply-save';
        applyDecodedPreset(decoded, { saveAlso });
        closePresetModal();
        showToast(saveAlso ? 'Preset aplicado e salvo em Meus Presets!' : 'Preset aplicado com sucesso!');
      } catch (err) {
        showToast(err.message || 'Código inválido.');
      }
    }
  });

  // Randomize & Reset
  dom.randomizeStyleBtn.addEventListener('click', randomizeStyle);
  dom.resetStyleBtn.addEventListener('click', resetStyle);

  // File inputs
  dom.logoFileInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) handleLogoFile(file);
    e.target.value = '';
  });

  dom.configImportInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        if (parsed.style && typeof parsed.style === 'object') {
          state.style = sanitizeStyle(parsed.style);
          renderCustomization();
          updateQrPreview();
          showToast('Estilo importado com sucesso!');
        } else {
          showToast('Arquivo JSON inválido.');
        }
      } catch {
        showToast('Erro ao ler arquivo JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // Global clipboard image paste for logo
  window.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          handleLogoFile(file);
          break;
        }
      }
    }
  });

  // React to live #preset= hash changes
  window.addEventListener('hashchange', () => {
    tryLoadPresetFromUrl();
  });

  // Export & Utility buttons
  dom.downloadPngBtn.addEventListener('click', () => downloadRaster('image/png', 'png'));
  dom.mobileDownloadBtn.addEventListener('click', () => downloadRaster('image/png', 'png'));
  dom.downloadSvgBtn.addEventListener('click', downloadSvg);
  dom.downloadWebpBtn.addEventListener('click', () => downloadRaster('image/webp', 'webp'));
  dom.downloadJpegBtn.addEventListener('click', () => downloadRaster('image/jpeg', 'jpg'));
  dom.copyImgBtn.addEventListener('click', copyQrToClipboard);
  dom.saveHistoryBtn.addEventListener('click', () => saveCurrentToHistory(null, false));
  dom.printQrBtn.addEventListener('click', () => window.print());

  // Mobile dock scroll back to preview
  dom.mobileScrollPreviewBtn.addEventListener('click', () => {
    dom.previewPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // History drawer
  dom.historyOpenBtn.addEventListener('click', openHistoryDrawer);
  dom.historyCloseBtn.addEventListener('click', closeHistoryDrawer);
  dom.historyDoneBtn.addEventListener('click', closeHistoryDrawer);
  dom.historyBackdrop.addEventListener('click', (e) => {
    if (e.target === dom.historyBackdrop) closeHistoryDrawer();
  });
  dom.clearHistoryBtn.addEventListener('click', () => {
    state.history = [];
    saveStorage(STORAGE_KEYS.history, '[]');
    updateHistoryBadge();
    renderHistoryDrawer();
    showToast('Histórico limpo.');
  });
  dom.historyList.addEventListener('click', (e) => {
    const itemBtn = e.target.closest('[data-history-id]');
    if (!itemBtn) return;
    const entry = state.history.find((h) => h.id === itemBtn.dataset.historyId);
    if (!entry) return;
    state.activeType = entry.type;
    state.formValues[entry.type] = { ...getQrType(entry.type).defaults, ...entry.values };
    state.style = sanitizeStyle(entry.style);
    renderTypeSelector();
    renderContentForm();
    renderCustomization();
    updateQrPreview();
    closeHistoryDrawer();
    showToast('QR Code restaurado do histórico.');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (dom.presetModalBackdrop.classList.contains('is-open')) closePresetModal();
      if (dom.historyBackdrop.classList.contains('is-open')) closeHistoryDrawer();
    }
  });

  // Show mobile floating dock only when preview panel is scrolled out of viewport
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries[0]?.isIntersecting;
        dom.mobileDock.classList.toggle('is-visible', !visible);
      },
      { threshold: 0.2 }
    );
    observer.observe(dom.previewPanel);
  }
}

function hydrateStaticIcons() {
  dom.historyIcon.innerHTML = UI_ICONS.history;
  dom.shareIcon.innerHTML = UI_ICONS.share;
  dom.presetCloseIcon.innerHTML = UI_ICONS.close;
  dom.shuffleIcon.innerHTML = UI_ICONS.shuffle;
  dom.resetIcon.innerHTML = UI_ICONS.reset;
  dom.dlIcon.innerHTML = UI_ICONS.download;
  dom.copyIcon.innerHTML = UI_ICONS.copy;
  dom.printIcon.innerHTML = UI_ICONS.print;
  dom.closeIcon.innerHTML = UI_ICONS.close;
}

function init() {
  // 1. Restore saved workspace from localStorage first
  restoreWorkspaceFromStorage();

  // 2. Apply optional URL query params (?mode=, ?type=, ?theme=)
  const params = new URLSearchParams(window.location.search);
  const urlMode = params.get('mode');
  if (urlMode === 'simple' || urlMode === 'complete') {
    state.mode = urlMode;
  }
  const urlType = params.get('type');
  if (urlType && QR_TYPES.some((t) => t.id === urlType)) {
    state.activeType = urlType;
  }
  const urlTheme = params.get('theme');
  if (urlTheme === 'dark' || urlTheme === 'light') {
    state.theme = urlTheme;
  }

  hydrateStaticIcons();
  applyTheme();
  updateHistoryBadge();
  setMode(state.mode);
  renderContentForm();
  updateQrPreview();
  bindEvents();

  // 3. If URL contains a shared #preset=QR1... or ?preset=QR1..., load and apply it
  tryLoadPresetFromUrl();
}

init();
