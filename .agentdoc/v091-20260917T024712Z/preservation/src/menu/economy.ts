import { LURE_CHARGES, TRAINING_MAX_LEVEL, lureCost, trainedHeroPower, trainingCost } from '../core/economy.js';
import { RARE_MONSTERS, requirementsMet } from '../core/discovery.js';
import { discoveryContext } from '../core/progress.js';
import { heroAttackPower, heroForm } from '../core/hero.js';
import type { CollectionAction } from '../core/collection.js';
import type { SaveFile } from '../core/save.js';
import type { MenuDocument, MenuElement } from './index.js';

/** Keep buttons mounted so five-second save updates do not move keyboard focus. */
export function mountShop(doc: MenuDocument, root: MenuElement, send: (action: CollectionAction) => void): (save: SaveFile) => void {
  const text = (tag: string, className: string, value = ''): MenuElement => {
    const el = doc.createElement(tag); el.className = className; el.textContent = value; return el;
  };
  const balance = text('h2', 'shop-balance');
  const makeCard = (title: string): { card: MenuElement; effect: MenuElement; note: MenuElement; button: MenuElement } => {
    const card = text('div', 'shop-card');
    const effect = text('p', 'shop-effect');
    const note = text('p', 'muted');
    const button = text('button', 'btn');
    card.append(text('h3', 'name', title), effect, note, button);
    return { card, effect, note, button };
  };
  const training = makeCard('무기 훈련');
  const lure = makeCard('레어 미끼');
  root.replaceChildren(balance, training.card, lure.card,
    text('p', 'muted', '영웅 재굴림은 영웅 탭에서 이용하세요. 골드 없이도 후보를 보류하고 플레이 30초 후 무료로 다시 볼 수 있습니다.'));
  let current: SaveFile | undefined;
  for (const [item, control] of [['training', training], ['lure', lure]] as const) {
    control.button.addEventListener('click', () => {
      if (!current || control.button.disabled) return;
      send({ type: 'shopBuy', item, shopSerial: current.progress?.shopSerial ?? 0 });
    });
  }
  return (save) => {
    current = save;
    const level = save.progress?.trainingLevel ?? 0;
    const remaining = save.progress?.lureRemaining ?? 0;
    const trainingPrice = trainingCost(level);
    const lurePrice = lureCost(save.hero?.reincarnations ?? 0);
    const context = discoveryContext(save, heroForm(save.hero?.equipped.formId ?? '')?.type);
    const canLure = RARE_MONSTERS.some((monster) => requirementsMet(monster.requirements, context));
    const base = heroAttackPower(save.level, save.souls, save.hero?.reincarnations ?? 0);
    const currentDamage = trainedHeroPower(base, level);
    const nextDamage = trainedHeroPower(base, level + 1);
    balance.textContent = `상점 · ${save.coins} 골드`;
    training.effect.textContent = `훈련 ${level}/${TRAINING_MAX_LEVEL} · 영웅 공격 +${level * 5}%${level < TRAINING_MAX_LEVEL ? ` → +${(level + 1) * 5}% · 피해 ${currentDamage} → ${nextDamage} (+${nextDamage - currentDamage})` : ` · 최대 단계 · 피해 ${currentDamage}`}`;
    training.note.textContent = '현재 상태의 비치명·비피버 영웅 1회 피해입니다. 훈련은 환생 후에도 유지됩니다. 동료와 PvP에는 적용되지 않습니다.';
    training.button.disabled = level >= TRAINING_MAX_LEVEL || save.coins < trainingPrice;
    training.button.textContent = level >= TRAINING_MAX_LEVEL ? '최대 훈련 완료'
      : `${trainingPrice} 골드로 훈련${save.coins < trainingPrice ? ` · ${trainingPrice - save.coins} 부족` : ''}`;
    lure.effect.textContent = `레어 등장 확률 12% → 25% · ${remaining > 0 ? `남은 ${remaining}회` : `다음 ${LURE_CHARGES}회 생성`}`;
    lure.note.textContent = '출현 조건을 만족한 레어가 있을 때만 1회씩 소모됩니다. 조건을 건너뛰지 않습니다. 미끼가 없어도 자격 있는 12번째 생성에는 레어가 보장됩니다.';
    lure.button.disabled = remaining > 0 || !canLure || save.coins < lurePrice;
    lure.button.textContent = remaining > 0 ? `미끼 사용 중 · ${remaining}회 남음`
      : !canLure ? '도감에서 레어 출현 조건을 먼저 달성하세요'
      : `${lurePrice} 골드로 구입${save.coins < lurePrice ? ` · ${lurePrice - save.coins} 부족` : ''}`;
  };
}
