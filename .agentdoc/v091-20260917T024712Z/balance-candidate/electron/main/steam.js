"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSteam = initializeSteam;
// Optional main-only Steam initialization. No renderer Node access, overlay
// invalidation, account migration or Steam requirement for ordinary play.
const node_module_1 = require("node:module");
const loadSteam = (0, node_module_1.createRequire)(__filename);
function initializeSteam(options) {
    if (options.smoke || !options.appId || !/^[1-9]\d{0,9}$/.test(options.appId))
        return { state: 'disabled' };
    const appId = Number(options.appId);
    if (!Number.isSafeInteger(appId) || appId > 0xffffffff)
        return { state: 'disabled' };
    try {
        // Native Steam API has no stdlib/Electron equivalent (ponytail rung 5).
        const binding = (options.load ?? (() => loadSteam('steamworks.js')))();
        const client = binding.init(appId);
        const steamId = client.localplayer.getSteamId().steamId64;
        if (typeof steamId !== 'bigint' || steamId <= 0n)
            return { state: 'unavailable' };
        return { state: 'connected', name: client.localplayer.getName().slice(0, 128), steamId: steamId.toString() };
    }
    catch {
        return { state: 'unavailable' };
    }
}
