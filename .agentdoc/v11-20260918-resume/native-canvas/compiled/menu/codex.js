"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.monsterCanvas = monsterCanvas;
exports.conditionText = conditionText;
exports.mountCodex = mountCodex;
const equipment_js_1 = require("../core/equipment.js");
const bignum_js_1 = require("../core/bignum.js");
const hero_js_1 = require("../core/hero.js");
const progress_js_1 = require("../core/progress.js");
const discovery_js_1 = require("../core/discovery.js");
const monsters_js_1 = require("../core/monsters.js");
const index_js_1 = require("../renderer/sprites/index.js");
const hero_js_2 = require("./hero.js");
function monsterCanvas(doc, speciesId, silhouette) {
    const canvas = doc.createElement('canvas');
    canvas.className = 'monster-art';
    canvas.width = 96;
    canvas.height = 96;
    canvas.setAttribute?.('role', 'img');
    canvas.setAttribute?.('aria-label', silhouette ? '미발견 몬스터 실루엣' : (0, monsters_js_1.displayNameOf)(speciesId));
    const ctx = canvas.getContext?.('2d');
    const sprite = index_js_1.monsterSprites[speciesId].idle;
    const scale = Math.min(3, Math.floor(96 / Math.max(sprite.w, sprite.h)));
    if (ctx)
        (0, index_js_1.drawSprite)(ctx, sprite, 0, Math.floor((96 - sprite.w * scale) / 2), 96 - sprite.h * scale, { scale, ...(silhouette ? { tint: hero_js_2.SILHOUETTE_COLOR } : {}) });
    return canvas;
}
/** Keep condition progress public, but disclose referenced names only after acquisition. */
function conditionText(requirement, context, acquired) {
    const status = (0, discovery_js_1.conditionStatus)(requirement, context);
    let label = status.label;
    if (requirement.kind === 'speciesKills')
        label = label.replace(requirement.id, acquired.monsters.includes(requirement.id)
            ? (0, monsters_js_1.displayNameOf)(requirement.id) : `미발견 몬스터 #${String(monsters_js_1.SPECIES_IDS.indexOf(requirement.id) + 1).padStart(3, '0')}`);
    if (requirement.kind === 'heroHistory')
        label = label.replace(requirement.id, acquired.heroes.includes(requirement.id)
            ? (0, hero_js_1.heroForm)(requirement.id)?.name ?? requirement.id : `미발견 영웅 #${String(hero_js_1.HERO_FORMS.findIndex(form => form.id === requirement.id) + 1).padStart(3, '0')}`);
    let progress = `${status.current}/${status.target}`;
    if (requirement.kind === 'playTimeMs')
        progress = `${Math.floor(status.current / 60_000)}/${status.target / 60_000}분`;
    if (requirement.kind === 'phase')
        progress = `현재 ${discovery_js_1.FIELD_PHASE_NAMES[(0, discovery_js_1.fieldPhase)(context.playTimeMs)]}`;
    if (requirement.kind === 'equippedType')
        progress = context.equippedType ? `현재 ${hero_js_2.ELEMENT_NAMES[context.equippedType]}` : '현재 수습 영웅';
    return `${status.met ? '✓' : '○'} ${label}${requirement.kind === 'pvpWins' ? '' : ` · ${progress}`}`;
}
/** Create each gallery once on demand; update text in place and reveal each canvas once. */
function mountCodex(doc, root, send) {
    const text = (tag, className, value = '') => {
        const el = doc.createElement(tag);
        el.className = className;
        el.textContent = value;
        return el;
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
    discoveries.append(text('h3', '', '새로 발견했어요'), unreadCount, previews, acknowledge, text('p', 'muted', '표시한 카드만 확인합니다. 남은 발견은 이어서 표시됩니다.'));
    goalPanel.append(text('h3', '', '선택한 목표'), goalName, goalStatus, goalConditions, clearGoal);
    let displayed = { heroes: [], monsters: [] };
    let previewKey = '';
    acknowledge.addEventListener('click', () => {
        if (!acknowledge.disabled)
            send({ type: 'acknowledgeDiscoveries', heroes: [...displayed.heroes], monsters: [...displayed.monsters] });
    });
    clearGoal.addEventListener('click', () => { if (!clearGoal.disabled)
        send({ type: 'setDiscoveryGoal', goal: null }); });
    const tabs = text('div', 'codex-tabs');
    const heroes = text('button', 'btn codex-heroes', '영웅 도감');
    const monsters = text('button', 'btn codex-monsters', '몬스터 도감');
    tabs.append(heroes, monsters);
    const heroGrid = text('div', 'codex-grid hero-gallery');
    const monsterGrid = text('div', 'codex-grid monster-gallery');
    const legendaryGrid = text('div', 'codex-grid legendary-gallery');
    const help = text('details', 'codex-help');
    help.append(text('summary', '', '발견 방법과 필드 시간'), text('p', 'muted', '카드를 펼치면 발견 조건과 진행도를 확인할 수 있습니다. 영웅은 환생에서 선택하고, 몬스터는 처치하면 도감에 공개됩니다.'), phase);
    root.replaceChildren(heading, tabs, goalPanel, discoveries, help, heroGrid, monsterGrid, legendaryGrid);
    let active = 'hero';
    let save;
    let heroCards;
    let monsterCards;
    let legendaryCards;
    const makeCard = (host, number, rarity, element) => {
        const card = text('details', 'codex-card');
        const summary = text('summary', 'codex-summary');
        const art = text('span', 'codex-art');
        const name = text('span', 'name');
        const description = text('p', 'codex-description');
        const stats = text('p', 'codex-stats');
        const eligibility = text('p', 'codex-eligibility');
        const conditions = text('div', 'codex-conditions');
        summary.append(art, text('span', 'codex-number', `#${String(number).padStart(3, '0')}`), name, text('span', 'stars', `${rarity} · ${element}`));
        card.append(summary, description, stats, eligibility, conditions);
        host.append(card);
        return { card, art, name, description, stats, eligibility, conditions };
    };
    const bindConditions = (host, requirements, fallback) => {
        const lines = requirements.map(() => text('p', 'condition'));
        host.append(text('p', 'muted', requirements.length > 1 ? '발견 조건 · 아래 항목 모두 충족' : '발견 조건'), ...(lines.length ? lines : [text('p', 'condition', fallback)]));
        return (context, acquired) => {
            requirements.forEach((r, i) => { lines[i].textContent = conditionText(r, context, acquired); });
            return requirements.every((r) => (0, discovery_js_1.conditionStatus)(r, context).met);
        };
    };
    const bindGoal = (host, goal) => {
        host.setAttribute?.('data-discovery-kind', goal.kind);
        host.setAttribute?.('data-discovery-id', goal.id);
        const button = text('button', 'btn codex-goal', '무료 목표 선택');
        host.append(button);
        button.addEventListener('click', () => {
            const current = save?.progress?.codex?.goal;
            send({ type: 'setDiscoveryGoal', goal: current?.kind === goal.kind && current.id === goal.id ? null : goal });
        });
        return (state) => {
            const current = state.progress?.codex?.goal;
            const selected = current?.kind === goal.kind && current.id === goal.id;
            button.textContent = selected ? '선택한 목표 · 해제' : '무료 목표 선택';
            button.setAttribute?.('aria-pressed', String(selected));
        };
    };
    let goalKey = '';
    let updateGoalConditions;
    const updateSummary = (state, context, acquired) => {
        const progress = state.progress;
        const codex = progress.codex;
        const heroes = acquired.heroes.filter(id => !codex?.acknowledgedHeroes.includes(id));
        const monsters = acquired.monsters.filter(id => !codex?.acknowledgedMonsters.includes(id));
        displayed = { heroes: heroes.slice(0, 3), monsters: monsters.slice(0, Math.max(0, 3 - heroes.length)) };
        discoveries.hidden = heroes.length + monsters.length === 0;
        unreadCount.textContent = `영웅 ${heroes.length} · 몬스터 ${monsters.length}${heroes.length + monsters.length === 0 ? ' · 모두 확인했습니다.' : ''}`;
        acknowledge.disabled = heroes.length + monsters.length === 0;
        const key = JSON.stringify(displayed);
        if (key !== previewKey) {
            previewKey = key;
            previews.replaceChildren(...displayed.heroes.map(id => {
                const card = text('div', 'discovery-preview');
                card.append((0, hero_js_2.heroCanvas)(doc, id, 64), text('span', 'discovery-name', (0, hero_js_1.heroForm)(id)?.name ?? '영웅'));
                return card;
            }), ...displayed.monsters.map(id => {
                const card = text('div', 'discovery-preview');
                card.append(monsterCanvas(doc, id, false), text('span', 'discovery-name', (0, monsters_js_1.displayNameOf)(id)));
                return card;
            }));
        }
        const goal = codex?.goal;
        const nextKey = JSON.stringify(goal ?? null);
        if (nextKey !== goalKey) {
            goalKey = nextKey;
            goalConditions.replaceChildren();
            const form = goal?.kind === 'hero' ? (0, hero_js_1.heroForm)(goal.id) : undefined;
            const requirements = goal?.kind === 'hero'
                ? (0, discovery_js_1.rareHero)(goal.id)?.requirements ?? (form && form.rank > 1 ? [{ kind: 'reincarnations', count: form.rank - 1 }] : [])
                : goal ? (0, discovery_js_1.rareMonster)(goal.id)?.requirements ?? [] : [];
            updateGoalConditions = goal ? bindConditions(goalConditions, requirements, goal.kind === 'hero' ? '첫 환생부터 등장 가능' : '조건 없이 필드에서 무작위 등장') : undefined;
        }
        clearGoal.disabled = !goal;
        clearGoal.hidden = !goal;
        goalPanel.className = goal ? 'discovery-goal' : 'discovery-goal no-goal';
        if (!goal) {
            goalName.textContent = '아래 카드에서 수집할 목표를 선택하세요.';
            goalStatus.textContent = '';
            return;
        }
        const seen = goal.kind === 'hero' ? acquired.heroes.includes(goal.id) : acquired.monsters.includes(goal.id);
        const number = goal.kind === 'hero' ? hero_js_1.HERO_FORMS.findIndex(f => f.id === goal.id) + 1 : monsters_js_1.SPECIES_IDS.indexOf(goal.id) + 1;
        goalName.textContent = `${goal.kind === 'hero' ? '영웅' : '몬스터'} #${String(number).padStart(3, '0')} · ${seen ? goal.kind === 'hero' ? (0, hero_js_1.heroForm)(goal.id)?.name ?? '영웅' : (0, monsters_js_1.displayNameOf)(goal.id) : '미발견'}`;
        const eligible = updateGoalConditions?.(context, acquired) ?? false;
        const owned = goal.kind === 'hero' && state.hero?.collection.some(r => r.formId === goal.id);
        goalStatus.textContent = seen ? `발견 완료${goal.kind === 'hero' ? owned ? ' · 보유' : ' · 미보유' : ''} · 목표는 직접 변경하거나 해제할 수 있습니다.`
            : goal.kind === 'hero' && state.hero && (0, hero_js_1.heroReadiness)(state.level, state.hero).status === 'capped' ? '환생 상한 도달 · 새 후보를 열 수 없습니다. 목표는 유지됩니다.'
                : eligible ? goal.kind === 'hero' ? `조건 충족 · 아직 미발견. Lv.${(0, hero_js_1.heroRequiredLevel)(state.hero?.reincarnations ?? 0)} 이후 환생 후보에서 선택하면 공개됩니다.` : '조건 충족 · 아직 미발견. 다음 필드 생성 때 추첨하며, 처치하면 공개됩니다.' : '현재 조건 미충족 · 목표는 유지됩니다.';
    };
    const makeHeroes = () => hero_js_1.HERO_FORMS.map((form, i) => {
        const nodes = makeCard(heroGrid, i + 1, form.rarity === 'rare' ? '레어' : '일반', `${hero_js_2.ELEMENT_NAMES[form.type]} · ${'★'.repeat(form.rank)}`);
        const requirements = (0, discovery_js_1.rareHero)(form.id)?.requirements ?? (form.rank > 1 ? [{ kind: 'reincarnations', count: form.rank - 1 }] : []);
        const updateGoal = bindGoal(nodes.card, { kind: 'hero', id: form.id });
        const updateConditions = bindConditions(nodes.conditions, requirements, '첫 환생부터 등장 가능');
        const button = text('button', 'btn codex-equip');
        nodes.card.append(button);
        button.addEventListener('click', () => {
            if (!button.disabled)
                send({ type: 'heroEquip', formId: form.id });
        });
        let revealed;
        return { update(state, context, acquired) {
                updateGoal(state);
                const seen = acquired.heroes.includes(form.id);
                const owned = state.hero?.collection.find((r) => r.formId === form.id);
                if (revealed !== seen) {
                    revealed = seen;
                    nodes.art.replaceChildren((0, hero_js_2.heroCanvas)(doc, form.id, 96, !seen));
                }
                nodes.card.className = `codex-card ${seen ? 'discovered' : 'locked'}`;
                nodes.name.textContent = seen ? form.name : '미발견';
                nodes.description.textContent = seen ? form.description : '환생 후보에서 이 영웅을 선택하면 설명과 능력치가 공개됩니다.';
                nodes.stats.textContent = seen ? owned ? `${(0, hero_js_2.heroBuffText)(owned)} · 중첩 ${owned.stacks ?? 0} · 이 영웅으로 ${state.progress?.heroCounts[form.id] ?? 0}회 환생`
                    : `${form.buff === 'element' ? `${hero_js_2.ELEMENT_NAMES[form.type]} 동료 +20–50%` : '모든 동료 +10–25%'} · 수락 시 수치 확정, 반복 환생 시 강화` : '능력치 미발견';
                const eligible = updateConditions(context, acquired);
                nodes.eligibility.textContent = seen ? owned ? '발견 · 보유' : '발견 · 미보유'
                    : state.hero && (0, hero_js_1.heroReadiness)(state.level, state.hero).status === 'capped' ? '환생 상한 도달 · 새 후보를 열 수 없습니다.'
                        : eligible ? `조건 달성 · Lv.${(0, hero_js_1.heroRequiredLevel)(state.hero?.reincarnations ?? 0)} 이후 새 환생 후보에서 만나 보세요${state.hero?.choices.length ? ' · 현재 열린 후보는 그대로 유지됩니다.' : ''}`
                            : '조건을 달성하면 환생 후보에 등장할 수 있습니다.';
                button.disabled = !owned || state.hero?.equipped.formId === form.id;
                button.textContent = !owned ? '환생으로 획득하면 장착 가능' : state.hero?.equipped.formId === form.id ? '장착 중' : '무료 장착';
            } };
    });
    const makeMonsters = () => monsters_js_1.SPECIES_IDS.map((speciesId, i) => {
        const rare = (0, discovery_js_1.rareMonster)(speciesId);
        const nodes = makeCard(monsterGrid, i + 1, rare ? '레어' : '일반', hero_js_2.ELEMENT_NAMES[(0, monsters_js_1.typeOf)(speciesId)]);
        const updateGoal = bindGoal(nodes.card, { kind: 'monster', id: speciesId });
        const updateConditions = bindConditions(nodes.conditions, rare?.requirements ?? [], '조건 없이 필드에서 무작위 등장');
        let revealed;
        return { update(state, context, acquired) {
                updateGoal(state);
                const seen = acquired.monsters.includes(speciesId);
                if (revealed !== seen) {
                    revealed = seen;
                    nodes.art.replaceChildren(monsterCanvas(doc, speciesId, !seen));
                }
                nodes.card.className = `codex-card ${seen ? 'discovered' : 'locked'}`;
                nodes.name.textContent = seen ? (0, monsters_js_1.displayNameOf)(speciesId) : '미발견';
                nodes.description.textContent = seen ? rare?.description ?? `${hero_js_2.ELEMENT_NAMES[(0, monsters_js_1.typeOf)(speciesId)]} 속성의 ${(0, monsters_js_1.displayNameOf)(speciesId)}. 보스로 만나 쓰러뜨리면 동료로 합류할 수 있습니다.`
                    : '이 몬스터를 처치하면 설명과 능력치가 공개됩니다.';
                const monster = (0, monsters_js_1.monsterForIndex)(state.monsterIndex, speciesId);
                nodes.stats.textContent = seen ? `현재 깊이 ${state.monsterIndex + 1} 기준 HP ${(0, bignum_js_1.format)(monster.maxHp)}${monster.boss ? ' (보스)' : ''} · 동료 공격 대기 ${(0, monsters_js_1.attackDelayOf)(speciesId) / 1000}초 · 누적 ${state.progress?.speciesKills[speciesId] ?? 0}회 처치`
                    : '능력치 미발견';
                const eligible = updateConditions(context, acquired);
                nodes.eligibility.textContent = eligible ? '현재 등장 가능 · 다음 필드 생성 때 추첨' : seen ? '발견 완료 · 현재 출현 조건 미충족' : '조건을 달성하면 필드에 등장할 수 있습니다.';
            } };
    });
    const makeLegends = () => equipment_js_1.EPIC_BOSSES.map((boss, i) => {
        const nodes = makeCard(legendaryGrid, i + 1, '전설 보스', hero_js_2.ELEMENT_NAMES[(0, monsters_js_1.typeOf)(boss.speciesId)]);
        nodes.name.textContent = boss.name;
        nodes.art.append(monsterCanvas(doc, boss.speciesId, false));
        nodes.description.textContent = '보스 단계에서 조건을 만족하면 별도로 추첨합니다. 일반 레어의 출현 보장·미끼·목표 추적은 적용되지 않습니다.';
        const updateConditions = bindConditions(nodes.conditions, boss.requirements, '조건 없음');
        const loot = (0, equipment_js_1.epicLootForBoss)(boss.id).map(item => {
            const row = text('p', 'legendary-loot');
            row.setAttribute?.('style', `color:${equipment_js_1.RARITY_COLORS.epic}`);
            nodes.card.append(row);
            return { item, row };
        });
        return { update(state, context, acquired) {
                const eligible = updateConditions(context, acquired);
                nodes.eligibility.textContent = eligible ? '출현 조건 충족 · 보스 생성 시 추첨' : '아직 출현 조건 미충족';
                nodes.stats.textContent = `전설 보스군 출현 ${equipment_js_1.EQUIPMENT_BALANCE.epicEncounterBps / 100}% · 처치 후 전용 에픽 추첨 ${equipment_js_1.EQUIPMENT_BALANCE.epicDropBps / 100}% · 보스 내 동일 가중치`;
                for (const { item, row } of loot)
                    row.textContent = `${item.name} · ${item.kind === 'weapon' ? `Lv.${item.requiredLevel} · ` : ''}획득 ${state.equipment?.acquired[item.id] ?? 0}회`;
            } };
    });
    const render = () => {
        if (!save || root.hidden)
            return;
        const state = { ...save, progress: (0, progress_js_1.saveProgress)((0, progress_js_1.migrateProgress)(save, save.monsterSpeciesId ?? (0, monsters_js_1.monsterForIndex)(save.monsterIndex).speciesId)) };
        const context = (0, progress_js_1.discoveryContext)(state, (0, hero_js_1.heroForm)(save.hero?.equipped.formId ?? '')?.type);
        const acquired = (0, progress_js_1.acquiredDiscoveries)(state);
        updateSummary(state, context, acquired);
        heroGrid.hidden = active !== 'hero';
        monsterGrid.hidden = active !== 'monster';
        legendaryGrid.hidden = active !== 'monster';
        heroes.className = `btn codex-heroes${active === 'hero' ? ' selected' : ''}`;
        monsters.className = `btn codex-monsters${active === 'monster' ? ' selected' : ''}`;
        heroes.setAttribute?.('aria-pressed', String(active === 'hero'));
        monsters.setAttribute?.('aria-pressed', String(active === 'monster'));
        const count = active === 'hero' ? acquired.heroes.length : acquired.monsters.length;
        heading.textContent = `${active === 'hero' ? '영웅' : '몬스터'} 도감 · 발견 ${count}/${active === 'hero' ? hero_js_1.HERO_FORMS.length : monsters_js_1.SPECIES_IDS.length}`;
        const ms = state.progress.playTimeMs;
        const seconds = Math.ceil((discovery_js_1.FIELD_PHASE_MS - ms % discovery_js_1.FIELD_PHASE_MS) / 1000);
        phase.textContent = `필드 시간 · ${discovery_js_1.FIELD_PHASE_NAMES[(0, discovery_js_1.fieldPhase)(ms)]} · 다음 전환까지 플레이 ${Math.floor(seconds / 60)}분 ${seconds % 60}초 (20분 주기)`;
        if (active === 'hero') {
            heroCards ??= makeHeroes();
            heroCards.forEach((card) => card.update(state, context, acquired));
        }
        else {
            monsterCards ??= makeMonsters();
            monsterCards.forEach((card) => card.update(state, context, acquired));
            legendaryCards ??= makeLegends();
            legendaryCards.forEach(card => card.update(state, context, acquired));
        }
    };
    heroes.addEventListener('click', () => { active = 'hero'; render(); });
    monsters.addEventListener('click', () => { active = 'monster'; render(); });
    return (next) => { save = next; render(); };
}
