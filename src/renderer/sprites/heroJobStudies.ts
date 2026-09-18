// Three job studies for visual review only. DFO-inspired costume language on
// the original 14×14 skeleton: same eye position, hands, feet and sword poses.
// Hood/helmet brims intentionally cover two forehead pixels in each pose.
// The three approved looks also anchor the final reincarnation catalogue.
import { COLORS } from './palette.js';
import { makeHeroLook as sprites } from './heroLook.js';

export const HERO_JOB_STUDIES = [
  {
    id: 'study-ghostblade', name: '01 · 백야 검귀', detail: '창백한 피부 · 붉은 눈 · 청강 장검',
    ...sprites({ e: COLORS.void, s: '#dfc9d3', h: '#e3edf4', c: '#344769', t: '#7c91ad', a: '#a9344e', w: '#b0e2ec' },
      '...ee.eeee..../..ehhhhhte..../..ethhsssse.../..etsssisee.../..eesssssse.../...eesssee..../...echtcce..../..eahctccsaeee/..eaacccseawwe/...ectace.ewe./..ecte.ettewe./..ecte.ecteewe/.etcte.etctewe/.eeeee.eeeeeee',
      [
        'ee....ee.eee../ewe.ehhhhhte../.ewethhsssse../..ewetsssisee./...ewesssssse./..eaaaeesssee./...eascchtce../....esahctce../....eaccccce../...ectaccce.../...ecte.ette../..ette..ette../.etcte..etcte./.eeeee..eeeee.',
        '...ee.eeee..../..ehhhhhte..../...ethhsssse../...etsssisee../....esssssse../....eessaeeeee/.echtccsawwtwe/.eahctcsaeeeee/..eacccace..../...ectace...../...ecte.ette../..ett..ette.../.etcte..etcte./.eeeee..eeeee.',
        '...ee.eeee..../..ehhhhhte..../..ethhsssse.../..etsssisee.../..eesssssse.../...eesssee..../..echtcce...../.eahctccsaeeee/.eaacccseawwee/..ectacce.ewe./..ecte.etteewe/.ette..etteewe/etcte..etcteee/eeeee..eeeee..',
      ]),
  },
  {
    id: 'study-shadow', name: '02 · 월영 자객', detail: '잿빛 피부 · 보라 눈 · 월영 후드',
    ...sprites({ e: COLORS.void, s: '#bfc4d1', h: '#67407f', c: '#39334e', t: '#a6a1b9', a: '#c777bf', w: '#d9e7ef' },
      '.....eee....../...eehhhee..../..ehchhcsshe../..ehsssische../..ehsssssshe../..ehhsssche.../..eahhacce..../.eaecatccsaeee/.e.ectccseatwe/...ecwace.ewe./..ette.ettewe./..ette.ette.../.eccce.eccce../.eeeee.eeeee..',
      [
        '.......eee..../....eehhhee.../...ehchhcsshe./..ewehsssishe./...ewesssssshe/..eaaaehsssche/...easacccce../..eaescatcce../.ea.ectcccce../...ecwaccce.../...ette.ette../..ette..ette../.eccce..eccce./.eeeee..eeeee.',
        '.....eee....../...eehhhee..../...ehchhcsshe./...ehsssische./...ehsssssshe./...ehhssaeeeee/.eahaccsawteee/.eacatcsaeeeee/..eacctcce..../...ecwace...../...ette.ette../..ett..ette.../.eccce..eccce./.eeeee..eeeee.',
        '.....eee....../...eehhhee..../..ehchhcsshe../..ehsssische../..ehsssssshe../..ehhsssche.../.eahhacce...../eaecatccsaeeee/e.ectccseatwee/..ecwacce.ewe./..ette.ettewe./.ette..ette.../eccce..eccce../eeeee..eeeee..',
      ], 'h'),
  },
  {
    id: 'study-dawn', name: '03 · 여명 성기사', detail: '따뜻한 피부 · 푸른 눈 · 금장 투구',
    ...sprites({ e: COLORS.void, s: '#c88f61', h: '#e5bc65', c: '#e6e9dd', t: '#204979', a: '#b78a4e', w: '#b7d4e3' },
      '....eeeeee..../...etcchcte.../..etccccsshe../..etsssiste.../..etssssssce../...etssscee.../..ecwahawe..../..etchaacsaeee/..eccaccseahwe/...ecwace.ewhe/..ecce.ettewwe/..ecce.etteewe/.ecwce.ecwcewe/.eeeee.eeeeeee',
      [
        'eee..eeeeee.../ewweetcchcte../ewwetccccsshe./.ewhetsssiste./..ewwessssssce/..eaaaetssscee/...eascwahae../....estchace../....eccacwce../...ecwaccce.../...ecce.ette../..ecce..ette../.ecwce..ecwce./.eeeee..eeeee.',
        '....eeeeee..../...etcchcte.../...etccccsshe./...etsssiste../...etssssssce./....etssaeewwe/.ecwahcsawwhwe/.etchacsaeeeee/..eccacwce..../...ecwace...../...ecce.ette../..ecc..ette.../.ecwce..ecwce./.eeeee..eeeee.',
        '....eeeeee..../...etcchcte.../..etccccsshe../..etsssiste.../..etssssssce../...etssscee.../..ecwahawe..../.etchaacsaeeee/.eccaccseahwee/..ecwacce.ewhe/..ecce.ettewwe/.ecce..etteewe/ecwce..ecwceee/eeeee..eeeee..',
      ], 't'),
  },
] as const;
