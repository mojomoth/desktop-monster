"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EQUIPMENT_PAGE_SIZE = void 0;
exports.successText = successText;
exports.itemPrimary = itemPrimary;
exports.mountEquipment = mountEquipment;
const equipment_js_1 = require("../core/equipment.js");
const bignum_js_1 = require("../core/bignum.js");
const equipment_js_2 = require("../renderer/sprites/equipment.js");
exports.EQUIPMENT_PAGE_SIZE = 24;
const rarityNames = { common: '일반', uncommon: '고급', rare: '레어', epic: '에픽' };
const jobNames = ['기사', '창술사', '사수', '성직자', '암살자', '수호자', '마법사', '격투가', '전사', '주술사'];
function successText(target) {
    const { numerator, denominator } = (0, equipment_js_1.enhancementSuccess)(target);
    if (numerator === denominator)
        return '100%';
    const hundredths = numerator * 10000n / denominator;
    return `${hundredths > 0n ? `${hundredths / 100n}.${String(hundredths % 100n).padStart(2, '0')}%` : '0.01% 미만'} (${numerator}/${denominator})`;
}
function itemPrimary(item) {
    const value = (0, equipment_js_1.itemAttack)(item);
    return `${(0, equipment_js_1.equipmentTemplate)(item.templateId)?.kind === 'weapon' ? '무기 공격' : '공격'} +${value / 100n}.${String(value % 100n).padStart(2, '0')}%`;
}
/** Item nodes outlive wallet/save updates, preserving disclosure and keyboard focus. */
function mountEquipment(doc, root, send, mode, now = Date.now) {
    const text = (tag, className, value = '') => {
        const el = doc.createElement(tag);
        el.className = className;
        el.textContent = value;
        return el;
    };
    const title = text('h2', 'equipment-heading', mode === 'shop' ? '장비 상점' : '장비와 가방');
    const summary = text('p', 'equipment-summary'), countdown = text('p', 'equipment-countdown');
    const expand = text('button', 'btn equipment-expand'), content = text('div', 'equipment-content');
    root.replaceChildren(title, summary, countdown, expand, content);
    let current;
    const act = (type, item) => {
        if (current?.equipment)
            send({ type, itemId: item.id, revision: current.equipment.revision });
    };
    const equip = (itemId, replaceId) => {
        if (current?.equipment)
            send({ type: 'equipmentEquip', itemId, revision: current.equipment.revision,
                ...(replaceId ? { replaceId } : {}) });
    };
    expand.addEventListener('click', () => {
        if (current?.equipment && !expand.disabled)
            send({ type: 'equipmentExpand', revision: current.equipment.revision });
    });
    const cards = new Map();
    const visibleCards = new Map();
    const pruneCards = () => {
        const visible = new Set([...visibleCards.values()].flat());
        for (const key of cards.keys())
            if (!visible.has(key))
                cards.delete(key);
    };
    const card = (original, shopping) => {
        let item = original, artKey = '', replacementsKey = '';
        const def = (0, equipment_js_1.equipmentTemplate)(item.templateId);
        const node = text('article', `equipment-card rarity-${def.rarity}`);
        node.setAttribute?.('data-item-id', item.id);
        node.setAttribute?.('style', `--rarity-color:${equipment_js_1.RARITY_COLORS[def.rarity]}`);
        const art = text('canvas', 'equipment-icon');
        art.width = 64;
        art.height = 64;
        art.setAttribute?.('aria-label', def.name);
        art.setAttribute?.('role', 'img');
        const name = text('h3', 'equipment-name'), rarity = text('p', 'equipment-rarity');
        const primary = text('p', 'equipment-primary'), requirement = text('p', 'equipment-requirement');
        const bonus = text('p', 'equipment-bonus'), details = text('details', 'equipment-details');
        details.append(text('summary', '', '능력과 장착 조건'), requirement, text('p', 'muted', `수습 영웅 · ${def.allowedJobs.map(job => jobNames[job]).join(' · ')}`), bonus);
        node.append(art, name, rarity, primary, details);
        const buy = text('button', 'btn equipment-buy'), enhance = text('button', 'btn equipment-enhance');
        const sell = text('button', 'btn equipment-sell'), move = text('button', 'btn equipment-move', '가방으로 이동');
        const wear = text('button', 'btn equipment-equip', '장착');
        const replacement = text('details', 'equipment-equip-choice'), replacementList = text('div', 'equipment-equip-options');
        replacement.append(text('summary', '', '장착할 자리 선택'), replacementList);
        const preview = text('details', 'equipment-enhance-preview'), previewTitle = text('summary', '');
        const previewPower = text('p', ''), riskText = text('p', ''), costText = text('p', 'equipment-cost');
        preview.append(previewTitle, previewPower, riskText, costText, enhance);
        buy.addEventListener('click', () => {
            if (!buy.disabled && current?.equipment)
                send({ type: 'equipmentBuy', itemId: item.id,
                    shopSerial: current.equipment.shop.serial, revision: current.equipment.revision });
        });
        enhance.addEventListener('click', () => { if (!enhance.disabled)
            act('equipmentEnhance', item); });
        sell.addEventListener('click', () => act('equipmentSell', item));
        move.addEventListener('click', () => { if (!move.disabled)
            act('equipmentMove', item); });
        wear.addEventListener('click', () => { if (!wear.disabled)
            equip(item.id); });
        if (shopping)
            node.append(buy);
        else
            node.append(wear, replacement, preview, sell, move);
        return { node, update(next, location) {
                item = next;
                const state = current.equipment, balance = BigInt(current.coins);
                const compatible = (0, equipment_js_1.canEquip)(item, current.hero?.equipped.formId ?? 'h00', current.level);
                const iconKey = JSON.stringify(item);
                if (artKey !== iconKey) {
                    artKey = iconKey;
                    art.width = 64;
                    const ctx = art.getContext?.('2d');
                    if (ctx) {
                        (0, equipment_js_2.drawEquipmentIcon)(ctx, item, 8, 8, { scale: 3 });
                    }
                }
                name.textContent = (0, equipment_js_1.equipmentName)(item);
                rarity.textContent = `${rarityNames[def.rarity]} · ${location}`;
                primary.textContent = itemPrimary(item);
                requirement.textContent = `${def.kind === 'weapon' ? `필요 Lv.${def.requiredLevel} · ` : ''}${compatible ? '현재 장착 가능' : '현재 장착 불가'}`;
                bonus.textContent = shopping && def.rarity === 'rare' ? '보조 옵션 ??? · 구매하면 공개됩니다'
                    : `${def.bonus === 'critical' ? '치명 확률' : '동료 공격'} +${(BigInt(def.bonusBps) * BigInt(item.roll) / 100n).toString()}bp`;
                if (shopping) {
                    const price = BigInt(def.price), bought = state.shop.boughtIds.includes(item.id);
                    buy.disabled = balance < price || bought;
                    buy.textContent = bought ? '구매 완료' : `${(0, bignum_js_1.format)(price)}G 구매`;
                    buy.setAttribute?.('title', `${price}G`);
                }
                else {
                    const cost = (0, equipment_js_1.enhancementCost)(item), target = BigInt(item.enhancement) + 1n, risk = target > 5n;
                    previewTitle.textContent = `+${target} 강화 · ${successText(target)}`;
                    previewPower.textContent = `${itemPrimary(item)} → ${itemPrimary({ ...item, enhancement: String(target) })}`;
                    riskText.className = risk ? 'equipment-danger' : 'muted';
                    riskText.textContent = risk ? '실패하면 이 장비가 사라집니다.' : '+5까지 확정 성공';
                    costText.textContent = `${(0, equipment_js_1.formatEquipmentCost)(cost)}G`;
                    enhance.disabled = (0, equipment_js_1.affordableEquipmentCost)(cost, balance) === null;
                    enhance.textContent = risk ? '강화 확인…' : '강화';
                    sell.textContent = `${(0, bignum_js_1.format)((0, equipment_js_1.sellPrice)(item))}G 판매`;
                    move.hidden = location !== '임시 보관';
                    move.disabled = state.bag.length >= state.capacity;
                    const equipped = location === '장착 중', full = def.kind === 'accessory' && state.loadout.accessories.length === 4;
                    wear.hidden = equipped || full;
                    wear.disabled = !compatible;
                    wear.textContent = compatible ? '장착' : '장착 조건 미충족';
                    replacement.hidden = equipped || !full || !compatible;
                    const nextKey = JSON.stringify(state.loadout.accessories);
                    if (nextKey !== replacementsKey) {
                        replacementsKey = nextKey;
                        replacementList.replaceChildren(...state.loadout.accessories.map(old => {
                            const choose = text('button', 'btn equipment-replace', `${(0, equipment_js_1.equipmentName)(old)} 대신 장착`);
                            choose.setAttribute?.('data-replace-id', old.id);
                            choose.addEventListener('click', () => equip(item.id, old.id));
                            return choose;
                        }));
                    }
                }
            } };
    };
    const section = (label, empty) => {
        const node = text('section', 'equipment-section'), heading = text('h3', ''), grid = text('div', 'equipment-grid');
        const emptyText = text('p', 'muted', empty), controls = text('div', 'equipment-pages');
        const previous = text('button', 'btn', '이전'), next = text('button', 'btn', '다음'), pageText = text('span', '');
        controls.append(previous, next, pageText);
        node.append(heading, grid, emptyText, controls);
        let page = 0, membership = '', items = [];
        const update = (values) => {
            items = values;
            const max = Math.max(1, Math.ceil(items.length / exports.EQUIPMENT_PAGE_SIZE));
            page = Math.min(page, max - 1);
            const visible = items.slice(page * exports.EQUIPMENT_PAGE_SIZE, (page + 1) * exports.EQUIPMENT_PAGE_SIZE);
            visibleCards.set(label, visible.map(item => `${label === '상품' ? 'shop' : 'owned'}:${item.id}`));
            const nodes = visible.map(item => {
                const key = `${label === '상품' ? 'shop' : 'owned'}:${item.id}`;
                let entry = cards.get(key);
                if (!entry) {
                    entry = card(item, label === '상품');
                    cards.set(key, entry);
                }
                entry.update(item, label);
                return entry.node;
            });
            const nextMembership = visible.map(item => item.id).join(',');
            if (membership !== nextMembership) {
                membership = nextMembership;
                grid.replaceChildren(...nodes);
            }
            heading.textContent = `${label} · ${items.length}`;
            emptyText.hidden = items.length > 0;
            controls.hidden = max <= 1;
            previous.disabled = page === 0;
            next.disabled = page + 1 >= max;
            pageText.textContent = `${page + 1} / ${max}`;
            node.hidden = label === '임시 보관' && !items.length;
        };
        for (const [button, offset] of [[previous, -1], [next, 1]])
            button.addEventListener('click', () => {
                if (!button.disabled) {
                    page += offset;
                    update(items);
                    pruneCards();
                }
            });
        return { node, update };
    };
    const stock = section('상품', '상품을 준비하고 있습니다.'), equipped = section('장착 중', '보스에게서 장비를 얻거나 상점에서 구매하세요.');
    const bag = section('가방', '가방이 비어 있습니다.'), temporary = section('임시 보관', '');
    const warning = text('p', 'equipment-danger', '임시품은 다음 초과 획득 또는 영웅 변경·환생 때 사라집니다. 필요한 장비는 가방으로 옮기세요.');
    content.append(...(mode === 'shop' ? [stock.node] : []), text('p', 'equipment-rule', '무기 1개 · 악세사리 4개 · 직접 장착할 수 있으며, 이후 더 강한 장비를 얻으면 자동 교체합니다.'), equipped.node, bag.node, warning, temporary.node);
    return save => {
        current = save;
        if (root.hidden)
            return;
        const state = save.equipment ?? (0, equipment_js_1.newEquipment)();
        // Legacy saves have no equipment until their first production engine load.
        current = { ...save, equipment: state };
        const balance = BigInt(save.coins);
        summary.textContent = `${(0, bignum_js_1.format)(balance)}G · 공격력 ${(0, bignum_js_1.format)((0, equipment_js_1.displayedHeroAttack)(current))} · 가방 ${state.bag.length}/${state.capacity}${state.bag.length >= state.capacity ? ' · 가방 가득 참' : ''}`;
        const seconds = Math.max(0, Math.ceil((state.shop.nextRefreshAt - Math.max(now(), state.shop.lastObservedAt)) / 1000));
        countdown.hidden = mode !== 'shop';
        countdown.textContent = `다음 상품 갱신 ${Math.floor(seconds / 3600)}시간 ${Math.floor(seconds % 3600 / 60)}분 ${seconds % 60}초 · 1시간마다 갱신`;
        expand.hidden = mode === 'shop';
        expand.disabled = (0, equipment_js_1.affordableEquipmentCost)((0, equipment_js_1.expansionCost)(state), balance) === null;
        expand.textContent = `가방 +${equipment_js_1.EQUIPMENT_BALANCE.expansionSlots}칸 · ${(0, equipment_js_1.formatEquipmentCost)((0, equipment_js_1.expansionCost)(state))}G`;
        if (mode === 'shop')
            stock.update(state.shop.stock);
        equipped.update([...(state.loadout.weapon ? [state.loadout.weapon] : []), ...state.loadout.accessories]);
        bag.update(state.bag);
        temporary.update(state.temporary);
        warning.hidden = !state.temporary.length;
        pruneCards();
    };
}
