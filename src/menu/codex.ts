import { format } from '../core/bignum.js';
import { HERO_FORMS, heroForm, heroReadiness, heroRequiredLevel } from '../core/hero.js';
import { acquiredDiscoveries, discoveryContext, migrateProgress } from '../core/progress.js';
import {
  conditionStatus, fieldPhase, FIELD_PHASE_MS, FIELD_PHASE_NAMES, rareHero, rareMonster,
} from '../core/discovery.js';
import type { DiscoveryContext, Requirement } from '../core/discovery.js';
import {
  SPECIES_IDS, attackDelayOf, displayNameOf, monsterForIndex, typeOf,
} from '../core/monsters.js';
import type { SpeciesId } from '../core/monsters.js';
import type { DiscoveryGoal } from '../core/progress.js';
import type { CollectionAction } from '../core/collection.js';
import type { SaveFile } from '../core/save.js';
import { drawSprite, monsterSprites } from '../renderer/sprites/index.js';
import type { MenuDocument, MenuElement } from './index.js';
import { ELEMENT_NAMES, heroBuffText, heroCanvas, SILHOUETTE_COLOR } from './hero.js';

export function monsterCanvas(doc: MenuDocument, speciesId: SpeciesId, silhouette: boolean): MenuElement {
  const canvas = doc.createElement('canvas');
  canvas.className = 'monster-art';
  canvas.width = 96; canvas.height = 96;
  canvas.setAttribute?.('role', 'img');
  canvas.setAttribute?.('aria-label', silhouette ? '미발견 몬스터 실루엣' : displayNameOf(speciesId));
  const ctx = canvas.getContext?.('2d');
  const sprite = monsterSprites[speciesId].idle;
  const scale = Math.min(3, Math.floor(96 / Math.max(sprite.w, sprite.h)));
  if (ctx) drawSprite(ctx, sprite, 0, Math.floor((96 - sprite.w * scale) / 2), 96 - sprite.h * scale,
    { scale, ...(silhouette ? { tint: SILHOUETTE_COLOR } : {}) });
  return canvas;
}

type AcquiredDiscoveries = ReturnType<typeof acquiredDiscoveries>;

/** Keep condition progress public, but disclose referenced names only after acquisition. */
export function conditionText(requirement: Requirement, context: DiscoveryContext, acquired: AcquiredDiscoveries): string {
  const status = conditionStatus(requirement, context);
  let label = status.label;
  if (requirement.kind === 'speciesKills') label = label.replace(requirement.id, acquired.monsters.includes(requirement.id)
    ? displayNameOf(requirement.id) : `미발견 몬스터 #${String(SPECIES_IDS.indexOf(requirement.id as SpeciesId) + 1).padStart(3, '0')}`);
  if (requirement.kind === 'heroHistory') label = label.replace(requirement.id, acquired.heroes.includes(requirement.id)
    ? heroForm(requirement.id)?.name ?? requirement.id : `미발견 영웅 #${String(HERO_FORMS.findIndex(form => form.id === requirement.id) + 1).padStart(3, '0')}`);
  let progress = `${status.current}/${status.target}`;
  if (requirement.kind === 'playTimeMs') progress = `${Math.floor(status.current / 60_000)}/${status.target / 60_000}분`;
  if (requirement.kind === 'phase') progress = `현재 ${FIELD_PHASE_NAMES[fieldPhase(context.playTimeMs)]}`;
  if (requirement.kind === 'equippedType') progress = context.equippedType ? `현재 ${ELEMENT_NAMES[context.equippedType]}` : '현재 수습 영웅';
  return `${status.met ? '✓' : '○'} ${label}${requirement.kind === 'pvpWins' ? '' : ` · ${progress}`}`;
}

