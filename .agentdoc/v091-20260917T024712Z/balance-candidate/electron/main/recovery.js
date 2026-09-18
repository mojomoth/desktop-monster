"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecoveryStore = void 0;
// One durable commit record covers save + metadata. Personal identity/settings
// never enter a checkpoint. All filesystem access is injected for fault tests.
const fs = __importStar(require("node:fs"));
const node_path_1 = require("node:path");
const node_crypto_1 = require("node:crypto");
const save_js_1 = require("../core/save.js");
const net_js_1 = require("./net.js");
const hash = (value) => (0, node_crypto_1.createHash)('sha256').update(JSON.stringify(value)).digest('hex');
const record = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
function validSave(value) {
    return record(value) && value.version === 3 && Number.isSafeInteger(value.level) && Number(value.level) >= 1 &&
        Number.isSafeInteger(value.nextCompanionId) && Number(value.nextCompanionId) >= 1 && Array.isArray(value.companions);
}
function validMetadata(raw) {
    if (!record(raw) || raw.version !== 1 || !Number.isSafeInteger(raw.highWater) || Number(raw.highWater) < 1 || typeof raw.reconcilePending !== 'boolean')
        return false;
    if (raw.pendingBattle !== undefined && (!record(raw.pendingBattle) || typeof raw.pendingBattle.matchId !== 'string' ||
        typeof raw.pendingBattle.opponentId !== 'string' || !Array.isArray(raw.pendingBattle.party) ||
        !raw.pendingBattle.party.every(x => typeof x === 'string') || !validSave(raw.pendingBattle.before)))
        return false;
    if (raw.pendingReclaim !== undefined && typeof raw.pendingReclaim !== 'string')
        return false;
    if (raw.gold !== undefined && !(0, net_js_1.isGoldState)(raw.gold))
        return false;
    if (raw.defenseCursor !== undefined && (!Number.isSafeInteger(raw.defenseCursor) || Number(raw.defenseCursor) < 0))
        return false;
    if (raw.replays !== undefined && (!Array.isArray(raw.replays) || raw.replays.length > 6 || !raw.replays.every(net_js_1.isPvpPresentation) ||
        new Set(raw.replays.map(p => p.battleId)).size !== raw.replays.length))
        return false;
    if (raw.committedOperationId !== undefined && typeof raw.committedOperationId !== 'string')
        return false;
    if (raw.lastBattle !== undefined && (!record(raw.lastBattle) || !Number.isSafeInteger(raw.lastBattle.at) ||
        !validSave(raw.lastBattle.before) || !(0, net_js_1.isPvpResponse)(raw.lastBattle.result)))
        return false;
    return true;
}
class RecoveryStore {
    dir;
    metadata;
    io;
    now;
    uuid;
    constructor(dir, initial, options = {}) {
        this.dir = dir;
        this.io = options.io ?? fs;
        this.now = options.now ?? Date.now;
        this.uuid = options.uuid ?? node_crypto_1.randomUUID;
        const raw = this.read('recovery.json');
        if (raw !== null && !validMetadata(raw)) {
            throw Error('Recovery metadata is invalid; original preserved');
        }
        this.metadata = raw ?? { version: 1, highWater: initial.nextCompanionId, reconcilePending: false };
        this.metadata.highWater = Math.max(this.metadata.highWater, initial.nextCompanionId);
        this.recoverCommit();
    }
    read(name) {
        try {
            return JSON.parse(this.io.readFileSync((0, node_path_1.join)(this.dir, name), 'utf8'));
        }
        catch (error) {
            if (error.code === 'ENOENT')
                return null;
            throw error;
        }
    }
    atomic(name, value) {
        const target = (0, node_path_1.join)(this.dir, name);
        this.io.mkdirSync(this.dir, { recursive: true });
        this.io.writeFileSync(target + '.tmp', JSON.stringify(value), 'utf8');
        this.io.renameSync(target + '.tmp', target);
    }
    get state() { return structuredClone(this.metadata); }
    get unfinished() {
        const op = this.read('operation.json');
        return record(op) && op.id !== this.metadata.committedOperationId;
    }
    update(patch) {
        const next = { ...this.metadata, ...patch, version: 1 };
        this.atomic('recovery.json', next);
        this.metadata = next;
    }
    /** Must succeed before an ID-containing snapshot is uploaded. Never rewinds. */
    observe(save) {
        if (save.nextCompanionId > this.metadata.highWater)
            this.update({ highWater: save.nextCompanionId });
    }
    allocationSafe(save) {
        return { ...save, nextCompanionId: Math.max(save.nextCompanionId, this.metadata.highWater) };
    }
    recoverCommit() {
        const raw = this.read('operation.json');
        if (raw === null)
            return null;
        if (!record(raw) || raw.version !== 1 || typeof raw.id !== 'string' || !validSave(raw.save) || !validMetadata(raw.metadata) ||
            raw.metadata.highWater < raw.save.nextCompanionId || raw.metadata.committedOperationId !== raw.id ||
            raw.hash !== hash({ id: raw.id, save: raw.save, metadata: raw.metadata }))
            throw Error('Invalid unfinished operation; original preserved');
        const op = raw;
        if (op.id === this.metadata.committedOperationId) {
            // Save/meta committed, but cleanup failed: NEVER rewind later gameplay.
            try {
                this.io.unlinkSync((0, node_path_1.join)(this.dir, 'operation.json'));
            }
            catch { /* retry cleanup next boot */ }
            return null;
        }
        this.atomic('save.json', op.save);
        this.atomic('recovery.json', op.metadata);
        this.metadata = op.metadata;
        try {
            this.io.unlinkSync((0, node_path_1.join)(this.dir, 'operation.json'));
        }
        catch { /* committed id makes replay safe */ }
        return op.save;
    }
    commit(save, patch = {}) {
        const next = this.allocationSafe((0, save_js_1.parseSave)(save));
        const id = this.uuid();
        const metadata = { ...this.metadata, ...patch, version: 1,
            highWater: Math.max(next.nextCompanionId, this.metadata.highWater), committedOperationId: id };
        const op = { version: 1, id, save: next, metadata, hash: hash({ id, save: next, metadata }) };
        this.atomic('operation.json', op);
        this.recoverCommit();
        return next;
    }
    backup(save, reason) {
        const normalized = (0, save_js_1.parseSave)(save);
        const id = this.uuid();
        const checkpoint = { version: 1, id, at: this.now(), reason, save: normalized, hash: hash(normalized) };
        this.io.mkdirSync((0, node_path_1.join)(this.dir, 'checkpoints'), { recursive: true });
        this.atomic(`checkpoints/${id}.json`, checkpoint);
        // Read-back validates the same path that restore will use before mutation.
        this.checkpoint(id);
        return this.summary(checkpoint);
    }
    checkpoint(id) {
        if (!/^[a-zA-Z0-9-]{1,64}$/.test(id))
            throw Error('Invalid checkpoint id');
        const c = this.read(`checkpoints/${id}.json`);
        if (!record(c) || c.version !== 1 || c.id !== id || !Number.isSafeInteger(c.at) ||
            (c.reason !== 'reset' && c.reason !== 'restore') || !validSave(c.save) || c.hash !== hash(c.save)) {
            throw Error('Checkpoint is damaged; original preserved');
        }
        return c;
    }
    summary(c) {
        return { id: c.id, at: c.at, reason: c.reason, level: c.save.level, bestIndex: c.save.bestIndex, companions: c.save.companions.length };
    }
    list() {
        let names;
        try {
            names = this.io.readdirSync((0, node_path_1.join)(this.dir, 'checkpoints'));
        }
        catch (error) {
            if (error.code === 'ENOENT')
                return [];
            throw error;
        }
        const rows = [];
        for (const name of names.filter(name => /^[a-zA-Z0-9-]+\.json$/.test(name))) {
            try {
                rows.push(this.summary(this.checkpoint(name.slice(0, -5))));
            }
            catch { /* damaged backups are preserved; never offered as valid restoration */ }
        }
        return rows.sort((a, b) => b.at - a.at || b.id.localeCompare(a.id)).slice(0, 5);
    }
    restoreCandidate(id) { return this.allocationSafe((0, save_js_1.parseSave)(this.checkpoint(id).save)); }
    prune() {
        const keep = new Set(this.list().map(c => `${c.id}.json`));
        let names;
        try {
            names = this.io.readdirSync((0, node_path_1.join)(this.dir, 'checkpoints'));
        }
        catch {
            return;
        }
        for (const name of names)
            if (/^[a-zA-Z0-9-]+\.json$/.test(name) && !keep.has(name)) {
                // Retain corrupt files as evidence; only expire verified old checkpoints.
                try {
                    this.checkpoint(name.slice(0, -5));
                    this.io.unlinkSync((0, node_path_1.join)(this.dir, 'checkpoints', name));
                }
                catch { /* preserve on failure */ }
            }
    }
}
exports.RecoveryStore = RecoveryStore;
