// Screenshot + play-test driver for Neon Coast (Node 22+, stdlib only).
// Drives the local headless Chromium over --remote-debugging-pipe (CDP over
// stdio) and loads the app straight from file:// — the app is fully offline,
// so file:// renders it exactly as a static server would. For every row of
// shots.json it waits for window.__shotReady, then captures a JPEG into
// screenshots/. Afterwards it play-tests the editor for real: loads the sample
// photos, edits the caption, and exports a PNG in all three post sizes,
// checking each download's PNG dimensions. Console errors, exceptions and
// failed requests are collected and reported; the process exits non-zero if
// any appear.
//
//   node render-shots.mjs
//
// Chrome: /opt/meta-chromium/chrome (override with CHROME env var). This
// Chromium build refuses to start without a Hatch WebGL domain policy, so the
// script writes a v1 policy file (example.com) plus its SHA-256 and passes
// both switches; the app uses 2D canvas only, so the policy is just the
// startup contract the binary wants.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const CHROME = process.env.CHROME ?? '/opt/meta-chromium/chrome';
const shots = JSON.parse(readFileSync(join(here, 'shots.json'), 'utf8'));
const outDir = join(here, 'screenshots');
const playDir = '/tmp/neon-coast-playtest';
mkdirSync(outDir, { recursive: true });
mkdirSync(playDir, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function pngSize(buf) {
  if (buf.subarray(1, 4).toString() !== 'PNG') return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

async function main() {
  const errors = [];
  // WebGL domain policy for the local Chromium build (see the chrome spawn below).
  const policyFile = '/tmp/neon-coast-webgl-policy.txt';
  writeFileSync(policyFile, 'hatch-webgl-allowed-domains-v1\nexample.com\n');
  const policySha = createHash('sha256').update(readFileSync(policyFile)).digest('hex');
  const chrome = spawn(CHROME, [
    '--headless=new', '--no-sandbox', '--disable-gpu',
    '--allow-file-access-from-files',
    `--hatch-webgl-allowed-domains-file=${policyFile}`,
    `--hatch-webgl-allowed-domains-sha256=${policySha}`,
    '--remote-debugging-pipe', '--user-data-dir=/tmp/neon-coast-chrome',
    '--password-store=basic', '--use-mock-keychain', 'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe', 'pipe', 'pipe'] });
  const input = chrome.stdio[3];
  const output = chrome.stdio[4];
  let buf = '';
  let id = 0;
  const pending = new Map();
  const consoleErrors = [];
  const failedRequests = [];
  output.on('data', (d) => {
    buf += d.toString();
    let idx;
    while ((idx = buf.indexOf('\0')) !== -1) {
      const raw = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (!raw.trim()) continue;
      let msg;
      try { msg = JSON.parse(raw); } catch { continue; }
      if (msg.id && pending.has(msg.id)) {
        const p = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        consoleErrors.push(`exception: ${msg.params.exceptionDetails.text} ${(msg.params.exceptionDetails.exception?.description ?? '').slice(0, 300)}`);
      } else if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) {
        consoleErrors.push(`${msg.params.type}: ${msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300)}`);
      } else if (msg.method === 'Network.loadingFailed') {
        failedRequests.push(msg.params.errorText);
      }
    }
  });
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, { resolve, reject });
    input.write(JSON.stringify({ id: mid, method, params, sessionId }) + '\0');
  });
  try {
    const { targetInfos } = await send('Target.getTargets');
    const page = targetInfos.find((t) => t.type === 'page');
    const { sessionId } = await send('Target.attachToTarget', { targetId: page.targetId, flatten: true });
    const psend = (method, params = {}) => send(method, params, sessionId);
    await psend('Runtime.enable');
    await psend('Page.enable');
    await psend('Network.enable');
    const evalJs = async (expression) => {
      const r = await psend('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(`${r.exceptionDetails.text} ${(r.exceptionDetails.exception?.description ?? '').slice(0, 300)}`);
      return r.result?.value;
    };
    const appUrl = (query) => `${pathToFileURL(join(here, 'app', 'index.html')).href}${query ?? ''}`;

    async function goto(url, w, h) {
      await psend('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
      await psend('Page.navigate', { url });
      for (let i = 0; i < 60; i++) {
        await sleep(250);
        if (await evalJs('window.__shotReady === true')) return;
      }
      throw new Error(`__shotReady never fired for ${url}`);
    }

    for (const shot of shots) {
      await goto(appUrl(shot.query), shot.w, shot.h);
      const { data } = await psend('Page.captureScreenshot', { format: 'jpeg', quality: 80 });
      writeFileSync(join(outDir, shot.name), Buffer.from(data, 'base64'));
      console.log(`shot ${shot.name} (${shot.w}x${shot.h})`);
    }

    // ---- Play-test: real user flow in the editor, no ?shot= scene. ----
    await psend('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
    await psend('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: playDir });
    await psend('Page.navigate', { url: appUrl('') });
    await sleep(1000);
    const loaded = await evalJs(`(async () => {
      document.getElementById('useSamples').click();
      await new Promise(r => setTimeout(r, 600));
      return document.getElementById('status').textContent;
    })()`);
    console.log('play-test samples:', loaded);
    const edited = await evalJs(`(() => {
      const t = document.getElementById('title');
      t.value = 'Midnight Run';
      t.dispatchEvent(new Event('input', { bubbles: true }));
      const s = document.getElementById('subtitle');
      s.value = 'chrome, neon and salt air';
      s.dispatchEvent(new Event('input', { bubbles: true }));
      return document.getElementById('title').value;
    })()`);
    console.log('play-test caption edited to:', edited);
    const sizes = [['square', 1080, 1080], ['portrait', 1080, 1350], ['wide', 1920, 1080]];
    for (const [key, w, h] of sizes) {
      await evalJs(`document.querySelector('[data-size="${key}"]').click()`);
      await sleep(300);
      await evalJs(`document.getElementById('export').click()`);
      await sleep(1200);
      const name = `neon-coast-${w}x${h}.png`;
      const path = join(playDir, name);
      if (!existsSync(path)) throw new Error(`export missing: ${name}`);
      const size = pngSize(readFileSync(path));
      console.log(`play-test export ${name}: ${size?.w}x${size?.h} ${size?.w === w && size?.h === h ? 'OK' : 'MISMATCH'}`);
      if (!size || size.w !== w || size.h !== h) errors.push(`export size mismatch ${name}`);
    }
    const switched = await evalJs(`(() => {
      document.querySelector('[data-layout="slanted"]').click();
      document.querySelector('[data-grade="heat"]').click();
      document.getElementById('ink').click();
      document.querySelector('[data-size="square"]').click();
      return document.querySelector('[data-layout="slanted"]').classList.contains('active')
        && document.querySelector('[data-grade="heat"]').classList.contains('active')
        && document.getElementById('ink').checked;
    })()`);
    console.log('play-test layout/grade/ink switch:', switched ? 'OK' : 'FAIL');
    if (!switched) errors.push('layout/grade/ink switch failed');
    const castEdited = await evalJs(`(() => {
      const n = document.getElementById('castName0');
      n.value = 'RICO';
      n.dispatchEvent(new Event('input', { bubbles: true }));
      return document.getElementById('castName0').value;
    })()`);
    console.log('play-test cast edited to:', castEdited);
    if (castEdited !== 'RICO') errors.push('cast edit failed');
    await evalJs(`document.getElementById('exportAll').click()`);
    await sleep(3000);
    for (const [w, h] of [[1080, 1080], [1080, 1350], [1920, 1080]]) {
      const name = `neon-coast-all-${w}x${h}.png`;
      const path = join(playDir, name);
      if (!existsSync(path)) throw new Error(`export-all missing: ${name}`);
      const size = pngSize(readFileSync(path));
      console.log(`play-test export-all ${name}: ${size?.w}x${size?.h} ${size?.w === w && size?.h === h ? 'OK' : 'MISMATCH'}`);
      if (!size || size.w !== w || size.h !== h) errors.push(`export-all size mismatch ${name}`);
    }

    console.log(`console errors: ${consoleErrors.length}`, consoleErrors);
    console.log(`failed network requests: ${failedRequests.length}`, failedRequests);
    if (consoleErrors.length) errors.push(...consoleErrors);
    if (failedRequests.length) errors.push(...failedRequests);
  } finally {
    chrome.kill();
  }
  for (const f of readdirSync(outDir)) {
    console.log(`screenshot ${f}: ${readFileSync(join(outDir, f)).length} bytes`);
  }
  if (errors.length) {
    console.error('PLAY-TEST FAILURES:', errors);
    process.exit(1);
  }
  console.log('render-shots: all shots + play-test passed');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
