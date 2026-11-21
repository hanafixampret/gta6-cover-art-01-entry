// Neon Vice cover renderer — pure Canvas 2D, deterministic.
// Every pixel of the cover is a pure function of the state: same state,
// same bytes. No network, no Date, no unseeded randomness.

export const GRADES = [
  {
    id: 'neon-sunset',
    name: 'Neon Sunset',
    filter: 'saturate(1.45) contrast(1.12) brightness(1.02)',
    overlay: { from: 'rgba(255,120,80,0.20)', to: 'rgba(255,40,120,0.24)', blend: 'overlay' },
  },
  {
    id: 'vice-pink',
    name: 'Vice Pink',
    filter: 'saturate(1.3) contrast(1.05) hue-rotate(-12deg)',
    overlay: { from: 'rgba(255,90,180,0.22)', to: 'rgba(120,40,160,0.20)', blend: 'soft-light' },
  },
  {
    id: 'ocean-drive',
    name: 'Ocean Drive',
    filter: 'saturate(1.2) contrast(1.08) hue-rotate(18deg)',
    overlay: { from: 'rgba(40,200,220,0.18)', to: 'rgba(0,80,140,0.22)', blend: 'soft-light' },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    filter: 'saturate(0.9) contrast(1.15) brightness(0.88)',
    overlay: { from: 'rgba(40,60,180,0.22)', to: 'rgba(10,10,50,0.26)', blend: 'overlay' },
  },
  {
    id: 'gold-hour',
    name: 'Gold Hour',
    filter: 'saturate(1.35) contrast(1.05) sepia(0.25)',
    overlay: { from: 'rgba(255,190,60,0.20)', to: 'rgba(160,90,0,0.18)', blend: 'soft-light' },
  },
  {
    id: 'noir',
    name: 'Noir',
    filter: 'grayscale(1) contrast(1.25) brightness(1.05)',
    overlay: null,
  },
];

