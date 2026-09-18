import { format } from '../core/bignum.js';
import {
  HERO_FORMS, HERO_MAX_REINCARNATIONS, heroEffectiveBuff, heroForm, heroReadiness,
  heroRequiredLevel, heroRerollCost, newHeroProgress, projectHeroRoll,
} from '../core/hero.js';
import { displayedHeroAttack } from '../core/equipment.js';
import type { EquipmentItem } from '../core/equipment.js';
import type { HeroRoll } from '../core/hero.js';
import type { SaveFile } from '../core/save.js';
import type { CollectionAction } from '../core/collection.js';
import { drawEquippedHero } from '../renderer/sprites/equippedHero.js';
import type { MenuDocument, MenuElement } from './index.js';

export const ELEMENT_NAMES = { fire: '불', water: '물', wind: '바람', earth: '대지', dark: '어둠' } as const;
export const SILHOUETTE_COLOR = '#8595a1';
export function heroBuffText(roll: HeroRoll): string {
  const form = heroForm(roll.formId);
  return form ? form.buff === 'element'
    ? `${ELEMENT_NAMES[form.type]} 동료 공격력 +${heroEffectiveBuff(roll) * 2}%`
    : `모든 동료 공격력 +${heroEffectiveBuff(roll)}%` : '환생하면 동료 버프가 열립니다';
}
export function heroCanvas(doc: MenuDocument, formId: string, size: 64 | 96 = 96, silhouette = false, weapon: EquipmentItem | null = null): MenuElement {
  const canvas = doc.createElement('canvas');
  canvas.className = 'hero-art';
  canvas.width = size;
  canvas.height = size;
  canvas.setAttribute?.('role', 'img');
  canvas.setAttribute?.('aria-label', silhouette ? '미발견 영웅 실루엣' : heroForm(formId)?.name ?? '수습 영웅');
  const ctx = canvas.getContext?.('2d');
  const sprite = { w: 14, h: 14 };
  // Four screen pixels per art pixel, matching the 2× canvas / 2× CSS field.
  if (ctx) drawEquippedHero(ctx, formId, weapon, (size - sprite.w * 4) / 2, (size - sprite.h * 4) / 2,
    { scale: 4, ...(silhouette ? { tint: SILHOUETTE_COLOR } : {}) });
  return canvas;
}

