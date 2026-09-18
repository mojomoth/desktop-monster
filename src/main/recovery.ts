// One durable commit record covers save + metadata. Personal identity/settings
// never enter a checkpoint. All filesystem access is injected for fault tests.
import * as fs from 'node:fs';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { parseSave } from '../core/save.js';
import type { SaveFile } from '../core/save.js';
import type { PvpResult, PvpGoldState, PvpPresentation } from '../shared/api.js';
import { isPvpResponse, isGoldState, isPvpPresentation } from './net.js';

export interface PendingBattle { opponentId: string; matchId: string; party: string[]; before: SaveFile; mode?: import('../shared/api.js').PvpMode }
export interface LastBattle { at: number; before: SaveFile; result: PvpResult }
export interface RecoveryMetadata {
  version: 1;
  highWater: number;
  reconcilePending: boolean;
  pendingBattle?: PendingBattle;
  pendingReclaim?: string;
  lastBattle?: LastBattle;
  committedOperationId?: string;
  gold?: PvpGoldState;
  defenseCursor?: number;
  replays?: PvpPresentation[];
}
export interface CheckpointSummary { id: string; at: number; reason: 'reset' | 'restore'; level: number; bestIndex: number; companions: number }
interface Checkpoint { version: 1; id: string; at: number; reason: 'reset' | 'restore'; save: SaveFile; hash: string }
interface Commit { version: 1; id: string; save: SaveFile; metadata: RecoveryMetadata; hash: string }
const hash = (value: unknown): string => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const record = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
function validSave(value: unknown): value is SaveFile {
  return record(value) && [1, 2, 3, 4].includes(Number(value.version)) && Number.isSafeInteger(value.level) && Number(value.level) >= 1 &&
    Number.isSafeInteger(value.nextCompanionId) && Number(value.nextCompanionId) >= 1 && Array.isArray(value.companions);
}
function validMetadata(raw: unknown): raw is RecoveryMetadata {
  if (!record(raw) || raw.version !== 1 || !Number.isSafeInteger(raw.highWater) || Number(raw.highWater) < 1 || typeof raw.reconcilePending !== 'boolean') return false;
  if (raw.pendingBattle !== undefined && (!record(raw.pendingBattle) || typeof raw.pendingBattle.matchId !== 'string' ||
    typeof raw.pendingBattle.opponentId !== 'string' || !Array.isArray(raw.pendingBattle.party) ||
    !raw.pendingBattle.party.every(x => typeof x === 'string') || !validSave(raw.pendingBattle.before))) return false;
  if (raw.pendingReclaim !== undefined && typeof raw.pendingReclaim !== 'string') return false;
  if (raw.gold !== undefined && !isGoldState(raw.gold)) return false;
  if (raw.defenseCursor !== undefined && (!Number.isSafeInteger(raw.defenseCursor) || Number(raw.defenseCursor) < 0)) return false;
  if (raw.replays !== undefined && (!Array.isArray(raw.replays) || raw.replays.length > 6 || !raw.replays.every(isPvpPresentation) ||
    new Set(raw.replays.map(p => p.battleId)).size !== raw.replays.length)) return false;
  if (raw.committedOperationId !== undefined && typeof raw.committedOperationId !== 'string') return false;
  if (raw.lastBattle !== undefined && (!record(raw.lastBattle) || !Number.isSafeInteger(raw.lastBattle.at) ||
    !validSave(raw.lastBattle.before) || !isPvpResponse(raw.lastBattle.result))) return false;
  return true;
}

