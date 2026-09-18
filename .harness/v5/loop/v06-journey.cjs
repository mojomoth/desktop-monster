// Scripted diagnostics, separate from native fresh-state observation.
const {readFileSync,mkdirSync,rmdirSync} = require('node:fs');
const {join,resolve} = require('node:path');
module.exports = async function journey({core,ROOT,data,field,menu,readState,flush,loadFixture,evaluate,click,until,pause,check,screenshot}) {
  const selector=(kind,id)=>`[data-discovery-kind="${kind}"][data-discovery-id="${id}"]`;
  const legacy=JSON.parse(readFileSync(resolve(ROOT,'.agentdoc/v06-20260910T063253Z/baseline/fixtures/full-roster-fixed.json')));
  // Keep legacy wealth/roster/history; avoid random battle progress during diagnostics.
  legacy.monsterHp='999999999999999999999999999999999999999999999999999999';
  await loadFixture(legacy);await click(menu,'#tab-codex');
  const migrated=await readState();
  check('v06-legacy-read-baseline', migrated.progress.seenHeroes.every(id=>migrated.progress.codex.acknowledgedHeroes.includes(id))&&
    migrated.progress.seenMonsters.every(id=>migrated.progress.codex.acknowledgedMonsters.includes(id))&&migrated.coins===legacy.coins&&
    JSON.stringify(migrated.companions)===JSON.stringify(legacy.companions)&&JSON.stringify(migrated.hero.collection)===JSON.stringify(legacy.hero.collection)&&
    JSON.stringify(migrated.progress.reincarnationHistory)===JSON.stringify(legacy.progress.reincarnationHistory),
    {coins:migrated.coins,companions:migrated.companions.length,heroCount:migrated.hero.collection.length,unreadText:await evaluate(menu,"document.querySelector('.discovery-count').textContent")});
  const progress=core.newProgress();progress.seenHeroes=['h01','h02','h03','h04'];progress.seenMonsters=['slime'];progress.speciesKills={dragon:3};
  await loadFixture({...core.DEFAULT_SAVE,coins:1800,monsterHp:legacy.monsterHp,progress});
  await click(menu,'#tab-codex');
  check('v06-open-does-not-ack', (await readState()).progress.codex.acknowledgedHeroes.length===0, 'Opening menu preserves unread discoveries.');
  await evaluate(menu,'window.scrollTo(0,0)');await screenshot(menu,'v06-unread-summary');
  await click(menu,'.discovery-ack');
  await until(async()=>(await readState()).progress.codex.acknowledgedHeroes.length===3,'displayed heroes acknowledged');
  const acked=await readState();check('v06-only-displayed-ack',!acked.progress.codex.acknowledgedHeroes.includes('h04'),acked.progress.codex);
  // Capture the displayed IDs, then cause a real new discovery through production IPC.
  const raceProgress=core.newProgress();raceProgress.seenHeroes=['h01'];raceProgress.seenMonsters=['slime'];
  await loadFixture({...core.DEFAULT_SAVE,level:12,monsterSpeciesId:'slime',monsterHp:legacy.monsterHp,progress:raceProgress});
  await click(menu,'#tab-codex');
  const displayedBeforeOffer=await evaluate(menu,"document.querySelector('.discovery-count').textContent");
  const stale={type:'acknowledgeDiscoveries',heroes:['h01'],monsters:['slime']};
  await evaluate(menu,"window.desmon.sendAction({type:'heroOffer'})");
  await until(async()=>(await readState()).progress.seenHeroes.some(id=>id!=='h01'),'new discovery after displayed snapshot');
  const offered=await readState();const newIds=offered.progress.seenHeroes.filter(id=>id!=='h01');
  for(let i=0;i<2;i++)await evaluate(menu,`window.desmon.sendAction(${JSON.stringify(stale)})`);
  await until(async()=>(await readState()).progress.codex.acknowledgedHeroes.includes('h01'),'stale displayed snapshot applied');
  const afterRace=await flush();
  check('v06-stale-ack-keeps-later-discovery',displayedBeforeOffer.includes('영웅 1')&&newIds.length>0&&
    newIds.every(id=>afterRace.progress.seenHeroes.includes(id)&&!afterRace.progress.codex.acknowledgedHeroes.includes(id)),
    {displayedBeforeOffer,stale,newIds,after:afterRace.progress.codex,offerSerial:offered.hero.offerSerial});
  await loadFixture(acked);await click(menu,'#tab-codex');
  const heroCard=selector('hero','h51');
  await click(menu,`${heroCard} summary`);await click(menu,`${heroCard} .codex-goal`);
  await until(async()=>(await readState()).progress.codex.goal?.id==='h51','goal selected');
  const goal=await evaluate(menu,`({name:document.querySelector('.goal-name').textContent,status:document.querySelector('.goal-status').textContent,cardName:document.querySelector('${heroCard} .name').textContent,artLabel:document.querySelector('${heroCard} canvas').getAttribute('aria-label')})`);
  check('v06-goal-unseen-eligible',goal.name.includes('미발견')&&goal.status.includes('조건 충족 · 아직 미발견')&&goal.cardName==='미발견'&&goal.artLabel.includes('실루엣'),goal);
  // Native focus and exact scroll position across a real five-second autosave.
  const focus=await evaluate(menu,`(() => {const b=document.querySelector('${heroCard} .codex-goal');b.focus();return {scroll:window.scrollY,open:document.querySelector('${heroCard}').open};})()`);
  await pause(5200);
  const stable=await evaluate(menu,`({focused:document.activeElement===document.querySelector('${heroCard} .codex-goal'),scroll:window.scrollY,open:document.querySelector('${heroCard}').open})`);
  check('v06-focus-scroll-disclosure',stable.focused&&stable.open&&focus.open&&stable.scroll===focus.scroll,{before:focus,after:stable});
  await screenshot(menu,'v06-goal-focus');
  await click(menu,`${selector('hero','h02')} summary`);await click(menu,`${selector('hero','h02')} .codex-goal`);
  await until(async()=>(await readState()).progress.codex.goal?.id==='h02','goal changed');
  check('v06-goal-discovered-unowned',await evaluate(menu,"document.querySelector('.goal-status').textContent.includes('발견 완료 · 미보유')"),'Discovered is distinct from owned.');
  await click(menu,'.goal-clear');await until(async()=>(await readState()).progress.codex.goal===null,'goal clear');
  check('v06-goal-clear',true,'Explicit free clear via native click → IPC → disk.');
  // Make atomic save's temporary path unwritable using an owned directory, no permission changes.
  const tmp=join(data,'save.json.tmp');mkdirSync(tmp);
  try {
    await click(menu,`${heroCard} .codex-goal`);
    await until(async()=>await evaluate(menu,"!document.querySelector('#save-status').hidden"),'save failure visible');
    const error=await evaluate(menu,"(() => {const e=document.querySelector('#save-status'),r=e.getBoundingClientRect();return {text:e.textContent,visible:r.bottom>0&&r.top<innerHeight,live:e.getAttribute('aria-live'),goal:document.querySelector('.goal-name').textContent}})()");
    const disk=await readState();
    check('v06-save-failure-honest',error.visible&&error.live==='polite'&&error.text.includes('저장하지 못했습니다')&&disk.progress.codex.goal===null&&error.goal.includes('목표 없음'),error);
    await screenshot(menu,'v06-save-failed');
  } finally {rmdirSync(tmp);}
  await flush();await until(async()=>(await readState()).progress.codex.goal?.id==='h51','retry after disk recovery');
  check('v06-save-retry',await evaluate(menu,"document.querySelector('#save-status').hidden"),(await readState()).progress.codex);
  const saved=await flush();
  await field.loadURL('about:blank');await field.loadFile(resolve(ROOT,'static/index.html'));
  await until(async()=>{try{return (await readState()).progress.codex.goal?.id==='h51';}catch{return false;}},'restart goal preserved');
  await pause(200);await flush();
  const resumed=await readState();
  check('v06-restart-ui-state',JSON.stringify(resumed.progress.codex)===JSON.stringify(saved.progress.codex),{saved:saved.progress.codex,resumed:resumed.progress.codex});
  await screenshot(menu,'v06-discoveries');
  // Explicit state fixtures test the same goal across phase and discovery transitions.
  // These are diagnostics, not accelerated natural-play rewards or elapsed-time evidence.
  const phaseProgress=core.newProgress();phaseProgress.seenMonsters=['slime'];
  const phaseFixture={...core.DEFAULT_SAVE,killCount:30,coins:45,monsterSpeciesId:'slime',monsterHp:legacy.monsterHp,progress:phaseProgress};
  await loadFixture(phaseFixture);await click(menu,'#tab-codex');await click(menu,'.codex-monsters');
  const phaseCard=selector('monster','dawnfinch');
  await click(menu,`${phaseCard} summary`);await click(menu,`${phaseCard} .codex-goal`);
  await until(async()=>(await readState()).progress.codex.goal?.id==='dawnfinch','phase goal selected');
  const eligibleBefore=await evaluate(menu,"document.querySelector('.goal-status').textContent");
  const phaseSave=await flush();phaseSave.progress.playTimeMs=core.FIELD_PHASE_MS+1000;
  await loadFixture(phaseSave);await click(menu,'#tab-codex');
  const phaseAfter=await readState();
  const ineligibleAfter=await evaluate(menu,"document.querySelector('.goal-status').textContent");
  check('v06-goal-phase-retained',eligibleBefore.includes('조건 충족 · 아직 미발견')&&ineligibleAfter.includes('현재 조건 미충족')&&
    phaseAfter.progress.codex.goal?.id==='dawnfinch'&&phaseAfter.coins===45,{eligibleBefore,ineligibleAfter,goal:phaseAfter.progress.codex.goal});
  // Restore a valid save with this current monster; production migration records its discovery.
  phaseAfter.monsterSpeciesId='dawnfinch';
  await loadFixture(phaseAfter);await click(menu,'#tab-codex');
  const completed=await readState();const completedText=await evaluate(menu,"document.querySelector('.goal-status').textContent");
  check('v06-same-goal-completed',completed.progress.codex.goal?.id==='dawnfinch'&&completed.progress.seenMonsters.includes('dawnfinch')&&
    completedText.includes('발견 완료')&&completed.coins===phaseAfter.coins&&completed.souls===phaseAfter.souls,
    {goal:completed.progress.codex.goal,completedText,coins:completed.coins,souls:completed.souls,mode:'explicit before/after save fixtures'});
  await evaluate(menu,'window.scrollTo(0,0)');await screenshot(menu,'v06-goal-completed');
  // Fixed fixture explicitly establishes +0 and actual next training purchase.
  const training=core.newProgress();
  await loadFixture({...core.DEFAULT_SAVE,level:5,coins:1800,progress:training,monsterHp:legacy.monsterHp});
  await click(menu,'#tab-shop');
  const preview=await evaluate(menu,"document.querySelector('#shop .shop-effect').textContent");
  check('v06-training-zero-preview',preview.includes('14 → 14 (+0)'),preview);
  await click(menu,'#shop .shop-card button');
  await until(async()=>(await readState()).progress.trainingLevel===1,'training applied');
  const bought=await readState();
  await evaluate(menu,"window.desmon.sendAction({type:'shopBuy',item:'training',shopSerial:0})");await pause(100);
  check('v06-training-repeat-token',(await readState()).coins===bought.coins,{coins:bought.coins,preview});
  await screenshot(menu,'v06-training');
  await loadFixture({...core.DEFAULT_SAVE,monsterHp:legacy.monsterHp,progress:core.newProgress()});
  const labelPixels = async () => evaluate(field, `(async () => {
    const {drawFeverLabel}=await import('../dist/web/renderer/hud.js');
    const {HERO_X,GROUND_Y,SPRITE_SCALE}=await import('../dist/web/renderer/game.js');
    const {heroIdle,heroFormSprite}=await import('../dist/web/renderer/sprites/index.js');
    const {COLORS}=await import('../dist/web/renderer/sprites/palette.js');
    const art=heroFormSprite('h00');const top=GROUND_Y-art.h*SPRITE_SCALE+Math.max(0,art.frames[0].findIndex(row=>/[^.]/.test(row)))*SPRITE_SCALE;
    const off=document.createElement('canvas');off.width=400;off.height=260;const ctx=off.getContext('2d');
    drawFeverLabel(ctx,HERO_X+Math.floor(heroIdle.w*SPRITE_SCALE/2),top);
    const mask=ctx.getImageData(0,0,400,260).data,p=document.querySelector('#game').getContext('2d').getImageData(0,0,400,260).data;
    ctx.fillStyle=COLORS.yellow;ctx.fillRect(0,0,1,1);const color=ctx.getImageData(0,0,1,1).data;
    let expected=0,matched=0;for(let i=0;i<mask.length;i+=4)if(mask[i+3]&&mask[i]===color[0]&&mask[i+1]===color[1]&&mask[i+2]===color[2]){expected++;if(p[i]===mask[i]&&p[i+1]===mask[i+1]&&p[i+2]===mask[i+2]&&p[i+3])matched++;}
    return {expected,matched};
  })()`);
  const cold=await labelPixels();
  const driver=new core.SimulatedInputDriver();driver.subscribe(event=>field.webContents.send('desmon:input',event));driver.start();
  for(let i=0;i<20;i++){driver.emit('keyboard');await pause(80);}driver.stop();await pause(100);
  const hot=await labelPixels();await screenshot(field,'v06-fever-active');
  await pause(5200);const cooled=await labelPixels();
  check('v06-native-fever-transition',hot.expected>0&&hot.matched===hot.expected&&cold.matched<hot.expected&&cooled.matched<hot.expected,{cold,hot,cooled,inputCount:20});

};
