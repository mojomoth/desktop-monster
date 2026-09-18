import { affordableEquipmentCost, canEquip, displayedHeroAttack, enhancementCost, enhancementSuccess, equipmentName, equipmentTemplate, EQUIPMENT_BALANCE, expansionCost, formatEquipmentCost, itemAttack, newEquipment, RARITY_COLORS, sellPrice, } from '../core/equipment.js';
import { format } from '../core/bignum.js';
import { drawEquipmentIcon } from '../renderer/sprites/equipment.js';
export const EQUIPMENT_PAGE_SIZE = 24;
const rarityNames = { common: '일반', uncommon: '고급', rare: '레어', epic: '에픽' };
const jobNames = ['기사', '창술사', '사수', '성직자', '암살자', '수호자', '마법사', '격투가', '전사', '주술사'];
export function successText(target) {
    const { numerator, denominator } = enhancementSuccess(target);
    if (numerator === denominator)
        return '100%';
    const hundredths = numerator * 10000n / denominator;
    return `${hundredths > 0n ? `${hundredths / 100n}.${String(hundredths % 100n).padStart(2, '0')}%` : '0.01% 미만'} (${numerator}/${denominator})`;
}
export function itemPrimary(item) {
    const value = itemAttack(item);
    return `${equipmentTemplate(item.templateId)?.kind === 'weapon' ? '무기 공격' : '공격'} +${value / 100n}.${String(value % 100n).padStart(2, '0')}%`;
}
/** Bounded pages retain focus until the owned items or wallet actually change. */
export function mountEquipment(doc, root, send, mode, now = Date.now) {
    const text = (tag, className, value = '') => {
        const el = doc.createElement(tag);
        el.className = className;
        el.textContent = value;
        return el;
    };
    const title = text('h2', 'equipment-heading');
    const summary = text('p', 'equipment-summary');
    const countdown = text('p', 'equipment-countdown');
    const expand = text('button', 'btn equipment-expand');
    const content = text('div', 'equipment-content');
    root.replaceChildren(title, summary, countdown, expand, content);
    const pages = new Map();
    let current, key = '';
    const act = (type, item) => {
        if (current?.equipment)
            send({ type, itemId: item.id, revision: current.equipment.revision });
    };
    expand.addEventListener('click', () => {
        if (current?.equipment && !expand.disabled)
            send({ type: 'equipmentExpand', revision: current.equipment.revision });
    });
    const card = (item, location) => {
        const def = equipmentTemplate(item.templateId);
        const node = text('article', `equipment-card rarity-${def.rarity}`);
        node.setAttribute?.('data-item-id', item.id);
        node.setAttribute?.('style', `--rarity-color:${RARITY_COLORS[def.rarity]}`);
        const art = text('canvas', 'equipment-icon');
        art.width = 64;
        art.height = 64;
        art.setAttribute?.('aria-label', def.name);
        art.setAttribute?.('role', 'img');
        const ctx = art.getContext?.('2d');
        if (ctx)
            drawEquipmentIcon(ctx, item, 8, 8, { scale: 3 });
        const price = BigInt(def.price), shopping = location === '상품';
        const details = text('details', 'equipment-details');
        const compatible = canEquip(item, current?.hero?.equipped.formId ?? 'h00', current?.level ?? 1);
        const jobs = `수습 영웅 · ${def.allowedJobs.map(job => jobNames[job]).join(' · ')}`;
        details.append(text('summary', '', '능력과 장착 조건'), text('p', 'equipment-requirement', `${def.kind === 'weapon' ? `필요 Lv.${def.requiredLevel} · ` : ''}${compatible ? '현재 장착 가능' : '현재 장착 불가'}`), text('p', 'muted', jobs), text('p', 'equipment-bonus', shopping && def.rarity === 'rare' ? '보조 옵션 ??? · 구매하면 공개됩니다'
            : `${def.bonus === 'critical' ? '치명 확률' : '동료 공격'} +${(BigInt(def.bonusBps) * BigInt(item.roll) / 100n).toString()}bp`));
        node.append(art, text('h3', 'equipment-name', equipmentName(item)), text('p', 'equipment-rarity', `${rarityNames[def.rarity]} · ${location}`), text('p', 'equipment-primary', itemPrimary(item)), details);
        if (shopping) {
            const buy = text('button', 'btn equipment-buy', `${format(price)}G 구매`);
            buy.setAttribute?.('title', `${price}G`);
            buy.disabled = !current || BigInt(current.coins) < price || !!current.equipment?.shop.boughtIds.includes(item.id);
            if (current?.equipment?.shop.boughtIds.includes(item.id))
                buy.textContent = '구매 완료';
            buy.addEventListener('click', () => {
                if (!buy.disabled && current?.equipment)
                    send({ type: 'equipmentBuy', itemId: item.id,
                        shopSerial: current.equipment.shop.serial, revision: current.equipment.revision });
            });
            node.append(buy);
        }
        else {
            const cost = enhancementCost(item), target = BigInt(item.enhancement) + 1n;
            const risk = target > 5n;
            const preview = text('details', 'equipment-enhance-preview');
            preview.append(text('summary', '', `+${target} 강화 · ${successText(target)}`), text('p', '', `${itemPrimary(item)} → ${itemPrimary({ ...item, enhancement: String(target) })}`), text('p', risk ? 'equipment-danger' : 'muted', risk ? '실패하면 이 장비가 사라집니다.' : '+5까지 확정 성공'), text('p', 'equipment-cost', `${formatEquipmentCost(cost)}G`));
            const enhance = text('button', 'btn equipment-enhance', risk ? '강화 확인…' : '강화');
            enhance.disabled = !current || affordableEquipmentCost(cost, BigInt(current.coins)) === null;
            enhance.addEventListener('click', () => { if (!enhance.disabled)
                act('equipmentEnhance', item); });
            const sell = text('button', 'btn equipment-sell', `${format(sellPrice(item))}G 판매`);
            sell.addEventListener('click', () => act('equipmentSell', item));
            preview.append(enhance);
            node.append(preview, sell);
            if (location === '임시 보관') {
                const move = text('button', 'btn equipment-move', '가방으로 이동');
                move.addEventListener('click', () => act('equipmentMove', item));
                node.append(move);
            }
        }
        return node;
    };
    const section = (label, items, empty) => {
        const section = text('section', 'equipment-section');
        const max = Math.max(1, Math.ceil(items.length / EQUIPMENT_PAGE_SIZE));
        const page = Math.min(pages.get(label) ?? 0, max - 1);
        pages.set(label, page);
        const grid = text('div', 'equipment-grid');
        grid.append(...items.slice(page * EQUIPMENT_PAGE_SIZE, (page + 1) * EQUIPMENT_PAGE_SIZE).map(item => card(item, label)));
        section.append(text('h3', '', `${label} · ${items.length}`), ...(items.length ? [grid] : [text('p', 'muted', empty)]));
        if (max > 1) {
            const controls = text('div', 'equipment-pages');
            for (const [labelText, offset] of [['이전', -1], ['다음', 1]]) {
                const button = text('button', 'btn', labelText);
                button.disabled = page + offset < 0 || page + offset >= max;
                button.addEventListener('click', () => { if (!button.disabled) {
                    pages.set(label, page + offset);
                    key = '';
                    render();
                } });
                controls.append(button);
            }
            controls.append(text('span', '', `${page + 1} / ${max}`));
            section.append(controls);
        }
        return section;
    };
    const render = () => {
        if (!current || root.hidden)
            return;
        const state = current.equipment ?? newEquipment(), balance = BigInt(current.coins);
        title.textContent = mode === 'shop' ? '장비 상점' : '장비와 가방';
        summary.textContent = `${format(balance)}G · 공격력 ${format(displayedHeroAttack(current))} · 가방 ${state.bag.length}/${state.capacity}${state.bag.length >= state.capacity ? ' · 가방 가득 참' : ''}`;
        const seconds = Math.max(0, Math.ceil((state.shop.nextRefreshAt - Math.max(now(), state.shop.lastObservedAt)) / 1000));
        countdown.hidden = mode !== 'shop';
        countdown.textContent = `다음 상품 갱신 ${Math.floor(seconds / 3600)}시간 ${Math.floor(seconds % 3600 / 60)}분 ${seconds % 60}초 · 1시간마다 갱신`;
        const cost = expansionCost(state);
        expand.hidden = mode === 'shop';
        expand.disabled = affordableEquipmentCost(cost, balance) === null;
        expand.textContent = `가방 +${EQUIPMENT_BALANCE.expansionSlots}칸 · ${formatEquipmentCost(cost)}G`;
        const nextKey = JSON.stringify([state.revision, current.coins, current.level, current.hero?.equipped.formId]);
        if (key === nextKey)
            return;
        key = nextKey;
        const equipped = [...(state.loadout.weapon ? [state.loadout.weapon] : []), ...state.loadout.accessories];
        content.replaceChildren(...(mode === 'shop' ? [section('상품', state.shop.stock, '상품을 준비하고 있습니다.')] : []), text('p', 'equipment-rule', '무기 1개 · 악세사리 4개 · 표시 공격력이 가장 높은 장비를 자동 장착합니다.'), section('장착 중', equipped, '보스에게서 장비를 얻거나 상점에서 구매하세요.'), section('가방', state.bag, '가방이 비어 있습니다.'), ...(state.temporary.length ? [text('p', 'equipment-danger', '임시품은 다음 초과 획득 또는 영웅 변경·환생 때 사라집니다. 필요한 장비는 가방으로 옮기세요.'),
            section('임시 보관', state.temporary, '')] : []));
    };
    return save => { current = save; render(); };
}
