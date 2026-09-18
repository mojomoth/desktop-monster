// Optional main-only Steam initialization. No renderer Node access, overlay
// invalidation, account migration or Steam requirement for ordinary play.
import { createRequire } from 'node:module';
const loadSteam = createRequire(__filename);
export interface SteamStatus { state: 'disabled' | 'connected' | 'unavailable'; name?: string; steamId?: string }
interface SteamBinding { init(appId: number): { localplayer: { getName(): string; getSteamId(): { steamId64: bigint } } } }
export function initializeSteam(options: { appId?: string; smoke?: boolean; load?: () => SteamBinding }): SteamStatus {
  if (options.smoke || !options.appId || !/^[1-9]\d{0,9}$/.test(options.appId)) return { state: 'disabled' };
  const appId = Number(options.appId);
  if (!Number.isSafeInteger(appId) || appId > 0xffffffff) return { state: 'disabled' };
  try {
    // Native Steam API has no stdlib/Electron equivalent (ponytail rung 5).
    const binding = (options.load ?? (() => loadSteam('steamworks.js') as SteamBinding))();
    const client = binding.init(appId);
    const steamId = client.localplayer.getSteamId().steamId64;
    if (typeof steamId !== 'bigint' || steamId <= 0n) return { state: 'unavailable' };
    return { state: 'connected', name: client.localplayer.getName().slice(0, 128), steamId: steamId.toString() };
  } catch { return { state: 'unavailable' }; }
}
