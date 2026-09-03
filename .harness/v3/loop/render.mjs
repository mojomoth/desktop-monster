#!/usr/bin/env node
// render.mjs — fill {{PLACEHOLDER}}s in a prompt template from a JSON object.
//   node render.mjs <template-path> <json-path-or-inline-json>   → stdout
// Unknown placeholders left in the template are an error (exit 1): a stale
// prompt must never reach a worker.
import { readFileSync, existsSync } from 'node:fs';

const [tpl, src] = process.argv.slice(2);
if (!tpl || !src) { process.stderr.write('usage: render.mjs <template> <json>\n'); process.exit(2); }
let text = readFileSync(tpl, 'utf8');
const values = JSON.parse(existsSync(src) ? readFileSync(src, 'utf8') : src);
for (const [k, v] of Object.entries(values)) text = text.split(`{{${k}}}`).join(String(v ?? ''));
const left = text.match(/\{\{[A-Z_]+\}\}/g);
if (left) { process.stderr.write(`render.mjs: unfilled placeholders: ${[...new Set(left)].join(' ')}\n`); process.exit(1); }
process.stdout.write(text);
