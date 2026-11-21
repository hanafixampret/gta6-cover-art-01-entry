// Neon Vice — app wiring: state, library, editor, export.
// The cover itself lives in cover.js; this file is the studio around it.
import {
  GRADES,
  LAYOUTS,
  SIZES,
  analyzeFocus,
  fitSource,
  layoutById,
  renderCover,
  seededRandom,
} from './cover.js';
import { applyShotMode, getShot } from './shots.js';

const $ = (sel) => document.querySelector(sel);

const state = {
  photos: [],
  panels: [],
  savedPanels: {},
  layoutId: 'vice-seven',
  gradeId: 'neon-sunset',
  sizeId: '4:5',
  title: 'VICE CITY',
  tagline: 'GRAND THEFT AUTO VI',
  quote: 'A VICE CITY MASTERPIECE',
  source: 'VICE GAMING',
  stars: 5,
  selected: 0,
  seed: 20261121,
  shot: null,
};

let lastRects = [];
let drag = null;

function photoByIndex(i) {
  return state.photos[i] || null;
}

function buildPanels(layoutId) {
  const layout = layoutById(layoutId);
  const saved = state.savedPanels[layoutId];
  if (saved && saved.length === layout.panels.length) return saved;
  const panels = layout.panels.map((p, i) => {
    const heroFirst = layout.panels.findIndex((q) => q.hero);
    const order = [];
    for (let k = 0; k < layout.panels.length; k++) order.push((heroFirst + k) % layout.panels.length);
    const slot = order.indexOf(i);
    return {
      photo: state.photos.length ? slot % state.photos.length : -1,
      zoom: p.zoom || 1,
      focus: null,
      tag: p.tag || '',
    };
  });
  state.savedPanels[layoutId] = panels;
  return panels;
}

function currentLayout() {
  return layoutById(state.layoutId);
}

function currentSize() {
  return SIZES.find((s) => s.id === state.sizeId) || SIZES[0];
}

function renderState() {
  return {
    photos: state.photos,
    panels: state.panels,
    layoutId: state.layoutId,
    gradeId: state.gradeId,
    title: state.title,
    tagline: state.tagline,
    quote: state.quote,
    source: state.source,
    stars: state.stars,
  };
}

