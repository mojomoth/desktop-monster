import { describe, expect, it } from 'vitest';
import { DEFAULT_SAVE } from '../src/core/save.js';
import type { CollectionAction } from '../src/core/collection.js';
import { HERO_MAX_REINCARNATIONS, heroRequiredLevel, newHeroProgress } from '../src/core/hero.js';
import type { HeroProgress } from '../src/core/hero.js';
import { heroPanel } from '../src/menu/hero.js';
import type { MenuDocument } from '../src/menu/index.js';

class Element {
  className = ''; textContent: string | null = null; hidden = false; disabled = false;
  children: Element[] = [];
  listeners: Array<() => void> = [];
  append(...children: unknown[]): void { this.children.push(...children as Element[]); }
  replaceChildren(...children: unknown[]): void { this.children = children as Element[]; }
  addEventListener(_type: 'click' | 'change', listener: () => void): void { this.listeners.push(listener); }
  all(): Element[] { return [this, ...this.children.flatMap((child) => child.all())]; }
}
const doc: MenuDocument = { createElement: () => new Element(), querySelector: () => null };
const panel = (level: number, hero: HeroProgress, actions: CollectionAction[] = []): Element[] =>
  (heroPanel(doc, { ...DEFAULT_SAVE, coins: 1000, level, hero }, (action) => actions.push(action)) as Element[])
    .flatMap((element) => element.all());

describe('v0.6 hero menu readiness', () => {
  it('separates accepting an old offer from the current reroll requirement', () => {
    const hero = { ...newHeroProgress(), reincarnations: 3, offerSerial: 7, offerLevel: 12,
      choices: [{ formId: 'h01', buffPercent: 10 }, { formId: 'h02', buffPercent: 15 }, { formId: 'h03', buffPercent: 20 }] };
    const actions: CollectionAction[] = [];
    const elements = panel(12, hero, actions);
    expect(elements.find((element) => element.className === 'next-level')?.textContent)
      .toBe(`현재 Lv.12 / 다음 환생 Lv.12 · 새 후보·재굴림 Lv.${heroRequiredLevel(3)}`);
    const accept = elements.find((element) => element.textContent === '이 영웅으로 환생')!;
    expect(accept.disabled).toBe(false);
    accept.listeners[0]!();
    expect(actions).toEqual([{ type: 'heroChoose', formId: 'h01', offerSerial: 7 }]);
    expect(elements.find((element) => element.textContent?.includes('골드로 다시 뽑기'))?.disabled).toBe(true);
    expect(panel(heroRequiredLevel(3), hero).find((element) => element.textContent?.includes('골드로 다시 뽑기'))?.disabled).toBe(false);
  });

  it('states the remaining wait through the last millisecond and opens at its exact end', () => {
    const required = heroRequiredLevel(1);
    for (const wait of ['restRemainingMs', 'deferRemainingMs'] as const) {
      const hero = { ...newHeroProgress(), reincarnations: 1, [wait]: 1 };
      const button = panel(required, hero).find((element) => element.className === 'btn')!;
      expect(button.disabled).toBe(true);
      expect(button.textContent).toContain('플레이 1초');
      expect(button.textContent).toContain(`Lv.${required} 필요`);
      const ready = panel(required, { ...hero, [wait]: 0 }).find((element) => element.className === 'btn')!;
      expect(ready.disabled).toBe(false);
      expect(ready.textContent).toBe('환생 후보 3명 보기');
      expect(panel(required - 1, { ...hero, [wait]: 0 }).find((element) => element.className === 'btn')?.textContent)
        .toBe(`Lv.${required}에 환생 해금`);
    }
  });

  it('does not promise another level target or offer at the reincarnation maximum', () => {
    const hero = { ...newHeroProgress(), reincarnations: HERO_MAX_REINCARNATIONS };
    const elements = panel(100, hero);
    expect(elements.find((element) => element.className === 'next-level')?.textContent).toContain('환생 상한 도달');
    expect(elements.some((element) => element.textContent?.includes('다음 환생 Lv.'))).toBe(false);
    expect(elements.filter((element) => element.className === 'btn')).toHaveLength(0);
    expect(panel(heroRequiredLevel(HERO_MAX_REINCARNATIONS - 1), { ...hero, reincarnations: HERO_MAX_REINCARNATIONS - 1 })
      .some((element) => element.textContent?.includes('이번 수락으로 환생 상한에 도달합니다.'))).toBe(true);
  });
});
