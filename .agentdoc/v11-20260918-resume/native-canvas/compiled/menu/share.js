"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SHARE_CODEX_PAGE_SIZE = exports.SHARE_CARD_SIZE = void 0;
exports.drawShareCard = drawShareCard;
// Pure PNG-card composition. The caller freezes the save/frame, creates a
// 1200×1200 canvas, and owns preview, clipboard and file dialogs. This module
// has no DOM, network, clock, RNG or save writes; only disclosed art is drawn.
const collection_js_1 = require("../core/collection.js");
const bignum_js_1 = require("../core/bignum.js");
const hero_js_1 = require("../core/hero.js");
const economy_js_1 = require("../core/economy.js");
const progress_js_1 = require("../core/progress.js");
const monsters_js_1 = require("../core/monsters.js");
const index_js_1 = require("../renderer/sprites/index.js");
const heroForms_js_1 = require("../renderer/sprites/heroForms.js");
exports.SHARE_CARD_SIZE = 1200;
exports.SHARE_CODEX_PAGE_SIZE = 12;
const ELEMENT = { fire: '불', water: '물', wind: '바람', earth: '대지', dark: '어둠' };
const titles = {
    hero: '나의 영웅', companion: '나의 동료', party: '함께하는 동료들',
    codex: '나의 발견 기록', field: '오늘의 모험', pvp: '대전의 순간',
};
function panel(ctx, x, y, w, h) {
    ctx.fillStyle = index_js_1.COLORS.steel;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#222034';
    ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
}
/** Fit by font size; never silently truncate an acquired character's name. */
function text(ctx, value, x, y, size = 32, color = index_js_1.COLORS.white, maxWidth = 1056) {
    ctx.fillStyle = color;
    let fit = size;
    ctx.font = `bold ${fit}px ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace`;
    while (fit > 14 && ctx.measureText(value).width > maxWidth) {
        fit -= 2;
        ctx.font = `bold ${fit}px ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace`;
    }
    ctx.fillText(value, x, y, maxWidth);
}
function sprite(ctx, art, cx, bottom, maxW, maxH) {
    const scale = Math.max(1, Math.floor(Math.min(maxW / art.w, maxH / art.h)));
    (0, index_js_1.drawSprite)(ctx, art, 0, Math.round(cx - art.w * scale / 2), bottom - art.h * scale, { scale });
}
const monsterArt = (id, stars = 0) => {
    const art = index_js_1.monsterSprites[(0, monsters_js_1.isSpeciesId)(id) ? id : 'slime'].idle;
    return { ...art, palette: (0, index_js_1.paletteForTier)(art.palette, stars) };
};
function companion(ctx, member, x, y, w, h, save) {
    panel(ctx, x, y, w, h);
    sprite(ctx, monsterArt(member.speciesId, member.stars), x + w / 2, y + h - 146, w - 40, h - 186);
    text(ctx, (0, monsters_js_1.displayNameOf)(member.speciesId), x + 16, y + h - 128, 26, index_js_1.COLORS.white, w - 32);
    text(ctx, `Lv.${(0, bignum_js_1.format)(member.level)} · ${ELEMENT[(0, monsters_js_1.typeOf)(member.speciesId)]}`, x + 16, y + h - 91, 24, index_js_1.COLORS.cyan, w - 32);
    text(ctx, `PvP ${(0, bignum_js_1.format)((0, collection_js_1.companionPower)(member))} · ★${(0, bignum_js_1.format)(member.stars)}`, x + 16, y + h - 59, 20, index_js_1.COLORS.cyan, w - 32);
    text(ctx, `사냥 공격력 ${(0, bignum_js_1.format)((0, collection_js_1.fieldCompanionPower)(member, save.hero?.reincarnations ?? 0, save.monsterCurveVersion ?? 10))}`, x + 16, y + h - 29, 20, index_js_1.COLORS.yellow, w - 32);
}
function fieldParty(save) {
    const target = (0, monsters_js_1.monsterForIndex)(save.monsterIndex, save.monsterSpeciesId);
    return (0, collection_js_1.activeFieldCompanions)(save.companions, target.type, save.hero?.equipped, save.hero?.reincarnations ?? 0, save.monsterCurveVersion ?? 10);
}
/** Returns pagination metadata without exposing internal character/player IDs. */
function drawShareCard(ctx, request) {
    const { save } = request;
    ctx.imageSmoothingEnabled = false;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = index_js_1.COLORS.void;
    ctx.fillRect(0, 0, exports.SHARE_CARD_SIZE, exports.SHARE_CARD_SIZE);
    ctx.fillStyle = index_js_1.COLORS.cyan;
    ctx.fillRect(48, 48, 12, 72);
    text(ctx, 'DesMon', 84, 48, 44, index_js_1.COLORS.cyan);
    text(ctx, titles[request.kind], 84, 106, 30);
    let page = 0;
    let pageCount = 1;
    if (request.kind === 'hero') {
        const roll = save.hero?.equipped;
        const form = (0, hero_js_1.heroForm)(roll?.formId ?? 'h00');
        panel(ctx, 72, 184, 1056, 608);
        sprite(ctx, (0, heroForms_js_1.heroFormSprite)(roll?.formId ?? 'h00'), 600, 724, 440, 456);
        text(ctx, form?.name ?? '수습 영웅', 72, 832, 44);
        text(ctx, `Lv.${(0, bignum_js_1.format)(save.level)} · 환생 ${(0, bignum_js_1.format)(save.hero?.reincarnations ?? 0)}회`, 72, 900, 32, index_js_1.COLORS.cyan);
        const power = (0, economy_js_1.trainedHeroPower)((0, hero_js_1.heroAttackPower)(save.level, save.souls, save.hero?.reincarnations ?? 0), save.progress?.trainingLevel ?? 0);
        text(ctx, `공격력 ${(0, bignum_js_1.format)(power)}`, 72, 954, 32, index_js_1.COLORS.yellow);
        text(ctx, form && roll ? `${form.buff === 'party' ? '모든' : ELEMENT[form.type]} 동료 공격력 +${(0, bignum_js_1.format)((0, hero_js_1.heroEffectiveBuff)(roll) * (form.buff === 'element' ? 2 : 1))}%`
            : '첫 번째 환생을 기다리는 중', 72, 1010, 28);
    }
    else if (request.kind === 'companion') {
        const member = save.companions.find(entry => entry.id === request.companionId);
        if (member)
            companion(ctx, member, 72, 184, 1056, 860, save);
        else
            text(ctx, '함께할 동료를 기다리는 중', 72, 550, 40);
    }
    else if (request.kind === 'party') {
        const party = fieldParty(save);
        text(ctx, `현재 필드 파티 · ${party.length}마리`, 72, 182, 32, index_js_1.COLORS.cyan);
        if (party.length === 0)
            text(ctx, '첫 동료와 만날 날을 기다려요', 72, 550, 40);
        for (const [index, member] of party.entries()) {
            const row = Math.floor(index / 3);
            companion(ctx, member, 72 + index % 3 * 360 + (row === 1 ? 180 : 0), 244 + row * 404, 336, 380, save);
        }
    }
    else if (request.kind === 'codex') {
        const kind = request.codexKind ?? 'hero';
        const acquired = (0, progress_js_1.acquiredDiscoveries)(save);
        const known = new Set(kind === 'hero' ? acquired.heroes : acquired.monsters);
        const catalog = kind === 'hero' ? hero_js_1.HERO_FORMS.map(form => form.id) : monsters_js_1.SPECIES_IDS;
        const disclosed = catalog.filter(id => known.has(id));
        pageCount = Math.max(1, Math.ceil(disclosed.length / exports.SHARE_CODEX_PAGE_SIZE));
        page = Number.isSafeInteger(request.page) ? Math.min(pageCount - 1, Math.max(0, request.page)) : 0;
        text(ctx, `${kind === 'hero' ? '영웅' : '몬스터'} 도감 · 발견 ${disclosed.length}/${catalog.length}`, 72, 182, 34, index_js_1.COLORS.cyan);
        const entries = disclosed.slice(page * exports.SHARE_CODEX_PAGE_SIZE, (page + 1) * exports.SHARE_CODEX_PAGE_SIZE);
        if (entries.length === 0)
            text(ctx, '새로운 발견을 기다리는 중', 72, 550, 40);
        for (const [index, id] of entries.entries()) {
            const x = 72 + index % 4 * 270;
            const y = 248 + Math.floor(index / 4) * 264;
            panel(ctx, x, y, 246, 240);
            sprite(ctx, kind === 'hero' ? (0, heroForms_js_1.heroFormSprite)(id) : monsterArt(id), x + 123, y + 166, 174, 150);
            text(ctx, kind === 'hero' ? (0, hero_js_1.heroForm)(id)?.name ?? '영웅' : (0, monsters_js_1.displayNameOf)(id), x + 12, y + 186, 24, index_js_1.COLORS.white, 222);
        }
    }
    else {
        const pvp = request.kind === 'pvp';
        if (request.frameCanvas) {
            // 200×130 field → 1000×650: one integer 5× scale, opaque card beneath.
            panel(ctx, 92, 224, 1016, 666);
            ctx.drawImage(request.frameCanvas, 100, 232, 1000, 650);
        }
        else if (pvp && request.replay) {
            panel(ctx, 72, 224, 1056, 666);
            const actorIds = new Set(request.replay.blows.flatMap(blow => [blow.side === 'A' ? blow.actorId : blow.targetId]));
            const mine = save.companions.filter(member => actorIds.has(member.id)).slice(0, 5);
            const theirs = request.replay.opponentParty.slice(0, 5);
            sprite(ctx, (0, heroForms_js_1.heroFormSprite)(save.hero?.equipped.formId ?? 'h00'), 336, 522, 168, 188);
            sprite(ctx, (0, heroForms_js_1.heroFormSprite)(request.replay.opponentHero?.formId ?? 'h00'), 864, 522, 168, 188);
            text(ctx, 'VS', 561, 414, 48, index_js_1.COLORS.yellow);
            for (const [group, side] of [[mine, 0], [theirs, 1]]) {
                for (const [index, member] of group.entries()) {
                    sprite(ctx, monsterArt(member.speciesId, member.stars), 152 + side * 528 + index * 88, 740, 78, 128);
                }
            }
            text(ctx, '나의 파티', 112, 790, 28, index_js_1.COLORS.cyan);
            text(ctx, '상대 파티', 640, 790, 28, index_js_1.COLORS.cyan);
        }
        else {
            text(ctx, pvp ? '아직 저장된 대전이 없습니다' : '전투 장면을 준비하지 못했습니다', 72, 550, 36);
        }
        text(ctx, pvp && request.result ? request.result.won ? 'VICTORY · 승리' : 'DEFEAT · 패배' : '함께 쌓아 가는 모험', 72, 940, 44, pvp && request.result?.won ? index_js_1.COLORS.yellow : index_js_1.COLORS.white);
        text(ctx, `Lv.${(0, bignum_js_1.format)(save.level)} · 최고 도달 ${(0, bignum_js_1.format)(save.bestIndex + 1)}`, 72, 1010, 30, index_js_1.COLORS.cyan);
    }
    ctx.fillStyle = index_js_1.COLORS.steel;
    ctx.fillRect(72, 1096, 1056, 2);
    text(ctx, 'DESMON · 작은 모험, 함께하는 하루', 72, 1130, 24, index_js_1.COLORS.steel, 870);
    if (request.kind === 'codex')
        text(ctx, `${page + 1} / ${pageCount}`, 976, 1130, 24, index_js_1.COLORS.steel, 152);
    return { width: exports.SHARE_CARD_SIZE, height: exports.SHARE_CARD_SIZE, page, pageCount };
}
