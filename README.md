# Neon Vice — GTA 6 Cover Studio

A free offline browser app that turns your photos into GTA VI-style cover art:
a multi-panel mosaic poster with a striped chrome title, the Vice City seal,
a review strip and a billing block, exported as a PNG to share.

## What it does

- **7-panel mosaic** (plus 5 more layouts: Hero Trio, Grid Nine, Strip Five,
  Duo, Solo) — click a panel to select it, drag to reframe the photo inside,
  scroll to zoom, edit its role tag.
- **Face-aware framing** — an edge-density focus finder centres each crop on
  the person in the photo, not the middle of the frame.
- **6 sunset grades** — Neon Sunset, Vice Pink, Ocean Drive, Midnight,
  Gold Hour, Noir — applied as canvas filters plus a blend overlay per panel.
- **Auto-fill** — deals your photos into the panels with a seeded shuffle,
  so the same click always deals the same cover.
- **Export** — PNG in 3 post sizes: Portrait 4:5 (1080×1350), Square 1:1
  (1080×1080), Wide 16:9 (1920×1080).
- **Fully offline** — photos never leave your device; system fonts only, no
  network requests, no uploads.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

## Screenshots

```sh
node render-shots.mjs
# writes screenshots/1-cover.jpg … 4-cover-square.jpg
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
# writes out/dossier.json from app/ and screenshots/
```

Built for make.fun's `gta6-cover-art-01` bounty. MIT licensed.
