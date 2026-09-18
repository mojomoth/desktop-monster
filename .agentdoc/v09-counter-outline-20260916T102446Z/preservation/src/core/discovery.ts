// v0.5 content and its discovery rules. No runtime imports: both catalogs use it.
import type { MonsterType } from './types-chart.js';

export type FieldPhase = 'dawn' | 'day' | 'dusk' | 'night';
export const FIELD_PHASE_MS = 300_000;
export const FIELD_PHASES: readonly FieldPhase[] = ['dawn', 'day', 'dusk', 'night'];
export const FIELD_PHASE_NAMES: Readonly<Record<FieldPhase, string>> = { dawn: '새벽', day: '낮', dusk: '황혼', night: '밤' };
export const fieldPhase = (playTimeMs: number): FieldPhase => FIELD_PHASES[Math.floor(Math.max(0, playTimeMs) / FIELD_PHASE_MS) % 4] ?? 'dawn';

export interface DiscoveryContext {
  killCount: number;
  playTimeMs: number;
  speciesKills: Readonly<Record<string, number>>;
  elementKills: Readonly<Record<MonsterType, number>>;
  heroCounts: Readonly<Record<string, number>>;
  heroFamilyHistory: readonly number[];
  reincarnations: number;
  uniqueHeroes: number;
  equippedType?: MonsterType;
  seenMonsters: readonly string[];
  seenHeroes: readonly string[];
  pvpWins: number;
  goldSpent: number;
}
export type Requirement =
  | { kind: 'speciesKills'; id: string; count: number }
  | { kind: 'elementKills'; element: MonsterType; count: number }
  | { kind: 'heroHistory'; id: string; count: number }
  | { kind: 'heroFamilyHistory'; family: number; count: number }
  | { kind: 'totalKills' | 'reincarnations' | 'uniqueHeroes' | 'playTimeMs' | 'seenMonsters' | 'goldSpent'; count: number }
  | { kind: 'equippedType'; element: MonsterType }
  | { kind: 'phase'; phase: FieldPhase }
  | { kind: 'pvpWins'; count: number; fallbackKills: number };
export interface ConditionStatus { met: boolean; current: number; target: number; label: string }
const ELEMENT_NAMES: Readonly<Record<MonsterType, string>> = { fire: '불', water: '물', wind: '바람', earth: '대지', dark: '어둠' };
const FAMILY_NAMES = ['검사', '창술사', '거너', '성직자', '도적', '광전사', '마법사', '격투가', '수호기사', '소환사'];
const countOf = (map: Readonly<Record<string, number>>, id: string): number => Object.hasOwn(map, id) ? map[id] ?? 0 : 0;

