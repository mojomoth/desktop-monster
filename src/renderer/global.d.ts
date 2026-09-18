// Ambient type of the preload bridge (GAME_ARCHITECTURE §3.3). The renderer
// build cannot import src/preload (it value-imports 'electron' and would be
// pulled into the web emit), so the shape is declared here from the shared
// payload types; tests/renderer.test.ts pins this file's method list against
// the preload source so the two can never drift.

import type {
  IdentityPayload,
  LeaderboardResult,
  MatchResult,
  NetResult,
  OpponentListResult,
  PvpResult,
  ReclaimResult,
  TheftsResult,
  LeaderboardMetric,
  PvpPresentation,
} from '../shared/api.js';
import type {
  GameSettings,
  SettingsResult,
  ConnectInputResult,
  SaveStatus,
  InputModePayload,
  InputPayload,
  MenuActionPayload, ActionResultPayload,
  SaveStatePayload,
  PrepareStatePayload, ReleaseStatePayload, CheckpointInfo, OperationResult, LastBattleInfo, ExportPngPayload, ExportPngResult,
} from '../shared/ipc.js';

declare global {
  interface Window {
    desmon: {
      onPrepareState(cb: (p: PrepareStatePayload) => void): () => void;
      captureState(requestId: string, generation: number, save: unknown): Promise<void>;
      onReleaseState(cb: (p: ReleaseStatePayload) => void): () => void;
      getGeneration(): Promise<number>;
      resetProgress(): Promise<OperationResult>;
      listCheckpoints(): Promise<CheckpointInfo[]>;
      restoreCheckpoint(id: string): Promise<OperationResult>;
      battleOpponent(opponentId: string): Promise<NetResult<PvpResult>>;
      getLastBattle(): Promise<LastBattleInfo | null>;
      getPendingReplays(): Promise<PvpPresentation[]>;
      completeReplay(id: string): Promise<boolean>;
      onPvpPlayback(cb: (active: boolean) => void): () => void;
      exportPng(payload: ExportPngPayload): Promise<ExportPngResult>;
      getFieldImage(): Promise<string | null>;
      getSettings(): Promise<GameSettings>;
      updateSettings(patch: Partial<GameSettings>): Promise<SettingsResult>;
      onSettingsChanged(cb: (settings: GameSettings) => void): () => void;
      connectGlobalInput(): Promise<ConnectInputResult>;
      getSaveStatus(): Promise<SaveStatus>;
      onSaveStatus(cb: (status: SaveStatus) => void): () => void;
      openSaveFolder(): Promise<void>;
      quit(): Promise<void>;
      onInput(cb: (e: InputPayload) => void): () => void;
      onInputMode(cb: (m: InputModePayload) => void): () => void;
      onReset(cb: () => void): () => void;
      getInputMode(): Promise<InputModePayload>;
      loadState(): Promise<SaveStatePayload | null>;
      saveState(s: SaveStatePayload, generation?: number): Promise<boolean>;
      onSaveFailed(cb: () => void): () => void;
      openAccessibilitySettings(): Promise<void>;
      reportFirstFrame(): void;
      moveWindowBy(dx: number, dy: number): void;
      getIdentity(): Promise<IdentityPayload>;
      setName(name: string): Promise<IdentityPayload>;
      getLeaderboard(n?: number, metric?: LeaderboardMetric): Promise<NetResult<LeaderboardResult>>;
      pvpOpponents(): Promise<NetResult<OpponentListResult>>;
      pvpMatch(opponentId?: string): Promise<NetResult<MatchResult>>;
      pvp(matchId: string, party: string[]): Promise<NetResult<PvpResult>>;
      thefts(): Promise<NetResult<TheftsResult>>;
      reclaim(theftId: string): Promise<NetResult<ReclaimResult>>;
      onAction(cb: (a: MenuActionPayload) => void): () => void;
      reportActionResult(result: ActionResultPayload): void;
      onActionResult(cb: (result: ActionResultPayload) => void): () => void;
      sendAction(a: MenuActionPayload): Promise<void>;
      onStateChanged(cb: (s: SaveStatePayload) => void): () => void;
      reportMenuReady(): void;
    };
  }
}

export {};
