// Fixed scenes for screenshots, driven by the `?shot=` query:
//   ?shot=editor&photo=<sample>&caption=<text>&layout=<key>&grade=<key>&size=<key>
//     shows the editor with a sample photo loaded.
//   ?shot=cover&photo=<sample>&caption=<text>&layout=<key>&grade=<key>&size=<key>
//     shows the exported cover alone, full frame, at the export size.
// window.__shotReady is set once the scene has painted, so the screenshot
// script knows the frame is final. The cover scene is the app's own drawing
// at the export size — the same pixels the Export button downloads — with the
// engine's top-bias crop applied, so faces survive the panel crop.
import { defaultPanels } from './cover.js';

export async function runShot(shot, query, app) {
  const photo = query.get('photo') ?? 'boulevard';
  const caption = query.get('caption') ?? 'Neon Shore';
  const subtitle = query.get('subtitle') ?? 'one last ride down the coast';
  const layout = query.get('layout') ?? 'hero';
  const grade = query.get('grade') ?? 'sunset';
  const size = query.get('size') ?? 'wide';

  const second = query.get('photo2');
  const photos = [await app.loadImage(`samples/${photo}.jpg`)];
  if (second) photos.push(await app.loadImage(`samples/${second}.jpg`));

  if (shot === 'cover') document.body.classList.add('shot-cover');
  app.setState({
    photos,
    layout,
    grade,
    title: caption,
    subtitle,
    size,
    panels: defaultPanels(layout, photos.length),
    selectedPanel: 0,
  });
  // Let the cover paint, then signal readiness on the next two frames.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