/** Create each gallery once on demand; update text in place and reveal each canvas once. */
export function mountCodex(doc: MenuDocument, root: MenuElement, send: (a: CollectionAction) => void): (save: SaveFile) => void {
  const text = (tag: string, className: string, value = ''): MenuElement => {
    const el = doc.createElement(tag); el.className = className; el.textContent = value; return el;
  };
  const heading = text('h2', 'codex-count');
  const phase = text('p', 'field-phase');
  const discoveries = text('section', 'discovery-summary');
  const unreadCount = text('p', 'discovery-count');
  const previews = text('div', 'discovery-previews');
  const acknowledge = text('button', 'btn discovery-ack', '표시한 발견 확인');
  const goalPanel = text('section', 'discovery-goal');
  const goalName = text('p', 'goal-name');
  const goalStatus = text('p', 'goal-status');
  const goalConditions = text('div', 'goal-conditions');
  const clearGoal = text('button', 'btn goal-clear', '목표 해제');
  discoveries.append(text('h3', '', '지난 확인 이후 발견'), unreadCount, previews, acknowledge,
    text('p', 'muted', '표시한 카드만 확인합니다. 나머지 발견은 확인 후 이어서 표시됩니다. 아래 전체 도감에서 모든 발견을 볼 수 있습니다.'));
  goalPanel.append(text('h3', '', '선택한 목표'), goalName, goalStatus, goalConditions, clearGoal);
  let displayed = { heroes: [] as string[], monsters: [] as string[] };
  let previewKey = '';
  acknowledge.addEventListener('click', () => {
    if (!acknowledge.disabled) send({ type: 'acknowledgeDiscoveries', heroes: [...displayed.heroes], monsters: [...displayed.monsters] });
  });
  clearGoal.addEventListener('click', () => { if (!clearGoal.disabled) send({ type: 'setDiscoveryGoal', goal: null }); });
  const tabs = text('div', 'codex-tabs');
  const heroes = text('button', 'btn codex-heroes', '영웅 도감');
  const monsters = text('button', 'btn codex-monsters', '몬스터 도감');
  tabs.append(heroes, monsters);
  const heroGrid = text('div', 'codex-grid hero-gallery');
  const monsterGrid = text('div', 'codex-grid monster-gallery');
  root.replaceChildren(heading, discoveries, goalPanel, phase, tabs,
    text('p', 'muted', '카드를 펼치면 발견 조건과 진행도를 확인할 수 있습니다. 영웅은 환생에서 선택하고, 몬스터는 처치하면 도감에 공개됩니다.'),
    heroGrid, monsterGrid);
  let active: 'hero' | 'monster' = 'hero';
  let save: SaveFile | undefined;
  type Card = { update: (state: SaveFile, context: DiscoveryContext, acquired: AcquiredDiscoveries) => void };
  let heroCards: Card[] | undefined;
  let monsterCards: Card[] | undefined;

  const makeCard = (host: MenuElement, number: number, rarity: string, element: string) => {
    const card = text('details', 'codex-card');
    const summary = text('summary', 'codex-summary');
    const art = text('span', 'codex-art');
    const name = text('span', 'name');
    const description = text('p', 'codex-description');
    const stats = text('p', 'codex-stats');
    const eligibility = text('p', 'codex-eligibility');
    const conditions = text('div', 'codex-conditions');
    summary.append(art, text('span', 'codex-number', `#${String(number).padStart(3, '0')}`),
      name, text('span', 'stars', `${rarity} · ${element}`));
    card.append(summary, description, stats, eligibility, conditions);
    host.append(card);
    return { card, art, name, description, stats, eligibility, conditions };
  };
  const bindConditions = (host: MenuElement, requirements: readonly Requirement[], fallback: string) => {
    const lines = requirements.map(() => text('p', 'condition'));
    host.append(text('p', 'muted', requirements.length > 1 ? '발견 조건 · 아래 항목 모두 충족' : '발견 조건'),
      ...(lines.length ? lines : [text('p', 'condition', fallback)]));
    return (context: DiscoveryContext, acquired: AcquiredDiscoveries): boolean => {
      requirements.forEach((r, i) => { lines[i]!.textContent = conditionText(r, context, acquired); });
      return requirements.every((r) => conditionStatus(r, context).met);
    };
  };
  const bindGoal = (host: MenuElement, goal: DiscoveryGoal) => {
    host.setAttribute?.('data-discovery-kind', goal.kind);
    host.setAttribute?.('data-discovery-id', goal.id);
    const button = text('button', 'btn codex-goal', '무료 목표 선택');
    host.append(button);
    button.addEventListener('click', () => {
      const current = save?.progress?.codex?.goal;
      send({ type: 'setDiscoveryGoal', goal: current?.kind === goal.kind && current.id === goal.id ? null : goal });
    });
    return (state: SaveFile) => {
      const current = state.progress?.codex?.goal;
      const selected = current?.kind === goal.kind && current.id === goal.id;
      button.textContent = selected ? '선택한 목표 · 해제' : '무료 목표 선택';
      button.setAttribute?.('aria-pressed', String(selected));
    };
  };
  let goalKey = '';
  let updateGoalConditions: ((context: DiscoveryContext, acquired: AcquiredDiscoveries) => boolean) | undefined;
  const updateSummary = (state: SaveFile, context: DiscoveryContext, acquired: AcquiredDiscoveries): void => {
    const progress = state.progress!;
    const codex = progress.codex;
    const heroes = acquired.heroes.filter(id => !codex?.acknowledgedHeroes.includes(id));
    const monsters = acquired.monsters.filter(id => !codex?.acknowledgedMonsters.includes(id));
    displayed = { heroes: heroes.slice(0, 3), monsters: monsters.slice(0, 3) };
    unreadCount.textContent = `영웅 ${heroes.length} · 몬스터 ${monsters.length}${heroes.length + monsters.length === 0 ? ' · 모두 확인했습니다.' : ''}`;
    acknowledge.disabled = heroes.length + monsters.length === 0;
    const key = JSON.stringify(displayed);
    if (key !== previewKey) {
      previewKey = key;
      previews.replaceChildren(...displayed.heroes.map(id => {
        const card = text('div', 'discovery-preview');
        card.append(heroCanvas(doc, id, 64), text('span', 'discovery-name', heroForm(id)?.name ?? '영웅')); return card;
      }), ...displayed.monsters.map(id => {
        const card = text('div', 'discovery-preview');
        card.append(monsterCanvas(doc, id as SpeciesId, false), text('span', 'discovery-name', displayNameOf(id as SpeciesId))); return card;
      }));
    }
    const goal = codex?.goal;
    const nextKey = JSON.stringify(goal ?? null);
    if (nextKey !== goalKey) {
      goalKey = nextKey;
      goalConditions.replaceChildren();
      const form = goal?.kind === 'hero' ? heroForm(goal.id) : undefined;
      const requirements: readonly Requirement[] = goal?.kind === 'hero'
        ? rareHero(goal.id)?.requirements ?? (form && form.rank > 1 ? [{ kind: 'reincarnations', count: form.rank - 1 }] : [])
        : goal ? rareMonster(goal.id as SpeciesId)?.requirements ?? [] : [];
      updateGoalConditions = goal ? bindConditions(goalConditions, requirements,
        goal.kind === 'hero' ? '첫 환생부터 등장 가능' : '조건 없이 필드에서 무작위 등장') : undefined;
    }
    clearGoal.disabled = !goal;
    if (!goal) { goalName.textContent = '목표 없음 · 아래 카드에서 하나를 무료로 선택하세요.'; goalStatus.textContent = ''; return; }
    const seen = goal.kind === 'hero' ? acquired.heroes.includes(goal.id) : acquired.monsters.includes(goal.id);
    const number = goal.kind === 'hero' ? HERO_FORMS.findIndex(f => f.id === goal.id) + 1 : SPECIES_IDS.indexOf(goal.id as SpeciesId) + 1;
    goalName.textContent = `${goal.kind === 'hero' ? '영웅' : '몬스터'} #${String(number).padStart(3, '0')} · ${seen ? goal.kind === 'hero' ? heroForm(goal.id)?.name ?? '영웅' : displayNameOf(goal.id as SpeciesId) : '미발견'}`;
    const eligible = updateGoalConditions?.(context, acquired) ?? false;
    const owned = goal.kind === 'hero' && state.hero?.collection.some(r => r.formId === goal.id);
    goalStatus.textContent = seen ? `발견 완료${goal.kind === 'hero' ? owned ? ' · 보유' : ' · 미보유' : ''} · 목표는 직접 변경하거나 해제할 수 있습니다.`
      : goal.kind === 'hero' && state.hero && heroReadiness(state.level, state.hero).status === 'capped' ? '환생 상한 도달 · 새 후보를 열 수 없습니다. 목표는 유지됩니다.'
      : eligible ? goal.kind === 'hero' ? `조건 충족 · 아직 미발견. Lv.${heroRequiredLevel(state.hero?.reincarnations ?? 0)} 이후 환생 후보에서 선택하면 공개됩니다.` : '조건 충족 · 아직 미발견. 다음 필드 생성 때 추첨하며, 처치하면 공개됩니다.' : '현재 조건 미충족 · 목표는 유지됩니다.';
  };
  const makeHeroes = (): Card[] => HERO_FORMS.map((form, i) => {
    const nodes = makeCard(heroGrid, i + 1, form.rarity === 'rare' ? '레어' : '일반', `${ELEMENT_NAMES[form.type]} · ${'★'.repeat(form.rank)}`);
    const requirements: readonly Requirement[] = rareHero(form.id)?.requirements ?? (form.rank > 1 ? [{ kind: 'reincarnations', count: form.rank - 1 }] : []);
    const updateGoal = bindGoal(nodes.card, { kind: 'hero', id: form.id });
    const updateConditions = bindConditions(nodes.conditions, requirements, '첫 환생부터 등장 가능');
    const button = text('button', 'btn codex-equip');
    nodes.card.append(button);
    button.addEventListener('click', () => {
      if (!button.disabled) send({ type: 'heroEquip', formId: form.id });
    });
    let revealed: boolean | undefined;
    return { update(state, context, acquired) {
      updateGoal(state);
      const seen = acquired.heroes.includes(form.id);
      const owned = state.hero?.collection.find((r) => r.formId === form.id);
      if (revealed !== seen) {
        revealed = seen;
        nodes.art.replaceChildren(heroCanvas(doc, form.id, 96, !seen));
      }
      nodes.card.className = `codex-card ${seen ? 'discovered' : 'locked'}`;
      nodes.name.textContent = seen ? form.name : '미발견';
      nodes.description.textContent = seen ? form.description : '환생 후보에서 이 영웅을 선택하면 설명과 능력치가 공개됩니다.';
      nodes.stats.textContent = seen ? owned ? `${heroBuffText(owned)} · 중첩 ${owned.stacks ?? 0} · 이 영웅으로 ${state.progress?.heroCounts[form.id] ?? 0}회 환생`
        : `${form.buff === 'element' ? `${ELEMENT_NAMES[form.type]} 동료 +20–50%` : '모든 동료 +10–25%'} · 수락 시 수치 확정, 반복 환생 시 강화` : '능력치 미발견';
      const eligible = updateConditions(context, acquired);
      nodes.eligibility.textContent = seen ? owned ? '발견 · 보유' : '발견 · 미보유'
        : state.hero && heroReadiness(state.level, state.hero).status === 'capped' ? '환생 상한 도달 · 새 후보를 열 수 없습니다.'
        : eligible ? `조건 달성 · Lv.${heroRequiredLevel(state.hero?.reincarnations ?? 0)} 이후 새 환생 후보에서 만나 보세요${state.hero?.choices.length ? ' · 현재 열린 후보는 그대로 유지됩니다.' : ''}`
          : '조건을 달성하면 환생 후보에 등장할 수 있습니다.';
      button.disabled = !owned || state.hero?.equipped.formId === form.id;
      button.textContent = !owned ? '환생으로 획득하면 장착 가능' : state.hero?.equipped.formId === form.id ? '장착 중' : '무료 장착';
    } };
  });
  const makeMonsters = (): Card[] => SPECIES_IDS.map((speciesId, i) => {
    const rare = rareMonster(speciesId);
    const nodes = makeCard(monsterGrid, i + 1, rare ? '레어' : '일반', ELEMENT_NAMES[typeOf(speciesId)]);
    const updateGoal = bindGoal(nodes.card, { kind: 'monster', id: speciesId });
    const updateConditions = bindConditions(nodes.conditions, rare?.requirements ?? [], '조건 없이 필드에서 무작위 등장');
    let revealed: boolean | undefined;
    return { update(state, context, acquired) {
      updateGoal(state);
      const seen = acquired.monsters.includes(speciesId);
      if (revealed !== seen) {
        revealed = seen;
        nodes.art.replaceChildren(monsterCanvas(doc, speciesId, !seen));
      }
      nodes.card.className = `codex-card ${seen ? 'discovered' : 'locked'}`;
      nodes.name.textContent = seen ? displayNameOf(speciesId) : '미발견';
      nodes.description.textContent = seen ? rare?.description ?? `${ELEMENT_NAMES[typeOf(speciesId)]} 속성의 ${displayNameOf(speciesId)}. 보스로 만나 쓰러뜨리면 동료로 합류할 수 있습니다.`
        : '이 몬스터를 처치하면 설명과 능력치가 공개됩니다.';
      const monster = monsterForIndex(state.monsterIndex, speciesId);
      nodes.stats.textContent = seen ? `현재 깊이 ${state.monsterIndex + 1} 기준 HP ${format(monster.maxHp)}${monster.boss ? ' (보스)' : ''} · 동료 공격 대기 ${attackDelayOf(speciesId) / 1000}초 · 누적 ${state.progress?.speciesKills[speciesId] ?? 0}회 처치`
        : '능력치 미발견';
      const eligible = updateConditions(context, acquired);
      nodes.eligibility.textContent = eligible ? '현재 등장 가능 · 다음 필드 생성 때 추첨' : seen ? '발견 완료 · 현재 출현 조건 미충족' : '조건을 달성하면 필드에 등장할 수 있습니다.';
    } };
  });

  const render = (): void => {
    if (!save || root.hidden) return;
    const state = { ...save, progress: migrateProgress(save, save.monsterSpeciesId ?? monsterForIndex(save.monsterIndex).speciesId) };
    const context = discoveryContext(state, heroForm(save.hero?.equipped.formId ?? '')?.type);
    const acquired = acquiredDiscoveries(state);
    updateSummary(state, context, acquired);
    heroGrid.hidden = active !== 'hero';
    monsterGrid.hidden = active !== 'monster';
    heroes.className = `btn codex-heroes${active === 'hero' ? ' selected' : ''}`;
    monsters.className = `btn codex-monsters${active === 'monster' ? ' selected' : ''}`;
    heroes.setAttribute?.('aria-pressed', String(active === 'hero'));
    monsters.setAttribute?.('aria-pressed', String(active === 'monster'));
    const count = active === 'hero' ? acquired.heroes.length : acquired.monsters.length;
    heading.textContent = `${active === 'hero' ? '영웅' : '몬스터'} 도감 · 발견 ${count}/${active === 'hero' ? HERO_FORMS.length : SPECIES_IDS.length}`;
    const ms = state.progress.playTimeMs;
    const seconds = Math.ceil((FIELD_PHASE_MS - ms % FIELD_PHASE_MS) / 1000);
    phase.textContent = `필드 시간 · ${FIELD_PHASE_NAMES[fieldPhase(ms)]} · 다음 전환까지 플레이 ${Math.floor(seconds / 60)}분 ${seconds % 60}초 (20분 주기)`;
    if (active === 'hero') { heroCards ??= makeHeroes(); heroCards.forEach((card) => card.update(state, context, acquired)); }
    else { monsterCards ??= makeMonsters(); monsterCards.forEach((card) => card.update(state, context, acquired)); }
  };
  heroes.addEventListener('click', () => { active = 'hero'; render(); });
  monsters.addEventListener('click', () => { active = 'monster'; render(); });
  return (next) => { save = next; render(); };
}
