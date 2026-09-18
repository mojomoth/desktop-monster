"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCALE_LABELS = exports.GAME_SCALES = void 0;
exports.isGameScale = isGameScale;
exports.readGameScale = readGameScale;
exports.readSettings = readSettings;
exports.writeGameScale = writeGameScale;
exports.updateSettings = updateSettings;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
/** Multipliers relative to the original 400×260 overlay. */
exports.GAME_SCALES = [2, 1.5, 1, 2 / 3, 1 / 2];
exports.SCALE_LABELS = ['2×', '1.5×', '1× (기본)', '2/3×', '1/2×'];
function isGameScale(value) {
    return typeof value === 'number' && exports.GAME_SCALES.includes(value);
}
/** Preferences are separate from progress, so Reset Progress keeps the scale. */
function readGameScale(userDataDir) {
    return readSettings(userDataDir).gameScale;
}
/** Legacy saves retain the pre-v0.8 automatic input connection. */
function readSettings(userDataDir, legacySave = false) {
    const settings = { gameScale: 1, muted: false, screenShake: true,
        welcomeSeen: legacySave, globalInputRequested: legacySave };
    try {
        const raw = JSON.parse((0, node_fs_1.readFileSync)((0, node_path_1.join)(userDataDir, 'settings.json'), 'utf8'));
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
            const object = raw;
            if (isGameScale(object['gameScale']))
                settings.gameScale = object['gameScale'];
            for (const key of ['muted', 'screenShake', 'welcomeSeen', 'globalInputRequested']) {
                if (typeof object[key] === 'boolean')
                    settings[key] = object[key];
            }
        }
    }
    catch {
        // Missing or malformed preferences cannot prevent safe local play.
    }
    return settings;
}
function writeGameScale(userDataDir, gameScale) {
    return updateSettings(userDataDir, { gameScale }).ok;
}
/** Validate the whole patch before one atomic write; failure preserves prior preferences. */
function updateSettings(userDataDir, patch, legacySave = false) {
    const previous = readSettings(userDataDir, legacySave);
    if (!patch || typeof patch !== 'object' || Array.isArray(patch))
        return { ok: false, settings: previous };
    const entries = Object.entries(patch);
    if (!entries.length || entries.some(([key, value]) => key === 'gameScale' ? !isGameScale(value)
        : !['muted', 'screenShake', 'welcomeSeen', 'globalInputRequested'].includes(key) || typeof value !== 'boolean')) {
        return { ok: false, settings: previous };
    }
    const settings = { ...previous, ...patch };
    try {
        (0, node_fs_1.mkdirSync)(userDataDir, { recursive: true });
        const file = (0, node_path_1.join)(userDataDir, 'settings.json');
        (0, node_fs_1.writeFileSync)(`${file}.tmp`, JSON.stringify(settings), 'utf8');
        (0, node_fs_1.renameSync)(`${file}.tmp`, file);
        return { ok: true, settings };
    }
    catch {
        return { ok: false, settings: previous };
    }
}
