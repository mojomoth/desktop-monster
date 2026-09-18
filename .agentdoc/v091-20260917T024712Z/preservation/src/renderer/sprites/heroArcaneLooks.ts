import { COLORS } from './palette.js';
import { makeHeroLook, type HeroLook } from './heroLook.js';

type Weapon = 'relic' | 'cleaver' | 'staff' | 'book';
type Paint = readonly [skin: string, hair: string, cloth: string, shade: string, accent: string, light: string];

// All costumes are drawn on the starter's 14px body. The six head rows and
// eight costume rows are authored separately; hands keep the starter's exact
// wind-up, strike and recovery anchors when the same costume changes pose.
function arcane(
  paint: Paint, head: string, body: string, weapon: Weapon, iris: 'a' | 'h' | 't' = 'a',
): HeroLook {
  const [s, h, c, t, a, w] = paint;
  const standing = `${head}/${body}`.split('/');
  const shift = (row: string, dx: number): string => dx < 0 ? row.slice(-dx) + '.'.repeat(-dx) : '.'.repeat(dx) + row.slice(0, 14 - dx);
  const cells = (rows: readonly string[]): string[][] => rows.map(row => [...row]);
  const prepare = cells([
    ...standing.slice(0, 6).map((row, y) => shift(row, y < 2 ? 1 : 2)),
    `...eas${standing[6]!.slice(4, 9)}e..`,
    `....es${standing[7]!.slice(3, 8)}e..`,
    `....e${standing[8]!.slice(3, 8)}ce..`,
    `...e${standing[9]!.slice(4, 8)}cce...`,
    '...ecte.ette..', '..ecte..ette..', '.ectce..ectce.', '.eeeee..eeeee.',
  ]);
  // The diagonal grip remains at (5,6)/(5,7), with the prop attached to it.
  const raised = weapon === 'book'
    ? ['eeee', 'ewae', '.ewe', '..ew', '...e']
    : weapon === 'cleaver'
      ? ['eee', 'ewwe', '.ewwe', '..ewe', '...ew']
      : weapon === 'relic'
        ? ['ee', 'eae', 'ewawe', '..eae', '...ea']
        : ['eee', 'ehwe', '.eae', '..eae', '...ea'];
  raised.forEach((row, y) => [...row].forEach((pixel, x) => {
    if (pixel !== '.') prepare[y]![x] = pixel;
  }));
  prepare[5]![2] = 'e'; prepare[5]![3] = 'a'; prepare[5]![4] = 'a'; prepare[5]![5] = 'a';

  const strike = cells([
    ...standing.slice(0, 6).map((row, y) => shift(row, y < 2 ? 0 : 1)),
    `.e${standing[6]!.slice(3, 8)}saeeee`,
    `.e${standing[7]!.slice(3, 8)}saeeee`,
    `..e${standing[8]!.slice(3, 8)}ce....`,
    standing[9]!.slice(0, 9) + '.....',
    '...ecte.ette..', '..ect..ette...', '.ectce..ectce.', '.eeeee..eeeee.',
  ]);
  const thrust = weapon === 'book' ? ['aeeee', 'awwwe', 'awtwe']
    : weapon === 'relic' ? ['aewee', 'aawwa', 'aewee']
      : weapon === 'staff' ? ['aeeee', 'aaahw', 'aeeee']
        : ['aewee', 'awwwa', 'aeeee'];
  thrust.forEach((row, y) => [...row].forEach((pixel, x) => { strike[y + 5]![x + 8] = pixel; }));
  // Close the forward edge; every weapon remains inside the 14px cell.
  for (let y = 5; y <= 7; y++) strike[y]![13] = 'e';

  const recover = cells([
    ...standing.slice(0, 6),
    shift(standing[6]!, -1),
    shift(standing[7]!.slice(0, 10).padEnd(14, '.'), -1).slice(0, 10) + standing[7]!.slice(10),
    shift(standing[8]!.slice(0, 10).padEnd(14, '.'), -1).slice(0, 10) + standing[8]!.slice(10),
    shift(standing[9]!.slice(0, 10).padEnd(14, '.'), -1).slice(0, 10) + standing[9]!.slice(10),
    standing[10]!, '.ecte..ette...', 'ectce..ectce..', 'eeeee..eeeee..',
  ]);
  return makeHeroLook({ e: COLORS.void, s, h, c, t, a, w }, standing.join('/'),
    [prepare, strike, recover].map(frame => frame.map(row => row.join('')).join('/')), iris);
}

