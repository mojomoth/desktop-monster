import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SAVE } from '../src/core/index.js';
import { IPC } from '../src/shared/ipc.js';
import { readSaveFileResult } from '../src/main/persistence.js';
import { readSettings, updateSettings, writeGameScale } from '../src/main/settings.js';
import { onceGlobalInput } from '../src/main/globalInput.js';

const fake = vi.hoisted(() => ({
  directory: '', handlers: new Map<string, (...args: unknown[]) => unknown>(),
  events: new Map<string, (...args: unknown[]) => unknown>(),
  game: { id: 1, send: vi.fn(), getURL: () => 'file:///app/static/index.html' }, menu: { id: 2, send: vi.fn(), getURL: () => 'file:///app/static/menu.html' },
  onSave: vi.fn(), network: vi.fn(), createClient: vi.fn(),
  identity: { name: 'Test', playerId: null, online: false },
}));
vi.mock('electron', () => ({
  app: { getPath: () => fake.directory, quit: vi.fn() },
  shell: { openExternal: vi.fn(), openPath: vi.fn() },
  BrowserWindow: { getAllWindows: () => [{webContents:fake.game},{webContents:fake.menu}] },
  ipcMain: {
    handle: (key:string,fn:(...args:unknown[])=>unknown) => fake.handlers.set(key,fn),
    on: (key:string,fn:(...args:unknown[])=>unknown) => fake.events.set(key,fn),
  },
}));
vi.mock('../src/main/net.js', () => ({
  createNetClient: fake.createClient,
  createNetSession: () => ({ identity: () => fake.identity, pvpHistory: () => ({wins:0,losses:0}),
    onSave: fake.onSave, setName:fake.network, leaderboard:fake.network, opponents:fake.network,
    match:fake.network,pvp:fake.network,thefts:fake.network,reclaim:fake.network }),
}));
import { getSaveStatus, registerIpcHandlers } from '../src/main/ipc.js';

beforeEach(() => {
  vi.clearAllMocks(); fake.handlers.clear(); fake.events.clear();
  fake.directory=mkdtempSync(join(tmpdir(),'desmon-v08-test-'));
});
afterEach(() => rmSync(fake.directory,{recursive:true,force:true}));
const call=(key:string,data?:unknown):unknown=>fake.handlers.get(key)!({sender:fake.game},data,0);

describe('v0.8 shared preferences and input start', () => {
  it('retains every preference when scale and other fields are edited in either order', () => {
    expect(updateSettings(fake.directory,{muted:true,screenShake:false,welcomeSeen:true,globalInputRequested:false}).ok).toBe(true);
    expect(writeGameScale(fake.directory,1.5)).toBe(true);
    expect(readSettings(fake.directory,true)).toEqual({gameScale:1.5,muted:true,screenShake:false,welcomeSeen:true,globalInputRequested:false});
    expect(updateSettings(fake.directory,{muted:false}).settings.gameScale).toBe(1.5);
  });
  it('distinguishes new and legacy defaults and preserves an explicit fallback after a save exists', () => {
    expect(readSettings(fake.directory).globalInputRequested).toBe(false);
    expect(readSettings(fake.directory,true).globalInputRequested).toBe(true);
    updateSettings(fake.directory,{welcomeSeen:true,globalInputRequested:false});
    writeFileSync(join(fake.directory,'save.json'),JSON.stringify(DEFAULT_SAVE));
    expect(readSettings(fake.directory,true).globalInputRequested).toBe(false);
  });
  it('rejects malformed patches atomically and reports filesystem failures without changing prior values', () => {
    updateSettings(fake.directory,{muted:true});
    const previous=readFileSync(join(fake.directory,'settings.json'),'utf8');
    for(const patch of [null,[],{}, {muted:0}, {muted:false,extra:true},{gameScale:NaN}, {screenShake:'false'}]) {
      expect(updateSettings(fake.directory,patch).ok).toBe(false);
      expect(readFileSync(join(fake.directory,'settings.json'),'utf8')).toBe(previous);
    }
    mkdirSync(join(fake.directory,'settings.json.tmp'));
    expect(updateSettings(fake.directory,{muted:false})).toMatchObject({ok:false,settings:{muted:true}});
    expect(readFileSync(join(fake.directory,'settings.json'),'utf8')).toBe(previous);
  });
  it('does not start until requested, starts once across repeated clicks, and cleans up the same owner', () => {
    const controller={getMode:()=>({mode:'fallback' as const,accessibilityGranted:false}),stop:vi.fn()};
    const start=vi.fn(()=>controller); const connection=onceGlobalInput(start);
    expect(start).not.toHaveBeenCalled();
    expect(connection.start()).toBe(controller);expect(connection.start()).toBe(controller);
    expect(start).toHaveBeenCalledTimes(1);connection.stop();expect(controller.stop).toHaveBeenCalledTimes(1);
  });
});

