// Neon Coast cover engine: draws a multi-panel GTA-poster-style cover on a
// 2D canvas from any photos, a title and a subtitle. Everything drawn here is
// original vector art (panels, gutters, synthwave sun, palm silhouettes,
// halftone dots, gradient lettering) — no Rockstar logo, artwork or font.
//
// A cover state is { photos, layout, grade, title, subtitle, size, panels },
// where panels[i] = { photo, zoom, dx, dy } crops and positions the photo in
// panel i (dx/dy are fractions of the panel size, zoom a multiplier on the
// cover-fit scale). drawCover renders that state at the canvas's own size.

export const LAYOUTS = {
  hero: 'Hero + three',
  quad: 'Four panels',
  strip: 'Hero strip',
  bleed: 'Full bleed',
};

export const GRADES = {
  sunset: 'Vice Sunset',
  neon: 'Neon Nights',
  pink: 'Vice Pink',
  teal: 'Teal Dusk',
  gold: 'Mono Gold',
};

export const SIZES = {
  square: { w: 1080, h: 1080, label: '1080 x 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 x 1350' },
  wide: { w: 1920, h: 1080, label: '1920 x 1080' },
};

// Per-grade colour recipes: [top tint, bottom tint, title gradient stops,
// subtitle colour, sun colours]. All applied as translucent overlays so any
// photo keeps its own detail under the grade.
const GRADE_RECIPES = {
  sunset: {
    top: 'rgba(255, 170, 60, 0.10)', bottom: 'rgba(214, 48, 120, 0.38)',
    title: ['#fff3a0', '#ff9a3d', '#ff2e88'], sub: '#ffe9a8',
    sun: ['#ffd76a', '#ff5e62'],
  },
  neon: {
    top: 'rgba(0, 229, 255, 0.10)', bottom: 'rgba(255, 0, 153, 0.34)',
    title: ['#d8fbff', '#37e6ff', '#ff2ea6'], sub: '#7df9ff',
    sun: ['#7df9ff', '#ff2ea6'],
  },
  pink: {
    top: 'rgba(255, 120, 200, 0.12)', bottom: 'rgba(120, 20, 160, 0.40)',
    title: ['#ffe3f2', '#ff7ac8', '#c724ff'], sub: '#ffd6ec',
    sun: ['#ffb3dd', '#c724ff'],
  },
  teal: {
    top: 'rgba(64, 224, 208, 0.10)', bottom: 'rgba(8, 60, 90, 0.42)',
    title: ['#e6fff8', '#5eead4', '#0ea5e9'], sub: '#a7f3d0',
    sun: ['#fef08a', '#0ea5e9'],
  },
  gold: {
    top: 'rgba(255, 215, 130, 0.10)', bottom: 'rgba(90, 50, 10, 0.42)',
    title: ['#fffbe6', '#ffd76a', '#e08a00'], sub: '#ffe9a8',
    sun: ['#fff3a0', '#e08a00'],
  },
};

const GUTTER = 0.012; // white gutter between panels, as a fraction of width

