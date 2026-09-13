import { describe, expect, it } from 'vitest';
import type { CollectionAction } from '../src/core/collection.js';
import { HERO_FORMS, heroForm, newHeroProgress } from '../src/core/hero.js';
import { SPECIES_IDS, displayNameOf } from '../src/core/monsters.js';
import { acquiredDiscoveries, discoveryContext, migrateProgress, newProgress } from '../src/core/progress.js';
import type { DiscoveryGoal } from '../src/core/progress.js';
import { DEFAULT_SAVE } from '../src/core/save.js';
import type { SaveFile } from '../src/core/save.js';
import { conditionText, mountCodex } from '../src/menu/codex.js';
import { heroPanel, SILHOUETTE_COLOR } from '../src/menu/hero.js';
import type { MenuDocument, MenuElement } from '../src/menu/index.js';
import type { SpriteCanvas } from '../src/renderer/sprites/index.js';

/** Minimal recording DOM for the registered codex AC; no browser or clock needed. */
class Element implements MenuElement {
  className = '';
  textContent: string | null = null;
  hidden = false;
  disabled = false;
  open = false;
  children: Element[] = [];
  readonly attributes: Record<string, string> = {};
  readonly fills: string[] = [];
  private readonly clicks: Array<() => void> = [];
  append(...children: unknown[]): void { this.children.push(...children as Element[]); }
  replaceChildren(...children: unknown[]): void { this.children = children as Element[]; }
  addEventListener(_type: 'click' | 'change', listener: () => void): void { this.clicks.push(listener); }
  setAttribute(name: string, value: string): void { this.attributes[name] = value; }
  getContext(): SpriteCanvas {
    const context: SpriteCanvas = { fillStyle: '', fillRect: () => { this.fills.push(String(context.fillStyle)); } };
    return context;
  }
  click(): void { if (!this.disabled) this.clicks.forEach(listener => listener()); }
  find(className: string): Element[] {
    return [...(this.className.split(' ').includes(className) ? [this] : []), ...this.children.flatMap(child => child.find(className))];
  }
}

function setup() {
  const document: MenuDocument = { createElement: () => new Element(), querySelector: () => null };
  const root = new Element();
  const actions: CollectionAction[] = [];
  return { document, root, actions, update: mountCodex(document, root, action => actions.push(action)) };
}
const text = (root: Element, className: string): string => root.find(className).map(node => node.textContent).join('\n');
function card(root: Element, goal: DiscoveryGoal): Element {
  const node = root.find('codex-card').find(node => node.attributes['data-discovery-kind'] === goal.kind &&
    node.attributes['data-discovery-id'] === goal.id);
  if (!node) throw new Error(`missing card ${goal.kind}/${goal.id}`);
  return node;
}
function expectMasked(node: Element, kind: 'hero' | 'monster'): void {
  expect(text(node, 'name')).toBe('미발견');
  expect(text(node, 'codex-stats')).toBe('능력치 미발견');
  expect(text(node, 'codex-description')).toContain(kind === 'hero' ? '선택하면' : '처치하면');
  const art = node.find(`${kind}-art`)[0]!;
  expect(art.attributes['aria-label']).toBe(kind === 'hero' ? '미발견 영웅 실루엣' : '미발견 몬스터 실루엣');
  expect(new Set(art.fills)).toEqual(new Set([SILHOUETTE_COLOR]));
}