/** Five distinct loadouts per family, ordered by existing rarity/ID rank. */
export const HERO_ARCANE_LOOKS: Readonly<Record<number, readonly HeroLook[]>> = {
  3: [
    // Linen cowl, crossed stole and a small wooden cross.
    arcane(['#c98e69', '#dccca6', '#e9e3cd', '#58626a', '#294d66', '#d8edf0'],
      '....eeeeee..../...ecchcce..../..ecchsssse.../..ecsssisce.../..ecsssssce.../...ecsssee....',
      '...echaace..../..eccccccsaeee/..ecaccaseawae/...echace.eae./..ecce.etteae./..ecce.etteeee/.ecwce.ecwce../.eeeee.eeeee..', 'relic'),
    // Folded teal hood, split surplice and a silver reliquary.
    arcane(['#b98572', '#20464a', '#d4e5dc', '#435361', '#ca9d61', '#f1e7c7'],
      '.....eee....../...eechhee..../..echhsssse.../..echssisce.../..ecsssssche../...echssce....',
      '..echahawe..../..echcaccsaeee/..ecccacseawae/..ecwhace.ewe./..ecce.ecteawe/..ecce.ecteeee/.ecwce.ecwce../.eeeee.eeeee..', 'relic', 'h'),
    // Low mitre, embroidered shoulder cloth, gilded crossbar.
    arcane(['#e2b3a5', '#b5c6d5', '#d7deeb', '#635d86', '#9771aa', '#f3d29a'],
      '....ee.ee...../...echahce..../..echhssshe.../..easssische../..ecsssssche../...echssce....',
      '.eecwahace..../.ecchcaccsaeee/..ewcaacseawae/..ecwhace.eae./..ecce.ecteawe/..ecce.ecteaee/.ecwce.ecwceae/.eeeee.eeeeeee', 'relic', 't'),
    // Broad pilgrim cowl, dark tabard and a carved ivory relic.
    arcane(['#946647', '#ddd2b5', '#365263', '#4a343e', '#b98651', '#ecddbe'],
      '...eeeeee...../..echhaace..../.echhhsssche../..easssische../..ecsssssace../..ecchssche...',
      '.echwahawe..../.ecahcaccsaeee/.ecacaacseawwe/..ecwhace.ewae/.ecwce.ecteawe/..ecce.ecteeee/.ecwce.ecwce../.eeeee.eeeee..', 'relic', 'h'),
    // Crown-seamed hood, gold-edged vestments and a four-point sun cross.
    arcane(['#c7956e', '#c9b783', '#f0e6cb', '#566a76', '#265747', '#ead091'],
      '....eeeee...../...echahce..../..echhhhche.../..easssisce.../..ecsssssace../.eccchssce....',
      '.ecwahawe...../.ecwhcaccsaeee/.eccwaacseawwe/.ecwhace.eawae/.ecwce.ecteawe/.ecwce.ecteaee/.ecwce.ecwceae/.eeeee.eeeeeee', 'relic'),
  ],
  5: [
    // Cropped jagged hair, bare red arm, leather chest strap, chipped cleaver.
    arcane(['#d7a397', '#dfd8c4', '#493b4e', '#7c7080', '#953649', '#c3d9df'],
      '...ee.eee...../..ehhhehhe..../..ethhsssse.../..etsssisee.../...esssssse.../...eesssee....',
      '...echtace..../..eahctccsaeee/..eaacccseawwe/...ectace.ewe./..ecte.ettewe./..ecte.ecteewe/.etcte.etctewe/.eeeee.eeeeeee', 'cleaver'),
    // Twin swept tufts, heavy gauntlet, diagonal harness, square-backed blade.
    arcane(['#bb8c7e', '#c17b57', '#343b4e', '#6c7e94', '#7c273b', '#e0e6df'],
      '..ee...ee...../..eheeehhe..../.ehhhhhssse.../..ehsssisee.../..etsssssse.../...eesssee....',
      '..eatchace..../.eeahctccsaeee/.eaaatccseawwe/..ectwace.ewte/..ecte.ettewwe/..ecte.ectewwe/.etcte.etcteee/.eeeee.eeeee..', 'cleaver'),
    // Bound silver mane, riveted shoulder, red wrap and serrated greatsword.
    arcane(['#d3b4b7', '#e1e4e3', '#3b3e58', '#7c809b', '#a63350', '#b3d8e5'],
      '....ee.eee..../..eehhhahhe.../.ehhhhhssse.../..etsssisee.../..easssssse.../...eesssee....',
      '.eeatchawe..../.etahctccsaeee/.eaaatccseawwe/..ectwace.ewae/.ectte.ettewwe/..ecte.ectewte/.etcte.etcteee/.eeeee.eeeee..', 'cleaver'),
    // Shoulder-length iron hair, scarlet bracer, plated kilt, black-edged sword.
    arcane(['#927c81', '#f0e7ee', '#3e3446', '#61758b', '#ae3a4c', '#e2dfd2'],
      '...ee..eee..../.eehheehhe..../.ehhhhssshe.../..etsssishe.../..eassssshe.../..eeasssee....',
      '.eatwchawe..../.etahctccsaeee/.eaaatccseawwe/.ecttwace.ewwe/.ectte.ettewte/.ectte.ectewwe/.etcte.etctewe/.eeeee.eeeeeee', 'cleaver', 'h'),
    // Forked white mane, crossed war harness, layered tassets, crimson fuller.
    arcane(['#d3afb8', '#ebe2d5', '#362e42', '#85778e', '#9f2945', '#c3e1e5'],
      '..ee.ee.ee..../.ehhehhehhe.../.ehhahssshe.../..etsssishe.../..ehsssssse.../..ehhsssee....',
      '.eatwahawe..../.ewahctccsaeee/.eaaatccseawwe/.ecttwace.ewae/.ectte.ettewae/.ectte.ectewwe/.etcte.etctewe/.eeeee.eeeeeee', 'cleaver'),
  ],
  6: [
    // Small pointed cap, short apprentice robe and a blue crystal wand.
    arcane(['#deb7a2', '#735979', '#45436a', '#a896b8', '#8fc4cb', '#eee1c5'],
      '.....ee......./....ehhe....../..ehhhhhaee.../..ehsssisce.../..ehsssssse.../...ehsssee....',
      '...echaace..../..echcaccsaeee/..eccaccseahwe/...ectace.eae./..ecce.etteae./..ecce.etteeae/.eccce.eccceae/.eeeee.eeeeeee', 'staff', 'h'),
    // Bent travelling hat, double collar, split coat and silver-capped staff.
    arcane(['#a9877e', '#476981', '#b8cfd5', '#343e55', '#b9a2d4', '#e9d2a5'],
      '...eeee......./...ehhhhe...../..ehhahahhee../..ehsssische../..ehsssssse.../...ehsssee....',
      '..echwhawe..../..echcaccsaeee/.eccwaccseahwe/..ectwace.eae./..ecce.etteawe/..ecce.etteeae/.eccce.eccceae/.eeeee.eeeeeee', 'staff', 't'),
    // Tall-fold cap, crescent trim, belted brocade and a forked gem staff.
    arcane(['#e0c1c5', '#675991', '#4e466d', '#9c8fb7', '#76bac7', '#e7d0a2'],
      '......ee....../....eehhe...../.eehhhahhhee../..ehsssische../..ehsssssche../...ehsssee....',
      '.eechahawe..../.ecchcaccsaeee/.eccwaccseahwe/..ectwace.eawa/..ecce.etteaee/..ecce.etteeae/.eccce.eccceae/.eeeee.eeeeeee', 'staff', 'h'),
    // Broad slouched hat, embroidered sleeves, layered hem and a pearl sceptre.
    arcane(['#c19371', '#3f5966', '#b2cecc', '#414365', '#ad7292', '#e9d9ae'],
      '..eeee......../..ehhhhhe...../.ehhahahhhee../..ehsssische../..ehsssssche../..ehhsssee....',
      '.echwahawe..../.ecahcaccsaeee/.eccwaccseahwe/.ecttwace.ehwe/.ecwce.etteaee/..ecce.etteeae/.eccce.eccceae/.eeeee.eeeeeee', 'staff', 't'),
    // Gold-bound crown of the same low hat, white robe panels and a star-cut orb.
    arcane(['#b8b1c9', '#545986', '#ece0c8', '#777694', '#cf955e', '#cadfeb'],
      '....eee......./..eehahhe...../.ehhaaahhhee../..ehsssische../..easssssace../..ehhsssche...',
      '.echwahawe..../.ecwhcaccsaeee/.eccwaccseahwe/.ecttwace.ehwe/.ecwce.etteawe/.ecwce.etteeae/.eccce.eccceae/.eeeee.eeeeeee', 'staff', 'h'),
  ],
  9: [
    // Soft beret, bob haircut, short cape and a bronze-bound open primer.
    arcane(['#d3aa98', '#684566', '#51465f', '#968eaa', '#bf87aa', '#e6d6ba'],
      '....eeeee...../..eehhhcce..../..ehhhsssse.../..ehsssisce.../..ehsssssse.../...ehsssee....',
      '..echahawe..../..echcaccsaeee/..eccaccsewawe/...ectace.wawe/..ecte.etteaee/..ecte.ette.../.eccce.eccce../.eeeee.eeeee..', 'book', 'h'),
    // Pinned beret, layered collar and ivory pages with a deep blue binding.
    arcane(['#ae9a9d', '#344d70', '#363b5d', '#8797ad', '#b292c2', '#e9dbc4'],
      '.....eeee...../...eehhhaee.../..ehhhsssse.../..etsssishe.../..ehsssssse.../..ehhsssee....',
      '.echwahawe..../.ecchcaccsaeee/.eccwaccsewawe/..ectwace.whwe/..ecte.etteaee/..ecte.ette.../.eccce.eccce../.eeeee.eeeee..', 'book', 'h'),
    // Short scholar hood, fitted waistcoat, clasped cape and a silver grimoire.
    arcane(['#d2b7c8', '#7a5a8a', '#3d425e', '#94a3b9', '#bf7594', '#eadcc1'],
      '.....eee....../....ehhhe...../..eehhhsshe.../..ehsssische../..ehsssssace../..ehhsssche...',
      '.echwahawe..../.ecahcaccsaeee/.eccwaccsewwwe/.ecttwace.whwe/.ectte.etteaee/..ecte.ette.../.eccce.eccce../.eeeee.eeeee..', 'book', 'h'),
    // Side-swept beret, brocade sleeves and an embossed brass folio.
    arcane(['#937d77', '#402c49', '#49435e', '#6e8e9c', '#a87d9e', '#e7cc95'],
      '...eeee......./..ehhhhaee..../.ehhhhsssse.../.ehtsssisce.../..ehsssssace../..ehhsssche...',
      '.echwahawe..../.ecwhcaccsaeee/.eccwaccsewwwe/.ecttwace.whae/.ectte.etteaee/.ectte.ette.../.eccce.eccce../.eeeee.eeeee..', 'book', 'h'),
    // Wide jewelled beret, white-lined cape and an illuminated gold-edged tome.
    arcane(['#c4a9b6', '#554366', '#e0d4bf', '#8e7598', '#8dbac3', '#e7c780'],
      '...eeeeeee..../..ehhhaahhe.../.ehhhassshe.../.ehtsssische../..ehsssssace../..eahsssche...',
      '.echwahawe..../.ecwhcaccsaeee/.eccwaccsewwwe/.ecttwace.whae/.ecwte.etteaee/.ecwte.ette.../.eccce.eccce../.eeeee.eeeee..', 'book', 'h'),
  ],
};
