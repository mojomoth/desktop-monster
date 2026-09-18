"use strict";
// Player identity persistence (SPEC F47; SERVER_ARCHITECTURE §6). Same shape as
// persistence.ts: electron-free, the userData directory and randomUUID are
// injected, and nothing here ever throws — a corrupt identity.json must never
// prevent boot. The auth token lives ONLY in this file: never in save.json,
// never in an IPC payload.
Object.defineProperty(exports, "__esModule", { value: true });
exports.IDENTITY_FILE_NAME = void 0;
exports.parsePvpHistory = parsePvpHistory;
exports.recordPvpHistory = recordPvpHistory;
exports.identityFilePath = identityFilePath;
exports.defaultName = defaultName;
exports.isValidName = isValidName;
exports.readIdentity = readIdentity;
exports.writeIdentity = writeIdentity;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const api_js_1 = require("../shared/api.js");
exports.IDENTITY_FILE_NAME = 'identity.json';
function parsePvpHistory(value) {
    const raw = typeof value === 'object' && value !== null ? value : {};
    const count = (v) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? v : 0;
    return { wins: count(raw.wins), losses: count(raw.losses),
        // The server consumes each match once; this durable recent window also
        // handles concurrent duplicate callbacks and reconnect retries locally.
        matchIds: Array.isArray(raw.matchIds) ? [...new Set(raw.matchIds.filter((id) => typeof id === 'string' && id.length > 0 && id.length <= 128))].slice(-100) : [] };
}
function recordPvpHistory(history, matchId, won) {
    if (matchId.length === 0 || matchId.length > 128 || history.matchIds.includes(matchId))
        return history;
    return { wins: Math.min(Number.MAX_SAFE_INTEGER, history.wins + (won ? 1 : 0)),
        losses: Math.min(Number.MAX_SAFE_INTEGER, history.losses + (won ? 0 : 1)), matchIds: [...history.matchIds, matchId].slice(-100) };
}
/** Absolute path of identity.json inside the given userData directory. */
function identityFilePath(userDataDir) {
    return (0, node_path_1.join)(userDataDir, exports.IDENTITY_FILE_NAME);
}
/** A fresh unregistered nickname: 'Knight-' + the first 4 chars of a uuid. */
function defaultName(randomUUID) {
    return `Knight-${randomUUID().slice(0, 4)}`;
}
/** True when `name` satisfies the nickname rule (1–16 of A–Z a–z 0–9 _ -). */
function isValidName(name) {
    return typeof name === 'string' && api_js_1.NICK_RE.test(name);
}
/**
 * Read identity.json. Missing, unreadable, corrupt or wrongly shaped content
 * yields a fresh `{ name: 'Knight-xxxx', playerId: null, token: null,
 * notifiedTheftIds: [] }`. Never throws.
 */
function readIdentity(dir, randomUUID) {
    let raw = null;
    try {
        raw = JSON.parse((0, node_fs_1.readFileSync)(identityFilePath(dir), 'utf8'));
    }
    catch {
        raw = null;
    }
    const o = (typeof raw === 'object' && raw !== null ? raw : {});
    return {
        name: isValidName(o.name) ? o.name : defaultName(randomUUID),
        playerId: typeof o.playerId === 'string' ? o.playerId : null,
        token: typeof o.token === 'string' ? o.token : null,
        notifiedTheftIds: Array.isArray(o.notifiedTheftIds)
            ? o.notifiedTheftIds.filter((id) => typeof id === 'string')
            : [],
        ...(o.pvpHistory !== undefined ? { pvpHistory: parsePvpHistory(o.pvpHistory) } : {}),
    };
}
/** Atomically persist `identity` (tmp + rename). Returns false, never throws. */
function writeIdentity(dir, identity) {
    const target = identityFilePath(dir);
    const tmp = `${target}.tmp`;
    try {
        (0, node_fs_1.mkdirSync)(dir, { recursive: true });
        (0, node_fs_1.writeFileSync)(tmp, JSON.stringify(identity), 'utf8');
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
