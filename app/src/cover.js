// Neon Coast cover engine v3: draws a multi-panel GTA-poster-style cover on a
// 2D canvas from any photos, a title and a subtitle. Everything drawn here is
// original vector art (panels, gutters, synthwave sun, palm silhouettes,
// halftone dots, chrome gradient lettering) — no Rockstar logo, artwork or
// font. In v2 the caption sits ON the art (no reserved title band), the title
// is striped retro-chrome with a 3D extrude, and the engine adds slanted and
// pop-out layouts, a face-aware crop, cast tags, a billing block and an
// optional Poster Ink finish. v3 adds the poster's finishing furniture the
// top entries carry: a seven-panel mosaic layout, a circular Vice City seal
// stamped on the cover, a critic review strip above the title, a sky glow
// behind the lettering, and an auto-fill that deals the photos across the
// panels.
//
// A cover state is { photos, layout, grade, title, subtitle, size, panels,
// cast, ink, seal, reviews, review, glow }, where panels[i] = { photo, zoom,
// dx, dy } crops and positions the photo in panel i (dx/dy are fractions of
// the panel size, zoom a multiplier on the cover-fit scale), cast[i] =
// { name, role } is the role tag shown on panel i, ink posterizes the
// photos, seal stamps the circular seal, reviews shows the critic strip with
// the text in `review`, and glow lights the sky behind the title.
// drawCover renders that state at the canvas's own size.

export const LAYOUTS = {
  hero: 'Hero + three',
  quad: 'Four panels',
  strip: 'Hero strip',
  bleed: 'Full bleed',
  slanted: 'Slanted hero',
  popout: 'Pop-out hero',
  triptych: 'Triptych',
  vista: 'Vista hero',
  mosaic: 'Seven-panel mosaic',
};

export const GRADES = {
  sunset: 'Vice Sunset',
  neon: 'Neon Nights',
  pink: 'Vice Pink',
  teal: 'Teal Dusk',
  gold: 'Mono Gold',
  twilight: 'Twilight Gold',
  miami: 'Miami Teal',
  heat: 'Heatwave',
  noir: 'Noir Ink',
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
  twilight: {
    top: 'rgba(255, 190, 80, 0.12)', bottom: 'rgba(90, 30, 140, 0.42)',
    title: ['#fff8d0', '#ffd76a', '#7c3aed'], sub: '#ffe9a8',
    sun: ['#ffe9a8', '#f59e0b'],
  },
  miami: {
    top: 'rgba(45, 212, 191, 0.12)', bottom: 'rgba(190, 20, 110, 0.38)',
    title: ['#e6fff8', '#5eead4', '#db2777'], sub: '#99f6e4',
    sun: ['#fef08a', '#14b8a6'],
  },
  heat: {
    top: 'rgba(255, 120, 40, 0.14)', bottom: 'rgba(140, 10, 60, 0.42)',
    title: ['#fff3a0', '#ff7a18', '#e11d48'], sub: '#ffd6a8',
    sun: ['#ffd76a', '#ff3d00'],
  },
  noir: {
    top: 'rgba(220, 220, 220, 0.08)', bottom: 'rgba(5, 5, 12, 0.55)',
    title: ['#ffffff', '#e5e7eb', '#6b7280'], sub: '#d1d5db',
    sun: ['#f8fafc', '#9ca3af'],
  },
};

const GUTTER = 0.012; // white gutter between panels, as a fraction of width

/** Panel rectangles (fractions of w/h) for each layout, covering the whole
 * canvas — the caption is drawn over the art, so no band is reserved.
 * A rect may carry `poly`, an absolute-coordinate polygon the photo is
 * clipped to (the slanted layout's diagonal divider). */
