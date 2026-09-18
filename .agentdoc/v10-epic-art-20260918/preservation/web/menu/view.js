// Menu view-model — SPEC F54 (Assumption 29; GAME_DESIGN_V2 §9). Pure data →
// strings/flags: no DOM, no electron, no net. src/menu/index.ts binds these
// rows to the page; every rule here mirrors a precondition of
// core/collection.ts's applyCollection, so a button is only ever offered when
// the action would succeed.
import { COMPANION_REINCARNATION_LEVEL, companionPower, displayNameOf, effectivePower, format, heroBuffedPower, PARTY_SIZE, partyOrder, REBIRTH_MIN_INDEX, typeOf, } from '../core/index.js';
/** 'Dragon Lv 7' — a card title, and the way pvpResultText names a companion. */
const companionName = (c) => `${displayNameOf(c.speciesId)} Lv ${String(c.level)}`;
/** Numeric part of a 'cN' id — the tie-breaker (same rule as activeCompanions). */
const idNum = (id) => Number(id.replace(/\D/g, '') || 0);
/** Every companion as a card, strongest first, ties → lower id. */
export function rosterRows(save) {
    return [...save.companions]
        .sort((a, b) => {
        const pa = companionPower(a);
        const pb = companionPower(b);
        if (pa === pb)
            return idNum(a.id) - idNum(b.id);
        return pb > pa ? 1 : -1;
    })
        .map((c) => ({
        id: c.id,
        speciesId: c.speciesId,
        stars: c.stars,
        name: companionName(c),
        starText: `★×${String(c.stars)}`,
        power: format(companionPower(c)),
        maxLevel: c.level >= COMPANION_REINCARNATION_LEVEL && Number.isSafeInteger(c.stars + 1),
    }));
}
/** Every unordered pair that may fuse: same species AND same stars. */
export function fuseCandidates(save) {
    const cs = save.companions;
    const pairs = [];
    for (let i = 0; i < cs.length; i++) {
        for (let j = i + 1; j < cs.length; j++) {
            const a = cs[i];
            const b = cs[j];
            if (a && b && a.speciesId === b.speciesId && a.stars === b.stars && Number.isSafeInteger(a.stars + 1)) {
                pairs.push([a.id, b.id]);
            }
        }
    }
    return pairs;
}
/** Rebirth unlocks at REBIRTH_MIN_INDEX (40) — the footer button's flag. */
export const canRebirth = (save) => save.monsterIndex >= REBIRTH_MIN_INDEX;
/** Ids that may eat `foodId` without overflowing their resulting level. */
export function consumeTargets(save, foodId) {
    const cs = save.companions;
    const food = cs.find((c) => c.id === foodId);
    if (!food)
        return [];
    return cs.filter((c) => c.id !== foodId && Number.isSafeInteger(c.level + 1 + food.stars)).map((c) => c.id);
}
/** The server's top, plus my own line when the top does not already hold it. */
export function leaderboardRows(result) {
    if (!result.ok) {
        const name = result.error === 'cooldown' ? '잠시 기다려 주세요' : '서버 연결 안 됨';
        return [{ rank: '', name, deepest: '', rebirths: '' }];
    }
    const { top, me } = result.value;
    const rows = me && !top.some((r) => r.rank === me.rank && r.name === me.name) ? [...top, me] : top;
    return rows.map((r) => ({
        rank: `#${String(r.rank)}`,
        name: r.name,
        deepest: result.value.metric === 'level' ? `Lv.${r.level == null ? '미등록' : format(r.level)}`
            : result.value.metric === 'pvpWins' ? `${r.wins ?? 0}승 · ${r.losses ?? 0}패`
                : result.value.metric === 'rebirths' ? `환생 ${r.rebirths}회` : `최고 단계 ${String(r.bestIndex)}`,
        rebirths: result.value.metric === 'pvpWins' ? '공격·방어 합산' : `♻×${String(r.rebirths)}`,
    }));
}
/** The Battle tab's verdict line: who was stolen or lost, or how long to wait. */
export function pvpResultText(result) {
    if (!result.ok) {
        if (result.error === 'busy')
            return '다른 작업이 진행 중입니다. 잠시 후 다시 시도하세요.';
        if (result.error === 'storage')
            return '전투 결과를 저장하지 못했습니다. 다시 시도하면 같은 전투를 복구합니다.';
        if (result.error === 'sync-required')
            return '서버 업데이트·동기화가 필요합니다. 잠시 후 다시 시도하세요.';
        if (result.error === 'stale-party')
            return '대기 중 동료가 이동했습니다. 편성을 확인하고 다시 전투하세요.';
        if (result.error === 'gold-conflict')
            return '금화가 다른 전투에서 변경되었습니다. 다시 시도해 주세요.';
        if (result.error === 'opponent-busy')
            return '상대가 방어 전투 후 대기 중입니다. 잠시 후 다른 상대와 전투하세요.';
        return result.error === 'cooldown'
            ? `다음 대전까지 ${String(result.retryAfterSec ?? 0)}초 남았습니다.`
            : '서버에 연결할 수 없어 지금은 대전할 수 없습니다.';
    }
    const { win, opponent, stolen, lost } = result.value;
    if (result.value.gold) {
        const { delta, reason } = result.value.gold;
        const protection = { transfer: '', protected: '보호 금액', 'daily-limit': '오늘의 금화 한도',
            'pair-protection': '같은 상대 보호 시간', capacity: '금화 보관 한도', bot: '훈련 전투' }[reason];
        return `${opponent.name}에게 ${win ? '승리' : '패배'} · 금화 ${BigInt(delta) > 0n ? '+' : ''}${delta}G${BigInt(delta) === 0n ? ` (${protection || '금화 이동 없음'})` : ''}`;
    }
    const history = result.value.historySaved === false ? ' 전적 저장을 완료하지 못했습니다. 자동 저장 때 다시 시도합니다.' : '';
    if (win) {
        return (stolen
            ? `${opponent.name}에게 승리 · ${companionName(stolen)}을 데려왔습니다!`
            : `${opponent.name}에게 승리했습니다.`) + history;
    }
    // v3 steals are attacker-only, so `lost` is always null — the named leg is
    // still here for the v2-shaped response the server may answer with.
    return (lost
        ? `${opponent.name}에게 패배 · ${companionName(lost)}을 빼앗겼습니다.`
        : `${opponent.name}에게 패배했습니다.`) + history;
}
/**
 * Badge letters. ponytail: mirrors the private TYPE_INITIALS of
 * renderer/sprites/party.ts (view.ts imports nothing but core) — wind and
 * water share an initial, so water takes 'A' for aqua.
 */
