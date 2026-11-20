// Neon Coast — the hand-in program for the gta6-cover-art-01 bounty (Node 22,
// standard library only). It copies this repo's app/ and screenshots/ into the
// grader's output directory and writes /output/dossier.json with the vendored
// make.fun library. The output directory is a mount point in the grader, so it
// is only ever created (mkdirSync), never removed — rmSync would throw EBUSY.
// The app it hands in is the v3 rebuild: everything v2 had (chrome title over
// the art, pop-out and slanted layouts, cast tags, billing block, face-aware
// crops, Poster Ink, export-all-sizes) plus the poster's finishing furniture
// — a seven-panel mosaic layout, the Vice City seal, the critic review strip,
// the sky glow behind the title, and Auto-fill — all drawn in code, offline,
// no game assets. After writing the dossier it prints the dossier's byte size
// and the screenshot count, and refuses to pass silently when the dossier is
// over the gate's 1.5 MiB cap, so a bad hand-in is caught here, not by the
// sealed scorer.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The sealed gate's caps (reference/gate.json): only text_max_bytes shapes the
// dossier's bytes; the other limits refuse an entry the scorer would refuse
// (more than 4 screenshots or one over 256 KiB; more than 993 files in app/ or
// 48 MiB of app files in all, or a path under app/ over 1000 bytes: app/ counts
// beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

// v3: say what was handed in, and fail loudly instead of shipping a dossier
// the gate would refuse for size. The screenshots are counted from the
// output directory itself, so a stale or missing shot cannot slip through.
const dossierBytes = statSync(join(out, 'dossier.json')).size;
const shotCount = existsSync(join(out, 'screenshots'))
  ? readdirSync(join(out, 'screenshots')).filter((f) => !f.startsWith('.')).length
  : 0;
console.log(`dossier.json: ${dossierBytes} bytes, ${shotCount} screenshots`);
if (dossierBytes > 1572864) {
  throw new Error(`dossier.json is ${dossierBytes} bytes, over the gate's 1.5 MiB cap`);
}
if (shotCount < 3 || shotCount > 4) {
  throw new Error(`expected 3 or 4 screenshots, found ${shotCount}`);
}