export class RecoveryStore {
  private metadata: RecoveryMetadata;
  private readonly io: Pick<typeof fs, 'readFileSync' | 'writeFileSync' | 'mkdirSync' | 'renameSync' | 'unlinkSync' | 'readdirSync'>;
  private readonly now: () => number;
  private readonly uuid: () => string;
  constructor(private readonly dir: string, initial: SaveFile, options: {
    io?: RecoveryStore['io']; now?: () => number; uuid?: () => string;
  } = {}) {
    this.io = options.io ?? fs; this.now = options.now ?? Date.now; this.uuid = options.uuid ?? randomUUID;
    const raw = this.read('recovery.json');
    if (raw !== null && !validMetadata(raw)) {
      throw Error('Recovery metadata is invalid; original preserved');
    }
    this.metadata = raw as unknown as RecoveryMetadata ?? { version: 1, highWater: initial.nextCompanionId, reconcilePending: false };
    this.metadata.highWater = Math.max(this.metadata.highWater, initial.nextCompanionId);
    this.recoverCommit();
  }
  private read(name: string): unknown {
    try { return JSON.parse(this.io.readFileSync(join(this.dir, name), 'utf8')) as unknown; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
  }
  private atomic(name: string, value: unknown): void {
    const target = join(this.dir, name);
    this.io.mkdirSync(this.dir, { recursive: true });
    this.io.writeFileSync(target + '.tmp', JSON.stringify(value), 'utf8');
    this.io.renameSync(target + '.tmp', target);
  }
  get state(): RecoveryMetadata { return structuredClone(this.metadata); }
  get unfinished(): boolean {
    const op = this.read('operation.json');
    return record(op) && op.id !== this.metadata.committedOperationId;
  }
  update(patch: Partial<RecoveryMetadata>): void {
    const next = { ...this.metadata, ...patch, version: 1 as const };
    if (!validMetadata(next)) throw Error('Invalid recovery metadata');
    this.atomic('recovery.json', next); this.metadata = next;
  }
  /** Must succeed before an ID-containing snapshot is uploaded. Never rewinds. */
  observe(save: SaveFile): void {
    if (save.nextCompanionId > this.metadata.highWater) this.update({ highWater: save.nextCompanionId });
  }
  allocationSafe(save: SaveFile): SaveFile {
    return { ...save, nextCompanionId: Math.max(save.nextCompanionId, this.metadata.highWater) };
  }
  recoverCommit(): SaveFile | null {
    const raw = this.read('operation.json');
    if (raw === null) return null;
    if (!record(raw) || raw.version !== 1 || typeof raw.id !== 'string' || !validSave(raw.save) || !validMetadata(raw.metadata) ||
      raw.metadata.highWater < raw.save.nextCompanionId || raw.metadata.committedOperationId !== raw.id ||
      raw.hash !== hash({ id: raw.id, save: raw.save, metadata: raw.metadata })) throw Error('Invalid unfinished operation; original preserved');
    const op = raw as unknown as Commit;
    if (op.id === this.metadata.committedOperationId) {
      // Save/meta committed, but cleanup failed: NEVER rewind later gameplay.
      try { this.io.unlinkSync(join(this.dir, 'operation.json')); } catch { /* retry cleanup next boot */ }
      return null;
    }
    const migrated = parseSave(op.save);
    this.atomic('save.json', migrated);
    this.atomic('recovery.json', op.metadata);
    this.metadata = op.metadata;
    try { this.io.unlinkSync(join(this.dir, 'operation.json')); } catch { /* committed id makes replay safe */ }
    return migrated;
  }
  commit(save: SaveFile, patch: Partial<RecoveryMetadata> = {}): SaveFile {
    const next = this.allocationSafe(parseSave(save));
    const id = this.uuid();
    const metadata: RecoveryMetadata = { ...this.metadata, ...patch, version: 1,
      highWater: Math.max(next.nextCompanionId, this.metadata.highWater), committedOperationId: id };
    if (!validMetadata(metadata)) throw Error('Invalid recovery operation metadata');
    const op: Commit = { version: 1, id, save: next, metadata, hash: hash({ id, save: next, metadata }) };
    this.atomic('operation.json', op);
    this.recoverCommit();
    return next;
  }
  backup(save: SaveFile, reason: Checkpoint['reason']): CheckpointSummary {
    const normalized = parseSave(save);
    const id = this.uuid();
    const checkpoint: Checkpoint = { version: 1, id, at: this.now(), reason, save: normalized, hash: hash(normalized) };
    this.io.mkdirSync(join(this.dir, 'checkpoints'), { recursive: true });
    this.atomic(`checkpoints/${id}.json`, checkpoint);
    // Read-back validates the same path that restore will use before mutation.
    this.checkpoint(id);
    return this.summary(checkpoint);
  }
  private checkpoint(id: string): Checkpoint {
    if (!/^[a-zA-Z0-9-]{1,64}$/.test(id)) throw Error('Invalid checkpoint id');
    const c = this.read(`checkpoints/${id}.json`);
    if (!record(c) || c.version !== 1 || c.id !== id || !Number.isSafeInteger(c.at) ||
      (c.reason !== 'reset' && c.reason !== 'restore') || !validSave(c.save) || c.hash !== hash(c.save)) {
      throw Error('Checkpoint is damaged; original preserved');
    }
    return c as unknown as Checkpoint;
  }
  private summary(c: Checkpoint): CheckpointSummary {
    return { id: c.id, at: c.at, reason: c.reason, level: c.save.level, bestIndex: c.save.bestIndex, companions: c.save.companions.length };
  }
  list(): CheckpointSummary[] {
    let names: string[];
    try { names = this.io.readdirSync(join(this.dir, 'checkpoints')) as string[]; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
    const rows: CheckpointSummary[] = [];
    for (const name of names.filter(name => /^[a-zA-Z0-9-]+\.json$/.test(name))) {
      try { rows.push(this.summary(this.checkpoint(name.slice(0, -5)))); }
      catch { /* damaged backups are preserved; never offered as valid restoration */ }
    }
    return rows.sort((a, b) => b.at - a.at || b.id.localeCompare(a.id)).slice(0, 5);
  }
  restoreCandidate(id: string): SaveFile { return this.allocationSafe(parseSave(this.checkpoint(id).save)); }
  prune(): void {
    const keep = new Set(this.list().map(c => `${c.id}.json`));
    let names: string[];
    try { names = this.io.readdirSync(join(this.dir, 'checkpoints')) as string[]; } catch { return; }
    for (const name of names) if (/^[a-zA-Z0-9-]+\.json$/.test(name) && !keep.has(name)) {
      // Retain corrupt files as evidence; only expire verified old checkpoints.
      try { this.checkpoint(name.slice(0, -5)); this.io.unlinkSync(join(this.dir, 'checkpoints', name)); } catch { /* preserve on failure */ }
    }
  }
}
