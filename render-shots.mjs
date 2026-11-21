// Neon Vice shot renderer: captures screenshots/ from the running app.
// Starts serve.ts, screenshots each shot in shots.json with headless Chrome,
// then converts the PNGs to JPEGs inside the gate's limits (long side at
// most 1280, short side at least 480, at most 256 KiB each). Node 22,
// standard library only; the JPEG step shells out to python3 + PIL.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const shotsPath = join(root, 'shots.json');
const shots = JSON.parse(readFileSync(shotsPath, 'utf8')).shots;
const outDir = join(root, 'screenshots');
const tmpDir = join(root, '.shots-tmp');
const chrome =
  process.env.CHROME_BIN ||
  join(process.env.HOME || '~', '.cache/ms-playwright/chromium-1255/chrome-linux64/chrome');
const PORT = Number(process.env.SHOT_PORT || 8123);

const PIL_SCRIPT = `import sys, os
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
w, h = im.size
if max(w, h) > 1280:
    r = 1280 / max(w, h)
    im = im.resize((round(w * r), round(h * r)), Image.LANCZOS)
q = 82
while True:
    im.save(dst, 'JPEG', quality=q)
    if os.path.getsize(dst) <= 262144 or q <= 40:
        break
    q -= 10
print(dst, im.size, os.path.getsize(dst))
`;

async function waitForServer(url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });
  writeFileSync(join(tmpDir, 'to_jpeg.py'), PIL_SCRIPT);
  const profile = join(tmpDir, 'chrome-profile');
  mkdirSync(profile, { recursive: true });

  const server = spawn(process.execPath, [join(root, 'serve.ts')], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
  });
  try {
    const up = await waitForServer(`http://localhost:${PORT}/`);
    if (!up) throw new Error(`server did not come up on port ${PORT}`);

    for (const shot of shots) {
      const png = join(tmpDir, `${shot.name}.png`);
      const jpg = join(outDir, shot.name);
      const url = `http://localhost:${PORT}${shot.url}`;
      execFileSync(
        chrome,
        [
          '--headless=new',
          '--no-sandbox',
          '--disable-gpu',
          '--hide-scrollbars',
          `--user-data-dir=${profile}`,
          `--window-size=${shot.width},${shot.height}`,
          '--force-device-scale-factor=1',
          '--virtual-time-budget=12000',
          '--timeout=20000',
          `--screenshot=${png}`,
          url,
        ],
        { stdio: 'inherit', timeout: 60000 },
      );
      if (!existsSync(png)) throw new Error(`no screenshot written for ${shot.name}`);
      execFileSync('python3', [join(tmpDir, 'to_jpeg.py'), png, jpg], { stdio: 'inherit' });
      const st = statSync(jpg);
      if (st.size > 262144) throw new Error(`${shot.name} is ${st.size} bytes, over the 256 KiB cap`);
      console.log(`shot ${shot.name}: ${st.size} bytes`);
    }
  } finally {
    server.kill();
    rmSync(tmpDir, { recursive: true, force: true });
  }
  console.log(`done: ${shots.length} screenshots in ${outDir}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
