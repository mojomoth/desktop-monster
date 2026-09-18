import { heroForm } from '../core/hero.js';
import type { SaveFile } from '../core/save.js';
import type { MenuDocument, MenuElement } from './index.js';
import { heroBuffText } from './hero.js';

export function playTimeText(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 3600)}시간 ${Math.floor(seconds / 60) % 60}분 ${seconds % 60}초`;
}

/** Name input is outside this host, so live statistics never replace an edited field. */
export function mountProfile(doc: MenuDocument, root: MenuElement): (save: SaveFile) => void {
  const text = (tag: string, className: string, value = ''): MenuElement => {
    const el = doc.createElement(tag); el.className = className; el.textContent = value; return el;
  };
  const stats = text('div', 'profile-stats');
  const legacy = text('p', 'muted');
  const history = text('details', 'profile-history');
  const heading = text('summary', 'name');
  const rows = text('div', 'history-rows');
  history.append(heading, rows);
  const totals = text('details', 'hero-totals');
  const totalRows = text('div', 'hero-total-rows');
  totals.append(text('summary', 'hero-totals-title', '영웅별 전체 환생 횟수'), totalRows);
  root.replaceChildren(stats, legacy, history, totals);
  let historyKey = '';
  return (save) => {
    const p = save.progress;
    stats.replaceChildren(
      text('p', 'play-time', `플레이 시간 · ${playTimeText(p?.playTimeMs ?? 0)}`),
      text('p', 'kill-count', `몬스터 처치 · ${save.killCount.toLocaleString('ko-KR')}마리`),
      text('p', 'hero-count', `영웅 환생 · ${save.hero?.reincarnations ?? 0}회`),
      text('p', 'rebirth-count', `총 회귀 · ${save.rebirths}회 (영웅 환생과 영혼 회귀 포함)`),
      text('p', 'pvp-count', `PvP · ${p?.pvpWins ?? 0}승 ${p?.pvpLosses ?? 0}패 (훈련 상대 제외)`),
      text('p', 'gold-spent', `누적 골드 사용 · ${(p?.goldSpent ?? 0).toLocaleString('ko-KR')}`),
    );
    legacy.textContent = p?.legacyHistory
      ? '이전 버전의 총 처치·환생 횟수는 유지됩니다. 플레이 시간·종별 처치·정확한 환생 순서는 v0.5부터 기록합니다.'
      : '앱에서 진행한 시간을 기록합니다. 종료·절전 시간은 포함되지 않습니다. 영웅 장착 변경은 환생 기록에 포함되지 않습니다.';
    const entries = p?.reincarnationHistory ?? [];
    heading.textContent = `영웅 환생 기록 · 총 ${save.hero?.reincarnations ?? 0}회 · 최근 ${entries.length}개 (최대 100개)`;
    const key = JSON.stringify([entries, p?.heroCounts]);
    if (key === historyKey) return;
    historyKey = key;
    totalRows.replaceChildren(...Object.entries(p?.heroCounts ?? {}).map(([id, count]) =>
      text('p', 'hero-total', `${heroForm(id)?.name ?? id} · ${count}회`)));
    rows.replaceChildren(...(entries.length === 0 ? [text('p', 'muted', '아직 기록된 영웅 환생이 없습니다.')]
      : [...entries].reverse().map((entry) => {
        const row = text('div', 'history-entry');
        row.append(text('h3', 'name', `#${entry.number} · ${heroForm(entry.formId)?.name ?? '영웅'}`),
          text('p', 'history-detail', `Lv.${entry.level}에서 환생 · 중첩 ${entry.stacks} · ${heroBuffText(entry)}`),
          text('p', 'muted', `플레이 ${playTimeText(entry.playTimeMs)} · 이 영웅으로 누적 ${p?.heroCounts[entry.formId] ?? 0}회`));
        return row;
      })));
  };
}
