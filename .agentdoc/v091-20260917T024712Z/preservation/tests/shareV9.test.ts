import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encodeTrayIconPng } from '../src/main/trayIcon.js';
import type { ExportPngPayload } from '../src/shared/ipc.js';

const platform = vi.hoisted(() => ({ decode: vi.fn(), copy: vi.fn(), saveDialog: vi.fn(), write: vi.fn() }));
vi.mock('electron', () => ({
  nativeImage: { createFromDataURL: platform.decode },
  clipboard: { writeImage: platform.copy },
  dialog: { showSaveDialog: platform.saveDialog },
}));
vi.mock('node:fs/promises', () => ({ writeFile: platform.write }));
import { exportPng, parsePngRequest } from '../src/main/share.js';

// Production's dependency-free encoder generates a complete PNG with valid
// IHDR/IDAT/IEND chunks and CRCs, rather than a header-shaped placeholder.
const png = encodeTrayIconPng(Array.from({ length: 1200 }, () => 'p'.repeat(1200)), { p: [20, 12, 28, 255] });
const dataUrl = `data:image/png;base64,${png.toString('base64')}`;
const request = (patch: Partial<ExportPngPayload> = {}): ExportPngPayload => ({ destination: 'file', name: 'DesMon-hero', dataUrl, ...patch });
const image = { isEmpty: vi.fn(), getSize: vi.fn(), toPNG: vi.fn() };

beforeEach(() => {
  vi.resetAllMocks();
  image.isEmpty.mockReturnValue(false); image.getSize.mockReturnValue({ width: 1200, height: 1200 }); image.toPNG.mockReturnValue(png);
  platform.decode.mockReturnValue(image);
  platform.saveDialog.mockResolvedValue({ canceled: false, filePath: '/injected/export/DesMon-hero.png' });
  platform.write.mockResolvedValue(undefined);
});

describe('v0.9 main PNG boundary', () => {
  it('accepts a complete 1200×1200 PNG with an extensionless or .png filename', () => {
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(png.toString('ascii', png.length - 8, png.length - 4)).toBe('IEND');
    for (const name of ['DesMon-hero', 'DesMon-hero.png', 'DesMon-codex-monster-12']) {
      const input = request({ name }); expect(parsePngRequest(input)).toEqual(input);
    }
    expect(platform.decode).not.toHaveBeenCalled();
  });

  it('rejects unsafe names, unsupported destinations, oversized data and malformed PNG headers before native code', async () => {
    const tiny = encodeTrayIconPng(['p'], { p: [20, 12, 28, 255] });
    const badSize = `data:image/png;base64,${tiny.toString('base64')}`;
    const badSignature = Buffer.from(png); badSignature[0] = 0;
    const badChunk = Buffer.from(png); badChunk.write('TEXT', 12, 'ascii');
    const inputs: unknown[] = [null, undefined, [], {},
      ...['', '../secret', '/tmp/file', 'folder/file', 'folder\\file', 'secret.txt', 'x'.repeat(61)].map(name => request({ name })),
      { ...request(), destination: 'sns' }, request({ dataUrl: '' }), request({ dataUrl: 'https://example.invalid/image.png' }),
      request({ dataUrl: dataUrl.replace('image/png', 'image/jpeg') }), request({ dataUrl: 'data:image/png;base64,%%%!' }),
      request({ dataUrl: `data:image/png;base64,${png.subarray(0, 23).toString('base64')}` }), request({ dataUrl: badSize }),
      request({ dataUrl: `data:image/png;base64,${badSignature.toString('base64')}` }),
      request({ dataUrl: `data:image/png;base64,${badChunk.toString('base64')}` }),
      request({ dataUrl: `data:image/png;base64,${'A'.repeat(12_000_000)}` }),
    ];
    for (const value of inputs) {
      expect(parsePngRequest(value)).toBeNull();
      expect(await exportPng(value)).toEqual({ ok: false, error: '올바른 공유 이미지가 아닙니다.' });
    }
    expect(platform.decode).not.toHaveBeenCalled(); expect(platform.saveDialog).not.toHaveBeenCalled();
    expect(platform.write).not.toHaveBeenCalled(); expect(platform.copy).not.toHaveBeenCalled();
  });

  it('rejects a native decode failure or dimension mismatch even after the header passed', async () => {
    image.isEmpty.mockReturnValueOnce(true);
    expect(await exportPng(request())).toEqual({ ok: false, error: '이미지를 열지 못했습니다.' });
    image.getSize.mockReturnValueOnce({ width: 400, height: 260 });
    expect(await exportPng(request())).toEqual({ ok: false, error: '이미지를 열지 못했습니다.' });
    image.getSize.mockReturnValue({ width: 1200, height: 1199 });
    expect(await exportPng(request())).toEqual({ ok: false, error: '이미지를 열지 못했습니다.' });
    expect(platform.saveDialog).not.toHaveBeenCalled(); expect(platform.write).not.toHaveBeenCalled(); expect(platform.copy).not.toHaveBeenCalled();
  });
});