// Layouts: panel rects in normalized canvas coordinates (0..1).
// Panels are drawn small-first, hero last, so the hero pops over its neighbours.
export const LAYOUTS = [
  {
    id: 'vice-seven',
    name: 'Vice Seven',
    panels: [
      { x: 0.02, y: 0.15, w: 0.26, h: 0.26, rot: 1.5, tag: 'OCEAN' },
      { x: 0.72, y: 0.15, w: 0.26, h: 0.26, rot: -1.5, tag: 'NEON' },
      { x: 0.02, y: 0.435, w: 0.26, h: 0.26, rot: -1.8, tag: 'PALMS' },
      { x: 0.72, y: 0.435, w: 0.26, h: 0.26, rot: 1.8, tag: 'HEAT' },
      { x: 0.03, y: 0.715, w: 0.44, h: 0.145, rot: 0.8, zoom: 1.5, tag: 'VICE' },
      { x: 0.53, y: 0.715, w: 0.44, h: 0.145, rot: -0.8, zoom: 1.5, tag: 'NIGHT' },
      { x: 0.305, y: 0.155, w: 0.39, h: 0.565, rot: -1.2, hero: true, tag: 'LUCIA' },
    ],
  },
  {
    id: 'hero-trio',
    name: 'Hero Trio',
    panels: [
      { x: 0.58, y: 0.15, w: 0.39, h: 0.34, rot: 1.2, tag: 'JASON' },
      { x: 0.58, y: 0.52, w: 0.39, h: 0.34, rot: -1.2, tag: 'OCEAN' },
      { x: 0.03, y: 0.15, w: 0.52, h: 0.71, rot: -1, hero: true, tag: 'LUCIA' },
    ],
  },
  {
    id: 'grid-nine',
    name: 'Grid Nine',
    panels: [
      { x: 0.02, y: 0.15, w: 0.31, h: 0.22, rot: 1, tag: 'VICE' },
      { x: 0.345, y: 0.15, w: 0.31, h: 0.22, rot: -1, tag: 'NEON' },
      { x: 0.67, y: 0.15, w: 0.31, h: 0.22, rot: 1, tag: 'PALMS' },
      { x: 0.02, y: 0.39, w: 0.31, h: 0.22, rot: -1, tag: 'HEAT' },
      { x: 0.67, y: 0.39, w: 0.31, h: 0.22, rot: -1, tag: 'OCEAN' },
      { x: 0.02, y: 0.63, w: 0.31, h: 0.22, rot: 1, tag: 'NIGHT' },
      { x: 0.345, y: 0.63, w: 0.31, h: 0.22, rot: -1, tag: 'JASON' },
      { x: 0.67, y: 0.63, w: 0.31, h: 0.22, rot: 1, tag: 'DRIVE' },
      { x: 0.33, y: 0.375, w: 0.34, h: 0.25, rot: 0, hero: true, tag: 'LUCIA' },
    ],
  },
  {
    id: 'strip-five',
    name: 'Strip Five',
    panels: [
      { x: 0.02, y: 0.15, w: 0.96, h: 0.125, rot: 0, zoom: 1.5, tag: 'VICE' },
      { x: 0.02, y: 0.285, w: 0.96, h: 0.125, rot: 0, zoom: 1.5, tag: 'NEON' },
      { x: 0.02, y: 0.42, w: 0.96, h: 0.16, rot: 0, zoom: 1.5, hero: true, tag: 'LUCIA' },
      { x: 0.02, y: 0.59, w: 0.96, h: 0.125, rot: 0, zoom: 1.5, tag: 'OCEAN' },
      { x: 0.02, y: 0.725, w: 0.96, h: 0.125, rot: 0, zoom: 1.5, tag: 'PALMS' },
    ],
  },
  {
    id: 'duo',
    name: 'Duo',
    panels: [
      { x: 0.6, y: 0.15, w: 0.38, h: 0.71, rot: 1, tag: 'JASON' },
      { x: 0.02, y: 0.15, w: 0.55, h: 0.71, rot: -1, hero: true, tag: 'LUCIA' },
    ],
  },
  {
    id: 'solo',
    name: 'Solo',
    panels: [
      { x: 0.02, y: 0.15, w: 0.96, h: 0.71, rot: 0, hero: true, tag: 'LUCIA' },
    ],
  },
];

export const SIZES = [
  { id: '4:5', name: 'Portrait 4:5', w: 1080, h: 1350 },
  { id: '1:1', name: 'Square 1:1', w: 1080, h: 1080 },
  { id: '16:9', name: 'Wide 16:9', w: 1920, h: 1080 },
];

export const DEFAULT_TAGS = ['LUCIA', 'JASON', 'VICE', 'OCEAN', 'NEON', 'PALMS', 'HEAT'];

// Seeded PRNG (mulberry32) — deterministic shuffles for Auto-fill.
export function seededRandom(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Face-aware focus: the centroid of strong edges, biased toward the upper
// half, where faces sit in portraits. Faces carry the most edge density in
// a portrait, so the crop centres on the person, not the middle of the frame.
export function analyzeFocus(img) {
  const S = 48;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, S, S);
  const d = g.getImageData(0, 0, S, S).data;
  const lum = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) {
    const o = i * 4;
    lum[i] = 0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2];
  }
  let sx = 0;
  let sy = 0;
  let sw = 0;
  for (let y = 1; y < S - 1; y++) {
    for (let x = 1; x < S - 1; x++) {
      const gx = lum[y * S + x + 1] - lum[y * S + x - 1];
      const gy = lum[(y + 1) * S + x] - lum[(y - 1) * S + x];
      const m = Math.abs(gx) + Math.abs(gy);
      const w = m * m * (1 + 0.7 * (1 - y / S)) * (1 - 0.25 * Math.abs(x / S - 0.5) * 2);
      sx += x * w;
      sy += y * w;
      sw += w;
    }
  }
  if (sw === 0) return { x: 0.5, y: 0.4 };
  const clamp = (v) => Math.min(0.85, Math.max(0.15, v));
  return { x: clamp(sx / sw / S), y: clamp(sy / sw / S) };
}

