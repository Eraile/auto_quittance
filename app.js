/* ============================================================
   AutoQuittance — app.js
   All processing is 100% client-side. No data leaves your device.
   ============================================================ */

'use strict';

// ============================================================
// Constants
// ============================================================

const PREFS_KEY = 'autoQuittance_prefs_v1';

const FRENCH_MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];

// ============================================================
// State
// ============================================================

let selectedOffset = 0;  // -1 = prev month, 0 = current, 1 = next
let uploadedFiles  = []; // Array of { file: File, id: string, recipientEmail: string }

// ============================================================
// Preferences (localStorage)
// ============================================================

function getPrefs() {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; }
  catch { return {}; }
}

function savePrefs(prefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

function loadPrefsIntoUI() {
  const p = getPrefs();
  byId('pref-sender-name').value  = p.senderName   || '';
  byId('pref-sender-email').value = p.senderEmail  || '';
  byId('pref-cc-email').value     = p.ccEmail      || '';
  byId('pref-mail-subject').value = p.mailSubject  || 'Factures - {CURRENT_MONTH}';
  byId('pref-mail-body').value    = p.mailBody     ||
    'Bonjour,\n\nVeuillez trouver en pièce jointe les factures du mois de {CURRENT_MONTH_LOWER}.\n\nCordialement,\n{SENDER_NAME}';
}

function collectAndSavePrefs() {
  const prefs = getPrefs();
  prefs.senderName  = byId('pref-sender-name').value.trim();
  prefs.senderEmail = byId('pref-sender-email').value.trim();
  prefs.ccEmail     = byId('pref-cc-email').value.trim();
  prefs.mailSubject = byId('pref-mail-subject').value.trim();
  prefs.mailBody    = byId('pref-mail-body').value;
  savePrefs(prefs);
  return prefs;
}

function saveRecipientPref(filename, email) {
  const prefs = getPrefs();
  if (!prefs.recipients) prefs.recipients = {};
  prefs.recipients[filename] = email;
  savePrefs(prefs);
}

// ============================================================
// Date utilities
// ============================================================

function getSelectedDate() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth() + selectedOffset, 1);
}