describe('V07-03 strict acquisition disclosure', () => {
  it('keeps every seen-only hero and monster masked, including condition references and alerts', () => {
    const { root, update, actions } = setup();
    update({ ...DEFAULT_SAVE, progress: { ...newProgress(), seenHeroes: HERO_FORMS.map(form => form.id),
      seenMonsters: [...SPECIES_IDS] } });
    expect(text(root, 'codex-count')).toBe('영웅 도감 · 발견 0/70');
    expect(root.find('hero-gallery')[0]!.find('codex-card')).toHaveLength(70);
    root.find('hero-gallery')[0]!.find('codex-card').forEach(node => expectMasked(node, 'hero'));
    expect(text(card(root, { kind: 'hero', id: 'h52' }), 'condition')).toContain('미발견 영웅 #001');
    expect(text(card(root, { kind: 'hero', id: 'h51' }), 'condition')).toContain('미발견 몬스터 #005');
    root.find('codex-monsters')[0]!.click();
    expect(text(root, 'codex-count')).toBe('몬스터 도감 · 발견 0/135');
    expect(root.find('monster-gallery')[0]!.find('codex-card')).toHaveLength(135);
    root.find('monster-gallery')[0]!.find('codex-card').forEach(node => expectMasked(node, 'monster'));
    expect(text(root, 'discovery-count')).toBe('영웅 0 · 몬스터 0 · 모두 확인했습니다.');
    expect(root.find('discovery-preview')).toHaveLength(0);
    expect(root.find('discovery-ack')[0]!.disabled).toBe(true);
    root.find('discovery-ack')[0]!.click();
    expect(actions).toEqual([]);
  });

  it('keeps offer and equipped portraits visible while unchosen codex entries stay masked', () => {
    const { document, root, update } = setup();
    const equipped = { formId: 'h02', buffPercent: 15 };
    const choices = ['h01', 'h03', 'h51'].map(formId => ({ formId, buffPercent: 15 }));
    const save = { ...DEFAULT_SAVE, level: 12, progress: newProgress(),
      hero: { ...newHeroProgress(), equipped, collection: [equipped], choices } };
    update(save);
    const panel = new Element();
    panel.append(...heroPanel(document, save, () => undefined));
    expect(panel.find('hero-art').map(art => art.attributes['aria-label']))
      .toEqual(['h02', 'h01', 'h03', 'h51'].map(id => heroForm(id)!.name));
    panel.find('hero-art').forEach(art => expect(new Set(art.fills).size).toBeGreaterThan(1));
    choices.forEach(choice => expectMasked(card(root, { kind: 'hero', id: choice.formId }), 'hero'));
    expect(text(root, 'codex-count')).toBe('영웅 도감 · 발견 1/70');
    expect(text(card(root, { kind: 'hero', id: 'h02' }), 'name')).toBe(heroForm('h02')!.name);
  });

  it.each(['count', 'history', 'collection'] as const)('reveals a chosen hero from permanent %s evidence without requiring seen history', evidence => {
    const { root, update, actions } = setup();
    const progress = newProgress();
    progress.codex!.goal = { kind: 'hero', id: 'h51' };
    const hero = newHeroProgress();
    if (evidence === 'count') progress.heroCounts.h51 = 1;
    if (evidence === 'history') progress.reincarnationHistory.push({ number: 1, formId: 'h51', level: 18,
      playTimeMs: 1000, buffPercent: 15, stacks: 0 });
    if (evidence === 'collection') hero.collection.push({ formId: 'h51', buffPercent: 15 });
    update({ ...DEFAULT_SAVE, progress, hero });
    const chosen = card(root, { kind: 'hero', id: 'h51' });
    expect(text(chosen, 'name')).toBe(heroForm('h51')!.name);
    expect(text(chosen, 'codex-description')).toBe(heroForm('h51')!.description);
    expect(text(chosen, 'codex-stats')).not.toBe('능력치 미발견');
    expect(chosen.find('hero-art')[0]!.attributes['aria-label']).toBe(heroForm('h51')!.name);
    expect(new Set(chosen.find('hero-art')[0]!.fills).size).toBeGreaterThan(1);
    expect(text(root, 'codex-count')).toBe('영웅 도감 · 발견 1/70');
    expect(text(root, 'discovery-name')).toBe(heroForm('h51')!.name);
    expect(text(root, 'goal-name')).toContain(heroForm('h51')!.name);
    expect(text(root, 'goal-status')).toContain(evidence === 'collection' ? '발견 완료 · 보유' : '발견 완료 · 미보유');
    root.find('discovery-ack')[0]!.click();
    expect(actions).toEqual([{ type: 'acknowledgeDiscoveries', heroes: ['h51'], monsters: [] }]);
  });

  it.each(['v5', 'v6'] as const)('removes %s appearance ACK and waits for the first actual kill before notifying and completing a goal', version => {
    const { root, update, actions } = setup();
    const progress = { ...newProgress(), seenHeroes: ['h51'], seenMonsters: ['dragon'] };
    if (version === 'v5') delete progress.codex;
    else progress.codex = { acknowledgedHeroes: ['h51'], acknowledgedMonsters: ['dragon'], goal: { kind: 'monster', id: 'dragon' } };
    const legacy: SaveFile = { ...DEFAULT_SAVE, killCount: 1000, monsterSpeciesId: 'dragon', progress,
      companions: [{ id: 'stolen', speciesId: 'dragon', bossIndex: 7, level: 250, stars: 0 }] };
    update(legacy);
    root.find('codex-monsters')[0]!.click();
    const dragon = card(root, { kind: 'monster', id: 'dragon' });
    expectMasked(dragon, 'monster');
    expect(text(root, 'codex-count')).toBe('몬스터 도감 · 발견 0/135');
    expect(root.find('discovery-ack')[0]!.disabled).toBe(true);
    const migrated = migrateProgress(legacy);
    migrated.codex!.goal = { kind: 'monster', id: 'dragon' };
    update({ ...legacy, progress: migrated });
    expect(text(root, 'goal-name')).toContain('미발견');
    expect(text(root, 'goal-status')).toContain('아직 미발견');
    const killed = { ...migrated, speciesKills: { dragon: 1 } };
    update({ ...legacy, progress: killed });
    expect(text(dragon, 'name')).toBe(displayNameOf('dragon'));
    expect(text(dragon, 'codex-description')).toContain(displayNameOf('dragon'));
    expect(text(dragon, 'codex-stats')).toContain('누적 1회 처치');
    expect(dragon.find('monster-art')[0]!.attributes['aria-label']).toBe(displayNameOf('dragon'));
    expect(new Set(dragon.find('monster-art')[0]!.fills).size).toBeGreaterThan(1);
    expect(text(root, 'codex-count')).toBe('몬스터 도감 · 발견 1/135');
    expect(text(root, 'discovery-count')).toBe('영웅 0 · 몬스터 1');
    expect(text(root, 'discovery-name')).toBe(displayNameOf('dragon'));
    expect(text(root, 'goal-status')).toContain('발견 완료');
    root.find('discovery-ack')[0]!.click();
    expect(actions).toEqual([{ type: 'acknowledgeDiscoveries', heroes: [], monsters: ['dragon'] }]);
    update({ ...legacy, progress: { ...killed, codex: { ...killed.codex!, acknowledgedMonsters: ['dragon'] } } });
    expect(root.find('discovery-preview')).toHaveLength(0);
    expect(root.find('discovery-ack')[0]!.disabled).toBe(true);
    expect(text(root, 'goal-status')).toContain('발견 완료');
  });

  it.each([
    { target: 'h51', reference: 'dragon', kind: 'speciesKills' as const, number: '#005', count: 3 },
    { target: 'h52', reference: 'h01', kind: 'heroHistory' as const, number: '#001', count: 2 },
  ])('updates masked $kind references in both the open card and selected goal after acquisition', ({ target, reference, kind, number, count }) => {
    const { root, update } = setup();
    const progress = newProgress();
    progress.codex!.goal = { kind: 'hero', id: target };
    const save = { ...DEFAULT_SAVE, progress };
    const requirement = { kind, id: reference, count };
    const hidden = conditionText(requirement, discoveryContext(save), acquiredDiscoveries(save));
    const name = kind === 'speciesKills' ? displayNameOf(reference) : heroForm(reference)!.name;
    expect(hidden).toContain(`미발견 ${kind === 'speciesKills' ? '몬스터' : '영웅'} ${number}`);
    expect(hidden).toContain(`0/${count}`);
    expect(hidden).not.toContain(name);
    update(save);
    const targetCard = card(root, { kind: 'hero', id: target });
    const goalCondition = root.find('goal-conditions')[0]!.find('condition')[0]!;
    targetCard.open = true;
    expect(text(targetCard, 'condition')).toBe(hidden);
    expect(goalCondition.textContent).toBe(hidden);
    if (kind === 'speciesKills') progress.speciesKills[reference] = 1;
    else progress.heroCounts[reference] = 1;
    update(save);
    expect(text(targetCard, 'condition')).toContain(name);
    expect(text(targetCard, 'condition')).toContain(`1/${count}`);
    expect(goalCondition.textContent).toBe(text(targetCard, 'condition'));
    expect(targetCard.open).toBe(true);
    expectMasked(targetCard, 'hero');
    expect(text(root, 'goal-status')).not.toContain('발견 완료');
  });

  it('re-masks previously revealed cards and stale previews when a legacy save has no acquisition evidence', () => {
    const { root, update } = setup();
    update({ ...DEFAULT_SAVE, progress: { ...newProgress(), heroCounts: { h51: 1 } } });
    const hero = card(root, { kind: 'hero', id: 'h51' });
    hero.open = true;
    expect(root.find('discovery-preview')).toHaveLength(1);
    update({ ...DEFAULT_SAVE, progress: { ...newProgress(), seenHeroes: ['h51'] } });
    expect(card(root, { kind: 'hero', id: 'h51' })).toBe(hero);
    expect(hero.open).toBe(true);
    expectMasked(hero, 'hero');
    expect(root.find('discovery-preview')).toHaveLength(0);
    expect(text(root, 'codex-count')).toBe('영웅 도감 · 발견 0/70');
    expect(root.find('discovery-ack')[0]!.disabled).toBe(true);
  });
});