// Cover-fit source rect: the panel is filled, the focus point lands at the
// panel centre (clamped so the rect never leaves the photo).
export function fitSource(img, focus, zoom, pw, ph) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(pw / iw, ph / ih) * (zoom || 1);
  const sw = pw / scale;
  const sh = ph / scale;
  const cx = (focus ? focus.x : 0.5) * iw;
  const cy = (focus ? focus.y : 0.5) * ih;
  const sx = Math.min(Math.max(cx - sw / 2, 0), Math.max(iw - sw, 0));
  const sy = Math.min(Math.max(cy - sh / 2, 0), Math.max(ih - sh, 0));
  return { sx, sy, sw, sh };
}

function drawStar(ctx, x, y, r, fill) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(ang) * rad;
    const py = y + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawArcText(ctx, text, cx, cy, radius, startAngle, endAngle, flip) {
  const step = (endAngle - startAngle) / Math.max(text.length - 1, 1);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < text.length; i++) {
    const a = startAngle + step * i;
    const x = cx + Math.cos(a) * radius;
    const y = cy + Math.sin(a) * radius;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a + (flip ? -Math.PI / 2 : Math.PI / 2));
    ctx.fillText(text[i], 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

function drawSun(ctx, W, H) {
  const r = W * 0.17;
  const cx = W * 0.5;
  const cy = H * 0.34;
  const off = document.createElement('canvas');
  off.width = Math.ceil(r * 2);
  off.height = Math.ceil(r * 2);
  const g = off.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, r * 2);
  grad.addColorStop(0, '#fff3a0');
  grad.addColorStop(0.55, '#ff9a3d');
  grad.addColorStop(1, '#ff2e88');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(r, r, r, 0, Math.PI * 2);
  g.fill();
  // Synthwave slits across the lower half.
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 5; i++) {
    const y = r + r * 0.08 + i * r * 0.17;
    g.fillRect(0, y, r * 2, r * 0.045 + i * r * 0.012);
  }
  g.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.globalAlpha = 0.95;
  ctx.drawImage(off, cx - r, cy - r);
  ctx.restore();
}

function drawSky(ctx, W, H) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#2b0a4a');
  sky.addColorStop(0.32, '#7b1e6e');
  sky.addColorStop(0.58, '#e8447c');
  sky.addColorStop(0.78, '#ff8a3d');
  sky.addColorStop(1, '#1c0533');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  // Sky glow behind the title.
  const glow = ctx.createRadialGradient(W * 0.5, H * 0.08, 0, W * 0.5, H * 0.08, W * 0.62);
  glow.addColorStop(0, 'rgba(255,150,220,0.55)');
  glow.addColorStop(0.5, 'rgba(255,90,140,0.22)');
  glow.addColorStop(1, 'rgba(255,90,140,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H * 0.5);
  drawSun(ctx, W, H);
}