/** Summary and actionable choices only; the separate codex owns the one gallery. */
export function heroPanel(doc: MenuDocument, save: SaveFile, send: (a: CollectionAction) => void): MenuElement[] {
  const hero = save.hero ?? newHeroProgress();
  const text = (tag: string, className: string, value: string): MenuElement => {
    const el = doc.createElement(tag);
    el.className = className;
    el.textContent = value;
    return el;
  };
  const button = (label: string, disabled: boolean, action: CollectionAction): MenuElement => {
    const el = text('button', 'btn', label);
    el.disabled = disabled;
    el.setAttribute?.('data-hero-action', action.type);
    if (!disabled) el.addEventListener('click', () => send(action));
    return el;
  };
  const required = heroRequiredLevel(hero.reincarnations);
  const readiness = heroReadiness(save.level, hero);
  const capped = readiness.status === 'capped';
  const heading = text('div', 'hero-summary', '');
  const summary = text('div', 'hero-summary-text', '');
  const wallet = text('p', 'hero-summary-gold', `골드 ${format(BigInt(save.coins))}`);
  wallet.setAttribute?.('title', `${save.coins}G`);
  summary.append(
    text('h2', 'name', heroForm(hero.equipped.formId)?.name ?? '여행의 시작 · 수습 영웅'),
    text('p', 'power', `Lv.${save.level} · 공격력 ${format(displayedHeroAttack(save))}`),
    text('p', 'hero-buff', heroBuffText(hero.equipped)));
  heading.append(heroCanvas(doc, hero.equipped.formId, 96, false, save.equipment?.loadout.weapon), summary,
    text('p', 'hero-summary-meta', `환생 ${hero.reincarnations}회 · 영웅 ${hero.collection.length}/${HERO_FORMS.length} · 중첩 ${hero.equipped.stacks ?? 0}`),
    wallet,
    text('p', 'next-level', capped ? '환생 상한 도달 · 더 이상의 환생 목표는 없습니다'
      : `현재 Lv.${save.level} / 다음 환생 Lv.${readiness.requiredLevel}${readiness.requiredLevel !== required ? ` · 새 후보·재굴림 Lv.${required}` : ''}`));
  const ready = readiness.status === 'ready';
  const opportunity = text('div', 'hero-opportunity', '');
  if (capped) {
    opportunity.append(text('h3', 'name', '환생 상한 도달'),
      text('p', 'muted', '보유 영웅은 도감에서 계속 무료로 장착할 수 있습니다.'));
    return [heading, opportunity];
  }
  opportunity.append(text('h3', 'name', hero.choices.length > 0
    ? '다음 생의 영웅을 고르세요' : '새로운 모습으로 환생'),
    text('p', 'hero-reset', 'Lv.1 · 첫 몬스터부터 다시 시작합니다.'),
    text('p', 'hero-keeps', '동료·골드·훈련·발견·기록 유지 · 영혼과 영구 공격력 +25% 획득'));
  if (hero.choices.length === 3) {
    const choices = text('div', 'hero-choices', '');
    for (const roll of hero.choices) {
      const form = heroForm(roll.formId)!;
      const card = text('div', 'hero-choice', '');
      const owned = hero.collection.find((r) => r.formId === roll.formId);
      const projected = projectHeroRoll(hero, roll);
      const description = text('div', 'hero-choice-text', '');
      description.append(text('h3', 'name', form.name),
        text('span', 'stars', `${form.rarity === 'rare' ? '레어' : '일반'} · ${'★'.repeat(form.rank)} · ${ELEMENT_NAMES[form.type]}`),
        text('p', 'hero-buff', owned ? `현재 ${heroBuffText(owned)} → 수락 후 ${heroBuffText(projected)}` : heroBuffText(projected)),
        text('p', 'stack-change', owned ? `중첩 ${owned.stacks ?? 0} → ${projected.stacks ?? 0}` : '첫 획득 · 중첩 0'));
      const choose = button('환생', !ready, { type: 'heroChoose', formId: roll.formId, offerSerial: hero.offerSerial });
      choose.setAttribute?.('aria-label', `환생 선택: ${form.name}`);
      choose.setAttribute?.('data-hero-choice', roll.formId);
      card.append(heroCanvas(doc, roll.formId), description, choose);
      choices.append(card);
    }
    const cost = heroRerollCost(hero.reincarnations);
    opportunity.append(choices,
      button('보류 · 플레이 30초 후 무료 재도전', !ready, { type: 'heroDefer', offerSerial: hero.offerSerial }),
      button(`${cost} 골드로 다시 뽑기${save.level < required ? ` · Lv.${required} 필요` : BigInt(save.coins) < cost ? ` · ${cost - BigInt(save.coins)} 부족` : ''}`,
        !ready || save.level < required || BigInt(save.coins) < cost, { type: 'heroReroll', offerSerial: hero.offerSerial }));
  } else {
    opportunity.append(button(ready ? '환생 후보 3명 보기' : readiness.status === 'defer'
        ? `무료 재도전까지 플레이 ${Math.ceil(readiness.remainingMs / 1000)}초 · Lv.${readiness.requiredLevel} 필요`
        : `Lv.${readiness.requiredLevel}에 환생 해금`, !ready, { type: 'heroOffer' }));
  }
  const rules = text('details', 'hero-rules', '');
  const rulesToggle = text('summary', '', '환생 규칙 자세히');
  rulesToggle.setAttribute?.('data-hero-action', 'heroRules');
  rules.append(rulesToggle,
    text('p', 'muted', hero.reincarnations + 1 >= HERO_MAX_REINCARNATIONS ? '이번 수락으로 환생 상한에 도달합니다.'
      : `수락 후에는 Lv.${heroRequiredLevel(hero.reincarnations + 1)}에 도달하면 다시 환생할 수 있습니다.`),
    text('p', 'muted', '낮은 단계와 보유 영웅도 다시 등장합니다. 같은 영웅으로 환생하면 중첩 +1, 이전 최고 수치를 보존합니다. 도감에서 보유 영웅을 무료 장착할 수 있습니다.'));
  opportunity.append(rules);
  return [heading, opportunity];
}
