// preview-shell.mjs — Electron main script that captures every `__v12` state of a preview page to PNG.
//   node_modules/.bin/electron .harness/v12/preview-shell.mjs <page.html> <outDir> [prefix]
// Offscreen window, no dock icon, no user data outside a temp dir, no network. Used by raid-preview.mjs only.
import { app, BrowserWindow } from 'electron';
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
const [page, outDir, prefix = ''] = process.argv.slice(2);
if (!page || !outDir) { console.error('usage: electron preview-shell.mjs <page.html> <outDir> [prefix]'); app.exit(64); }
app.setPath('userData', mkdtempSync(join(tmpdir(), 'desmon-v12-preview-')));
app.dock?.hide?.();
app.commandLine.appendSwitch('disable-gpu');
const sleep = ms => new Promise(r => setTimeout(r, ms));
app.whenReady().then(async () => {
  mkdirSync(outDir, { recursive: true });
  const win = new BrowserWindow({ show: false, width: 900, height: 700, useContentSize: true, backgroundColor: '#303040',
    webPreferences: { offscreen: true, contextIsolation: true, sandbox: true, nodeIntegration: false } });
  win.webContents.on('console-message', (_e, _l, message) => console.error('[page]', message));
  win.webContents.setFrameRate(30);
  await win.loadFile(resolve(page));
  const run = code => win.webContents.executeJavaScript(code, true);
  const states = await run('JSON.stringify(__v12.states)').then(JSON.parse);
  const written = [];
  for (const name of states) {
    const size = await run(`Promise.resolve(__v12.show(${JSON.stringify(name)})).then(s => JSON.stringify(s))`).then(JSON.parse);
    win.setContentSize(Math.max(1, Math.round(size.w)), Math.max(1, Math.round(size.h)));
    await run('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))'); await sleep(120);
    const image = await win.webContents.capturePage();
    const file = join(outDir, prefix + name + '.png'); writeFileSync(file, image.toPNG()); written.push(file);
  }
  console.log(JSON.stringify({ written }));
  app.exit(0);
}).catch(error => { console.error(error.stack || error); app.exit(1); });
