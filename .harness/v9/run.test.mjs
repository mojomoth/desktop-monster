import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { verified, ROOT } from './run.mjs';
test('verification rejects missing, failed, stale and modified evidence',()=>{
  const dir=mkdtempSync(join(tmpdir(),'desmon-v9-harness-'));
  try {
    const log=join(dir,'raw.log');writeFileSync(log,'pass');
    const checks=['ac','gates'].map(id=>({id,exitCode:0,before:'a',after:'a',log,logHash:createHash('sha256').update('pass').digest('hex')}));
    assert.ok(ROOT.endsWith('desktop-monster'));assert.ok(verified(checks,'a'));assert.ok(!verified(checks,'b'));
    assert.ok(!verified(checks.slice(0,1),'a'));assert.ok(!verified(checks.map(c=>({...c,exitCode:1})),'a'));
    writeFileSync(log,'changed');assert.ok(!verified(checks,'a'));
  } finally{rmSync(dir,{recursive:true,force:true});}
});
