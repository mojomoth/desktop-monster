"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SILHOUETTE_COLOR = exports.ELEMENT_NAMES = void 0;
exports.heroBuffText = heroBuffText;
exports.heroCanvas = heroCanvas;
exports.heroPanel = heroPanel;
const bignum_js_1 = require("../core/bignum.js");
const hero_js_1 = require("../core/hero.js");
const equipment_js_1 = require("../core/equipment.js");
const equippedHero_js_1 = require("../renderer/sprites/equippedHero.js");
exports.ELEMENT_NAMES = { fire: '불', water: '물', wind: '바람', earth: '대지', dark: '어둠' };
exports.SILHOUETTE_COLOR = '#8595a1';
function heroBuffText(roll) {
    const form = (0, hero_js_1.heroForm)(roll.formId);
    return form ? form.buff === 'element'
        ? `${exports.ELEMENT_NAMES[form.type]} 동료 공격력 +${(0, hero_js_1.heroEffectiveBuff)(roll) * 2}%`
        : `모든 동료 공격력 +${(0, hero_js_1.heroEffectiveBuff)(roll)}%` : '환생하면 동료 버프가 열립니다';
}
function heroCanvas(doc, formId, size = 96, silhouette = false, weapon = null) {
    const canvas = doc.createElement('canvas');
    canvas.className = 'hero-art';
    canvas.width = size;
    canvas.height = size;
    canvas.setAttribute?.('role', 'img');
    canvas.setAttribute?.('aria-label', silhouette ? '미발견 영웅 실루엣' : (0, hero_js_1.heroForm)(formId)?.name ?? '수습 영웅');
    const ctx = canvas.getContext?.('2d');
    const sprite = { w: 14, h: 14 };
    // Four screen pixels per art pixel, matching the 2× canvas / 2× CSS field.
    if (ctx)
        (0, equippedHero_js_1.drawEquippedHero)(ctx, formId, weapon, (size - sprite.w * 4) / 2, (size - sprite.h * 4) / 2, { scale: 4, ...(silhouette ? { tint: exports.SILHOUETTE_COLOR } : {}) });
    return canvas;
}
/** Summary and actionable choices only; the separate codex owns the one gallery. */
function heroPanel(doc, save, send) {
    const hero = save.hero ?? (0, hero_js_1.newHeroProgress)();
    const text = (tag, className, value) => {
        const el = doc.createElement(tag);
        el.className = className;
        el.textContent = value;
        return el;
    };
    const button = (label, disabled, action) => {
        const el = text('button', 'btn', label);
        el.disabled = disabled;
        el.setAttribute?.('data-hero-action', action.type);
        if (!disabled)
            el.addEventListener('click', () => send(action));
        return el;
    };
    const required = (0, hero_js_1.heroRequiredLevel)(hero.reincarnations);
    const readiness = (0, hero_js_1.heroReadiness)(save.level, hero);
    const capped = readiness.status === 'capped';
    const heading = text('div', 'hero-summary', '');
    const summary = text('div', 'hero-summary-text', '');
    const wallet = text('p', 'hero-summary-gold', `골드 ${(0, bignum_js_1.format)(BigInt(save.coins))}`);
    wallet.setAttribute?.('title', `${save.coins}G`);
    summary.append(text('h2', 'name', (0, hero_js_1.heroForm)(hero.equipped.formId)?.name ?? '여행의 시작 · 수습 영웅'), text('p', 'power', `Lv.${save.level} · 공격력 ${(0, bignum_js_1.format)((0, equipment_js_1.displayedHeroAttack)(save))}`), text('p', 'hero-buff', heroBuffText(hero.equipped)));
    heading.append(heroCanvas(doc, hero.equipped.formId, 96, false, save.equipment?.loadout.weapon), summary, text('p', 'hero-summary-meta', `환생 ${hero.reincarnations}회 · 영웅 ${hero.collection.length}/${hero_js_1.HERO_FORMS.length} · 중첩 ${hero.equipped.stacks ?? 0}`), wallet, text('p', 'next-level', capped ? '환생 상한 도달 · 더 이상의 환생 목표는 없습니다'
        : `현재 Lv.${save.level} / 다음 환생 Lv.${readiness.requiredLevel}${readiness.requiredLevel !== required ? ` · 새 후보·재굴림 Lv.${required}` : ''}`));
    const ready = readiness.status === 'ready';
    const opportunity = text('div', 'hero-opportunity', '');
    if (capped) {
        opportunity.append(text('h3', 'name', '환생 상한 도달'), text('p', 'muted', '보유 영웅은 도감에서 계속 무료로 장착할 수 있습니다.'));
        return [heading, opportunity];
    }
    opportunity.append(text('h3', 'name', hero.choices.length > 0
        ? '다음 생의 영웅을 고르세요' : '새로운 모습으로 환생'), text('p', 'hero-reset', 'Lv.1 · 첫 몬스터부터 다시 시작합니다.'), text('p', 'hero-keeps', '동료·골드·훈련·발견·기록 유지 · 영혼과 영구 공격력 +25% 획득'));
    if (hero.choices.length === 3) {
        const choices = text('div', 'hero-choices', '');
        for (const roll of hero.choices) {
            const form = (0, hero_js_1.heroForm)(roll.formId);
            const card = text('div', 'hero-choice', '');
            const owned = hero.collection.find((r) => r.formId === roll.formId);
            const projected = (0, hero_js_1.projectHeroRoll)(hero, roll);
            const description = text('div', 'hero-choice-text', '');
            description.append(text('h3', 'name', form.name), text('span', 'stars', `${form.rarity === 'rare' ? '레어' : '일반'} · ${'★'.repeat(form.rank)} · ${exports.ELEMENT_NAMES[form.type]}`), text('p', 'hero-buff', owned ? `현재 ${heroBuffText(owned)} → 수락 후 ${heroBuffText(projected)}` : heroBuffText(projected)), text('p', 'stack-change', owned ? `중첩 ${owned.stacks ?? 0} → ${projected.stacks ?? 0}` : '첫 획득 · 중첩 0'));
            const choose = button('환생', !ready, { type: 'heroChoose', formId: roll.formId, offerSerial: hero.offerSerial });
            choose.setAttribute?.('aria-label', `환생 선택: ${form.name}`);
            choose.setAttribute?.('data-hero-choice', roll.formId);
            card.append(heroCanvas(doc, roll.formId), description, choose);
            choices.append(card);
        }
        const cost = (0, hero_js_1.heroRerollCost)(hero.reincarnations);
        opportunity.append(choices, button('보류 · 플레이 30초 후 무료 재도전', !ready, { type: 'heroDefer', offerSerial: hero.offerSerial }), button(`${cost} 골드로 다시 뽑기${save.level < required ? ` · Lv.${required} 필요` : BigInt(save.coins) < cost ? ` · ${cost - BigInt(save.coins)} 부족` : ''}`, !ready || save.level < required || BigInt(save.coins) < cost, { type: 'heroReroll', offerSerial: hero.offerSerial }));
    }
    else {
        opportunity.append(button(ready ? '환생 후보 3명 보기' : readiness.status === 'defer'
            ? `무료 재도전까지 플레이 ${Math.ceil(readiness.remainingMs / 1000)}초 · Lv.${readiness.requiredLevel} 필요`
            : `Lv.${readiness.requiredLevel}에 환생 해금`, !ready, { type: 'heroOffer' }));
    }
    const rules = text('details', 'hero-rules', '');
    const rulesToggle = text('summary', '', '환생 규칙 자세히');
    rulesToggle.setAttribute?.('data-hero-action', 'heroRules');
    rules.append(rulesToggle, text('p', 'muted', hero.reincarnations + 1 >= hero_js_1.HERO_MAX_REINCARNATIONS ? '이번 수락으로 환생 상한에 도달합니다.'
        : `수락 후에는 Lv.${(0, hero_js_1.heroRequiredLevel)(hero.reincarnations + 1)}에 도달하면 다시 환생할 수 있습니다.`), text('p', 'muted', '낮은 단계와 보유 영웅도 다시 등장합니다. 같은 영웅으로 환생하면 중첩 +1, 이전 최고 수치를 보존합니다. 도감에서 보유 영웅을 무료 장착할 수 있습니다.'));
    opportunity.append(rules);
    return [heading, opportunity];
}