function drawPanel(ctx, W, H, rect, photo, grade, panelState, isHero) {
  const pw = rect.w * W;
  const ph = rect.h * H;
  const cx = rect.x * W + pw / 2;
  const cy = rect.y * H + ph / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((rect.rot * Math.PI) / 180);
  const border = W * (isHero ? 0.009 : 0.005);
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = W * 0.03;
  ctx.shadowOffsetY = W * 0.012;
  ctx.fillStyle = '#ffffff';
  roundRectPath(ctx, -pw / 2 - border, -ph / 2 - border, pw + border * 2, ph + border * 2, W * 0.007);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.save();
  roundRectPath(ctx, -pw / 2, -ph / 2, pw, ph, W * 0.004);
  ctx.clip();
  if (photo && photo.img) {
    ctx.filter = grade.filter;
    const focus = panelState && panelState.focus ? panelState.focus : photo.focus;
    const zoom = panelState && panelState.zoom ? panelState.zoom : 1;
    const src = fitSource(photo.img, focus, zoom, pw, ph);
    ctx.drawImage(photo.img, src.sx, src.sy, src.sw, src.sh, -pw / 2, -ph / 2, pw, ph);
    ctx.filter = 'none';
    if (grade.overlay) {
      const ov = ctx.createLinearGradient(0, -ph / 2, 0, ph / 2);
      ov.addColorStop(0, grade.overlay.from);
      ov.addColorStop(1, grade.overlay.to);
      ctx.globalCompositeOperation = grade.overlay.blend;
      ctx.fillStyle = ov;
      ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
      ctx.globalCompositeOperation = 'source-over';
    }
    // Vignette: darkens the panel edges so the white frame pops.
    const vg = ctx.createRadialGradient(0, 0, Math.min(pw, ph) * 0.35, 0, 0, Math.max(pw, ph) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = vg;
    ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
  } else {
    const g2 = ctx.createLinearGradient(-pw / 2, -ph / 2, pw / 2, ph / 2);
    g2.addColorStop(0, '#3a1a5e');
    g2.addColorStop(1, '#12082a');
    ctx.fillStyle = g2;
    ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
  }
  ctx.restore();
  // Role tag chip, bottom-left inside the panel.
  const tag = (panelState && panelState.tag) || rect.tag || '';
  if (tag) {
    const fs = Math.max(11, W * 0.02);
    ctx.font = `800 ${fs}px "Arial Narrow", Impact, sans-serif`;
    const tw = ctx.measureText(tag).width;
    const pad = fs * 0.55;
    const bx = -pw / 2 + W * 0.012;
    const by = ph / 2 - W * 0.012 - fs * 1.5;
    ctx.fillStyle = 'rgba(10,4,24,0.82)';
    roundRectPath(ctx, bx, by, tw + pad * 2, fs * 1.5, fs * 0.3);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag, bx + pad, by + fs * 0.78);
  }
  ctx.restore();
}

function drawTitle(ctx, W, H, st) {
  // Capped by height so the tagline never dips into the panels on square
  // and wide exports, where the canvas is short relative to its width.
  const size = Math.min(W * 0.115, H * 0.095);
  const x = W / 2;
  const y = H * 0.072;
  // Render the title on its own layer so stripes clip inside the letters
  // and the drop shadow falls on the sky, not on the letters.
  const layer = document.createElement('canvas');
  layer.width = W;
  layer.height = Math.ceil(size * 2.1);
  const g = layer.getContext('2d');
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `900 ${size}px "Arial Black", Impact, sans-serif`;
  const ly = layer.height / 2 - size * 0.12;
  const grad = g.createLinearGradient(0, ly - size * 0.5, 0, ly + size * 0.5);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.45, '#ffe9f6');
  grad.addColorStop(0.55, '#8fe8ff');
  grad.addColorStop(1, '#ff9de2');
  g.fillStyle = grad;
  g.fillText(st.title, x, ly);
  // Chrome stripes inside the letters.
  g.globalCompositeOperation = 'source-atop';
  const stripeH = size * 0.085;
  g.fillStyle = 'rgba(20,8,40,0.28)';
  for (let yy = ly - size * 0.5; yy < ly + size * 0.5; yy += stripeH * 2) {
    g.fillRect(0, yy, W, stripeH);
  }
  g.globalCompositeOperation = 'source-over';
  // Heavy black outline.
  g.lineWidth = size * 0.05;
  g.strokeStyle = '#14081f';
  g.lineJoin = 'round';
  g.strokeText(st.title, x, ly);
  // Tagline under the title, letterspaced.
  const ts = W * 0.03;
  g.font = `800 ${ts}px "Arial Narrow", Impact, sans-serif`;
  g.fillStyle = '#ffffff';
  try {
    g.letterSpacing = `${Math.round(W * 0.008)}px`;
  } catch (e) {
    /* older canvas: no letterSpacing */
  }
  g.fillText(st.tagline, x, ly + size * 0.72);
  try {
    g.letterSpacing = '0px';
  } catch (e) {
    /* ignore */
  }
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = W * 0.012;
  ctx.shadowOffsetY = size * 0.06;
  ctx.drawImage(layer, 0, y - layer.height / 2);
  ctx.restore();
}

