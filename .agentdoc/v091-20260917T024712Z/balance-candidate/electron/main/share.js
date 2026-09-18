"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePngRequest = parsePngRequest;
exports.exportPng = exportPng;
const electron_1 = require("electron");
const promises_1 = require("node:fs/promises");
function parsePngRequest(value) {
    if (!value || typeof value !== 'object')
        return null;
    const p = value;
    if ((p.destination !== 'file' && p.destination !== 'clipboard') || typeof p.name !== 'string' ||
        !/^[a-zA-Z0-9_-]{1,60}(?:\.png)?$/.test(p.name) || typeof p.dataUrl !== 'string' || p.dataUrl.length > 12_000_000 ||
        !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(p.dataUrl))
        return null;
    const data = Buffer.from(p.dataUrl.slice('data:image/png;base64,'.length), 'base64');
    if (data.length < 24 || data.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' ||
        data.toString('ascii', 12, 16) !== 'IHDR' || data.readUInt32BE(16) !== 1200 || data.readUInt32BE(20) !== 1200)
        return null;
    return p;
}
async function exportPng(value) {
    const payload = parsePngRequest(value);
    if (!payload)
        return { ok: false, error: '올바른 공유 이미지가 아닙니다.' };
    try {
        const image = electron_1.nativeImage.createFromDataURL(payload.dataUrl);
        if (image.isEmpty() || image.getSize().width !== 1200 || image.getSize().height !== 1200)
            return { ok: false, error: '이미지를 열지 못했습니다.' };
        if (payload.destination === 'clipboard') {
            electron_1.clipboard.writeImage(image);
            return { ok: true };
        }
        const result = await electron_1.dialog.showSaveDialog({ title: '공유 이미지 저장', defaultPath: payload.name.endsWith('.png') ? payload.name : `${payload.name}.png`, filters: [{ name: 'PNG 이미지', extensions: ['png'] }] });
        if (result.canceled || !result.filePath)
            return { ok: false, canceled: true };
        await (0, promises_1.writeFile)(result.filePath, image.toPNG());
        return { ok: true };
    }
    catch {
        return { ok: false, error: '이미지를 저장하지 못했습니다. 위치와 권한을 확인하세요.' };
    }
}
