"use strict";
// Save-file persistence (SPEC F22, main half). Deliberately electron-free:
// the userData directory is injected (src/main/ipc.ts passes
// `app.getPath('userData')`), which lets vitest exercise real filesystem
// round-trips. NEVER throws — a missing/corrupt save must never prevent boot.
// Parsing/validating the CONTENT is core's job (SaveFileV1 lands in T08).
Object.defineProperty(exports, "__esModule", { value: true });
exports.SAVE_FILE_NAME = void 0;
exports.saveFilePath = saveFilePath;
exports.readSaveFile = readSaveFile;
exports.readSaveFileResult = readSaveFileResult;
exports.writeSaveFile = writeSaveFile;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
exports.SAVE_FILE_NAME = 'save.json';
/** Absolute path of save.json inside the given userData directory. */
function saveFilePath(userDataDir) {
    return (0, node_path_1.join)(userDataDir, exports.SAVE_FILE_NAME);
}
/**
 * Read and JSON-parse save.json. Returns the raw parsed value, or null on ANY
 * error (missing file, unreadable, corrupt JSON, ...).
 */
function readSaveFile(userDataDir) {
    try {
        return JSON.parse((0, node_fs_1.readFileSync)(saveFilePath(userDataDir), 'utf8'));
    }
    catch {
        return null;
    }
}
/** Disk failures must not silently become a new game that overwrites the original. */
function readSaveFileResult(userDataDir) {
    let text;
    try {
        text = (0, node_fs_1.readFileSync)(saveFilePath(userDataDir), 'utf8');
    }
    catch (error) {
        return error.code === 'ENOENT'
            ? { kind: 'missing' } : { kind: 'error', reason: 'read' };
    }
    let value;
    try {
        value = JSON.parse(text);
    }
    catch {
        return { kind: 'error', reason: 'format' };
    }
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return { kind: 'error', reason: 'format' };
    if (![1, 2, 3].includes(value.version))
        return { kind: 'error', reason: 'unsupported-version' };
    return { kind: 'loaded', value };
}
/**
 * Atomically persist `data` as JSON: write a tmp file in the same directory,
 * then rename it over save.json — rename on the same volume is atomic, so a
 * crash mid-write can never leave a truncated save.json behind. Creates the
 * directory if missing. Returns false (never throws) on any error.
 */
function writeSaveFile(userDataDir, data) {
    const target = saveFilePath(userDataDir);
    const tmp = `${target}.tmp`;
    try {
        (0, node_fs_1.mkdirSync)(userDataDir, { recursive: true });
        (0, node_fs_1.writeFileSync)(tmp, JSON.stringify(data), 'utf8');
        (0, node_fs_1.renameSync)(tmp, target);
        return true;
    }
    catch {
        try {
            (0, node_fs_1.unlinkSync)(tmp);
        }
        catch {
            // best effort: the tmp file may never have been created
        }
        return false;
    }
}