/** Panel rectangles (fractions of w/h) for each layout, title band excluded. */
export function layoutPanels(layout, w, h) {
  const g = GUTTER * w;
  const band = h * 0.24; // title band height at the foot
  const top = 0;
  const bottom = h - band;
  if (layout === 'quad') {
    const cw = (w - g) / 2;
    const ch = (bottom - g) / 2;
    return [
      { x: 0, y: top, w: cw, h: ch },
      { x: cw + g, y: top, w: cw, h: ch },
      { x: 0, y: top + ch + g, w: cw, h: ch },
      { x: cw + g, y: top + ch + g, w: cw, h: ch },
    ];
  }
  if (layout === 'strip') {
    const heroH = (bottom - top) * 0.58;
    const rowH = bottom - top - heroH - g;
    const cw = (w - 2 * g) / 3;
    return [
      { x: 0, y: top, w, h: heroH },
      { x: 0, y: top + heroH + g, w: cw, h: rowH },
      { x: cw + g, y: top + heroH + g, w: cw, h: rowH },
      { x: 2 * (cw + g), y: top + heroH + g, w: cw, h: rowH },
    ];
  }
  if (layout === 'bleed') {
    return [{ x: 0, y: 0, w, h: bottom }];
  }
  // hero: big panel left, three stacked right
  const heroW = w * 0.62;
  const colW = w - heroW - g;
  const ch = (bottom - 2 * g) / 3;
  return [
    { x: 0, y: top, w: heroW, h: bottom },
    { x: heroW + g, y: top, w: colW, h: ch },
    { x: heroW + g, y: top + ch + g, w: colW, h: ch },
    { x: heroW + g, y: top + 2 * (ch + g), w: colW, h: ch },
  ];
}

/** Default per-panel crop state for a layout and a photo count. */
export function defaultPanels(layout, photoCount) {
  const n = layoutPanels(layout, 100, 100).length;
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({ photo: photoCount <= 1 ? 0 : i % photoCount, zoom: 1, dx: 0, dy: 0 });
  }
  return out;
}

/** Nudges each panel's crop toward the top of its photo: faces usually sit in
 * the upper half, and a centred cover-fit crop cuts them off in wide panels.
 * Each shift is capped at 75% of the most the panel can move while the photo
 * still covers it, so no gap ever opens at the panel's foot. */
export function topBiasPanels(state) {
  const size = SIZES[state.size] || SIZES.square;
  const rects = layoutPanels(state.layout, size.w, size.h);
  rects.forEach((rect, i) => {
    const panel = state.panels && state.panels[i];
    const photo = panel && state.photos && state.photos[panel.photo];
    if (!panel || !photo) return;
    const iw = photo.naturalWidth || photo.width;
    const ih = photo.naturalHeight || photo.height;
    const base = Math.max(rect.w / iw, rect.h / ih) * (panel.zoom || 1);
    const excess = ih * base - rect.h;
    if (excess <= 0) {
      panel.dy = 0;
      return;
    }
    panel.dy = ((excess / 2) / rect.h) * 0.75;
  });
}

/** Draws one photo into a panel rect, cover-fit, with the panel's pan/zoom. */
export function drawPhotoInPanel(ctx, photo, rect, panel) {
  if (!photo) return;
  const iw = photo.naturalWidth || photo.width;
  const ih = photo.naturalHeight || photo.height;
  const base = Math.max(rect.w / iw, rect.h / ih) * (panel.zoom || 1);
  const pw = iw * base;
  const ph = ih * base;
  const cx = rect.x + rect.w / 2 + (panel.dx || 0) * rect.w;
  const cy = rect.y + rect.h / 2 + (panel.dy || 0) * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(photo, cx - pw / 2, cy - ph / 2, pw, ph);
  ctx.restore();
}

/** Applies the grade's sunset/neon wash over one panel rect. */
export function applyGrade(ctx, rect, recipe) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  const wash = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  wash.addColorStop(0, recipe.top);
  wash.addColorStop(1, recipe.bottom);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = 'rgba(255, 120, 60, 0.14)';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

/** A synthwave sun: a gradient disc cut by horizontal slats toward its foot. */
export function drawSun(ctx, cx, cy, r, colours) {
  const grad = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  grad.addColorStop(0, colours[0]);
  grad.addColorStop(1, colours[1]);
  ctx.save();
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // Slats: the disc's own background colour shows through as gaps.
  ctx.globalCompositeOperation = 'destination-out';
  let y = cy + r * 0.05;
  let gap = r * 0.07;
  while (y < cy + r) {
    ctx.fillRect(cx - r, y, r * 2, gap);
    y += gap * 2.4;
    gap *= 1.5;
  }
  ctx.restore();
}

