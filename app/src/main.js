// Neon Coast editor v2: pick photos, choose a layout, grade and post size,
// name the cast, crop and position each panel, edit the caption, export the
// cover as a PNG — one size, or all three at once. Photos are read on this
// machine only (FileReader / object URLs) and never uploaded. A `?shot=`
// query sets up a fixed scene for a screenshot instead (see ./shots.js):
// ?shot=editor shows the editor with a sample photo loaded, ?shot=cover
// shows the exported cover alone, full frame.
import { drawCover, layoutPanels, defaultPanels, topBiasPanels, LAYOUTS, GRADES, SIZES } from './cover.js';
import { runShot } from './shots.js';

const preview = document.getElementById('preview');
const status = document.getElementById('status');
const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');
const zoomInput = document.getElementById('zoom');
const photoInput = document.getElementById('photos');
const onePhotoToggle = document.getElementById('onePhoto');
const panelLabel = document.getElementById('panelLabel');
const inkToggle = document.getElementById('ink');

const DEFAULT_CAST = [
  { name: 'MARLOWE', role: 'THE DRIVER' },
  { name: 'VEGA', role: 'THE LOOKOUT' },
  { name: 'CASS', role: 'THE FIXER' },
];

const state = {
  photos: [],
  layout: 'hero',
  grade: 'sunset',
  title: 'Neon Shore',
  subtitle: 'one last ride down the coast',
  size: 'square',
  panels: defaultPanels('hero', 0),
  selectedPanel: 0,
  cast: DEFAULT_CAST.map((c) => ({ ...c })),
  ink: false,
};

function sizeOf() {
  return SIZES[state.size];
}

function redraw() {
  const { w, h } = sizeOf();
  // Preview canvas keeps the export aspect ratio, capped for the screen —
  // except in a cover shot, where it renders at full export resolution so
  // the screenshot shows the exact pixels the Export button downloads.
  const scale = document.body.classList.contains('shot-cover')
    ? 1
    : Math.min(760 / w, 620 / h, 1);
  preview.width = Math.round(w * scale);
  preview.height = Math.round(h * scale);
  drawCover(preview, state);
  highlightSelectedPanel();
}

/** Outlines the selected panel on the preview so the crop target is visible. */
function highlightSelectedPanel() {
  if (document.body.classList.contains('shot-cover')) return;
  const ctx = preview.getContext('2d');
  const panels = layoutPanels(state.layout, preview.width, preview.height);
  const rect = panels[state.selectedPanel];
  if (!rect) return;
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 8]);
  ctx.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
  ctx.setLineDash([]);
  ctx.restore();
  const panel = state.panels[state.selectedPanel];
  panelLabel.textContent = `Panel ${state.selectedPanel + 1} of ${panels.length} — photo ${panel ? panel.photo + 1 : 1} of ${Math.max(1, state.photos.length)}`;
}

function setLayout(layout) {
  state.layout = layout;
  state.panels = defaultPanels(layout, state.photos.length);
  topBiasPanels(state);
  if (state.selectedPanel >= state.panels.length) state.selectedPanel = 0;
  syncPanelControls();
  redraw();
}

function setGrade(grade) {
  state.grade = grade;
  syncPanelControls();
  redraw();
}

function setSize(size) {
  state.size = size;
  syncPanelControls();
  redraw();
}

function syncPanelControls() {
  const panel = state.panels[state.selectedPanel];
  if (panel) zoomInput.value = String(panel.zoom);
  document.querySelectorAll('[data-layout]').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
  });
  document.querySelectorAll('[data-grade]').forEach((b) => {
    b.classList.toggle('active', b.dataset.grade === state.grade);
  });
  document.querySelectorAll('[data-size]').forEach((b) => {
    b.classList.toggle('active', b.dataset.size === state.size);
  });
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Adds files from the picker as photos, keeping the first three. */
async function addFiles(files) {
  for (const file of files) {
    if (state.photos.length >= 3) break;
    if (!file.type.startsWith('image/')) continue;
    state.photos.push(await loadImage(URL.createObjectURL(file)));
  }
  afterPhotosChanged(`Loaded ${state.photos.length} photo${state.photos.length === 1 ? '' : 's'}.`);
}

