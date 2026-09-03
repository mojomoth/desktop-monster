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
  PvpResult,
  ReclaimResult,
  TheftsResult,
} from '../shared/api.js';
import type {
  InputModePayload,
  InputPayload,
  MenuActionPayload,
  SaveStatePayload,
} from '../shared/ipc.js';

declare global {
  interface Window {
    desmon: {
      onInput(cb: (e: InputPayload) => void): () => void;
      onInputMode(cb: (m: InputModePayload) => void): () => void;
      onReset(cb: () => void): () => void;
      getInputMode(): Promise<InputModePayload>;
      loadState(): Promise<SaveStatePayload | null>;
      saveState(s: SaveStatePayload): Promise<void>;
      openAccessibilitySettings(): Promise<void>;
      reportFirstFrame(): void;
      moveWindowBy(dx: number, dy: number): void;
      getIdentity(): Promise<IdentityPayload>;
      setName(name: string): Promise<IdentityPayload>;
      getLeaderboard(n?: number): Promise<NetResult<LeaderboardResult>>;
      pvpMatch(): Promise<NetResult<MatchResult>>;
      pvp(matchId: string, party: string[]): Promise<NetResult<PvpResult>>;
      thefts(): Promise<NetResult<TheftsResult>>;
      reclaim(theftId: string): Promise<NetResult<ReclaimResult>>;
      onAction(cb: (a: MenuActionPayload) => void): () => void;
      sendAction(a: MenuActionPayload): Promise<void>;
      onStateChanged(cb: (s: SaveStatePayload) => void): () => void;
      reportMenuReady(): void;
    };
  }
}

export {};