/** UI and random selection evaluate exactly the same rule, including offline alternatives. */
export function conditionStatus(requirement: Requirement, context: DiscoveryContext): ConditionStatus {
  let current = 0;
  let target = 'count' in requirement ? requirement.count : 1;
  let label = '';
  switch (requirement.kind) {
    case 'speciesKills': current = countOf(context.speciesKills, requirement.id); label = `${requirement.id} ${target}회 처치`; break;
    case 'elementKills': current = context.elementKills[requirement.element]; label = `${ELEMENT_NAMES[requirement.element]} 몬스터 ${target}회 처치`; break;
    case 'heroHistory': current = countOf(context.heroCounts, requirement.id); label = `${requirement.id} 영웅으로 ${target}회 환생`; break;
    case 'heroFamilyHistory': current = context.heroFamilyHistory[requirement.family] ?? 0; label = `${FAMILY_NAMES[requirement.family] ?? '일반 영웅'} 계열로 ${target}회 환생`; break;
    case 'totalKills': current = context.killCount; label = `몬스터 누적 ${target}회 처치`; break;
    case 'reincarnations': current = context.reincarnations; label = `영웅 환생 ${target}회`; break;
    case 'uniqueHeroes': current = context.uniqueHeroes; label = `서로 다른 영웅 ${target}종으로 환생`; break;
    case 'playTimeMs': current = context.playTimeMs; label = `활성 플레이 ${target / 60_000}분`; break;
    case 'seenMonsters': current = new Set(context.seenMonsters).size; label = `몬스터 ${target}종 발견`; break;
    case 'goldSpent': current = context.goldSpent; label = `골드 누적 ${target} 사용`; break;
    case 'equippedType': current = context.equippedType === requirement.element ? 1 : 0; label = `${ELEMENT_NAMES[requirement.element]} 영웅 장착`; break;
    case 'phase': current = fieldPhase(context.playTimeMs) === requirement.phase ? 1 : 0; label = `필드 시간 ${FIELD_PHASE_NAMES[requirement.phase]}`; break;
    case 'pvpWins': {
      current = context.pvpWins;
      const met = current >= target || context.killCount >= requirement.fallbackKills;
      label = `실제 PvP ${current}/${target}승 또는 몬스터 ${context.killCount}/${requirement.fallbackKills}회 처치`;
      return { met, current, target, label };
    }
  }
  target = Math.max(1, target);
  return { met: current >= target, current, target, label };
}
export function requirementsMet(requirements: readonly Requirement[], context?: DiscoveryContext): boolean {
  return requirements.length === 0 || context !== undefined && requirements.every((r) => conditionStatus(r, context).met);
}
export interface RareHeroDef {
  id: string; name: string; description: string; rank: number; type: MonsterType;
  buff: 'element' | 'party'; rarity: 'rare'; requirements: readonly Requirement[];
}
export interface RareMonsterDef {
  id: string; name: string; description: string; type: MonsterType;
  size: 1 | 2 | 3; attackDelayMs: number; rarity: 'rare'; requirements: readonly Requirement[];
}
const species = (id: string, count: number): Requirement => ({ kind: 'speciesKills', id, count });
const element = (element: MonsterType, count: number): Requirement => ({ kind: 'elementKills', element, count });
const family = (family: number, count = 1): Requirement => ({ kind: 'heroFamilyHistory', family, count });
const count = (kind: 'totalKills' | 'reincarnations' | 'uniqueHeroes' | 'playTimeMs' | 'seenMonsters' | 'goldSpent', count: number): Requirement => ({ kind, count });
const equipped = (element: MonsterType): Requirement => ({ kind: 'equippedType', element });
const phase = (phase: FieldPhase): Requirement => ({ kind: 'phase', phase });
const pvp = (count: number, fallbackKills: number): Requirement => ({ kind: 'pvpWins', count, fallbackKills });
const hero = (id: string, name: string, description: string, type: MonsterType, rank: number, buff: 'element' | 'party', requirements: readonly Requirement[]): RareHeroDef =>
  ({ id, name, description, type, rank, buff, rarity: 'rare', requirements });

