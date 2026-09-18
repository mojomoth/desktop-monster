// Standalone offline Chromium canvas diagnostic, not production E2E/performance.
const { app, BrowserWindow, session } = require('electron');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { createHash } = require('node:crypto');
const root = process.cwd(), out = __dirname;
const ts = require(path.join(root, 'node_modules/typescript'));
const hash = value => createHash('sha256').update(value).digest('hex');
const source = fs.readFileSync(path.join(root, 'src/renderer/sprites/sprite.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const exported = {}; new Function('exports', compiled)(exported);
const registry = require(path.join(root, 'dist/electron/renderer/sprites/index.js'));
const arts = [...registry.allSprites()];
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'desmon-v11-canvas-')));
app.whenReady().then(async () => {
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_, done) => done({ cancel: true }));
  const win = new BrowserWindow({ show: false, width: 400, height: 260, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false } });
  await win.loadURL('about:blank');
  const oldDraw = function(ctx, art, frame, x, y, opts) {
    const rows = art.frames[frame]; if (!rows) return;
    for (let ry = 0; ry < art.h; ry++) for (let rx = 0; rx < art.w; rx++) {
      const ch = rows[ry]?.charAt(opts.flipX ? art.w - 1 - rx : rx), color = art.palette[ch];
      if (!ch || ch === '.' || color === undefined) continue;
      ctx.fillStyle = opts.tint ?? color; ctx.fillRect(x + rx * opts.scale, y + ry * opts.scale, opts.scale, opts.scale);
    }
  };
  const test = function(arts, oldDraw, drawSprite) {
    const canvases = [document.createElement('canvas'), document.createElement('canvas')];
    canvases.forEach(c => { c.width = 200; c.height = 160; });
    const contexts = canvases.map(c => c.getContext('2d'));
    let cases = 0;
    for (const [name, art] of arts) for (let frame = 0; frame < art.frames.length; frame++) {
      for (const [x, y, scale] of [[-1, 2, 1], [3, 2, 2], [0, 0, 3], [0.5, 0, 2], [0, 0.5, 2], [0, 0, 1.5]]) {
        for (const flipX of [false, true]) for (const tint of [undefined, '#123456']) {
          contexts.forEach(c => c.clearRect(0, 0, 200, 160));
          oldDraw(contexts[0], art, frame, x, y, { scale, flipX, tint });
          drawSprite(contexts[1], art, frame, x, y, { scale, flipX, tint });
          const a = contexts[0].getImageData(0, 0, 200, 160).data;
          const b = contexts[1].getImageData(0, 0, 200, 160).data;
          for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) throw Error(JSON.stringify({ name, frame, x, y, scale, flipX, tint, byte: i }));
          cases++;
        }
      }
    }
    return { cases, registeredSprites: arts.length, passed: true, coverage: 'Real Canvas2D RGBA bytes; identity context as production; clipping, mirrors, tint, integer/fractional positions/scales' };
  };
  try {
    // Module-qualified constants in transpiled function are bound explicitly.
    const body = `const exports={TRANSPARENT:'.'};return (${test.toString()})(${JSON.stringify(arts)},${oldDraw.toString()},${exported.drawSprite.toString()});`;
    const result = await win.webContents.executeJavaScript(`(()=>{${body}})()`);
    const report = { ...result, at: new Date().toISOString(), runtime: process.versions, spriteSourceSha256: hash(source), scriptSha256: hash(fs.readFileSync(__filename)), atlasSha256: hash(JSON.stringify(arts)), diagnosticOnly: true };
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(result)); app.quit();
  } catch (error) { console.error(error); app.exit(1); }
}).catch(error => { console.error(error); app.exit(1); });