/** Loads the bundled sample photos (made for make.fun, free to use). */
async function loadSamples() {
  state.photos = [
    await loadImage('samples/boulevard.jpg'),
    await loadImage('samples/pier.jpg'),
  ];
  afterPhotosChanged('Sample photos loaded — or pick your own below.');
}

function afterPhotosChanged(message) {
  if (onePhotoToggle.checked) {
    state.panels = state.panels.map((p) => ({ ...p, photo: 0 }));
  } else {
    state.panels = defaultPanels(state.layout, state.photos.length);
  }
  topBiasPanels(state);
  status.textContent = message;
  syncPanelControls();
  redraw();
}

photoInput.addEventListener('change', async (e) => {
  await addFiles([...e.target.files]);
});
document.getElementById('useSamples').addEventListener('click', loadSamples);
document.getElementById('clearPhotos').addEventListener('click', () => {
  state.photos = [];
  state.panels = defaultPanels(state.layout, 0);
  status.textContent = 'Photos cleared.';
  redraw();
});
titleInput.addEventListener('input', () => {
  state.title = titleInput.value;
  redraw();
});
subtitleInput.addEventListener('input', () => {
  state.subtitle = subtitleInput.value;
  redraw();
});
zoomInput.addEventListener('input', () => {
  const panel = state.panels[state.selectedPanel];
  if (panel) panel.zoom = Number(zoomInput.value);
  redraw();
});
onePhotoToggle.addEventListener('change', () => afterPhotosChanged(
  onePhotoToggle.checked ? 'One photo fills every panel.' : 'Each panel uses its own photo.',
));
inkToggle.addEventListener('change', () => {
  state.ink = inkToggle.checked;
  status.textContent = state.ink ? 'Poster Ink on — flat print colours.' : 'Poster Ink off.';
  redraw();
});

/** Cast editor: three name + role pairs, each shown as a tag on its panel. */
function syncCastInputs() {
  for (let i = 0; i < 3; i++) {
    const n = document.getElementById(`castName${i}`);
    const r = document.getElementById(`castRole${i}`);
    if (n) n.value = (state.cast[i] && state.cast[i].name) || '';
    if (r) r.value = (state.cast[i] && state.cast[i].role) || '';
  }
}
for (let i = 0; i < 3; i++) {
  const n = document.getElementById(`castName${i}`);
  const r = document.getElementById(`castRole${i}`);
  if (n) {
    n.addEventListener('input', () => {
      state.cast[i] = { ...(state.cast[i] || {}), name: n.value };
      redraw();
    });
  }
  if (r) {
    r.addEventListener('input', () => {
      state.cast[i] = { ...(state.cast[i] || {}), role: r.value };
      redraw();
    });
  }
}
document.querySelectorAll('[data-layout]').forEach((b) => {
  b.addEventListener('click', () => setLayout(b.dataset.layout));
});
document.querySelectorAll('[data-grade]').forEach((b) => {
  b.addEventListener('click', () => setGrade(b.dataset.grade));
});
document.querySelectorAll('[data-size]').forEach((b) => {
  b.addEventListener('click', () => setSize(b.dataset.size));
});
document.getElementById('prevPanel').addEventListener('click', () => {
  const n = layoutPanels(state.layout, 100, 100).length;
  state.selectedPanel = (state.selectedPanel - 1 + n) % n;
  syncPanelControls();
  redraw();
});
document.getElementById('nextPanel').addEventListener('click', () => {
  const n = layoutPanels(state.layout, 100, 100).length;
  state.selectedPanel = (state.selectedPanel + 1) % n;
  syncPanelControls();
  redraw();
});