function offsetMonth(date, delta) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function lastDay(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function pad2(n) { return String(n).padStart(2, '0'); }

function fmtDDMMYYYY(date) {
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function firstDayStr(date) {
  return `01/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function lastDayStr(date) {
  return `${pad2(lastDay(date))}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function monthNameOf(date) {
  return FRENCH_MONTHS[date.getMonth()];
}

// ============================================================
// Placeholder builder
//   Returns an object: { '{KEY}': 'value', ... }
//   Keys sorted longest-first so replacements don't clobber each other.
// ============================================================

function buildPlaceholders() {
  const prefs = getPrefs();
  const sel   = getSelectedDate();
  const prev  = offsetMonth(sel, -1);
  const next  = offsetMonth(sel, 1);
  const today = new Date();

  return sortedPlaceholders({
    // ---- Selected month ----
    '{CURRENT_MONTH_HEADLINE}': `1er ${monthNameOf(sel)} ${sel.getFullYear()}`,
    '{CURRENT_MONTH_DAYS_RANGE}': `du ${firstDayStr(sel)} au ${lastDayStr(sel)}`,
    '{CURRENT_MONTH_LOWER}':   `${monthNameOf(sel)} ${sel.getFullYear()}`,
    '{CURRENT_MONTH}':         `${monthNameOf(sel).toUpperCase()} ${sel.getFullYear()}`,
    '{MONTH_NAME_UPPER}':      monthNameOf(sel).toUpperCase(),
    '{MONTH_NUMBER}':          pad2(sel.getMonth() + 1),
    '{MONTH_NAME}':            monthNameOf(sel),
    '{DATE_RANGE}':            `du ${firstDayStr(sel)} au ${lastDayStr(sel)}`,
    '{FIRST_DAY}':             firstDayStr(sel),
    '{LAST_DAY}':              lastDayStr(sel),
    '{YEAR}':                  String(sel.getFullYear()),

    // ---- Previous month ----
    '{PREV_MONTH_LOWER}':    `${monthNameOf(prev)} ${prev.getFullYear()}`,
    '{PREV_MONTH_NUMBER}':   pad2(prev.getMonth() + 1),
    '{PREV_MONTH_NAME}':     monthNameOf(prev),
    '{PREV_MONTH}':          `${monthNameOf(prev).toUpperCase()} ${prev.getFullYear()}`,
    '{PREV_FIRST_DAY}':      firstDayStr(prev),
    '{PREV_LAST_DAY}':       lastDayStr(prev),
    '{PREV_YEAR}':           String(prev.getFullYear()),

    // ---- Next month ----
    '{NEXT_MONTH_LOWER}':    `${monthNameOf(next)} ${next.getFullYear()}`,
    '{NEXT_MONTH_NUMBER}':   pad2(next.getMonth() + 1),
    '{NEXT_MONTH_NAME}':     monthNameOf(next),
    '{NEXT_MONTH}':          `${monthNameOf(next).toUpperCase()} ${next.getFullYear()}`,
    '{NEXT_FIRST_DAY}':      firstDayStr(next),
    '{NEXT_LAST_DAY}':       lastDayStr(next),
    '{NEXT_YEAR}':           String(next.getFullYear()),

    // ---- Today ----
    '{TODAY_YEAR}': String(today.getFullYear()),
    '{TODAY}':      fmtDDMMYYYY(today),

    // ---- Sender (from prefs) ----
    '{SENDER_EMAIL}': prefs.senderEmail || '',
    '{SENDER_NAME}':  prefs.senderName  || '',
  });
}

/** Returns a new object with entries sorted by key length desc
 *  (longest first) to avoid partial substitutions like
 *  {CURRENT_MONTH} being hit inside {CURRENT_MONTH_HEADLINE}. */
function sortedPlaceholders(raw) {
  const sorted = {};
  Object.keys(raw)
    .sort((a, b) => b.length - a.length)
    .forEach(k => { sorted[k] = raw[k]; });
  return sorted;
}

/** Replace all placeholder occurrences in a string. */
function replaceAll(text, placeholders) {
  if (!text) return text;
  let result = text;
  for (const [key, val] of Object.entries(placeholders)) {
    if (result.includes(key)) {
      result = result.split(key).join(val);
    }
  }
  return result;
}

/** XML-escape a string for safe injection into raw XML (docx). */
function xmlEscape(str) {
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&apos;');
}

// ============================================================
// Document Processing
// ============================================================

/**
 * Process a .docx file by doing a raw XML string replacement.
 * Works perfectly for templates where placeholders are typed
 * as continuous text without mixed formatting.
 * Returns a Blob with the modified .docx.
 */
async function processDocx(file, placeholders) {
  const buffer = await file.arrayBuffer();
  const zip    = new PizZip(buffer);

  // Build XML-safe version of placeholders
  const xmlPH = {};
  for (const [k, v] of Object.entries(placeholders)) {
    xmlPH[k] = xmlEscape(v);
  }

  // All XML parts that can contain user text in a .docx
  const parts = [
    'word/document.xml',
    'word/header1.xml', 'word/header2.xml', 'word/header3.xml',
    'word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml',
    'word/endnotes.xml', 'word/footnotes.xml',
  ];

  for (const part of parts) {
    if (zip.files[part]) {
      let xml = zip.files[part].asText();
      xml = replaceAll(xml, xmlPH);
      zip.file(part, xml);
    }
  }

  const out = zip.generate({ type: 'arraybuffer', compression: 'DEFLATE' });
  return new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
}

/**
 * Process a .xlsx file using SheetJS.
 * Iterates all string cells and replaces placeholder text.
 * Returns a Blob with the modified .xlsx.
 */
async function processXlsx(file, placeholders) {
  const buffer = await file.arrayBuffer();
  const data   = new Uint8Array(buffer);
  const wb     = XLSX.read(data, { type: 'array', cellStyles: true, cellHTML: false });

  wb.SheetNames.forEach(sheetName => {
    const sheet = wb.Sheets[sheetName];
    Object.keys(sheet).forEach(ref => {
      if (ref.startsWith('!')) return;
      const cell = sheet[ref];
      if (!cell || cell.t !== 's') return; // only text cells

      const newVal = replaceAll(cell.v, placeholders);
      if (newVal !== cell.v) {
        cell.v = newVal;
        cell.w = newVal; // formatted text
        // Update rich text runs if present
        if (cell.r && Array.isArray(cell.r)) {
          cell.r = cell.r.map(run => ({
            ...run,
            t: run.t ? replaceAll(run.t, placeholders) : run.t
          }));
        }
      }
    });
  });

  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

/**
 * Dispatch processing based on file extension.
 * Returns { blob, outName } or throws.
 */
async function processFile(entry, placeholders) {
  const ext      = extOf(entry.file.name);
  const base     = entry.file.name.slice(0, entry.file.name.lastIndexOf('.'));
  const sel      = getSelectedDate();
  const suffix   = `${pad2(sel.getMonth() + 1)}_${sel.getFullYear()}`;
  const outName  = `${base}_${suffix}${ext}`;

  let blob;
  if (ext === '.docx') {
    blob = await processDocx(entry.file, placeholders);
  } else if (ext === '.xlsx') {
    blob = await processXlsx(entry.file, placeholders);
  } else {
    throw new Error('Format non supporté');
  }

  return { blob, outName };
}

// ============================================================
// UI Helpers
// ============================================================

function byId(id) { return document.getElementById(id); }

function extOf(filename) {
  return filename.slice(filename.lastIndexOf('.')).toLowerCase();
}

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ============================================================
// Period Selection
// ============================================================

function updatePeriodButtons() {
  const now  = new Date();
  const defs = [
    { offset: -1, previewId: 'preview-prev',    btnAttr: '-1' },
    { offset:  0, previewId: 'preview-current', btnAttr:  '0' },
    { offset:  1, previewId: 'preview-next',    btnAttr:  '1' },
  ];
  defs.forEach(({ offset, previewId, btnAttr }) => {
    const date    = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const preview = byId(previewId);
    const btn     = document.querySelector(`.period-btn[data-offset="${btnAttr}"]`);
    if (preview) preview.textContent = `${monthNameOf(date)} ${date.getFullYear()}`;
    if (btn) btn.classList.toggle('active', offset === selectedOffset);
  });
  renderPlaceholdersPreview();
}

// ============================================================
// Placeholders Preview
// ============================================================

function renderPlaceholdersPreview() {
  const container = byId('placeholders-grid');
  if (!container) return;

  const ph = buildPlaceholders();
  container.innerHTML = '';

  for (const [key, value] of Object.entries(ph)) {
    if (!value && (key === '{SENDER_NAME}' || key === '{SENDER_EMAIL}')) continue;
    const row = document.createElement('div');
    row.className = 'placeholder-row';
    row.innerHTML =
      `<code>${escapeHtml(key)}</code>` +
      `<span class="arrow">→</span>` +
      `<strong>${escapeHtml(value || '(vide)')}</strong>`;
    container.appendChild(row);
  }
}

// ============================================================
// Dropzone & File Management
// ============================================================

function setupDropzone() {
  const zone  = byId('dropzone');
  const input = byId('file-input');

  // Click on zone triggers input
  zone.addEventListener('click', () => input.click());

  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('dragover');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragover');
    addFiles(Array.from(e.dataTransfer.files));
  });

  input.addEventListener('change', () => {
    addFiles(Array.from(input.files));
    input.value = ''; // allow re-selecting the same file
  });
}

function addFiles(files) {
  const validExts = ['.docx', '.xlsx'];
  const prefs     = getPrefs();

  files.forEach(file => {
    const ext = extOf(file.name);
    if (!validExts.includes(ext)) return;
    if (uploadedFiles.some(f => f.file.name === file.name)) return; // no duplicates

    const savedEmail = (prefs.recipients && prefs.recipients[file.name]) || '';
    uploadedFiles.push({
      file,
      id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      recipientEmail: savedEmail,
    });
  });

  renderFileList();
}

function renderFileList() {
  const section = byId('step-recipients');
  const list    = byId('file-list');

  if (uploadedFiles.length === 0) {
    section.classList.add('hidden');
    updateGenerateButton();
    return;
  }

  section.classList.remove('hidden');
  list.innerHTML = '';

  uploadedFiles.forEach(entry => {
    const icon = entry.file.name.endsWith('.xlsx') ? '📊' : '📝';
    const row  = document.createElement('div');
    row.className = 'file-row';
    row.innerHTML = `
      <span class="file-icon">${icon}</span>
      <div class="file-info">
        <div class="file-name">${escapeHtml(entry.file.name)}</div>
        <div class="file-size">${(entry.file.size / 1024).toFixed(1)} Ko</div>
      </div>
      <input
        type="email"
        class="recipient-input"
        placeholder="Email destinataire (optionnel)"
        value="${escapeHtml(entry.recipientEmail)}"
        data-id="${entry.id}"
        autocomplete="email"
      >
      <button class="file-remove" data-id="${entry.id}" title="Retirer ce fichier">✕</button>
    `;
    list.appendChild(row);
  });

  // Bind recipient email changes
  list.querySelectorAll('.recipient-input').forEach(input => {
    input.addEventListener('input', e => {
      const ent = uploadedFiles.find(f => f.id === e.target.dataset.id);
      if (ent) {
        ent.recipientEmail = e.target.value.trim();
        saveRecipientPref(ent.file.name, ent.recipientEmail);
      }
    });
  });

  // Bind remove buttons
  list.querySelectorAll('.file-remove').forEach(btn => {
    btn.addEventListener('click', e => {
      uploadedFiles = uploadedFiles.filter(f => f.id !== e.target.dataset.id);
      renderFileList();
    });
  });

  updateGenerateButton();
}

function updateGenerateButton() {
  const btn  = byId('generate-btn');
  const hint = byId('generate-hint');
  btn.disabled = uploadedFiles.length === 0;
  hint.textContent = uploadedFiles.length === 0
    ? 'Ajoutez au moins un template (étape 2) pour continuer.'
    : `${uploadedFiles.length} template(s) prêt(s) à être traité(s).`;
}

// ============================================================
// XLSX Styled Preview — raw XML parsing via PizZip
// ============================================================

/** Extract #RRGGBB from an Excel <color> element (handles AARRGGBB format). */
function rgbFromColorEl(el) {
  if (!el) return null;
  const rgb = el && el.getAttribute('rgb');
  if (!rgb) return null;
  if (rgb.length === 8) return '#' + rgb.slice(2); // AARRGGBB → #RRGGBB
  if (rgb.length === 6) return '#' + rgb;
  return null;
}

/** Convert an Excel border <left|right|top|bottom> element to a CSS border string. */
function borderSideCss(el) {
  if (!el) return null;
  const style = el.getAttribute('style');
  if (!style || style === 'none') return null;
  const css = {
    thin: '1px solid', medium: '2px solid', thick: '3px solid',
    hair: '1px solid', dashed: '1px dashed', dotted: '1px dotted',
    double: '3px double', mediumDashed: '2px dashed',
    dashDot: '1px dashed', mediumDashDot: '2px dashed',
    dashDotDot: '1px dashed', slantDashDot: '1px dashed',
  }[style] || '1px solid';
  const color = rgbFromColorEl(el.querySelector('color')) || '#666';
  return `${css} ${color}`;
}

/** Parse xl/styles.xml → { fonts[], fills[], borders[], xfs[] } */
function parseXlsxStylesXml(xmlText) {
  const empty = { fonts: [], fills: [], borders: [], xfs: [] };
  if (!xmlText) return empty;
  try {
    const doc = new DOMParser().parseFromString(xmlText, 'application/xml');

    const fonts = Array.from(doc.querySelectorAll('fonts > font')).map(f => ({
      bold:   !!f.querySelector('b'),
      italic: !!f.querySelector('i'),
      strike: !!f.querySelector('strike'),
      under:  !!f.querySelector('u'),
      size:   parseFloat(f.querySelector('sz')?.getAttribute('val') || '10'),
      color:  rgbFromColorEl(f.querySelector('color')),
    }));

    const fills = Array.from(doc.querySelectorAll('fills > fill')).map(f => {
      const pf = f.querySelector('patternFill');
      if (!pf) return null;
      const pt = pf.getAttribute('patternType');
      if (pt === 'none') return null;
      const fg = rgbFromColorEl(pf.querySelector('fgColor'));
      return fg ? { bg: fg } : null;
    });

    const borders = Array.from(doc.querySelectorAll('borders > border')).map(b => ({
      left:   borderSideCss(b.querySelector('left')),
      right:  borderSideCss(b.querySelector('right')),
      top:    borderSideCss(b.querySelector('top')),
      bottom: borderSideCss(b.querySelector('bottom')),
    }));

    const xfs = Array.from(doc.querySelectorAll('cellXfs > xf')).map(xf => ({
      fontId:   parseInt(xf.getAttribute('fontId')   || '0'),
      fillId:   parseInt(xf.getAttribute('fillId')   || '0'),
      borderId: parseInt(xf.getAttribute('borderId') || '0'),
      alignment: (() => {
        const a = xf.querySelector('alignment');
        return a ? {
          h:    a.getAttribute('horizontal'),
          v:    a.getAttribute('vertical'),
          wrap: a.getAttribute('wrapText') === '1',
        } : null;
      })(),
    }));

    return { fonts, fills, borders, xfs };
  } catch { return empty; }
}

/** Convert a parsed xf (cell format) to a CSS inline string. */
function xfToCss(xf, fonts, fills, borders) {
  if (!xf) return '';
  let css = '';

  const font = fonts[xf.fontId];
  if (font) {
    if (font.bold)   css += 'font-weight:bold;';
    if (font.italic) css += 'font-style:italic;';
    if (font.strike) css += 'text-decoration:line-through;';
    if (font.under)  css += 'text-decoration:underline;';
    if (font.size)   css += `font-size:${Math.round(font.size * 1.15)}px;`;
    if (font.color)  css += `color:${font.color};`;
  }

  const fill = fills[xf.fillId];
  if (fill && fill.bg) css += `background:${fill.bg};`;

  const border = borders[xf.borderId];
  if (border) {
    if (border.top)    css += `border-top:${border.top};`;
    if (border.right)  css += `border-right:${border.right};`;
    if (border.bottom) css += `border-bottom:${border.bottom};`;
    if (border.left)   css += `border-left:${border.left};`;
  }

  if (xf.alignment) {
    const hMap = { center: 'center', right: 'right', left: 'left' };
    const vMap = { center: 'middle', top: 'top', bottom: 'bottom', distributed: 'middle' };
    if (xf.alignment.h && hMap[xf.alignment.h]) css += `text-align:${hMap[xf.alignment.h]};`;
    if (xf.alignment.v && vMap[xf.alignment.v]) css += `vertical-align:${vMap[xf.alignment.v]};`;
    if (xf.alignment.wrap) css += 'white-space:pre-wrap;word-break:break-word;';
  }
  return css;
}

/**
 * Parse the raw worksheet XML to extract a Map of "R,C" (0-based) → style index.
 * This is needed because SheetJS community edition does not expose the raw style index.
 */
function parseCellStyleMap(sheetXml) {
  const map = new Map();
  if (!sheetXml) return map;
  // Match every <c r="REF" ... s="N"> — the s attribute is the style index
  const re = /<c\b[^>]*\br="([A-Z]{1,3}\d+)"[^>]*\bs="(\d+)"/g;
  let m;
  while ((m = re.exec(sheetXml)) !== null) {
    const decoded = XLSX.utils.decode_cell(m[1]);
    map.set(`${decoded.r},${decoded.c}`, parseInt(m[2]));
  }
  return map;
}

/**
 * Get the ordered list of worksheet XML paths from workbook relationships.
 * Returns an array in the same order as wb.SheetNames.
 */
function getSheetXmlPaths(zip) {
  try {
    // Parse rels: rId → relative path
    const relsXml = zip.files['xl/_rels/workbook.xml.rels']?.asText() || '';
    const ridToTarget = {};
    let rm;
    const relRe = /Id="(rId\d+)"[^>]*Target="([^"]+)"/g;
    while ((rm = relRe.exec(relsXml)) !== null) {
      ridToTarget[rm[1]] = rm[2].replace(/^\.?\//, ''); // strip leading ./ or /
    }

    // Parse workbook.xml: get sheet rIds in order
    const wbXml = zip.files['xl/workbook.xml']?.asText() || '';
    const sheetRe = /<sheet\b[^>]+r:id="(rId\d+)"/g;
    const paths = [];
    let sm;
    while ((sm = sheetRe.exec(wbXml)) !== null) {
      const target = ridToTarget[sm[1]];
      if (target) paths.push('xl/' + target);
    }
    return paths;
  } catch {
    return [];
  }
}

/** Build a full styled HTML table for one worksheet. */
function buildXlsxStyledHtml(ws, styleMap, xlStyles) {
  if (!ws['!ref']) return '<p style="color:var(--text-muted);padding:1rem">Feuille vide</p>';

  const range   = XLSX.utils.decode_range(ws['!ref']);
  const merges  = ws['!merges'] || [];
  const colDefs = ws['!cols']   || [];
  const rowDefs = ws['!rows']   || [];

  // Build merge spans lookup
  const mergeSpans = new Map();
  const skipCells  = new Set();
  merges.forEach(m => {
    mergeSpans.set(`${m.s.r},${m.s.c}`, {
      rs: m.e.r - m.s.r + 1,
      cs: m.e.c - m.s.c + 1,
    });
    for (let r = m.s.r; r <= m.e.r; r++) {
      for (let c = m.s.c; c <= m.e.c; c++) {
        if (r !== m.s.r || c !== m.s.c) skipCells.add(`${r},${c}`);
      }
    }
  });

  let html = '<table style="border-collapse:collapse;table-layout:fixed;font-family:Calibri,Arial,sans-serif;font-size:11px;">';

  // Column widths
  html += '<colgroup>';
  for (let c = range.s.c; c <= range.e.c; c++) {
    const col = colDefs[c];
    const w   = col?.wpx ? col.wpx + 'px'
              : col?.wch ? Math.round(col.wch * 7) + 'px'
              : '80px';
    html += `<col style="width:${w}">`;
  }
  html += '</colgroup><tbody>';

  for (let r = range.s.r; r <= range.e.r; r++) {
    const row = rowDefs[r];
    const rowH = row?.hpx ? `height:${row.hpx}px;` : '';
    html += `<tr style="${rowH}">`;

    for (let c = range.s.c; c <= range.e.c; c++) {
      const key = `${r},${c}`;
      if (skipCells.has(key)) continue;

      const merge = mergeSpans.get(key);
      const rs = merge?.rs > 1 ? ` rowspan="${merge.rs}"` : '';
      const cs = merge?.cs > 1 ? ` colspan="${merge.cs}"` : '';

      const cell  = ws[XLSX.utils.encode_cell({ r, c })];
      const value = cell ? (cell.w || (cell.v !== undefined ? String(cell.v) : '')) : '';

      const sIdx  = styleMap.get(key);
      const xf    = sIdx !== undefined ? xlStyles.xfs[sIdx] : undefined;
      const style = 'padding:2px 5px;overflow:hidden;' + (xf ? xfToCss(xf, xlStyles.fonts, xlStyles.fills, xlStyles.borders) : '');

      html += `<td${rs}${cs} style="${style}">${escapeHtml(value)}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  return html;
}

/** Main entry point: renders an xlsx blob to styled HTML using PizZip + raw XML. */
async function renderXlsxPreview(blob) {
  const buffer  = await blob.arrayBuffer();
  const zipData = new Uint8Array(buffer);

  const zip      = new PizZip(zipData);
  const xlStyles = parseXlsxStylesXml(zip.files['xl/styles.xml']?.asText());
  const sheetPaths = getSheetXmlPaths(zip);
  const wb       = XLSX.read(zipData, { type: 'array' });

  let html = '';
  wb.SheetNames.forEach((name, idx) => {
    const ws = wb.Sheets[name];
    if (!ws || !ws['!ref']) return;

    if (wb.SheetNames.length > 1) {
      html += `<div class="xlsx-sheet-title">${escapeHtml(name)}</div>`;
    }

    const sheetXmlPath = sheetPaths[idx] || `xl/worksheets/sheet${idx + 1}.xml`;
    const sheetXml     = zip.files[sheetXmlPath]?.asText() || '';
    const styleMap     = parseCellStyleMap(sheetXml);

    html += '<div class="xlsx-scroll">';
    html += buildXlsxStyledHtml(ws, styleMap, xlStyles);
    html += '</div>';
  });

  return html || '<p style="color:var(--text-muted);padding:1rem">Fichier vide ou non reconnu.</p>';
}

// ============================================================
// Preview Modal
// ============================================================

let _previewBlob = null;
let _previewName = '';

async function openPreview(blob, filename) {
  _previewBlob = blob;
  _previewName = filename;

  const modal  = byId('preview-modal');
  const title  = byId('preview-modal-title');
  const body   = byId('preview-body');
  const dlBtn  = byId('modal-dl-btn');

  title.textContent = filename;
  body.innerHTML    = '<div class="modal-loading">⏳ Chargement du document…</div>';
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  dlBtn.onclick = () => saveAs(_previewBlob, _previewName);

  const ext = extOf(filename);

  if (ext === '.docx') {
    try {
      const container = document.createElement('div');
      body.innerHTML  = '';
      body.appendChild(container);
      await window.docx.renderAsync(blob, container, null, {
        inWrapper:      true,
        ignoreWidth:    false,
        ignoreHeight:   false,
        breakPages:     true,
        useBase64URL:   true,
        renderHeaders:  true,
        renderFooters:  true,
        renderFootnotes: true,
      });
    } catch (e) {
      body.innerHTML = `<div class="modal-error">❌ Erreur d'aperçu : ${escapeHtml(e.message)}<br><small>Le fichier reste téléchargeable.</small></div>`;
    }

  } else if (ext === '.xlsx') {
    try {
      const html = await renderXlsxPreview(blob);
      body.innerHTML = html;
    } catch (e) {
      body.innerHTML = `<div class="modal-error">❌ Erreur d'aperçu : ${escapeHtml(e.message)}</div>`;
    }
  }
}

function closePreview() {
  byId('preview-modal').classList.add('hidden');
  byId('preview-body').innerHTML = '';
  document.body.style.overflow   = '';
  _previewBlob = null;
}

// ============================================================
// Generate
// ============================================================

async function handleGenerate() {
  const prefs        = collectAndSavePrefs();
  const placeholders = buildPlaceholders();

  const resultsSection = byId('step-results');
  const resultsContent = byId('results-content');
  resultsSection.classList.remove('hidden');
  resultsContent.innerHTML = '<p style="color:var(--text-muted);font-size:.9rem">⏳ Génération en cours…</p>';
  resultsSection.scrollIntoView({ behavior: 'smooth' });

  // --- Process all files ---
  const generated = []; // { blob, outName, recipientEmail, error }

  for (const entry of uploadedFiles) {
    try {
      const { blob, outName } = await processFile(entry, placeholders);
      generated.push({ blob, outName, recipientEmail: entry.recipientEmail, error: null });
    } catch (err) {
      console.error('Error processing', entry.file.name, err);
      generated.push({ blob: null, outName: entry.file.name, recipientEmail: entry.recipientEmail, error: err.message });
    }
  }

  // --- Build mail subject & body (with placeholders resolved) ---
  const subject = replaceAll(prefs.mailSubject || 'Factures - {CURRENT_MONTH}', placeholders);
  const body    = replaceAll(prefs.mailBody    || '', placeholders);
  const cc      = prefs.ccEmail || '';

  // --- Group by recipient ---
  const byRecipient = new Map(); // email|'__none__' → [generatedEntry]
  generated.forEach(g => {
    const key = g.recipientEmail || '__none__';
    if (!byRecipient.has(key)) byRecipient.set(key, []);
    byRecipient.get(key).push(g);
  });

  // --- Render results ---
  resultsContent.innerHTML = '';

  // Downloads section
  const dlSection  = document.createElement('div');
  dlSection.className = 'results-section';
  dlSection.innerHTML = '<h3>📥 Télécharger les documents générés</h3>';
  const dlGrid = document.createElement('div');
  dlGrid.className = 'download-grid';

  generated.forEach(g => {
    const item = document.createElement('div');
    if (g.error) {
      item.className = 'error-item';
      item.textContent = `❌ ${g.outName} — Erreur : ${g.error}`;
    } else {
      item.className = 'download-item';

      const label = document.createElement('span');
      label.className   = 'download-filename';
      label.textContent = g.outName;

      const previewBtn = document.createElement('button');
      previewBtn.className   = 'preview-btn';
      previewBtn.textContent = '👁 Aperçu';
      previewBtn.addEventListener('click', () => openPreview(g.blob, g.outName));

      const dlBtn = document.createElement('button');
      dlBtn.className   = 'download-btn';
      dlBtn.textContent = '⬇ Télécharger';
      dlBtn.addEventListener('click', () => saveAs(g.blob, g.outName));

      item.appendChild(label);
      item.appendChild(previewBtn);
      item.appendChild(dlBtn);
    }
    dlGrid.appendChild(item);
  });

  dlSection.appendChild(dlGrid);
  resultsContent.appendChild(dlSection);

  // Mail section
  const mailSection = document.createElement('div');
  mailSection.className = 'results-section';
  mailSection.innerHTML = '<h3>📧 Préparer les envois</h3>';

  byRecipient.forEach((entries, recipient) => {
    const successful  = entries.filter(e => !e.error);
    const fileNames   = successful.map(e => e.outName).join(', ');

    const card = document.createElement('div');
    card.className = 'mail-card';

    if (recipient === '__none__') {
      card.innerHTML = `
        <div class="mail-no-recipient">
          ⚠️ Ces fichiers n'ont pas de destinataire assigné : ${escapeHtml(fileNames)}<br>
          <small>Retournez à l'étape 3 pour ajouter une adresse email.</small>
        </div>`;
    } else {
      const mailto = buildMailtoLink(recipient, subject, body, cc);

      card.innerHTML = `
        <div class="mail-card-header">
          <div class="mail-recipient-label">
            <strong>À :</strong> ${escapeHtml(recipient)}
          </div>
          <span class="mail-files-tag">${escapeHtml(fileNames)}</span>
        </div>
        <div class="mail-card-body">
          <p class="mail-subject-preview"><strong>Objet :</strong> ${escapeHtml(subject)}</p>
          <div class="mail-actions">
            <a href="${mailto}" class="mailto-btn" target="_blank">📧 Ouvrir dans le client mail</a>
            <button class="copy-btn" data-body="${escapeHtmlAttr(body)}">📋 Copier le corps</button>
          </div>
          <p class="mail-attach-note">
            💡 N'oubliez pas d'attacher manuellement les fichiers téléchargés ci-dessus.
          </p>
        </div>`;
    }

    mailSection.appendChild(card);
  });

  resultsContent.appendChild(mailSection);

  // Bind copy-body buttons
  resultsContent.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.dataset.body
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = '✅ Copié !';
        setTimeout(() => { btn.textContent = '📋 Copier le corps'; }, 2500);
      }).catch(() => {
        // Fallback for browsers without clipboard API
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        btn.textContent = '✅ Copié !';
        setTimeout(() => { btn.textContent = '📋 Copier le corps'; }, 2500);
      });
    });
  });

  resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function buildMailtoLink(to, subject, body, cc) {
  let link = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  if (cc) link += `&cc=${encodeURIComponent(cc)}`;
  return link;
}

function escapeHtmlAttr(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================
// Init
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  // Period buttons
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedOffset = parseInt(btn.dataset.offset, 10);
      updatePeriodButtons();
    });
  });

  // Dropzone
  setupDropzone();

  // Load persisted preferences
  loadPrefsIntoUI();

  // Auto-save prefs & refresh placeholders preview on change
  ['pref-sender-name', 'pref-sender-email', 'pref-cc-email',
   'pref-mail-subject', 'pref-mail-body'].forEach(id => {
    byId(id).addEventListener('input', () => {
      collectAndSavePrefs();
      renderPlaceholdersPreview(); // refresh SENDER_* values in preview
    });
  });

  // Generate button
  byId('generate-btn').addEventListener('click', handleGenerate);

  // Preview modal
  byId('modal-close').addEventListener('click', closePreview);
  byId('preview-modal').addEventListener('click', e => {
    if (e.target === byId('preview-modal')) closePreview();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closePreview();
  });

  // Initial render
  updatePeriodButtons();
  updateGenerateButton();
});