describe('v0.8 save protection and last save status', () => {
  it('distinguishes absence, valid legacy/current formats, malformed JSON and unsupported formats', () => {
    expect(readSaveFileResult(fake.directory)).toEqual({kind:'missing'});
    for(const version of [1,2,3]) {
      writeFileSync(join(fake.directory,'save.json'),JSON.stringify({...DEFAULT_SAVE,version}));
      expect(readSaveFileResult(fake.directory)).toMatchObject({kind:'loaded',value:{version}});
    }
    for(const raw of ['{','null','[]','3','{}','{"version":5}']) {
      writeFileSync(join(fake.directory,'save.json'),raw);
      expect(readSaveFileResult(fake.directory).kind).toBe('error');
      expect(readFileSync(join(fake.directory,'save.json'),'utf8')).toBe(raw);
    }
    rmSync(join(fake.directory,'save.json'));mkdirSync(join(fake.directory,'save.json'));
    expect(readSaveFileResult(fake.directory)).toEqual({kind:'error',reason:'read'});
  });
  it('blocks every mutation and online call after an invalid existing save without changing any original byte', async () => {
    const file=join(fake.directory,'save.json');writeFileSync(file,'{broken');
    registerIpcHandlers();
    expect(getSaveStatus()).toEqual({state:'load-error',reason:'format'});
    expect(fake.createClient).toHaveBeenCalledWith({baseUrl:''});
    expect(call(IPC.LOAD_STATE)).toBeNull();
    expect(call(IPC.SAVE_STATE,DEFAULT_SAVE)).toBe(false);
    call(IPC.MENU_ACTION,{type:'consume',targetId:'c1',foodId:'c2'});
    call(IPC.SET_NAME,{name:'Changed'});
    for(const key of [IPC.LEADERBOARD,IPC.PVP_OPPONENTS,IPC.PVP_MATCH,IPC.PVP,IPC.THEFTS,IPC.RECLAIM]) {
      expect(await call(key,{})).toEqual({ok:false,error:'offline'});
    }
    expect(fake.onSave).not.toHaveBeenCalled();expect(fake.network).not.toHaveBeenCalled();
    expect(fake.game.send.mock.calls).toEqual([[IPC.ACTION_RESULT, {
      action: {type:'consume',targetId:'c1',foodId:'c2'}, ok:false, error:expect.any(String),
    }]]);
    expect(readFileSync(file,'utf8')).toBe('{broken');
  });
  it('uses the verified startup snapshot even if the disk becomes unreadable before the renderer asks', () => {
    const file=join(fake.directory,'save.json');writeFileSync(file,JSON.stringify({...DEFAULT_SAVE,coins:'321'}));
    registerIpcHandlers();writeFileSync(file,'{broken');
    expect(call(IPC.LOAD_STATE)).toMatchObject({coins:'321'});
    expect(readFileSync(file,'utf8')).toBe('{broken');
  });
  it('does not create progress if fresh preferences could not be persisted', () => {
    registerIpcHandlers({initialSave:{kind:'missing'},startupError:'settings-write'});
    expect(getSaveStatus()).toEqual({state:'load-error',reason:'settings-write'});
    expect(call(IPC.SAVE_STATE,DEFAULT_SAVE)).toBe(false);
    expect(readSaveFileResult(fake.directory)).toEqual({kind:'missing'});
  });
  it('keeps write failure through menu reopen and state reads, and clears it only after a real successful retry', () => {
    const file=join(fake.directory,'save.json');writeFileSync(file,JSON.stringify(DEFAULT_SAVE));
    registerIpcHandlers();mkdirSync(join(fake.directory,'save.json.tmp'));
    expect(call(IPC.SAVE_STATE,{...DEFAULT_SAVE,coins:'99'})).toBe(false);
    expect(call(IPC.GET_SAVE_STATUS)).toEqual({state:'write-error'});
    fake.events.get(IPC.MENU_READY)!({sender:fake.menu});call(IPC.LOAD_STATE);
    expect(fake.menu.send).toHaveBeenCalledWith(IPC.SAVE_STATUS,{state:'write-error'});
    expect(call(IPC.GET_SAVE_STATUS)).toEqual({state:'write-error'});
    expect(fake.onSave).not.toHaveBeenCalled();
    rmSync(join(fake.directory,'save.json.tmp'),{recursive:true});
    expect(call(IPC.SAVE_STATE,{...DEFAULT_SAVE,coins:'99'})).toBe(true);
    expect(getSaveStatus()).toEqual({state:'ready'});
    expect(JSON.parse(readFileSync(file,'utf8')).coins).toBe('99');
    expect(call(IPC.LOAD_STATE)).toMatchObject({coins:'99'});
    expect(fake.menu.send).toHaveBeenCalledWith(IPC.SAVE_STATUS,{state:'ready'});
    expect(fake.onSave).toHaveBeenCalledTimes(1);
  });
});
