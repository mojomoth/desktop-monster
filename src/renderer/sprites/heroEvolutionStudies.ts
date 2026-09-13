// Three review studies, NOT the live reincarnation catalogue. The original
// 14×14 adventurer supplies the face, hair, pose and animation timing.
// Only the small outfit matrices below are new; no enlarged head/body system.
import { heroAttack, heroIdle } from './hero.js';
import { COLORS } from './palette.js';
import type { Sprite } from './sprite.js';

interface HeroStudy {
  id: string;
  name: string;
  detail: string;
  idle: Sprite;
  attack: Sprite;
}

function outfit(base: Sprite, bodies: readonly string[], metal: string = COLORS.slate): Sprite {
  return {
    w: base.w, h: base.h, palette: { ...base.palette, t: metal },
    frames: bodies.map((body, pose) => {
      const rows = body.split('/');
      return [...base.frames[pose]!.slice(0, base.h - rows.length), ...rows];
    }),
  };
}

export const HERO_EVOLUTION_STUDIES: readonly HeroStudy[] = [
  {
    id: 'study-leather', name: '01 · 모험 검사', detail: '초록 튜닉 · 가죽 어깨받이와 벨트',
    idle: outfit(heroIdle, [
      '...ebbggge..../..ebggbggsyeee/..eggbggseyyye/...ebbybe.ewe./..ette.ette.../..ette.etteewe/.ebbbe.ebbbewe/.eeeee.eeeeeee',
      '...ebbggge..../..ebggbggsyeee/..eggbggseyyye/...ebbybe.ewe./..ette.etteewe/.ebbbe.ebbbewe/.eeeee.eeeeeee',
    ]),
    attack: outfit(heroAttack, [
      '...eysbbggge../....esgbggge../....eggbggge../...ebbbygge.../...ette.ette../..ette..ette../.ebbbe..ebbbe./.eeeee..eeeee.',
      '.ebbgggsywwwwe/.ebggbgsyeeeee/..eggbggge..../...ebbybe...../...ette.ette../..ett..ette.../.ebbbe..ebbbe./.eeeee..eeeee.',
      '..ebbggge...../.ebggbggsyeeee/.eggbggseyyyee/..ebbybbe.ewe./..ette.etteewe/.ette..etteewe/ebbbe..ebbbeee/eeeee..eeeee..',
    ]),
  },
  {
    id: 'study-steel', name: '02 · 강철 기사', detail: '강철 어깨 갑옷 · 초록 소매와 흉갑',
    idle: outfit(heroIdle, [
      '..etwtgtwe..../..etgwtggsyeee/..eggttgseyyye/...ettyte.ewe./..ette.ette.../..ette.etteewe/.ebtbe.ebtbewe/.eeeee.eeeeeee',
      '..etwtgtwe..../..etgwtggsyeee/..eggttgseyyye/...ettyte.ewe./..ette.etteewe/.ebtbe.ebtbewe/.eeeee.eeeeeee',
    ], COLORS.steel),
    attack: outfit(heroAttack, [
      '...eyswtgtwe../....esgwtgge../....egttggge../...ettytgge.../...ette.ette../..ette..ette../.ebtbe..ebtbe./.eeeee..eeeee.',
      '.etwtggsywwwwe/.etgwtgsyeeeee/..egttggge..../...ettyte...../...ette.ette../..ett..ette.../.ebtbe..ebtbe./.eeeee..eeeee.',
      '..etwtgtwe..../.etgwtggsyeeee/.eggttgseyyyee/..ettytte.ewe./..ette.etteewe/.ette..etteewe/ebtbe..ebtbeee/eeeee..eeeee..',
    ], COLORS.steel),
  },
  {
    id: 'study-royal', name: '03 · 왕실 근위', detail: '녹색 망토 · 금장 흉갑과 강철 부츠',
    idle: outfit(heroIdle, [
      '..ewytgywe..../.eggtwyggsyeee/.eggytygseyyye/.eggygyge.ewe./.egtte.ette.../.eytte.etteewe/.ebwbe.ebwbewe/.eeeee.eeeeeee',
      '..ewytgywe..../.eggtwyggsyeee/.eggytygseyyye/.eggygyge.ewe./.eytte.etteewe/.ebwbe.ebwbewe/.eeeee.eeeeeee',
    ], COLORS.steel),
    attack: outfit(heroAttack, [
      '...eysytgywe../..egesgtwyge../..egggtyggge../.egggygygge.../.eggtte.ette../.egtte..ette../.ebwbe..ebwbe./.eeeee..eeeee.',
      '.ewytggsywwwwe/.egtwygsyeeeee/.eggytygge..../.eggygyge...../.eggtte.ette../.egtt..ette.../.ebwbe..ebwbe./.eeeee..eeeee.',
      '..ewytgywe..../.egtwyggsyeeee/.eggytyseyyyee/.eggygyge.ewe./.egtte.etteewe/.egtte.etteewe/ebwbe..ebwbeee/eeeee..eeeee..',
    ], COLORS.steel),
  },
];
