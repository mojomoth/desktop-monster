"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountShop = mountShop;
const equipment_js_1 = require("./equipment.js");
const bignum_js_1 = require("../core/bignum.js");
const economy_js_1 = require("../core/economy.js");
const discovery_js_1 = require("../core/discovery.js");
const progress_js_1 = require("../core/progress.js");
const hero_js_1 = require("../core/hero.js");
/** Keep buttons mounted so five-second save updates do not move keyboard focus. */
function mountShop(doc, root, send) {
    const text = (tag, className, value = '') => {
        const el = doc.createElement(tag);
        el.className = className;
        el.textContent = value;
        return el;
    };
    const balance = text('h2', 'shop-balance');
    const makeCard = (title) => {
        const card = text('div', 'shop-card');
        const effect = text('p', 'shop-effect');
        const note = text('p', 'muted');
        const button = text('button', 'btn');
        card.append(text('h3', 'name', title), effect, note, button);
        return { card, effect, note, button };
    };
    const gearRoot = text('section', 'gear-shop');
    const updateGear = (0, equipment_js_1.mountEquipment)(doc, gearRoot, send, 'shop');
    const training = makeCard('무기 훈련');
    const lure = makeCard('레어 미끼');
    root.replaceChildren(gearRoot, balance, training.card, lure.card, text('p', 'muted', '영웅 재굴림은 영웅 탭에서 이용하세요. 골드 없이도 후보를 보류하고 플레이 30초 후 무료로 다시 볼 수 있습니다.'));
    let current;
    for (const [item, control] of [['training', training], ['lure', lure]]) {
        control.button.addEventListener('click', () => {
            if (!current || control.button.disabled)
                return;
            send({ type: 'shopBuy', item, shopSerial: current.progress?.shopSerial ?? 0 });
        });
    }
    return (save) => {
        current = save;
        updateGear(save);
        const coins = BigInt(save.coins);
        const level = save.progress?.trainingLevel ?? 0;
        const remaining = save.progress?.lureRemaining ?? 0;
        const trainingPrice = (0, economy_js_1.trainingCost)(level);
        const lurePrice = (0, economy_js_1.lureCost)(save.hero?.reincarnations ?? 0);
        const context = (0, progress_js_1.discoveryContext)(save, (0, hero_js_1.heroForm)(save.hero?.equipped.formId ?? '')?.type);
        const canLure = discovery_js_1.RARE_MONSTERS.some((monster) => (0, discovery_js_1.requirementsMet)(monster.requirements, context));
        const base = (0, hero_js_1.heroAttackPower)(save.level, save.souls, save.hero?.reincarnations ?? 0);
        const currentDamage = (0, economy_js_1.trainedHeroPower)(base, level);
        const nextDamage = (0, economy_js_1.trainedHeroPower)(base, level + 1);
        balance.textContent = `상점 · ${(0, bignum_js_1.format)(coins)} 골드`;
        balance.setAttribute?.('title', `${save.coins}G`);
        training.effect.textContent = `훈련 ${level}/${economy_js_1.TRAINING_MAX_LEVEL} · 영웅 공격 +${level * 5}%${level < economy_js_1.TRAINING_MAX_LEVEL ? ` → +${(level + 1) * 5}% · 피해 ${currentDamage} → ${nextDamage} (+${nextDamage - currentDamage})` : ` · 최대 단계 · 피해 ${currentDamage}`}`;
        training.note.textContent = '현재 상태의 비치명·비피버 영웅 1회 피해입니다. 훈련은 환생 후에도 유지됩니다. 동료에게는 적용되지 않습니다.';
        training.button.disabled = level >= economy_js_1.TRAINING_MAX_LEVEL || coins < trainingPrice;
        training.button.textContent = level >= economy_js_1.TRAINING_MAX_LEVEL ? '최대 훈련 완료'
            : `${trainingPrice} 골드로 훈련${coins < trainingPrice ? ` · ${trainingPrice - coins} 부족` : ''}`;
        lure.effect.textContent = `레어 등장 확률 12% → 25% · ${remaining > 0 ? `남은 ${remaining}회` : `다음 ${economy_js_1.LURE_CHARGES}회 생성`}`;
        lure.note.textContent = '출현 조건을 만족한 레어가 있을 때만 1회씩 소모됩니다. 조건을 건너뛰지 않습니다. 미끼가 없어도 자격 있는 12번째 생성에는 레어가 보장됩니다.';
        lure.button.disabled = remaining > 0 || !canLure || coins < lurePrice;
        lure.button.textContent = remaining > 0 ? `미끼 사용 중 · ${remaining}회 남음`
            : !canLure ? '도감에서 레어 출현 조건을 먼저 달성하세요'
                : `${lurePrice} 골드로 구입${coins < lurePrice ? ` · ${lurePrice - coins} 부족` : ''}`;
    };
}