const TYPE_BADGE = {
    fire: 'F',
    wind: 'W',
    earth: 'E',
    water: 'A',
    dark: 'D',
};
/** Any companion — mine or an opponent's — as a compact card. */
export function miniRow(c) {
    const type = typeOf(c.speciesId);
    return {
        id: c.id,
        speciesId: c.speciesId,
        stars: c.stars,
        name: companionName(c),
        starText: `★×${String(c.stars)}`,
        typeClass: `type type-${type}`,
        typeBadge: TYPE_BADGE[type],
    };
}
/** The previewed opponent's party in `partyOrder`; no match or a bot → none. */
export function opponentRows(match) {
    return match === null ? [] : partyOrder(match.opponent.party).map(miniRow);
}
/** Who strikes first: `partyOrder` is biggest (back) first, so front is last. */
const frontOf = (party) => {
    const ordered = partyOrder(party);
    return ordered[ordered.length - 1];
};
/** The live `#preview` line: my party's power against the opponent's front. */
export function partyPreview(myParty, opponentParty, hero) {
    const front = frontOf(opponentParty);
    const total = myParty.reduce((sum, c) => {
        const power = heroBuffedPower(companionPower(c), typeOf(c.speciesId), hero);
        return (sum +
            (front === undefined ? power : effectivePower(power, typeOf(c.speciesId), typeOf(front.speciesId))));
    }, 0n);
    return `상대에게 적용되는 파티 힘: ${format(total)}`;
}
/** Add or drop `id` from the picked party; a full party refuses new picks. */
export function togglePick(ids, id) {
    if (ids.includes(id))
        return ids.filter((x) => x !== id);
    return ids.length >= PARTY_SIZE ? [...ids] : [...ids, id];
}
const HOUR_MS = 3_600_000;
/** The theft inbox — `now` is injected so the rows stay deterministic. */
export function theftRows(thefts, now) {
    return thefts.map((t) => {
        const left = Math.max(0, t.reclaimUntil - now);
        const hours = Math.floor(left / HOUR_MS);
        const minutes = Math.floor((left % HOUR_MS) / 60_000);
        return {
            id: t.id,
            text: `${t.thiefName}에게 빼앗긴 ${companionName(t.companion)} · 회수 가능 시간 ${String(hours)}시간 ${String(minutes)}분 남음`,
        };
    });
}
/**
 * `Battle!` is offered only with a live match, a party and no cooldown.
 *
 * ponytail: the v2 call form `(save, cooldownUntil)` is still accepted while
 * src/menu/index.ts is the one-button v2 binder — T71 rewrites it and this leg
 * goes with it.
 */
export function battleEnabled(state, cooldownUntil = 0) {
    return 'companions' in state
        ? cooldownUntil <= 0
        : state.match !== null && state.cooldownUntil <= 0;
}