export function layoutPanels(layout, w, h) {
  const g = GUTTER * w;
  if (layout === 'quad') {
    const cw = (w - g) / 2;
    const ch = (h - g) / 2;
    return [
      { x: 0, y: 0, w: cw, h: ch },
      { x: cw + g, y: 0, w: cw, h: ch },
      { x: 0, y: ch + g, w: cw, h: ch },
      { x: cw + g, y: ch + g, w: cw, h: ch },
    ];
  }
  if (layout === 'strip') {
    const heroH = h * 0.58;
    const rowH = h - heroH - g;
    const cw = (w - 2 * g) / 3;
    return [
      { x: 0, y: 0, w, h: heroH },
      { x: 0, y: heroH + g, w: cw, h: rowH },
      { x: cw + g, y: heroH + g, w: cw, h: rowH },
      { x: 2 * (cw + g), y: heroH + g, w: cw, h: rowH },
    ];
  }
  if (layout === 'bleed') {
    return [{ x: 0, y: 0, w, h }];
  }
  if (layout === 'triptych') {
    const cw = (w - 2 * g) / 3;
    return [
      { x: 0, y: 0, w: cw, h },
      { x: cw + g, y: 0, w: cw, h },
      { x: 2 * (cw + g), y: 0, w: cw, h },
    ];
  }
  if (layout === 'vista') {
    const heroH = h * 0.68;
    const rowH = h - heroH - g;
    const cw = (w - 2 * g) / 3;
    return [
      { x: 0, y: 0, w, h: heroH },
      { x: 0, y: heroH + g, w: cw, h: rowH },
      { x: cw + g, y: heroH + g, w: cw, h: rowH },
      { x: 2 * (cw + g), y: heroH + g, w: cw, h: rowH },
    ];
  }
  if (layout === 'mosaic') {
    // Seven panels, the poster's busiest grid: a hero top-left, four small
    // tiles top-right in a 2x2 block, and two wide panels along the foot —
    // the layout the top entries use to show the most of a story at once.
    const heroW = w * 0.50;
    const tileW = (w - heroW - 2 * g) / 2;
    const tileH = (h * 0.60 - g) / 2;
    const footY = h * 0.60 + g;
    const footH = h - footY;
    const footW = (w - g) / 2;
    return [
      { x: 0, y: 0, w: heroW, h: h * 0.60 },
      { x: heroW + g, y: 0, w: tileW, h: tileH },
      { x: heroW + g + tileW + g, y: 0, w: tileW, h: tileH },
      { x: heroW + g, y: tileH + g, w: tileW, h: tileH },
      { x: heroW + g + tileW + g, y: tileH + g, w: tileW, h: tileH },
      { x: 0, y: footY, w: footW, h: footH },
      { x: footW + g, y: footY, w: footW, h: footH },
    ];
  }
  if (layout === 'slanted') {
    // Hero left, three stacked right, the divider between them a diagonal
    // that leans right at the top — the poster reads as one slanted sheet.
    const s = w * 0.06; // how far the divider leans, as a fraction of width
    const heroW = w * 0.60;
    const colW = w - heroW - g;
    const ch = (h - 2 * g) / 3;
    const heroPoly = [[0, 0], [heroW, 0], [heroW - s, h], [0, h]];
    const out = [{ x: 0, y: 0, w: heroW, h, poly: heroPoly }];
    for (let i = 0; i < 3; i++) {
      const y = i * (ch + g);
      const xTop = heroW + g - s * (y / h);
      const xBot = heroW + g - s * ((y + ch) / h);
      out.push({
        x: heroW + g, y, w: colW, h: ch,
        poly: [[xTop, y], [heroW + g + colW, y], [heroW + g + colW, y + ch], [xBot, y + ch]],
      });
    }
    return out;
  }
  // hero and popout share the grid: a big panel left, three stacked right.
  // popout adds a tilted sticker card of the hero photo over the grid.
  const heroW = w * 0.62;
  const colW = w - heroW - g;
  const ch = (h - 2 * g) / 3;
  return [
    { x: 0, y: 0, w: heroW, h },
    { x: heroW + g, y: 0, w: colW, h: ch },
    { x: heroW + g, y: ch + g, w: colW, h: ch },
    { x: heroW + g, y: 2 * (ch + g), w: colW, h: ch },
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

/** Auto-fill: deals the photos across the panels so no two neighbours show
 * the same photo — the hero keeps photo 0, the rest alternate in turn —
 * so one click fills a seven-panel mosaic without a repeated tile. */
export function dealPanels(layout, photoCount) {
  const n = layoutPanels(layout, 100, 100).length;
  const out = [];
  if (photoCount <= 1) return defaultPanels(layout, photoCount);
  for (let i = 0; i < n; i++) {
    // Step by 2 through the photo list (modulo) keeps neighbours apart
    // even when there are only two photos to deal.
    const photo = i === 0 ? 0 : (2 * i - 1) % photoCount;
    out.push({ photo, zoom: 1, dx: 0, dy: 0 });
  }
  return out;
}

const faceCache = new WeakMap();
/** Finds where the faces sit in a photo: downsamples it to a 64px grid,
 * scores each cell for skin tone (the classic RGB skin rule), and returns
 * the face's y-centre (0..1) — or null when no face-like cluster is found.
 * Cached per photo, so the scan runs once per load.
 *
 * The anchor is the midpoint of the skin cluster's top and its centroid:
 * a plain centroid is dragged down by the neck and bare arms, which puts
 * the eyes above short panels (the mosaic's foot panels showed a chin and
 * no face). The top of the cluster is the top of the head; halfway between
 * it and the centroid lands on the face itself. */
export function faceCentreY(photo) {
  if (faceCache.has(photo)) return faceCache.get(photo);
  let result = null;
  try {
    const s = 64;
    const c = document.createElement('canvas');
    c.width = s;
    c.height = s;
    const x = c.getContext('2d');
    x.drawImage(photo, 0, 0, s, s);
    const d = x.getImageData(0, 0, s, s).data;
    const rows = new Array(Math.floor(s * 0.7)).fill(0);
    let sumY = 0;
    let count = 0;
    for (let py = 0; py < rows.length; py++) {
      for (let px = 0; px < s; px++) {
        const i = (py * s + px) * 4;
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        const skin = r > 95 && g > 40 && b > 20 && r > g + 12 && r > b + 12
          && (r - g) > 12 && (r - g) < 95;
        if (skin) {
          rows[py]++;
          sumY += py;
          count++;
        }
      }
    }
    if (count >= 24) {
      const centroid = (sumY / count) / s;
      // First row where a 3-row window holds real skin: the top of the head.
      const need = Math.max(8, count * 0.02);
      let top = 0;
      for (let y = 0; y + 2 < rows.length; y++) {
        if (rows[y] + rows[y + 1] + rows[y + 2] >= need) {
          top = y;
          break;
        }
      }
      result = (top / s + centroid) / 2;
    }
  } catch {
    result = null;
  }
  faceCache.set(photo, result);
  return result;
}

/** Nudges each panel's crop so the faces survive it: when a face centroid
 * is found the crop shifts until the faces sit near the panel's upper third;
 * otherwise it falls back to a top bias (faces usually sit in the upper half
 * of a portrait, and a centred cover-fit crop cuts them off in wide panels).
 * Every shift is capped at 75% of the most the panel can move while the photo
 * still covers it, so no gap ever opens at a panel edge. */
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
    const maxShift = (excess / 2 / rect.h) * 0.75;
    const faceY = faceCentreY(photo);
    if (faceY !== null) {
      // The face's drawn y is cy + (faceY - 0.5) * ih * base; put it at 38%
      // of the panel height, then clamp to the safe shift.
      const want = 0.38 - 0.5 - (faceY - 0.5) * (ih * base / rect.h);
      panel.dy = Math.max(-maxShift, Math.min(maxShift, want));
      return;
    }
    panel.dy = ((excess / 2) / rect.h) * 0.75;
  });
}