export const RARE_HERO_FORMS: readonly RareHeroDef[] = [
  hero('h51', '잿불 대장장이', '쓰러진 용의 불씨를 집게검에 담는다.', 'fire', 2, 'element', [species('dragon', 3)]),
  hero('h52', '홍련 결투가', '짧고 정확한 쌍곡도로 동료의 박자를 이끈다.', 'fire', 3, 'party', [{ kind: 'heroHistory', id: 'h01', count: 2 }]),
  hero('h53', '태양 순례자', '오래 걸은 길 위에 따뜻한 횃불을 남긴다.', 'fire', 4, 'element', [count('playTimeMs', 1_800_000), element('fire', 40)]),
  hero('h54', '화산 왕관병', '용암이 식어 만든 톱니관으로 전장을 지킨다.', 'fire', 5, 'party', [family(5), count('reincarnations', 5)]),
  hero('h55', '진주 조율사', '진주 봉의 작은 물방울 소리로 공격을 맞춘다.', 'water', 2, 'element', [species('slime', 5)]),
  hero('h56', '해무 항해사', '닻창과 해도로 보이지 않는 바다를 건넌다.', 'water', 3, 'party', [family(1), family(6)]),
  hero('h57', '서리 기록관', '얼음 책에 모든 동료의 발자국을 새긴다.', 'water', 4, 'element', [count('seenMonsters', 35), count('reincarnations', 3)]),
  hero('h58', '심해 기사', '깊은 바다에서 길어 올린 잠수 투구를 쓴다.', 'water', 5, 'party', [element('water', 100), species('reefknight', 2), count('totalKills', 1500)]),
  hero('h59', '구름 우편사', '늦은 편지도 제때 전하는 깃털창의 주인.', 'wind', 2, 'element', [species('bat', 5)]),
  hero('h60', '번개 조준수', '번개 조준경 너머로 동료의 길을 연다.', 'wind', 3, 'party', [family(2, 2)]),
  hero('h61', '폭풍 무희', '부채검의 칼춤으로 전장의 바람을 모은다.', 'wind', 4, 'element', [family(7), element('wind', 60)]),
  hero('h62', '천공 수호자', '양갈래 투구로 먼 동료의 신호를 듣는다.', 'wind', 5, 'party', [count('reincarnations', 5), count('seenMonsters', 60), count('totalKills', 6000)]),
  hero('h63', '이끼 약제사', '돌 틈의 약초와 유리병 철퇴로 동료에게 힘을 준다.', 'earth', 2, 'element', [species('golem', 3)]),
  hero('h64', '황금 측량사', '측량 자로 쓴 골드의 길 아래 숨은 광맥을 찾는다.', 'earth', 3, 'party', [count('goldSpent', 1_000), count('reincarnations', 2)]),
  hero('h65', '숲의 서약자', '나뭇가지 왕관에 옛 수호자의 약속을 새겼다.', 'earth', 4, 'element', [family(3), family(8)]),
  hero('h66', '수정 파수꾼', '오래 지킨 자리에서 결정 투구와 망치가 자랐다.', 'earth', 5, 'party', [element('earth', 100), count('playTimeMs', 3_600_000)]),
  hero('h67', '달그늘 탐정', '낮은 중절모 아래 남은 발자국을 쫓는다.', 'dark', 2, 'element', [species('ghost', 3)]),
  hero('h68', '까마귀 전령', '새 부리 모자를 쓰고 잊힌 동료의 이름을 부른다.', 'dark', 3, 'party', [family(4), family(9)]),
  hero('h69', '결투의 망령', '반가면과 톱날 검에 전장의 승패를 기억한다.', 'dark', 4, 'element', [pvp(3, 1_500)]),
  hero('h70', '별밤 계승자', '지난 모든 삶을 반달검에 별자리처럼 잇는다.', 'dark', 5, 'party', [count('uniqueHeroes', 10), count('totalKills', 30000)]),
];
const monster = <Id extends string>(id: Id, name: string, description: string, type: MonsterType, size: 1 | 2 | 3, attackDelayMs: number, requirements: readonly Requirement[]): RareMonsterDef & { id: Id } =>
  ({ id, name, description, type, size, attackDelayMs, rarity: 'rare', requirements });