// Drag on the preview to pan the selected panel's photo; click selects a panel.
let dragging = null;
function panelAt(clientX, clientY) {
  const r = preview.getBoundingClientRect();
  const x = ((clientX - r.left) / r.width) * preview.width;
  const y = ((clientY - r.top) / r.height) * preview.height;
  const panels = layoutPanels(state.layout, preview.width, preview.height);
  return { index: panels.findIndex((p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h), x, y };
}
preview.addEventListener('pointerdown', (e) => {
  const hit = panelAt(e.clientX, e.clientY);
  if (hit.index === -1) return;
  state.selectedPanel = hit.index;
  dragging = { x: hit.x, y: hit.y };
  preview.setPointerCapture(e.pointerId);
  syncPanelControls();
  redraw();
});
preview.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const hit = panelAt(e.clientX, e.clientY);
  const panel = state.panels[state.selectedPanel];
  const rect = layoutPanels(state.layout, preview.width, preview.height)[state.selectedPanel];
  if (!panel || !rect) return;
  panel.dx += (hit.x - dragging.x) / rect.w;
  panel.dy += (hit.y - dragging.y) / rect.h;
  panel.dx = Math.max(-0.6, Math.min(0.6, panel.dx));
  panel.dy = Math.max(-0.6, Math.min(0.6, panel.dy));
  dragging = { x: hit.x, y: hit.y };
  redraw();
});
preview.addEventListener('pointerup', () => { dragging = null; });

/** Renders the cover at full export size and downloads it as a PNG. */
export function exportCover() {
  const { w, h } = sizeOf();
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off, state);
  return new Promise((resolve) => {
    off.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `neon-coast-${w}x${h}.png`;
      a.click();
      status.textContent = `Saved neon-coast-${w}x${h}.png`;
      resolve(a.download);
    }, 'image/png');
  });
}
document.getElementById('export').addEventListener('click', exportCover);

/** Renders the same cover in all three post sizes and downloads each PNG,
 * so one click hands over the square, portrait and wide versions together. */
export async function exportAllSizes() {
  const names = [];
  for (const key of Object.keys(SIZES)) {
    const { w, h } = SIZES[key];
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    drawCover(off, { ...state, size: key });
    // eslint-disable-next-line no-await-in-loop
    const name = await new Promise((resolve) => {
      off.toBlob((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `neon-coast-all-${w}x${h}.png`;
        a.click();
        resolve(a.download);
      }, 'image/png');
    });
    names.push(name);
  }
  status.textContent = `Saved ${names.length} sizes: ${names.join(', ')}`;
  return names;
}
document.getElementById('exportAll').addEventListener('click', exportAllSizes);

// Build the layout / grade / size buttons from the engine's own tables.
function buildButtons() {
  const layoutRow = document.getElementById('layoutRow');
  for (const [key, label] of Object.entries(LAYOUTS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.layout = key;
    b.textContent = label;
    b.addEventListener('click', () => setLayout(key));
    layoutRow.appendChild(b);
  }
  const gradeRow = document.getElementById('gradeRow');
  for (const [key, label] of Object.entries(GRADES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.grade = key;
    b.textContent = label;
    b.addEventListener('click', () => setGrade(key));
    gradeRow.appendChild(b);
  }
  const sizeRow = document.getElementById('sizeRow');
  for (const [key, spec] of Object.entries(SIZES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.size = key;
    b.textContent = spec.label;
    b.addEventListener('click', () => setSize(key));
    sizeRow.appendChild(b);
  }
}

buildButtons();
syncPanelControls();
syncCastInputs();

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), {
    loadSamples,
    loadImage,
    setState(next) {
      Object.assign(state, next);
      state.panels = next.panels || defaultPanels(state.layout, state.photos.length);
      state.cast = (next.cast && next.cast.length ? next.cast : DEFAULT_CAST)
        .map((c) => ({ ...c }));
      state.ink = Boolean(next.ink);
      topBiasPanels(state);
      titleInput.value = state.title;
      subtitleInput.value = state.subtitle;
      if (inkToggle) inkToggle.checked = state.ink;
      syncCastInputs();
      syncPanelControls();
      redraw();
    },
    redraw,
  });
} else {
  redraw();
}
