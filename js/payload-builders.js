/**
 * Specific QR Code Type definitions, form schemas, and standards-compliant payload encoders.
 * Covers 16 types: URL, Wi-Fi, PIX (EMVCo BR Code), vCard 3.0, MeCard, WhatsApp,
 * Text, Email, Phone, SMS, Event (iCalendar), GPS Location, Social Profiles,
 * Cryptocurrency, App Store, and Online Meetings.
 */

export const QR_CATEGORIES = [
  { id: 'all', label: 'Todos' },
  { id: 'essential', label: 'Essenciais' },
  { id: 'communication', label: 'Comunicação' },
  { id: 'people', label: 'Contatos & Eventos' },
  { id: 'more', label: 'Pagamentos & Apps' },
];

/**
 * Strips accents and normalizes text for EMVCo / PIX ASCII fields.
 */
function toAsciiUpper(str, maxLen) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .trim()
    .toUpperCase()
    .slice(0, maxLen);
}

/**
 * Formats an EMVCo TLV (Tag-Length-Value) field.
 */
function tlv(id, value) {
  const str = String(value);
  const len = str.length.toString().padStart(2, '0');
  return `${id}${len}${str}`;
}

/**
 * Computes CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) per Banco Central PIX spec.
 */
export function computeCrc16Ccitt(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= (payload.charCodeAt(i) & 0xff) << 8;
    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Builds a valid Banco Central do Brasil static PIX BR Code payload.
 */
export function buildPixPayload({ key, name, city, amount, txid, description }) {
  const cleanKey = String(key || '').trim();
  if (!cleanKey) return '';

  const cleanDesc = toAsciiUpper(description, 40);
  const merchantAccountFields = [
    tlv('00', 'br.gov.bcb.pix'),
    tlv('01', cleanKey),
  ];
  if (cleanDesc) {
    merchantAccountFields.push(tlv('02', cleanDesc));
  }

  const merchantName = toAsciiUpper(name || 'RECEBEDOR', 25) || 'RECEBEDOR';
  const merchantCity = toAsciiUpper(city || 'BRASILIA', 15) || 'BRASILIA';
  const cleanTxid =
    String(txid || '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 25) || '***';

  const parts = [
    tlv('00', '01'),
    tlv('26', merchantAccountFields.join('')),
    tlv('52', '0000'),
    tlv('53', '986'),
  ];

  const numericAmount = parseFloat(String(amount || '').replace(',', '.'));
  if (!Number.isNaN(numericAmount) && numericAmount > 0) {
    parts.push(tlv('54', numericAmount.toFixed(2)));
  }

  parts.push(tlv('58', 'BR'));
  parts.push(tlv('59', merchantName));
  parts.push(tlv('60', merchantCity));
  parts.push(tlv('62', tlv('05', cleanTxid)));

  const withoutCrc = `${parts.join('')}6304`;
  return `${withoutCrc}${computeCrc16Ccitt(withoutCrc)}`;
}

/**
 * Escapes special Wi-Fi QR characters (\ ; , : ")
 */
function escapeWifi(value) {
  return String(value || '').replace(/([\\;,:"])/g, '\\$1');
}

/**
 * Escapes vCard 3.0 values
 */
function escapeVcard(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

/**
 * Escapes MeCard values
 */
function escapeMecard(value) {
  return String(value || '').replace(/([\\;:,])/g, '\\$1');
}

/**
 * Formats an HTML datetime-local string (YYYY-MM-DDTHH:MM) into iCalendar format.
 */
function formatIcalDate(dateStr, allDay = false) {
  if (!dateStr) return '';
  if (allDay) {
    return dateStr.slice(0, 10).replace(/-/g, '');
  }
  const normalized = dateStr.length === 16 ? `${dateStr}:00` : dateStr;
  return normalized.replace(/[-:]/g, '');
}

/**
 * Normalizes a URL by adding https:// if missing a scheme.
 */
function normalizeUrl(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/**
 * Strips non-digits for phone/WhatsApp links.
 */
function digitsOnly(str) {
  return String(str || '').replace(/\D/g, '');
}

const SOCIAL_BASE_URLS = {
  instagram: (h) => `https://instagram.com/${h}`,
  linkedin: (h) => `https://linkedin.com/in/${h}`,
  github: (h) => `https://github.com/${h}`,
  x: (h) => `https://x.com/${h}`,
  tiktok: (h) => `https://tiktok.com/@${h}`,
  youtube: (h) => `https://youtube.com/@${h}`,
  telegram: (h) => `https://t.me/${h}`,
  threads: (h) => `https://threads.net/@${h}`,
  behance: (h) => `https://behance.net/${h}`,
  spotify: (h) => `https://open.spotify.com/user/${h}`,
};

export const QR_TYPES = [
  {
    id: 'url',
    label: 'Link / URL',
    shortLabel: 'Link',
    category: 'essential',
    featured: true,
    icon: 'url',
    suggestedLogo: 'link',
    defaultCta: 'ACESSE O LINK',
    description: 'Abre um site, portfólio, cardápio ou página da web.',
    defaults: {
      url: 'https://github.com',
    },
    fields: [
      {
        name: 'url',
        label: 'Endereço do site (URL)',
        type: 'url',
        placeholder: 'https://seusite.com.br',
        required: true,
        fullWidth: true,
      },
    ],
    build(d) {
      return normalizeUrl(d.url);
    },
  },
  {
    id: 'wifi',
    label: 'Rede Wi-Fi',
    shortLabel: 'Wi-Fi',
    category: 'essential',
    featured: true,
    icon: 'wifi',
    suggestedLogo: 'wifi',
    defaultCta: 'CONECTE-SE AO WI-FI',
    description: 'Conecta automaticamente celulares à sua rede Wi-Fi.',
    defaults: {
      ssid: 'MinhaRede_5G',
      password: '',
      encryption: 'WPA',
      hidden: false,
    },
    fields: [
      {
        name: 'ssid',
        label: 'Nome da rede (SSID)',
        type: 'text',
        placeholder: 'Ex: Escritorio_WiFi',
        required: true,
      },
      {
        name: 'encryption',
        label: 'Segurança',
        type: 'select',
        options: [
          { value: 'WPA', label: 'WPA / WPA2 / WPA3' },
          { value: 'WEP', label: 'WEP' },
          { value: 'nopass', label: 'Aberta (sem senha)' },
        ],
      },
      {
        name: 'password',
        label: 'Senha da rede',
        type: 'password-toggle',
        placeholder: 'Digite a senha',
        showWhen: (d) => d.encryption !== 'nopass',
        fullWidth: true,
      },
      {
        name: 'hidden',
        label: 'Rede oculta (SSID não visível)',
        type: 'checkbox',
        fullWidth: true,
      },
    ],
    build(d) {
      const ssid = String(d.ssid || '').trim();
      if (!ssid) return '';
      const enc = d.encryption || 'WPA';
      const pass = enc === 'nopass' ? '' : escapeWifi(d.password || '');
      const hidden = d.hidden ? 'true' : 'false';
      return `WIFI:T:${enc};S:${escapeWifi(ssid)};P:${pass};H:${hidden};;`;
    },
  },
  {
    id: 'pix',
    label: 'PIX (BR Code)',
    shortLabel: 'PIX',
    category: 'essential',
    featured: true,
    icon: 'pix',
    suggestedLogo: 'pix',
    defaultCta: 'PAGUE COM PIX',
    description: 'Gera QR Code estático padrão Banco Central com CRC-16.',
    defaults: {
      key: '',
      name: '',
      city: 'SAO PAULO',
      amount: '',
      txid: '',
      description: '',
    },
    fields: [
      {
        name: 'key',
        label: 'Chave PIX',
        type: 'text',
        placeholder: 'CPF, CNPJ, e-mail, +5511999999999 ou chave aleatória',
        required: true,
        fullWidth: true,
      },
      {
        name: 'name',
        label: 'Nome do recebedor',
        type: 'text',
        placeholder: 'Seu nome ou empresa (máx. 25)',
        required: true,
      },
      {
        name: 'city',
        label: 'Cidade',
        type: 'text',
        placeholder: 'Ex: SAO PAULO',
      },
      {
        name: 'amount',
        label: 'Valor (R$) — opcional',
        type: 'number',
        step: '0.01',
        min: '0',
        placeholder: '0.00',
      },
      {
        name: 'txid',
        label: 'Identificador (TxID) — opcional',
        type: 'text',
        placeholder: 'Ex: PEDIDO123',
      },
      {
        name: 'description',
        label: 'Descrição — opcional',
        type: 'text',
        placeholder: 'Mensagem curta para o pagador',
        fullWidth: true,
      },
    ],
    build(d) {
      return buildPixPayload(d);
    },
  },
  {
    id: 'vcard',
    label: 'Contato (vCard)',
    shortLabel: 'Contato',
    category: 'people',
    featured: true,
    icon: 'vcard',
    suggestedLogo: 'contact',
    defaultCta: 'SALVAR CONTATO',
    description: 'Cartão de visitas digital completo (vCard 3.0) compatível com iOS e Android.',
    defaults: {
      firstName: '',
      lastName: '',
      org: '',
      title: '',
      mobile: '',
      phone: '',
      email: '',
      website: '',
      street: '',
      city: '',
      state: '',
      zip: '',
      country: 'Brasil',
      note: '',
    },
    fields: [
      { name: 'firstName', label: 'Nome', type: 'text', placeholder: 'Ana', required: true },
      { name: 'lastName', label: 'Sobrenome', type: 'text', placeholder: 'Silva' },
      { name: 'org', label: 'Empresa', type: 'text', placeholder: 'Estúdio Criativo' },
      { name: 'title', label: 'Cargo', type: 'text', placeholder: 'Designer' },
      { name: 'mobile', label: 'Celular', type: 'tel', placeholder: '+55 11 99999-9999' },
      { name: 'phone', label: 'Telefone comercial', type: 'tel', placeholder: '+55 11 3333-4444' },
      { name: 'email', label: 'E-mail', type: 'email', placeholder: 'ana@empresa.com' },
      { name: 'website', label: 'Site', type: 'url', placeholder: 'https://empresa.com' },
      { name: 'street', label: 'Endereço (Rua, nº)', type: 'text', placeholder: 'Av. Paulista, 1000', fullWidth: true },
      { name: 'city', label: 'Cidade', type: 'text', placeholder: 'São Paulo' },
      { name: 'state', label: 'Estado', type: 'text', placeholder: 'SP' },
      { name: 'zip', label: 'CEP', type: 'text', placeholder: '01310-100' },
      { name: 'country', label: 'País', type: 'text', placeholder: 'Brasil' },
      { name: 'note', label: 'Observações', type: 'textarea', placeholder: 'Informações extras', fullWidth: true },
    ],
    build(d) {
      const first = (d.firstName || '').trim();
      const last = (d.lastName || '').trim();
      const org = (d.org || '').trim();
      if (!first && !last && !org && !d.mobile && !d.email) return '';

      const fn = [first, last].filter(Boolean).join(' ') || org || 'Contato';
      const lines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `N:${escapeVcard(last)};${escapeVcard(first)};;;`,
        `FN:${escapeVcard(fn)}`,
      ];
      if (org) lines.push(`ORG:${escapeVcard(org)}`);
      if (d.title) lines.push(`TITLE:${escapeVcard(d.title)}`);
      if (d.mobile) lines.push(`TEL;TYPE=CELL,VOICE:${d.mobile.trim()}`);
      if (d.phone) lines.push(`TEL;TYPE=WORK,VOICE:${d.phone.trim()}`);
      if (d.email) lines.push(`EMAIL;TYPE=INTERNET:${d.email.trim()}`);
      if (d.website) lines.push(`URL:${normalizeUrl(d.website)}`);
      if (d.street || d.city || d.state || d.zip || d.country) {
        lines.push(
          `ADR;TYPE=WORK:;;${escapeVcard(d.street)};${escapeVcard(d.city)};${escapeVcard(d.state)};${escapeVcard(d.zip)};${escapeVcard(d.country)}`
        );
      }
      if (d.note) lines.push(`NOTE:${escapeVcard(d.note)}`);
      lines.push('END:VCARD');
      return lines.join('\n');
    },
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    shortLabel: 'WhatsApp',
    category: 'communication',
    featured: true,
    icon: 'whatsapp',
    suggestedLogo: 'whatsapp',
    defaultCta: 'FALE NO WHATSAPP',
    description: 'Inicia uma conversa no WhatsApp com mensagem pré-preenchida.',
    defaults: {
      countryCode: '55',
      phone: '',
      message: '',
    },
    fields: [
      { name: 'countryCode', label: 'DDI (País)', type: 'text', placeholder: '55' },
      { name: 'phone', label: 'DDD + Número', type: 'tel', placeholder: '11 99999-9999', required: true },
      {
        name: 'message',
        label: 'Mensagem inicial — opcional',
        type: 'textarea',
        placeholder: 'Olá! Gostaria de mais informações.',
        fullWidth: true,
      },
    ],
    build(d) {
      const fullNum = digitsOnly(d.countryCode) + digitsOnly(d.phone);
      if (!fullNum) return '';
      const msg = String(d.message || '').trim();
      return msg ? `https://wa.me/${fullNum}?text=${encodeURIComponent(msg)}` : `https://wa.me/${fullNum}`;
    },
  },
  {
    id: 'text',
    label: 'Texto Livre',
    shortLabel: 'Texto',
    category: 'essential',
    featured: true,
    icon: 'text',
    suggestedLogo: 'star',
    defaultCta: 'LEIA A MENSAGEM',
    description: 'Codifica qualquer texto, código, cupom ou instrução.',
    defaults: {
      text: '',
    },
    fields: [
      {
        name: 'text',
        label: 'Conteúdo do texto',
        type: 'textarea',
        rows: 4,
        placeholder: 'Digite qualquer mensagem, código promocional ou informação...',
        required: true,
        fullWidth: true,
      },
    ],
    build(d) {
      return String(d.text || '').trim();
    },
  },
  {
    id: 'email',
    label: 'E-mail',
    shortLabel: 'E-mail',
    category: 'communication',
    featured: false,
    icon: 'email',
    suggestedLogo: 'email',
    defaultCta: 'ENVIE UM E-MAIL',
    description: 'Abre o aplicativo de e-mail com destinatário, assunto e corpo.',
    defaults: {
      to: '',
      subject: '',
      body: '',
      cc: '',
    },
    fields: [
      { name: 'to', label: 'Para (E-mail)', type: 'email', placeholder: 'contato@empresa.com', required: true },
      { name: 'cc', label: 'CC — opcional', type: 'email', placeholder: 'copia@empresa.com' },
      { name: 'subject', label: 'Assunto', type: 'text', placeholder: 'Assunto da mensagem', fullWidth: true },
      { name: 'body', label: 'Mensagem', type: 'textarea', placeholder: 'Escreva o corpo do e-mail...', fullWidth: true },
    ],
    build(d) {
      const to = String(d.to || '').trim();
      if (!to) return '';
      const params = [];
      if (d.cc) params.push(`cc=${encodeURIComponent(d.cc.trim())}`);
      if (d.subject) params.push(`subject=${encodeURIComponent(d.subject.trim())}`);
      if (d.body) params.push(`body=${encodeURIComponent(d.body.trim())}`);
      return params.length ? `mailto:${to}?${params.join('&')}` : `mailto:${to}`;
    },
  },
  {
    id: 'phone',
    label: 'Telefone',
    shortLabel: 'Telefone',
    category: 'communication',
    featured: false,
    icon: 'phone',
    suggestedLogo: 'phone',
    defaultCta: 'LIGUE AGORA',
    description: 'Disca diretamente para o número informado.',
    defaults: {
      phone: '',
    },
    fields: [
      {
        name: 'phone',
        label: 'Número de telefone',
        type: 'tel',
        placeholder: '+55 11 99999-9999',
        required: true,
        fullWidth: true,
      },
    ],
    build(d) {
      const cleaned = String(d.phone || '').replace(/[^\d+]/g, '');
      return cleaned ? `tel:${cleaned}` : '';
    },
  },
  {
    id: 'sms',
    label: 'SMS',
    shortLabel: 'SMS',
    category: 'communication',
    featured: false,
    icon: 'sms',
    suggestedLogo: 'phone',
    defaultCta: 'ENVIE UM SMS',
    description: 'Abre o app de mensagens com número e texto prontos.',
    defaults: {
      phone: '',
      message: '',
    },
    fields: [
      { name: 'phone', label: 'Número de destino', type: 'tel', placeholder: '+55 11 99999-9999', required: true, fullWidth: true },
      { name: 'message', label: 'Mensagem SMS', type: 'textarea', placeholder: 'Texto da mensagem...', fullWidth: true },
    ],
    build(d) {
      const cleaned = String(d.phone || '').replace(/[^\d+]/g, '');
      if (!cleaned) return '';
      return `SMSTO:${cleaned}:${String(d.message || '').trim()}`;
    },
  },
  {
    id: 'social',
    label: 'Redes Sociais',
    shortLabel: 'Social',
    category: 'communication',
    featured: false,
    icon: 'social',
    suggestedLogo: 'instagram',
    defaultCta: 'SIGA-NOS',
    description: 'Cria um link direto para seu perfil em redes sociais.',
    defaults: {
      platform: 'instagram',
      handle: '',
    },
    fields: [
      {
        name: 'platform',
        label: 'Plataforma',
        type: 'select',
        options: [
          { value: 'instagram', label: 'Instagram' },
          { value: 'linkedin', label: 'LinkedIn' },
          { value: 'github', label: 'GitHub' },
          { value: 'x', label: 'X (Twitter)' },
          { value: 'tiktok', label: 'TikTok' },
          { value: 'youtube', label: 'YouTube' },
          { value: 'telegram', label: 'Telegram' },
          { value: 'threads', label: 'Threads' },
          { value: 'behance', label: 'Behance' },
          { value: 'spotify', label: 'Spotify' },
        ],
      },
      {
        name: 'handle',
        label: 'Nome de usuário (sem @)',
        type: 'text',
        placeholder: 'seuusuario',
        required: true,
      },
    ],
    build(d) {
      const handle = String(d.handle || '').trim().replace(/^@+/, '');
      if (!handle) return '';
      const builder = SOCIAL_BASE_URLS[d.platform] || SOCIAL_BASE_URLS.instagram;
      return builder(handle);
    },
  },
  {
    id: 'mecard',
    label: 'Contato Compacto (MeCard)',
    shortLabel: 'MeCard',
    category: 'people',
    featured: false,
    icon: 'mecard',
    suggestedLogo: 'contact',
    defaultCta: 'SALVAR CONTATO',
    description: 'Formato mais leve que vCard — gera QR Code com menos pontos e leitura mais rápida.',
    defaults: {
      name: '',
      phone: '',
      email: '',
      org: '',
      url: '',
      address: '',
      note: '',
    },
    fields: [
      { name: 'name', label: 'Nome completo', type: 'text', placeholder: 'Lucas Oliveira', required: true },
      { name: 'phone', label: 'Telefone', type: 'tel', placeholder: '+55 11 99999-9999' },
      { name: 'email', label: 'E-mail', type: 'email', placeholder: 'lucas@email.com' },
      { name: 'org', label: 'Empresa', type: 'text', placeholder: 'Empresa Ltda' },
      { name: 'url', label: 'Site', type: 'url', placeholder: 'https://seusite.com' },
      { name: 'address', label: 'Endereço', type: 'text', placeholder: 'Cidade, Estado' },
      { name: 'note', label: 'Nota', type: 'text', placeholder: 'Observação curta', fullWidth: true },
    ],
    build(d) {
      const name = String(d.name || '').trim();
      if (!name) return '';
      const parts = [`N:${escapeMecard(name)}`];
      if (d.phone) parts.push(`TEL:${escapeMecard(d.phone.trim())}`);
      if (d.email) parts.push(`EMAIL:${escapeMecard(d.email.trim())}`);
      if (d.org) parts.push(`ORG:${escapeMecard(d.org.trim())}`);
      if (d.url) parts.push(`URL:${escapeMecard(normalizeUrl(d.url))}`);
      if (d.address) parts.push(`ADR:${escapeMecard(d.address.trim())}`);
      if (d.note) parts.push(`NOTE:${escapeMecard(d.note.trim())}`);
      return `MECARD:${parts.join(';')};;`;
    },
  },
  {
    id: 'event',
    label: 'Evento (Calendário)',
    shortLabel: 'Evento',
    category: 'people',
    featured: false,
    icon: 'event',
    suggestedLogo: 'event',
    defaultCta: 'SALVAR NA AGENDA',
    description: 'Adiciona um compromisso direto na agenda do celular (iCalendar).',
    defaults: {
      title: '',
      start: '',
      end: '',
      allDay: false,
      location: '',
      description: '',
    },
    fields: [
      { name: 'title', label: 'Título do evento', type: 'text', placeholder: 'Lançamento do Produto', required: true, fullWidth: true },
      { name: 'start', label: 'Início', type: 'datetime-local', required: true },
      { name: 'end', label: 'Término', type: 'datetime-local' },
      { name: 'allDay', label: 'Evento de dia inteiro', type: 'checkbox', fullWidth: true },
      { name: 'location', label: 'Local', type: 'text', placeholder: 'Auditório Principal ou link', fullWidth: true },
      { name: 'description', label: 'Descrição', type: 'textarea', placeholder: 'Detalhes do evento...', fullWidth: true },
    ],
    build(d) {
      const title = String(d.title || '').trim();
      if (!title) return '';
      const lines = ['BEGIN:VEVENT', `SUMMARY:${escapeVcard(title)}`];
      if (d.start) {
        const dtStart = formatIcalDate(d.start, d.allDay);
        lines.push(d.allDay ? `DTSTART;VALUE=DATE:${dtStart}` : `DTSTART:${dtStart}`);
      }
      if (d.end) {
        const dtEnd = formatIcalDate(d.end, d.allDay);
        lines.push(d.allDay ? `DTEND;VALUE=DATE:${dtEnd}` : `DTEND:${dtEnd}`);
      }
      if (d.location) lines.push(`LOCATION:${escapeVcard(d.location.trim())}`);
      if (d.description) lines.push(`DESCRIPTION:${escapeVcard(d.description.trim())}`);
      lines.push('END:VEVENT');
      return lines.join('\n');
    },
  },
  {
    id: 'geo',
    label: 'Localização (GPS)',
    shortLabel: 'Mapa',
    category: 'people',
    featured: false,
    icon: 'geo',
    suggestedLogo: 'geo',
    defaultCta: 'COMO CHEGAR',
    description: 'Abre coordenadas GPS no aplicativo de mapas do celular.',
    defaults: {
      lat: '-23.561414',
      lng: '-46.655881',
      label: 'Avenida Paulista',
      format: 'maps',
    },
    fields: [
      { name: 'lat', label: 'Latitude', type: 'text', placeholder: '-23.561414', required: true },
      { name: 'lng', label: 'Longitude', type: 'text', placeholder: '-46.655881', required: true },
      { name: 'label', label: 'Nome do local — opcional', type: 'text', placeholder: 'Ex: Nossa Loja' },
      {
        name: 'format',
        label: 'Formato',
        type: 'select',
        options: [
          { value: 'maps', label: 'Google Maps (universal)' },
          { value: 'geo', label: 'URI geo: (nativo)' },
        ],
      },
      { name: '_locateBtn', label: 'Usar minha localização atual', type: 'geo-action', fullWidth: true },
    ],
    build(d) {
      const lat = String(d.lat || '').trim();
      const lng = String(d.lng || '').trim();
      if (!lat || !lng) return '';
      const label = String(d.label || '').trim();
      if (d.format === 'geo') {
        return label ? `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(label)})` : `geo:${lat},${lng}`;
      }
      return label
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`
        : `https://maps.google.com/?q=${lat},${lng}`;
    },
  },
  {
    id: 'meeting',
    label: 'Reunião Online',
    shortLabel: 'Reunião',
    category: 'people',
    featured: false,
    icon: 'meeting',
    suggestedLogo: 'meeting',
    defaultCta: 'ENTRAR NA SALA',
    description: 'Link rápido para reuniões no Zoom, Google Meet ou Teams.',
    defaults: {
      provider: 'zoom',
      meetingId: '',
      password: '',
      customUrl: '',
    },
    fields: [
      {
        name: 'provider',
        label: 'Plataforma',
        type: 'select',
        options: [
          { value: 'zoom', label: 'Zoom (ID + Senha)' },
          { value: 'meet', label: 'Google Meet (Código)' },
          { value: 'custom', label: 'Link completo (Teams / Outro)' },
        ],
        fullWidth: true,
      },
      {
        name: 'meetingId',
        label: 'ID da Reunião ou Código',
        type: 'text',
        placeholder: 'Ex: 123 456 7890 ou abc-defg-hij',
        showWhen: (d) => d.provider !== 'custom',
      },
      {
        name: 'password',
        label: 'Senha (opcional)',
        type: 'text',
        placeholder: 'Senha da sala',
        showWhen: (d) => d.provider === 'zoom',
      },
      {
        name: 'customUrl',
        label: 'Link da reunião',
        type: 'url',
        placeholder: 'https://teams.microsoft.com/...',
        showWhen: (d) => d.provider === 'custom',
        fullWidth: true,
      },
    ],
    build(d) {
      if (d.provider === 'custom') return normalizeUrl(d.customUrl);
      const id = String(d.meetingId || '').trim();
      if (!id) return '';
      if (d.provider === 'meet') {
        const cleanCode = id.replace(/^https?:\/\/meet\.google\.com\//i, '').trim();
        return `https://meet.google.com/${cleanCode}`;
      }
      const cleanZoomId = id.replace(/\s+/g, '');
      const pwd = String(d.password || '').trim();
      return pwd
        ? `https://zoom.us/j/${cleanZoomId}?pwd=${encodeURIComponent(pwd)}`
        : `https://zoom.us/j/${cleanZoomId}`;
    },
  },
  {
    id: 'crypto',
    label: 'Criptomoeda',
    shortLabel: 'Crypto',
    category: 'more',
    featured: false,
    icon: 'crypto',
    suggestedLogo: 'crypto',
    defaultCta: 'ENVIAR CRIPTO',
    description: 'Endereço de carteira Bitcoin, Ethereum, Solana ou Litecoin.',
    defaults: {
      currency: 'bitcoin',
      address: '',
      amount: '',
      label: '',
    },
    fields: [
      {
        name: 'currency',
        label: 'Moeda',
        type: 'select',
        options: [
          { value: 'bitcoin', label: 'Bitcoin (BTC)' },
          { value: 'ethereum', label: 'Ethereum (ETH)' },
          { value: 'solana', label: 'Solana (SOL)' },
          { value: 'litecoin', label: 'Litecoin (LTC)' },
        ],
      },
      { name: 'amount', label: 'Valor — opcional', type: 'text', placeholder: '0.005' },
      { name: 'address', label: 'Endereço da carteira', type: 'text', placeholder: 'bc1q... ou 0x...', required: true, fullWidth: true },
      { name: 'label', label: 'Rótulo / Mensagem — opcional', type: 'text', placeholder: 'Doação ou pagamento', fullWidth: true },
    ],
    build(d) {
      const addr = String(d.address || '').trim();
      if (!addr) return '';
      const scheme = d.currency || 'bitcoin';
      const params = [];
      if (d.amount) params.push(`amount=${encodeURIComponent(d.amount.trim())}`);
      if (d.label) params.push(`label=${encodeURIComponent(d.label.trim())}`);
      return params.length ? `${scheme}:${addr}?${params.join('&')}` : `${scheme}:${addr}`;
    },
  },
  {
    id: 'app',
    label: 'App / Loja',
    shortLabel: 'App',
    category: 'more',
    featured: false,
    icon: 'app',
    suggestedLogo: 'link',
    defaultCta: 'BAIXE O APP',
    description: 'Link direto para download na App Store, Google Play ou loja web.',
    defaults: {
      store: 'play',
      appId: '',
    },
    fields: [
      {
        name: 'store',
        label: 'Loja',
        type: 'select',
        options: [
          { value: 'play', label: 'Google Play (Package ID)' },
          { value: 'apple', label: 'Apple App Store (App ID)' },
          { value: 'url', label: 'Link direto da loja' },
        ],
      },
      {
        name: 'appId',
        label: 'ID do aplicativo ou URL',
        type: 'text',
        placeholder: 'com.exemplo.app ou id123456789',
        required: true,
      },
    ],
    build(d) {
      const val = String(d.appId || '').trim();
      if (!val) return '';
      if (d.store === 'url') return normalizeUrl(val);
      if (d.store === 'apple') {
        const numeric = val.replace(/^id/i, '');
        return `https://apps.apple.com/app/id${numeric}`;
      }
      return `https://play.google.com/store/apps/details?id=${encodeURIComponent(val)}`;
    },
  },
];

export function getQrType(id) {
  return QR_TYPES.find((t) => t.id === id) || QR_TYPES[0];
}
