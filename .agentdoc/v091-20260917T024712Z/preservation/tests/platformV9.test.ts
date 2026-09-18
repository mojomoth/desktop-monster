import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { initializeSteam } from '../src/main/steam.js';
describe('optional Steam initialization and Windows preparation', () => {
  it('never loads native Steam for missing/invalid AppID or smoke', () => {
    const load = vi.fn();
    for (const appId of [undefined, '', '0', '-1', '1.5', 'abc', '4294967296']) expect(initializeSteam({ appId, load }).state).toBe('disabled');
    expect(initializeSteam({ appId: '480', smoke: true, load }).state).toBe('disabled');
    expect(load).not.toHaveBeenCalled();
  });
  it('initializes once with a valid AppID, identifies the local player and tolerates an unavailable SDK', () => {
    const init = vi.fn(() => ({ localplayer: { getSteamId: () => ({ steamId64: 123n }), getName: () => 'Knight' } }));
    expect(initializeSteam({ appId: '480', load: () => ({ init }) })).toEqual({ state: 'connected', name: 'Knight', steamId: '123' });
    expect(init).toHaveBeenCalledExactlyOnceWith(480);
    expect(initializeSteam({ appId: '480', load: () => { throw Error('Steam not running'); } })).toEqual({ state: 'unavailable' });
  });
  it('keeps mac contracts while packaging native Windows SDK artifacts and preserving uninstall data', () => {
    const p = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string,string>; build: { asarUnpack: string[]; files: string[]; nsis: {deleteAppDataOnUninstall:boolean} } };
    expect(p.scripts.package).toBe('npm run build && CSC_IDENTITY_AUTO_DISCOVERY=false electron-builder --mac');
    expect(p.scripts['package:win']).toBe('node scripts/windows.mjs package');
    expect(p.build.asarUnpack).toContain('**/steamworks.js/dist/**');
    expect(p.build.files).toContain('!**/steam_appid.txt');
    expect(p.build.nsis.deleteAppDataOnUninstall).toBe(false);
  });
});