/** A palm silhouette: curved trunk, five drooping fronds, drawn in one colour. */
export function drawPalm(ctx, x, y, s, colour) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, s * 0.06);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + s * 0.08, y - s * 0.55, x + s * 0.22, y - s * 0.95);
  ctx.stroke();
  const tx = x + s * 0.22;
  const ty = y - s * 0.95;
  ctx.lineWidth = Math.max(1.5, s * 0.035);
  for (let i = 0; i < 5; i++) {
    const a = (-0.15 - i * 0.32) * Math.PI;
    const len = s * (0.42 - Math.abs(i - 2) * 0.05);
    const ex = tx + Math.cos(a) * len;
    const ey = ty + Math.sin(a) * len * 0.55 + s * 0.16;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(tx + Math.cos(a) * len * 0.5, ty - s * 0.12, ex, ey);
    ctx.stroke();
  }
  ctx.restore();
}

/** Halftone dots fading across a rect, for the title band's corners. */
export function drawHalftone(ctx, rect, colour) {
  ctx.save();
  ctx.fillStyle = colour;
  const step = Math.max(6, rect.h * 0.055);
  for (let y = rect.y + step / 2; y < rect.y + rect.h; y += step) {
    for (let x = rect.x + step / 2; x < rect.x + rect.w; x += step) {
      const fade = 1 - (y - rect.y) / rect.h;
      const r = step * 0.16 * fade;
      if (r > 0.4) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

let grainTile = null;
/** A seeded 128px noise tile, reused so the grain is identical every render. */
export function grainPattern(ctx) {
  if (grainTile) return grainTile;
  const tile = document.createElement('canvas');
  tile.width = 128;
  tile.height = 128;
  const tctx = tile.getContext('2d');
  const img = tctx.createImageData(128, 128);
  let seed = 20261119;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 28;
  }
  tctx.putImageData(img, 0, 0);
  grainTile = ctx.createPattern(tile, 'repeat');
  return grainTile;
}

/** Fits a font size so `text` spans at most `maxW` at the given weight/family. */
export function fitFont(ctx, text, maxW, startSize, weight, family) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  try { ctx.letterSpacing = '0px'; } catch { /* older canvas: no letterSpacing */ }
  while (size > 10 && ctx.measureText(text).width > maxW) {
    size = Math.floor(size * 0.94);
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

const TITLE_FAMILY = '"Arial Black", "Helvetica Neue", Helvetica, sans-serif';
const SCRIPT_FAMILY = '"Brush Script MT", "Segoe Script", cursive';

/** The title band: dark gradient, sun, palms, halftone, title + subtitle. */
export function drawTitleBand(ctx, w, h, state, recipe) {
  const bandH = h * 0.24;
  const y0 = h - bandH;
  const band = ctx.createLinearGradient(0, y0 - h * 0.05, 0, h);
  band.addColorStop(0, 'rgba(16, 6, 32, 0)');
  band.addColorStop(0.35, 'rgba(16, 6, 32, 0.88)');
  band.addColorStop(1, 'rgba(10, 3, 24, 0.98)');
  ctx.fillStyle = band;
  ctx.fillRect(0, y0 - h * 0.05, w, h * 0.05 + bandH);

  // Synthwave sun peeking over the band's top edge, right of centre.
  drawSun(ctx, w * 0.82, y0 + bandH * 0.08, bandH * 0.42, recipe.sun);
  // Palm silhouettes framing the band.
  drawPalm(ctx, w * 0.03, h - h * 0.005, bandH * 0.85, 'rgba(8, 2, 18, 0.9)');
  drawPalm(ctx, w * 0.94, h - h * 0.005, bandH * 0.62, 'rgba(8, 2, 18, 0.85)');
  drawHalftone(ctx, { x: w * 0.62, y: y0 + bandH * 0.55, w: w * 0.36, h: bandH * 0.4 }, 'rgba(255,255,255,0.16)');

  const title = (state.title || '').trim().toUpperCase();
  if (title) {
    const size = fitFont(ctx, title, w * 0.9, h * 0.115, 900, TITLE_FAMILY);
    const grad = ctx.createLinearGradient(0, y0 + bandH * 0.18, 0, y0 + bandH * 0.62);
    grad.addColorStop(0, recipe.title[0]);
    grad.addColorStop(0.55, recipe.title[1]);
    grad.addColorStop(1, recipe.title[2]);
    ctx.save();
    ctx.translate(w / 2, y0 + bandH * 0.52);
    ctx.rotate(-0.022);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    try { ctx.letterSpacing = `${Math.max(1, size * 0.02)}px`; } catch { /* no-op */ }
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#160a2e';
    ctx.lineWidth = Math.max(3, size * 0.09);
    ctx.strokeText(title, 0, 0);
    ctx.fillStyle = grad;
    ctx.shadowColor = 'rgba(255, 46, 136, 0.55)';
    ctx.shadowBlur = size * 0.18;
    ctx.fillText(title, 0, 0);
    ctx.restore();
  }
  const sub = (state.subtitle || '').trim();
  if (sub) {
    const size = fitFont(ctx, sub, w * 0.72, h * 0.042, 700, SCRIPT_FAMILY);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `italic 700 ${size}px ${SCRIPT_FAMILY}`;
    ctx.fillStyle = recipe.sub;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = size * 0.25;
    ctx.fillText(sub, w / 2, y0 + bandH * 0.82);
    ctx.restore();
  }
  // Badge ribbon, top-left of the band: invented place name, never a game mark.
  const badge = 'NEON COAST';
  const bs = fitFont(ctx, badge, w * 0.2, h * 0.026, 800, TITLE_FAMILY);
  ctx.save();
  ctx.font = `800 ${bs}px ${TITLE_FAMILY}`;
  const bw = ctx.measureText(badge).width + bs * 1.6;
  const bh = bs * 1.9;
  ctx.translate(w * 0.035, y0 + bandH * 0.06);
  ctx.rotate(-0.03);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, bw, bh);
  ctx.fillStyle = '#160a2e';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badge, bw / 2, bh / 2 + 1);
  ctx.restore();
}

/** Draws the whole cover for `state` onto `canvas` at the canvas's own size. */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const recipe = GRADE_RECIPES[state.grade] || GRADE_RECIPES.sunset;
  const panels = layoutPanels(state.layout, w, h);

  // Deep violet base, then the white poster frame.
  ctx.fillStyle = '#160a2e';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#fdfbf7';
  ctx.fillRect(0, 0, w, h);

  panels.forEach((rect, i) => {
    const panel = (state.panels && state.panels[i]) || { photo: 0, zoom: 1, dx: 0, dy: 0 };
    const photo = state.photos && state.photos[panel.photo];
    if (photo) {
      drawPhotoInPanel(ctx, photo, rect, panel);
      applyGrade(ctx, rect, recipe);
    } else {
      // Empty panel: a sunset placeholder gradient with a sun, so the cover
      // still reads as finished before any photo is loaded.
      const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
      g.addColorStop(0, '#ff9a3d');
      g.addColorStop(0.55, '#ff2e88');
      g.addColorStop(1, '#3b1d6e');
      ctx.fillStyle = g;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      drawSun(ctx, rect.x + rect.w / 2, rect.y + rect.h * 0.42, Math.min(rect.w, rect.h) * 0.2, recipe.sun);
    }
    ctx.strokeStyle = 'rgba(22, 10, 46, 0.55)';
    ctx.lineWidth = Math.max(1, w * 0.0015);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });

  drawTitleBand(ctx, w, h, state, recipe);

  // Grain + vignette over the whole cover.
  const grain = grainPattern(ctx);
  if (grain) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = grain;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(10,2,24,0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}