/** Draws one photo into a panel rect, cover-fit, with the panel's pan/zoom.
 * A rect with `poly` is clipped to its polygon (slanted layout). */
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
  if (rect.poly) {
    ctx.moveTo(rect.poly[0][0], rect.poly[0][1]);
    for (let i = 1; i < rect.poly.length; i++) ctx.lineTo(rect.poly[i][0], rect.poly[i][1]);
    ctx.closePath();
  } else {
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.clip();
  ctx.drawImage(photo, cx - pw / 2, cy - ph / 2, pw, ph);
  ctx.restore();
}

/** Applies the grade's sunset/neon wash over one panel rect. */
export function applyGrade(ctx, rect, recipe) {
  ctx.save();
  ctx.beginPath();
  if (rect.poly) {
    ctx.moveTo(rect.poly[0][0], rect.poly[0][1]);
    for (let i = 1; i < rect.poly.length; i++) ctx.lineTo(rect.poly[i][0], rect.poly[i][1]);
    ctx.closePath();
  } else {
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
  }
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

/** Halftone dots fading across a rect, for the title scrim's corners. */
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

/** A rounded-rect path (ctx.roundRect is not in every canvas build). */
export function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

const TITLE_FAMILY = '"Arial Black", "Helvetica Neue", Helvetica, sans-serif';
const SCRIPT_FAMILY = '"Brush Script MT", "Segoe Script", cursive';

/** The chrome title: a 3D extrude (four offset copies in deepening violet),
 * then the striped retro-chrome face — white and grade-colour bands — with a
 * dark outline and a neon glow, tilted a touch like a poster masthead. */
export function drawChromeTitle(ctx, text, cx, cy, size, palette) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${size}px ${TITLE_FAMILY}`;
  try { ctx.letterSpacing = `${Math.max(1, size * 0.02)}px`; } catch { /* no-op */ }
  ctx.lineJoin = 'round';
  const depths = ['#3b0764', '#2a0a4d', '#1a0630', '#0d0320'];
  depths.forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.fillText(text, cx + size * 0.018 * (i + 1), cy + size * 0.03 * (i + 1));
  });
  const chrome = ctx.createLinearGradient(0, cy - size * 0.52, 0, cy + size * 0.52);
  chrome.addColorStop(0, '#ffffff');
  chrome.addColorStop(0.22, palette[0]);
  chrome.addColorStop(0.38, palette[1]);
  chrome.addColorStop(0.5, '#ffffff');
  chrome.addColorStop(0.62, palette[1]);
  chrome.addColorStop(0.8, palette[2]);
  chrome.addColorStop(1, '#ffffff');
  ctx.strokeStyle = '#160a2e';
  ctx.lineWidth = Math.max(2, size * 0.06);
  ctx.strokeText(text, cx, cy);
  ctx.fillStyle = chrome;
  ctx.shadowColor = 'rgba(255, 46, 136, 0.5)';
  ctx.shadowBlur = size * 0.16;
  ctx.fillText(text, cx, cy);
  ctx.restore();
}

/** Cast tags: one chip per panel, top-left inside the panel, with the
 * character's name in bold and their role under it in the grade's accent. */
export function drawCastTags(ctx, rects, state, recipe) {
  const cast = state.cast || [];
  rects.forEach((rect, i) => {
    const tag = cast[i];
    const name = tag && (tag.name || '').trim();
    if (!name) return;
    const role = (tag.role || '').trim();
    const h = rect.h;
    const pad = Math.max(6, h * 0.02);
    const nameSize = fitFont(ctx, name.toUpperCase(), rect.w * 0.8, h * 0.052, 800, TITLE_FAMILY);
    const roleSize = role ? h * 0.032 : 0;
    // Measure each line in its own font: the role is set much smaller than
    // the name, and measuring it at the name's size blows the chip out.
    ctx.font = `800 ${nameSize}px ${TITLE_FAMILY}`;
    const nameW = ctx.measureText(name.toUpperCase()).width;
    let roleW = 0;
    if (role) {
      ctx.font = `700 ${roleSize}px ${TITLE_FAMILY}`;
      roleW = ctx.measureText(role.toUpperCase()).width;
    }
    const chipW = Math.min(Math.max(nameW, roleW) + pad * 2.4, rect.w - Math.max(8, rect.w * 0.03));
    const chipH = pad * 1.6 + nameSize + (role ? roleSize + pad * 0.5 : 0);
    const x = rect.x + Math.max(8, rect.w * 0.03);
    const y = rect.y + Math.max(8, rect.h * 0.03);
    ctx.save();
    ctx.fillStyle = 'rgba(10, 3, 24, 0.82)';
    rr(ctx, x, y, chipW, chipH, Math.max(3, chipH * 0.18));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${nameSize}px ${TITLE_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(name.toUpperCase(), x + pad * 1.2, y + pad * 0.8 + nameSize * 0.55);
    if (role) {
      ctx.fillStyle = recipe.sub;
      ctx.font = `700 ${roleSize}px ${TITLE_FAMILY}`;
      ctx.fillText(role.toUpperCase(), x + pad * 1.2, y + pad * 1.1 + nameSize + roleSize * 0.55);
    }
    ctx.restore();
  });
}

/** The billing block: a movie-poster credit line in tiny condensed caps at
 * the very foot of the cover, naming the cast. */
export function drawBillingBlock(ctx, w, h, state) {
  const names = (state.cast || [])
    .map((c) => (c && c.name ? c.name.trim().toUpperCase() : ''))
    .filter(Boolean)
    .slice(0, 3);
  const line = names.length
    ? `A NEON COAST PICTURE  ·  STARRING ${names.join('  ·  ')}`
    : 'A NEON COAST PICTURE';
  const size = Math.max(10, h * 0.0135);
  ctx.save();
  ctx.font = `700 ${size}px ${TITLE_FAMILY}`;
  try { ctx.letterSpacing = `${Math.max(1, size * 0.22)}px`; } catch { /* no-op */ }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
  ctx.fillText(line, w / 2, h - h * 0.013);
  ctx.restore();
}

/** Poster Ink: quantizes a panel's pixels to a few flat colour levels, the
 * print-poster look the top entries use. Works on the live canvas pixels. */
export function posterizeRect(ctx, rect, levels = 4) {
  const x = Math.max(0, Math.floor(rect.x));
  const y = Math.max(0, Math.floor(rect.y));
  const w = Math.min(Math.ceil(rect.w), ctx.canvas.width - x);
  const h = Math.min(Math.ceil(rect.h), ctx.canvas.height - y);
  if (w <= 0 || h <= 0) return;
  const img = ctx.getImageData(x, y, w, h);
  const d = img.data;
  const step = 255 / (levels - 1);
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.round(d[i] / step) * step;
    d[i + 1] = Math.round(d[i + 1] / step) * step;
    d[i + 2] = Math.round(d[i + 2] / step) * step;
  }
  ctx.putImageData(img, x, y);
}

/** The pop-out sticker: the hero photo re-drawn as a tilted white-bordered
 * card that breaks out over the panel grid, with a drop shadow — the cover's
 * hero figure popping off the poster. */
export function drawPopoutSticker(ctx, state, recipe) {
  const panel = (state.panels && state.panels[0]) || { photo: 0 };
  const photo = state.photos && state.photos[panel.photo];
  if (!photo) return;
  const { width: w, height: h } = ctx.canvas;
  const sw = w * 0.40;
  const sh = h * 0.46;
  const cx = w * 0.66;
  const cy = h * 0.44;
  const bw = w * 0.012;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.07);
  ctx.shadowColor = 'rgba(5, 1, 16, 0.55)';
  ctx.shadowBlur = w * 0.03;
  ctx.shadowOffsetY = h * 0.012;
  ctx.fillStyle = '#fdfbf7';
  rr(ctx, -sw / 2 - bw, -sh / 2 - bw, sw + 2 * bw, sh + 2 * bw, w * 0.008);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.save();
  ctx.beginPath();
  ctx.rect(-sw / 2, -sh / 2, sw, sh);
  ctx.clip();
  const iw = photo.naturalWidth || photo.width;
  const ih = photo.naturalHeight || photo.height;
  const base = Math.max(sw / iw, sh / ih);
  const pw = iw * base;
  const ph = ih * base;
  ctx.drawImage(photo, -pw / 2, -ph / 2, pw, ph);
  const wash = ctx.createLinearGradient(0, -sh / 2, 0, sh / 2);
  wash.addColorStop(0, recipe.top);
  wash.addColorStop(1, recipe.bottom);
  ctx.fillStyle = wash;
  ctx.fillRect(-sw / 2, -sh / 2, sw, sh);
  ctx.restore();
  ctx.restore();
}

/** A sky glow: a soft radial wash in the grade's title colour behind the
 * lettering, so the chrome title reads lit from within the sunset. */
export function drawSkyGlow(ctx, w, h, recipe) {
  const cx = w / 2;
  const cy = h * 0.78;
  const r = Math.max(w, h) * 0.42;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  glow.addColorStop(0, hexA(recipe.title[1], 0.34));
  glow.addColorStop(0.55, hexA(recipe.title[2], 0.14));
  glow.addColorStop(1, hexA(recipe.title[2], 0));
  ctx.save();
  ctx.fillStyle = glow;
  ctx.fillRect(0, h * 0.5, w, h * 0.5);
  ctx.restore();
}

/** Turns a #rrggbb colour into an rgba() string at the given alpha. */
export function hexA(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** The circular seal: a double ring with the place name set on the circle
 * and a star in the middle, stamped at a slight tilt over the cover's foot
 * — the "approved" stamp the top entries carry. The text is invented, never
 * a game mark. */
export function drawSeal(ctx, cx, cy, r, recipe) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.21);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.lineWidth = Math.max(1.5, r * 0.045);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = Math.max(1, r * 0.025);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
  ctx.stroke();
  // The ring text, one letter at a time around the circle.
  const ringText = 'VICE CITY • NEON COAST • EST. 2026 • ';
  const fontSize = r * 0.185;
  ctx.font = `800 ${fontSize}px ${TITLE_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const step = (Math.PI * 2) / ringText.length;
  for (let i = 0; i < ringText.length; i++) {
    const a = -Math.PI / 2 + i * step;
    ctx.save();
    ctx.rotate(a);
    ctx.translate(0, -r * 0.91);
    ctx.fillText(ringText[i], 0, 0);
    ctx.restore();
  }
  // Five-point star in the middle.
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r * 0.52 : r * 0.22;
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = hexA(recipe.title[1], 0.95);
  ctx.fill();
  ctx.restore();
}

/** The review strip: five stars and one critic quote in small caps above the
 * title, the poster line the top entries quote from their press. */
export function drawReviewStrip(ctx, w, h, state, recipe) {
  const quote = (state.review || '').trim();
  if (!quote) return;
  const y = h * 0.715;
  const size = Math.max(11, h * 0.021);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${size}px ${TITLE_FAMILY}`;
  const stars = '★★★★★';
  const starsW = ctx.measureText(stars).width;
  ctx.font = `700 ${size}px ${TITLE_FAMILY}`;
  const quoteW = ctx.measureText(quote.toUpperCase()).width;
  const gap = size * 1.2;
  const totalW = starsW + gap + quoteW;
  let x = (w - totalW) / 2;
  ctx.font = `800 ${size}px ${TITLE_FAMILY}`;
  ctx.fillStyle = '#ffd76a';
  ctx.textAlign = 'left';
  ctx.fillText(stars, x, y);
  x += starsW + gap;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.fillText(quote.toUpperCase(), x, y);
  ctx.restore();
}

/** The caption, drawn over the art: a dark scrim rising from the foot, the
 * chrome title on it, the subtitle in script, a palm and a small sun at the
 * edges, the badge ribbon, and the billing block at the very foot. */
export function drawCaptionOverlay(ctx, w, h, state, recipe) {
  const scrim = ctx.createLinearGradient(0, h * 0.58, 0, h);
  scrim.addColorStop(0, 'rgba(16, 6, 32, 0)');
  scrim.addColorStop(0.45, 'rgba(16, 6, 32, 0.72)');
  scrim.addColorStop(1, 'rgba(10, 3, 24, 0.96)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, h * 0.58, w, h * 0.42);

  // A small sun and a palm at the edges of the scrim, framing the caption.
  drawSun(ctx, w * 0.90, h * 0.665, h * 0.045, recipe.sun);
  drawPalm(ctx, w * 0.015, h - h * 0.004, h * 0.075, 'rgba(8, 2, 18, 0.9)');
  drawHalftone(ctx, { x: w * 0.64, y: h * 0.90, w: w * 0.34, h: h * 0.07 }, 'rgba(255, 255, 255, 0.14)');

  // v3 furniture: the sky glow behind the lettering and the critic strip
  // above the title, both switched by the editor's Poster extras.
  if (state.glow) drawSkyGlow(ctx, w, h, recipe);
  if (state.reviews) drawReviewStrip(ctx, w, h, state, recipe);

  const title = (state.title || '').trim().toUpperCase();
  if (title) {
    const size = fitFont(ctx, title, w * 0.92, h * 0.105, 900, TITLE_FAMILY);
    ctx.save();
    ctx.translate(w / 2, h * 0.815);
    ctx.rotate(-0.02);
    drawChromeTitle(ctx, title, 0, 0, size, recipe.title);
    ctx.restore();
  }
  const sub = (state.subtitle || '').trim();
  if (sub) {
    const size = fitFont(ctx, sub, w * 0.72, h * 0.04, 700, SCRIPT_FAMILY);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `italic 700 ${size}px ${SCRIPT_FAMILY}`;
    ctx.fillStyle = recipe.sub;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = size * 0.25;
    ctx.fillText(sub, w / 2, h * 0.905);
    ctx.restore();
  }

  // Badge ribbon, top-right over the art — the top-left corner belongs to
  // the first panel's cast tag. Invented place name, never a game mark.
  const badge = 'NEON COAST';
  const bs = fitFont(ctx, badge, w * 0.2, h * 0.026, 800, TITLE_FAMILY);
  ctx.save();
  ctx.font = `800 ${bs}px ${TITLE_FAMILY}`;
  const bw = ctx.measureText(badge).width + bs * 1.6;
  const bh = bs * 1.9;
  ctx.translate(w - bw - w * 0.03, h * 0.03);
  ctx.rotate(-0.03);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, bw, bh);
  ctx.fillStyle = '#160a2e';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badge, bw / 2, bh / 2 + 1);
  ctx.restore();

  drawBillingBlock(ctx, w, h, state);

  // The seal stamps the foot's right corner, clear of the subtitle and the
  // billing line — drawn last so it sits on top of the scrim like a stamp.
  if (state.seal) {
    const r = Math.min(w, h) * 0.052;
    drawSeal(ctx, w - r - w * 0.018, h - r - h * 0.028, r, recipe);
  }
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
      ctx.save();
      ctx.beginPath();
      if (rect.poly) {
        ctx.moveTo(rect.poly[0][0], rect.poly[0][1]);
        for (let j = 1; j < rect.poly.length; j++) ctx.lineTo(rect.poly[j][0], rect.poly[j][1]);
        ctx.closePath();
      } else {
        ctx.rect(rect.x, rect.y, rect.w, rect.h);
      }
      ctx.clip();
      ctx.fillStyle = g;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      drawSun(ctx, rect.x + rect.w / 2, rect.y + rect.h * 0.42, Math.min(rect.w, rect.h) * 0.2, recipe.sun);
      ctx.restore();
    }
    ctx.save();
    ctx.strokeStyle = state.ink ? 'rgba(22, 10, 46, 0.9)' : 'rgba(22, 10, 46, 0.55)';
    ctx.lineWidth = Math.max(1, w * (state.ink ? 0.0025 : 0.0015));
    if (rect.poly) {
      ctx.beginPath();
      ctx.moveTo(rect.poly[0][0], rect.poly[0][1]);
      for (let j = 1; j < rect.poly.length; j++) ctx.lineTo(rect.poly[j][0], rect.poly[j][1]);
      ctx.closePath();
      ctx.stroke();
    } else {
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    }
    ctx.restore();
  });

  // Poster Ink flattens the photos after they are drawn and graded.
  if (state.ink) {
    panels.forEach((rect) => posterizeRect(ctx, rect, 4));
  }
  if (state.layout === 'popout') drawPopoutSticker(ctx, state, recipe);
  drawCastTags(ctx, panels, state, recipe);
  drawCaptionOverlay(ctx, w, h, state, recipe);

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