export const RARE_MONSTERS = [
  monster('dawnfinch', '새벽불새', '해 모양 볏을 세운 통통한 새. 새벽빛을 먼저 듣는다.', 'fire', 1, 100, [phase('dawn'), count('totalKills', 30)]),
  monster('kilnbeetle', '가마딱정', '벽돌 가마 같은 등껍질에서 온기가 흐른다.', 'fire', 2, 300, [equipped('fire')]),
  monster('crownwyrm', '왕관용', '세 뿔이 왕관으로 이어진 조그만 용의 왕.', 'fire', 3, 700, [species('dragon', 3)]),
  monster('cinderhare', '숯토끼', '집게 귀로 숯불을 집어 석탄 꼬리에 숨긴다.', 'fire', 1, 200, [family(0)]),
  monster('duelphoenix', '결투불사조', '방패처럼 닳은 날개에 지난 결투를 새겼다.', 'fire', 2, 500, [pvp(1, 300)]),
  monster('furnaceox', '용광로소', '둥근 화구가 난 배에서 금속을 녹인다.', 'fire', 3, 800, [count('goldSpent', 500)]),
  monster('mistaxolotl', '안개도롱', '세 갈래 아가미를 펼치면 안개가 피어난다.', 'water', 1, 100, [phase('dawn'), count('playTimeMs', 300_000)]),
  monster('pearlcrab', '진주게', '한 집게로 커다란 진주를 소중히 든다.', 'water', 2, 300, [equipped('water')]),
  monster('tideleviathan', '물결고래', '파도 이마와 작은 꼬리로 구름바다를 헤엄친다.', 'water', 3, 700, [element('water', 30)]),
  monster('frostnewt', '서리도마뱀', '등의 세 얼음판 사이에 찬 숨을 모은다.', 'water', 1, 200, [species('slime', 5)]),
  monster('mirrorjelly', '거울해파리', '네모 거울 속 두 점눈이 당신을 따라본다.', 'water', 2, 500, [family(6)]),
  monster('anchornaut', '닻갑오징어', '닻 모양 촉수로 바닥을 짚고 길을 찾는다.', 'water', 3, 800, [count('seenMonsters', 30)]),
  monster('sunskipper', '햇살메뚜기', '부채 등을 접고 긴 뒷다리로 빛을 따라 뛴다.', 'wind', 1, 100, [phase('day'), count('totalKills', 30)]),
  monster('courierowl', '전령부엉', '봉투 모양 가슴털 아래 먼 곳의 편지를 숨긴다.', 'wind', 2, 300, [equipped('wind')]),
  monster('stormmanta', '폭풍가오리', '번개처럼 꺾인 양 날개가 돌풍을 가른다.', 'wind', 3, 700, [element('wind', 30)]),
  monster('ribbonstoat', '리본족제비', '두 갈래 리본 꼬리로 나뭇가지를 꼭 잡는다.', 'wind', 1, 200, [family(2)]),
  monster('arenakite', '투기장솔개', '작은 벼슬과 다리 보호대가 빛나는 승부사.', 'wind', 2, 500, [pvp(3, 700)]),
  monster('zephyrstag', '미풍사슴', '풍향계 뿔을 돌려 동료에게 바람길을 알린다.', 'wind', 3, 800, [count('playTimeMs', 1_800_000)]),
  monster('duskarmadillo', '황혼천산갑', '비스듬한 돌 비늘에 마지막 햇빛을 담는다.', 'earth', 1, 100, [phase('dusk'), count('totalKills', 30)]),
  monster('mossbadger', '이끼오소리', '등의 이끼 언덕을 천천히 옮기는 정원사.', 'earth', 2, 300, [equipped('earth')]),
  monster('crystaltortoise', '수정거북', '등껍질 한가운데 육각 수정이 자라고 있다.', 'earth', 3, 700, [species('golem', 3)]),
  monster('coinmole', '금화두더지', '동전 테 코와 광부 손톱으로 보물을 찾는다.', 'earth', 1, 200, [count('goldSpent', 250)]),
  monster('oathbison', '서약들소', '두 뿔 사이 돌판에 지킬 약속을 새겼다.', 'earth', 2, 500, [family(8)]),
  monster('rootcolossus', '뿌리거인', '두 갈래 나무뿌리 다리로 숲을 옮겨 걷는다.', 'earth', 3, 800, [count('reincarnations', 3)]),
  monster('moonmoth', '달나방', '둥근 날개에 초승달 구멍이 뚫려 있다.', 'dark', 1, 100, [phase('night'), count('totalKills', 30)]),
  monster('inkferret', '먹물담비', '붓끝 꼬리로 지나간 길에 까만 선을 남긴다.', 'dark', 2, 300, [equipped('dark')]),
  monster('cryptcervid', '묘비사슴', '네모 묘비 뿔 아래 오래된 이름을 지킨다.', 'dark', 3, 700, [species('ghost', 3)]),
  monster('maskimp', '가면꼬마', '반쪽 웃는 가면 뒤에서 장난을 궁리한다.', 'dark', 1, 200, [family(4)]),
  monster('victoryraven', '승리까마귀', '작은 월계관과 굽은 부리로 승리를 노래한다.', 'dark', 2, 500, [pvp(5, 1_200)]),
  monster('starvoid', '별먹이', '납작한 몸 한가운데 별 모양 입이 깜빡인다.', 'dark', 3, 800, [count('reincarnations', 10), count('totalKills', 16000)]),
] as const satisfies readonly RareMonsterDef[];
export const rareHero = (id: string): RareHeroDef | undefined => RARE_HERO_FORMS.find((h) => h.id === id);
export const rareMonster = (id: string): RareMonsterDef | undefined => RARE_MONSTERS.find((m) => m.id === id);

/** Shared by actual spawning and the measurement eligibility export. */
export const eligibleRareMonsters = (context: DiscoveryContext): readonly (typeof RARE_MONSTERS)[number][] =>
  RARE_MONSTERS.filter((monster) => requirementsMet(monster.requirements, context));

/** Read-only view of the actual catalog rules, not a second copy of the experiment. */
export const PROGRESSION_CONTENT_RULES: Readonly<Record<string, readonly Requirement[]>> = Object.freeze(
  Object.fromEntries([...RARE_HERO_FORMS, ...RARE_MONSTERS].map(({ id, requirements }) => [id, requirements])),
);
