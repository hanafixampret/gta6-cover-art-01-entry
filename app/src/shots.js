// Shot presets for screenshots: the same app, driven by a URL query, so the
// cover and the editor can be captured headlessly without a human clicking.
// ?shot=cover renders the cover full-bleed (the dossier's first screenshot),
// ?shot=editor shows the working app with photos loaded, and the portrait /
// square shots show the same cover in its other export shapes.
export const SHOT_PRESETS = {
  cover: {
    mode: 'cover',
    sizeId: '4:5',
    layoutId: 'vice-seven',
    gradeId: 'neon-sunset',
    title: 'VICE CITY',
    tagline: 'GRAND THEFT AUTO VI',
  },
  portrait: {
    mode: 'cover',
    sizeId: '4:5',
    layoutId: 'grid-nine',
    gradeId: 'vice-pink',
    title: 'VICE CITY',
    tagline: 'GRAND THEFT AUTO VI',
  },
  square: {
    mode: 'cover',
    sizeId: '1:1',
    layoutId: 'hero-trio',
    gradeId: 'gold-hour',
    title: 'VICE CITY',
    tagline: 'GRAND THEFT AUTO VI',
  },
  editor: {
    mode: 'editor',
    sizeId: '4:5',
    layoutId: 'vice-seven',
    gradeId: 'neon-sunset',
    title: 'VICE CITY',
    tagline: 'GRAND THEFT AUTO VI',
  },
};

export function getShot() {
  const params = new URLSearchParams(window.location.search);
  const name = params.get('shot');
  if (!name || !SHOT_PRESETS[name]) return null;
  return { name, ...SHOT_PRESETS[name] };
}

// In cover mode the page is only the cover: the UI chrome is hidden and the
// stage canvas fills the viewport, so a plain screenshot is the exported art.
export function applyShotMode(shot) {
  if (!shot) return;
  if (shot.mode === 'cover') {
    document.body.classList.add('shot-cover');
    document.title = 'Neon Vice — Cover';
  } else {
    document.body.classList.add('shot-editor');
  }
}
