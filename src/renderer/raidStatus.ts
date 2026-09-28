import type { RaidLiveResponse } from '../shared/api.js';

export interface RaidStatus { text: string; className: string; actionable: boolean; hidden: boolean }
export function raidStatus(live: RaidLiveResponse | null, now: number, connected: boolean): RaidStatus {
  if (!connected) return { text: '레이드 연결 끊김 · 재연결 중', className: 'offline', actionable: false, hidden: false };
  const raid = live?.raid;
  if (!raid) return { text: '', className: '', actionable: false, hidden: true };
  if (raid.phase === 'confirming' && raid.me.joined) {
    if (raid.me.confirmed) return { text: '참여 완료', className: 'done', actionable: false, hidden: false };
    if (now < (raid.confirmUntil ?? now)) return { text: '경고 · 참여', className: 'alert', actionable: true, hidden: false };
  }
  if (raid.phase === 'countdown') {
    const seconds = Math.ceil(Math.max(0, (raid.battleAt ?? now) - now) / 1000);
    const time = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(n => String(n).padStart(2, '0')).join(':');
    return { text: `레이드 ${time}`, className: '', actionable: false, hidden: false };
  }
  return { text: '', className: '', actionable: false, hidden: true };
}
