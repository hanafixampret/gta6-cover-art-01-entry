[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/hanafixampret/gta6-cover-art-01-entry/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/hanafixampret/gta6-cover-art-01-entry/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Neon Coast — GTA-style Cover Maker

An offline web app that turns a photo and a caption into poster-style cover art in the spirit of GTA 6 posters — a multi-panel cover with bold gradient lettering, a Vice City sunset / neon colour grade, a synthwave sun and palm silhouettes — exported as a PNG to share.

Built for the make.fun bounty [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01).

## Use it

Serve `app/` with any static server (or `node serve.ts`, then open http://localhost:8080):

1. **Photos** — choose up to 3 photos from your machine, or use the bundled samples. Photos are read locally and never uploaded.
2. **Layout** — 8 layouts: Hero + three, Four panels, Hero strip, Full bleed, Slanted hero, Pop-out hero, Triptych, or Vista hero.
3. **Colour grade** — 9 grades: Vice Sunset, Neon Nights, Vice Pink, Teal Dusk, Mono Gold, Twilight Gold, Miami Teal, Heatwave, or Noir Ink — plus optional Poster Ink for flat print colours.
4. **Caption** — edit the title and subtitle; the title is set in striped retro-chrome 3D lettering over the art.
5. **Cast** — name up to 3 characters and their roles; each pair is drawn as a tag on its panel, and the names feed the billing block at the foot of the cover.
6. **Crop** — click a panel to select it, drag the photo inside it to position it, use the zoom slider. Crops are face-aware: the engine scans each photo for faces and keeps them in frame.
7. **Post size** — 1080 × 1080, 1080 × 1350, or 1920 × 1080, then **Export PNG** — or **Export all 3 sizes** for all three at once.

## How it works

- `app/index.html` + `app/style.css` — the editor UI.
- `app/src/cover.js` — the cover engine: 8 panel layouts (including slanted and pop-out heroes), 9 colour grades, cover-fit photo drawing with per-panel pan/zoom, a face-aware crop that scans each photo for faces, grade washes, the synthwave sun, palm silhouettes, halftone dots, grain and vignette, striped retro-chrome 3D title lettering over the art, cast role tags, a movie-poster billing block, and the Poster Ink finish. All art is drawn in code; no game assets.
- `app/src/main.js` — editor wiring: photo loading, controls, drag-to-pan, export.
- `app/src/shots.js` — fixed `?shot=` scenes used to take the screenshots.
- `app/samples/` — two sample photos made for make.fun with an image model, free to use.

Everything runs offline: every file the app loads lives under `app/`, and there are no network requests.

## Originality

All art, lettering and effects are original work made for this app. It uses no Rockstar Games logo, wordmark, official artwork, character or font. Lettering uses system fonts; the sample photos were made for make.fun and are free to use.

## License

MIT — see [LICENSE](LICENSE).