describe('v0.9 native PNG output', () => {
  it('saves only to the native dialog-selected location using decoded PNG bytes', async () => {
    const chosen = '/injected/export/Chosen image.png';
    platform.saveDialog.mockResolvedValueOnce({ canceled: false, filePath: chosen });
    expect(await exportPng(request())).toEqual({ ok: true });
    expect(platform.decode).toHaveBeenCalledExactlyOnceWith(dataUrl);
    expect(platform.saveDialog).toHaveBeenCalledExactlyOnceWith({ title: '공유 이미지 저장', defaultPath: 'DesMon-hero.png',
      filters: [{ name: 'PNG 이미지', extensions: ['png'] }] });
    expect(platform.write).toHaveBeenCalledExactlyOnceWith(chosen, png);
    expect(image.toPNG).toHaveBeenCalledTimes(1); expect(platform.copy).not.toHaveBeenCalled();
  });

  it('does not duplicate .png when a filename already includes the extension', async () => {
    expect(await exportPng(request({ name: 'DesMon-hero.png' }))).toEqual({ ok: true });
    expect(platform.saveDialog).toHaveBeenCalledWith(expect.objectContaining({ defaultPath: 'DesMon-hero.png' }));
  });

  it('copies the decoded image without opening a file dialog or writing a file', async () => {
    expect(await exportPng(request({ destination: 'clipboard' }))).toEqual({ ok: true });
    expect(platform.copy).toHaveBeenCalledExactlyOnceWith(image);
    expect(platform.saveDialog).not.toHaveBeenCalled(); expect(platform.write).not.toHaveBeenCalled(); expect(image.toPNG).not.toHaveBeenCalled();
  });

  it('treats cancellation and an absent path as canceled and performs no write', async () => {
    platform.saveDialog.mockResolvedValueOnce({ canceled: true, filePath: '/must-not-write.png' });
    expect(await exportPng(request())).toEqual({ ok: false, canceled: true });
    platform.saveDialog.mockResolvedValueOnce({ canceled: false });
    expect(await exportPng(request())).toEqual({ ok: false, canceled: true });
    expect(platform.write).not.toHaveBeenCalled(); expect(platform.copy).not.toHaveBeenCalled();
  });

  it('reports disk failures honestly and permits a successful retry', async () => {
    platform.write.mockRejectedValueOnce(new Error('disk full'));
    expect(await exportPng(request())).toEqual({ ok: false, error: '이미지를 저장하지 못했습니다. 위치와 권한을 확인하세요.' });
    expect(await exportPng(request())).toEqual({ ok: true });
    expect(platform.write).toHaveBeenCalledTimes(2);
  });

  it('contains platform exceptions from decode, dialog and clipboard', async () => {
    platform.decode.mockImplementationOnce(() => { throw new Error('decode'); });
    expect((await exportPng(request())).ok).toBe(false);
    platform.saveDialog.mockRejectedValueOnce(new Error('dialog'));
    expect((await exportPng(request())).ok).toBe(false);
    platform.copy.mockImplementationOnce(() => { throw new Error('clipboard'); });
    expect((await exportPng(request({ destination: 'clipboard' }))).ok).toBe(false);
    expect(platform.write).not.toHaveBeenCalled();
  });
});