function sizeCanvasToStage() {
  const canvas = $('#stage');
  const wrap = $('#stage-wrap');
  const size = currentSize();
  const dpr = Math.min(window.devicePixelRatio || 1, state.shot && state.shot.mode === 'cover' ? 1 : 2);
  if (state.shot && state.shot.mode === 'cover') {
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
  } else {
    const maxW = Math.min(wrap.clientWidth || 560, 560);
    const w = Math.round(maxW * dpr);
    const h = Math.round((w * size.h) / size.w);
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${maxW}px`;
    canvas.style.height = `${Math.round((maxW * size.h) / size.w)}px`;
  }
}

function render() {
  const canvas = $('#stage');
  if (!canvas) return;
  sizeCanvasToStage();
  const ctx = canvas.getContext('2d');
  lastRects = renderCover(ctx, canvas.width, canvas.height, renderState());
  updatePanelPanel();
}

function updatePanelPanel() {
  const layout = currentLayout();
  const sel = state.panels[state.selected];
  const label = $('#selected-label');
  if (label) {
    label.textContent = sel
      ? `Panel ${state.selected + 1} of ${layout.panels.length}${layout.panels[state.selected].hero ? ' — hero' : ''}`
      : 'No panel selected';
  }
  const zoom = $('#zoom');
  if (zoom && sel) zoom.value = Math.round((sel.zoom || 1) * 100);
  const tag = $('#tag-input');
  if (tag && sel) tag.value = sel.tag || '';
  document.querySelectorAll('#library .thumb').forEach((el, i) => {
    el.classList.toggle('assigned', state.panels.some((p) => p.photo === i));
  });
  document.querySelectorAll('.layout-btn').forEach((el) => {
    el.classList.toggle('active', el.dataset.layout === state.layoutId);
  });
  document.querySelectorAll('.grade-btn').forEach((el) => {
    el.classList.toggle('active', el.dataset.grade === state.gradeId);
  });
  document.querySelectorAll('.size-btn').forEach((el) => {
    el.classList.toggle('active', el.dataset.size === state.sizeId);
  });
}

function addPhoto(name, img) {
  const photo = {
    id: state.photos.length,
    name,
    img,
    focus: { x: 0.5, y: 0.4 },
    edgeScore: 0,
  };
  try {
    photo.focus = analyzeFocus(img);
  } catch (e) {
    /* focus detection is a bonus; the centre crop still works */
  }
  state.photos.push(photo);
  const lib = $('#library');
  const thumb = document.createElement('button');
  thumb.className = 'thumb';
  thumb.type = 'button';
  const im = document.createElement('img');
  im.src = img.src;
  im.alt = name;
  thumb.appendChild(im);
  const cap = document.createElement('span');
  cap.textContent = name;
  thumb.appendChild(cap);
  thumb.addEventListener('click', () => {
    const sel = state.panels[state.selected];
    if (sel) {
      sel.photo = photo.id;
      render();
    }
  });
  lib.appendChild(thumb);
  return photo;
}

async function loadSample(url, name) {
  const res = await fetch(url);
  const blob = await res.blob();
  const obj = URL.createObjectURL(blob);
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = obj;
  });
  return addPhoto(name, img);
}

function autoFill() {
  const layout = currentLayout();
  const rnd = seededRandom(state.seed);
  state.seed += 1;
  const order = state.photos.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const heroIdx = layout.panels.findIndex((p) => p.hero);
  state.panels = layout.panels.map((p, i) => {
    const slot = i === heroIdx ? 0 : 1 + ((i - (i > heroIdx ? 1 : 0)) % Math.max(order.length, 1));
    return {
      photo: order.length ? order[slot % order.length] : -1,
      zoom: p.zoom || 1,
      focus: null,
      tag: p.tag || '',
    };
  });
  state.savedPanels[state.layoutId] = state.panels;
  state.selected = heroIdx >= 0 ? heroIdx : 0;
  render();
}

function switchLayout(id) {
  state.savedPanels[state.layoutId] = state.panels;
  state.layoutId = id;
  state.panels = buildPanels(id);
  const heroIdx = currentLayout().panels.findIndex((p) => p.hero);
  state.selected = heroIdx >= 0 ? heroIdx : 0;
  render();
}

function switchSize(id) {
  state.sizeId = id;
  render();
}

function exportCover() {
  const size = currentSize();
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  const ctx = off.getContext('2d');
  renderCover(ctx, size.w, size.h, renderState());
  off.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-vice-cover-${size.id.replace(':', 'x')}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
}

function canvasPoint(ev) {
  const canvas = $('#stage');
  const r = canvas.getBoundingClientRect();
  return {
    x: ((ev.clientX - r.left) / r.width) * canvas.width,
    y: ((ev.clientY - r.top) / r.height) * canvas.height,
  };
}

function hitPanel(pt) {
  for (let i = lastRects.length - 1; i >= 0; i--) {
    const rc = lastRects[i];
    const cx = rc.x + rc.w / 2;
    const cy = rc.y + rc.h / 2;
    const ang = (-rc.rot * Math.PI) / 180;
    const dx = pt.x - cx;
    const dy = pt.y - cy;
    const lx = dx * Math.cos(ang) - dy * Math.sin(ang);
    const ly = dx * Math.sin(ang) + dy * Math.cos(ang);
    if (Math.abs(lx) <= rc.w / 2 && Math.abs(ly) <= rc.h / 2) return i;
  }
  return -1;
}

function buildControls() {
  const layoutRow = $('#layout-row');
  LAYOUTS.forEach((l) => {
    const b = document.createElement('button');
    b.className = 'layout-btn';
    b.type = 'button';
    b.dataset.layout = l.id;
    b.textContent = `${l.name} · ${l.panels.length}`;
    b.addEventListener('click', () => switchLayout(l.id));
    layoutRow.appendChild(b);
  });
  const gradeRow = $('#grade-row');
  GRADES.forEach((g) => {
    const b = document.createElement('button');
    b.className = 'grade-btn';
    b.type = 'button';
    b.dataset.grade = g.id;
    b.textContent = g.name;
    b.addEventListener('click', () => {
      state.gradeId = g.id;
      render();
    });
    gradeRow.appendChild(b);
  });
  const sizeRow = $('#size-row');
  SIZES.forEach((s) => {
    const b = document.createElement('button');
    b.className = 'size-btn';
    b.type = 'button';
    b.dataset.size = s.id;
    b.textContent = s.name;
    b.addEventListener('click', () => switchSize(s.id));
    sizeRow.appendChild(b);
  });
  const starsRow = $('#stars-row');
  for (let i = 1; i <= 5; i++) {
    const b = document.createElement('button');
    b.className = 'star-btn';
    b.type = 'button';
    b.textContent = '★';
    b.dataset.stars = String(i);
    b.addEventListener('click', () => {
      state.stars = i;
      document.querySelectorAll('.star-btn').forEach((el) => {
        el.classList.toggle('active', Number(el.dataset.stars) <= i);
      });
      render();
    });
    starsRow.appendChild(b);
  }
  document.querySelectorAll('.star-btn').forEach((el) => {
    el.classList.toggle('active', Number(el.dataset.stars) <= state.stars);
  });
}

function wireEvents() {
  $('#title-input').addEventListener('input', (e) => {
    state.title = e.target.value.toUpperCase();
    render();
  });
  $('#tagline-input').addEventListener('input', (e) => {
    state.tagline = e.target.value.toUpperCase();
    render();
  });
  $('#quote-input').addEventListener('input', (e) => {
    state.quote = e.target.value;
    render();
  });
  $('#source-input').addEventListener('input', (e) => {
    state.source = e.target.value;
    render();
  });
  $('#tag-input').addEventListener('input', (e) => {
    const sel = state.panels[state.selected];
    if (sel) {
      sel.tag = e.target.value.toUpperCase().slice(0, 12);
      render();
    }
  });
  $('#zoom').addEventListener('input', (e) => {
    const sel = state.panels[state.selected];
    if (sel) {
      sel.zoom = Number(e.target.value) / 100;
      render();
    }
  });
  $('#detect-btn').addEventListener('click', () => {
    const sel = state.panels[state.selected];
    const photo = sel ? photoByIndex(sel.photo) : null;
    if (sel && photo && photo.img) {
      sel.focus = analyzeFocus(photo.img);
      sel.zoom = 1;
      render();
    }
  });
  $('#autofill-btn').addEventListener('click', autoFill);
  $('#export-btn').addEventListener('click', exportCover);
  $('#add-photos').addEventListener('click', () => $('#file-input').click());
  $('#file-input').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      const url = URL.createObjectURL(f);
      const img = new Image();
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
        img.src = url;
      });
      if (img.naturalWidth) addPhoto(f.name.replace(/\.[^.]+$/, ''), img);
    }
    if (!state.panels.length) state.panels = buildPanels(state.layoutId);
    render();
  });
  const canvas = $('#stage');
  canvas.addEventListener('pointerdown', (ev) => {
    const pt = canvasPoint(ev);
    const idx = hitPanel(pt);
    if (idx >= 0) {
      state.selected = idx;
      const sel = state.panels[idx];
      const photo = sel ? photoByIndex(sel.photo) : null;
      drag = { x: pt.x, y: pt.y, photo, panel: sel };
      canvas.setPointerCapture(ev.pointerId);
      render();
    }
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (!drag || !drag.photo || !drag.panel) return;
    const pt = canvasPoint(ev);
    const dx = pt.x - drag.x;
    const dy = pt.y - drag.y;
    drag.x = pt.x;
    drag.y = pt.y;
    const rect = lastRects[state.selected];
    if (!rect) return;
    const img = drag.photo.img;
    const focus = drag.panel.focus || drag.photo.focus || { x: 0.5, y: 0.5 };
    const src = fitSource(img, focus, drag.panel.zoom || 1, rect.w, rect.h);
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    drag.panel.focus = {
      x: Math.min(0.95, Math.max(0.05, focus.x - (dx / rect.w) * (src.sw / iw))),
      y: Math.min(0.95, Math.max(0.05, focus.y - (dy / rect.h) * (src.sh / ih))),
    };
    render();
  });
  canvas.addEventListener('pointerup', () => {
    drag = null;
  });
  canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const sel = state.panels[state.selected];
    if (!sel) return;
    sel.zoom = Math.min(3, Math.max(1, (sel.zoom || 1) * (1 - ev.deltaY * 0.001)));
    render();
  }, { passive: false });
  window.addEventListener('resize', render);
}

async function init() {
  state.shot = getShot();
  if (state.shot) {
    state.layoutId = state.shot.layoutId || state.layoutId;
    state.gradeId = state.shot.gradeId || state.gradeId;
    state.sizeId = state.shot.sizeId || state.sizeId;
    state.title = state.shot.title || state.title;
    state.tagline = state.shot.tagline || state.tagline;
    applyShotMode(state.shot);
  }
  buildControls();
  wireEvents();
  state.panels = buildPanels(state.layoutId);
  const heroIdx = currentLayout().panels.findIndex((p) => p.hero);
  state.selected = heroIdx >= 0 ? heroIdx : 0;
  render();
  try {
    await loadSample('samples/boulevard.jpg', 'Boulevard');
    await loadSample('samples/pier.jpg', 'Pier');
  } catch (e) {
    /* samples are a bonus; the app still works with user photos */
  }
  state.panels = buildPanels(state.layoutId);
  // Re-assign so the hero gets the sunset boulevard shot.
  state.panels.forEach((p, i) => {
    p.photo = state.photos.length ? i % state.photos.length : -1;
  });
  const hero = currentLayout().panels.findIndex((p) => p.hero);
  if (hero >= 0 && state.photos.length) state.panels[hero].photo = 0;
  state.savedPanels[state.layoutId] = state.panels;
  render();
  document.title = 'Neon Vice — ready';
}

init();