function drawSeal(ctx, W, H) {
  const r = W * 0.082;
  const x = W * 0.875;
  const y = H * 0.115;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = W * 0.015;
  ctx.shadowOffsetY = W * 0.006;
  const gold = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  gold.addColorStop(0, '#ffe98a');
  gold.addColorStop(0.6, '#d4a017');
  gold.addColorStop(1, '#8a6400');
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#1a0b2e';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.78, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd76a';
  ctx.lineWidth = Math.max(1.5, r * 0.03);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffd76a';
  ctx.font = `800 ${r * 0.17}px "Arial Narrow", Impact, sans-serif`;
  drawArcText(ctx, 'VICE CITY', x, y, r * 0.56, -Math.PI * 0.78, -Math.PI * 0.22, false);
  // Bottom arc runs right to left in canvas angles, so the letters are fed
  // from the left end (0.72π) to the right end (0.28π) to read correctly.
  drawArcText(ctx, 'EST. 1986', x, y, r * 0.56, Math.PI * 0.72, Math.PI * 0.28, true);
  drawStar(ctx, x, y, r * 0.26, '#ffd76a');
  ctx.restore();
}

function drawReview(ctx, W, H, st) {
  const y0 = H * 0.882;
  const h = H * 0.058;
  ctx.save();
  ctx.fillStyle = 'rgba(12,4,26,0.88)';
  ctx.fillRect(0, y0, W, h);
  ctx.fillStyle = '#ffd76a';
  ctx.fillRect(0, y0, W, Math.max(2, H * 0.002));
  ctx.fillRect(0, y0 + h, W, Math.max(2, H * 0.002));
  const starR = W * 0.016;
  const gap = starR * 2.6;
  const total = gap * 4;
  const sx = W / 2 - total / 2;
  const sy = y0 + h * 0.32;
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, sx + i * gap, sy, starR, i < st.stars ? '#ffd76a' : 'rgba(255,215,106,0.25)');
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = `italic 700 ${W * 0.026}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`\u201c${st.quote}\u201d  —  ${st.source}`, W / 2, y0 + h * 0.72);
  ctx.restore();
}

function drawBilling(ctx, W, H) {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.font = `${Math.max(9, W * 0.0115)}px "Arial Narrow", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NEON VICE COVER STUDIO  •  A FAN-MADE TOOL  •  PHOTOS NEVER LEAVE YOUR DEVICE', W / 2, H * 0.962);
  ctx.fillText('VICE CITY  •  OCEAN DRIVE  •  LEONIDA  •  MADE OFFLINE IN YOUR BROWSER', W / 2, H * 0.982);
  ctx.restore();
}

// state: { photos, panels, layoutId, gradeId, title, tagline, quote, source, stars }
// panels: array aligned with the layout's panel list: { photo, zoom, focus, tag }
// Returns the panel rects in canvas pixels (for hit-testing in the editor).
export function renderCover(ctx, W, H, st) {
  const layout = LAYOUTS.find((l) => l.id === st.layoutId) || LAYOUTS[0];
  const grade = GRADES.find((g) => g.id === st.gradeId) || GRADES[0];
  drawSky(ctx, W, H);
  const rects = [];
  layout.panels.forEach((rect, i) => {
    const ps = st.panels && st.panels[i] ? st.panels[i] : {};
    const photo = st.photos && typeof ps.photo === 'number' ? st.photos[ps.photo] : null;
    drawPanel(ctx, W, H, rect, photo, grade, ps, !!rect.hero);
    rects.push({
      x: rect.x * W,
      y: rect.y * H,
      w: rect.w * W,
      h: rect.h * H,
      rot: rect.rot,
      hero: !!rect.hero,
      index: i,
    });
  });
  drawTitle(ctx, W, H, st);
  drawSeal(ctx, W, H);
  drawReview(ctx, W, H, st);
  drawBilling(ctx, W, H);
  return rects;
}

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}
