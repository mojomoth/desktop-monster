import { describe, expect, it } from 'vitest';
import { createEngine } from '../src/core/engine.js';
import { TRAINING_MAX_LEVEL, trainingCost } from '../src/core/economy.js';
import { newHeroProgress } from '../src/core/hero.js';
import { newProgress } from '../src/core/progress.js';
import { DEFAULT_SAVE } from '../src/core/save.js';
import type { SaveFile } from '../src/core/save.js';
import type { CollectionAction } from '../src/core/collection.js';
import { mountShop } from '../src/menu/economy.js';
import type { MenuDocument } from '../src/menu/index.js';

class Element {
  className = ''; textContent: string | null = null; hidden = false; disabled = false;
  children: Element[] = [];
  listeners: Array<() => void> = [];
  append(...children: unknown[]): void { this.children.push(...children as Element[]); }
  replaceChildren(...children: unknown[]): void { this.children = children as Element[]; }
  addEventListener(_type: 'click' | 'change', listener: () => void): void { this.listeners.push(listener); }
  all(): Element[] { return [this, ...this.children.flatMap((child) => child.all())]; }
  click(): void { for (const listener of this.listeners) listener(); }
}
const doc: MenuDocument = { createElement: () => new Element(), querySelector: () => null };
const fixture = (level = 5): SaveFile => ({ ...DEFAULT_SAVE, level, coins: 10_000, progress: newProgress() });
const hit = (save: SaveFile): bigint => {
  const event = createEngine(save, { next: () => .99 }).attack('keyboard').find((event) => event.type === 'attack');
  if (!event || event.type !== 'attack') throw new Error('Missing production attack event');
  expect(event.crit).toBe(false);
  return event.damage;
};
function shop(save: SaveFile, send: (action: CollectionAction) => void = () => undefined) {
  const root = new Element();
  const update = mountShop(doc, root, send);
  update(save);
  const card = root.children[1]!;
  return { update, card, button: card.all().find((element) => element.className === 'btn')!,
    effect: card.all().find((element) => element.className === 'shop-effect')! };
}

describe('v0.6 exact training preview', () => {
  it('shows integer +0 and +1 and matches actual noncritical nonfever attacks before and after purchase', () => {
    for (const [level, expected] of [[5, '14 → 14 (+0)'], [6, '22 → 23 (+1)']] as const) {
      const save = fixture(level);
      const { effect, card } = shop(save);
      expect(effect.textContent).toContain(expected);
      expect(card.all().some((element) => element.textContent?.includes('비치명·비피버 영웅 1회 피해'))).toBe(true);
      const engine = createEngine(save, { next: () => .99 });
      engine.apply({ type: 'shopBuy', item: 'training', shopSerial: 0 });
      const before = hit(save);
      const after = hit(engine.toSave());
      expect(effect.textContent).toContain(`피해 ${before} → ${after} (+${after - before})`);
      expect(engine.getState().coins).toBe(save.coins - trainingCost(0));
    }
  });

  it('updates the mounted preview when level, souls, reincarnations and training change', () => {
    const mounted = shop(fixture());
    for (const save of [fixture(6), { ...fixture(6), souls: 3 },
      { ...fixture(6), souls: 3, hero: { ...newHeroProgress(), reincarnations: 3 } },
      { ...fixture(6), souls: 3, hero: { ...newHeroProgress(), reincarnations: 3 }, progress: { ...newProgress(), trainingLevel: 4 } }]) {
      mounted.update(save);
      const engine = createEngine(save, { next: () => .99 });
      engine.apply({ type: 'shopBuy', item: 'training', shopSerial: 0 });
      const before = hit(save);
      const after = hit(engine.toSave());
      expect(mounted.effect.textContent).toContain(`피해 ${before} → ${after} (+${after - before})`);
      expect(mounted.card.all().find((element) => element.className === 'btn')).toBe(mounted.button);
    }
  });

  it('keeps the preview visible when gold is insufficient and makes no purchase at the maximum', () => {
    const actions: CollectionAction[] = [];
    const mounted = shop({ ...fixture(), coins: 74 }, (action) => actions.push(action));
    expect(mounted.effect.textContent).toContain('14 → 14 (+0)');
    expect(mounted.button.disabled).toBe(true);
    expect(mounted.button.textContent).toContain('1 부족');
    mounted.button.click();
    const maximum = { ...fixture(), progress: { ...newProgress(), trainingLevel: TRAINING_MAX_LEVEL } };
    mounted.update(maximum);
    expect(mounted.effect.textContent).toContain(`최대 단계 · 피해 ${hit(maximum)}`);
    expect(mounted.effect.textContent).not.toContain('→');
    expect(mounted.button.disabled).toBe(true);
    mounted.button.click();
    expect(actions).toEqual([]);
  });

  it('leaves rapid repeated clicks on one purchase token and spends only once', () => {
    const engine = createEngine(fixture(), { next: () => .99 });
    const actions: CollectionAction[] = [];
    const mounted = shop(engine.toSave(), (action) => { actions.push(action); engine.apply(action); });
    mounted.button.click();
    mounted.button.click();
    expect(actions).toEqual(Array.from({ length: 2 }, () => ({ type: 'shopBuy', item: 'training', shopSerial: 0 })));
    expect(engine.getState().coins).toBe(10_000 - 75);
    expect(engine.getState().progress).toMatchObject({ trainingLevel: 1, shopSerial: 1, goldSpent: 75 });
    mounted.update(engine.toSave());
    expect(mounted.effect.textContent).toContain('14 → 15 (+1)');
    mounted.button.click();
    expect(actions.at(-1)).toEqual({ type: 'shopBuy', item: 'training', shopSerial: 1 });
    expect(engine.getState().coins).toBe(10_000 - 75 - 300);
  });
});
