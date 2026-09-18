// Scripted v0.7 acceptance diagnostics. These fixtures never count as natural play.
const { resolve } = require('node:path');

// Blink activates Enter buttons on keypress charCode 13; keyDown alone has no text.
// Electron 39's converter accepts the literal char, while named "Enter" is not '\r'.
function nativeKeyEvents(keyCode,modifiers=[]) {
  return [{type:'keyDown',keyCode,modifiers},
    ...(['Enter','Space'].includes(keyCode)?[{type:'char',keyCode:keyCode==='Enter'?'\r':' ',modifiers}]:[]),
    {type:'keyUp',keyCode,modifiers}];
}

function createMockPvp({createApp,MemoryStore,createNetClient,now=Date.now}) {
  let serial=0,registerIp=0;const calls=[],responses=[],authIps=new Map();
  const {handle}=createApp({store:new MemoryStore(),now,randomUUID:()=>`e2e-${++serial}`,
    randomBytesHex:n=>(++serial).toString(16).padStart(n*2,'0'),randomSeed:()=>7});
  const client=createNetClient({baseUrl:'https://desmon.invalid',fetchFn:async (url,init={})=>{
    const parsed=new URL(url);const body=init.body?JSON.parse(init.body):null;
    const auth=init.headers?.authorization?.replace(/^Bearer /,'' )??null;
    if(auth&&!authIps.has(auth))authIps.set(auth,`isolated-auth-${authIps.size+1}`);
    const ip=auth?authIps.get(auth):`isolated-register-${++registerIp}`;
    const requestIndex=calls.length;
    calls.push({path:parsed.pathname,body,ip});
    const result=await handle({method:init.method??'GET',path:parsed.pathname,query:Object.fromEntries(parsed.searchParams),
      auth,body,ip});
    if(parsed.pathname==='/v1/pvp/match')responses.push({requestIndex,path:parsed.pathname,status:result.status,
      playerId:result.body?.opponent?.playerId??null,matchId:result.body?.matchId??null,
      bot:result.body?.bot??null,expiresAt:result.body?.expiresAt??null});
    return new Response(JSON.stringify(result.body),{status:result.status});
  }});
  return {client,calls,responses};
}

module.exports = async function journey({core,ROOT,field,menu,ipcMain,readState,flush,loadFixture,evaluate,click,until,pause,check,screenshot}) {
  const selector = (kind,id) => `[data-discovery-kind="${kind}"][data-discovery-id="${id}"]`;
  const art = async (kind,id) => evaluate(menu, `(() => {
    const card=document.querySelector(${JSON.stringify(selector(kind,id))});
    const canvas=card?.querySelector('canvas'); if(!canvas)return null;
    const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    const colors=new Set();for(let i=0;i<pixels.length;i+=4)if(pixels[i+3])colors.add(pixels.slice(i,i+4).join(','));
    return {colors:colors.size,label:canvas.getAttribute('aria-label'),name:card.querySelector('.name').textContent};
  })()`);
  const masked = value => value?.colors === 1 && value.label?.includes('실루엣');
  const revealed = value => value?.colors > 1 && !value.label?.includes('실루엣');
  const chooseGoal = async (kind,id) => {
    const card=selector(kind,id);
    if (!await evaluate(menu, `document.querySelector(${JSON.stringify(card)}).open`)) await click(menu, `${card} summary`);
    await click(menu, `${card} .codex-goal`);
    await until(async () => (await readState()).progress?.codex?.goal?.id === id, 'goal selected through menu');
  };

  // One actually selected hero and defeated species; the other two were only seen.
  const roll={formId:'h01',buffPercent:15};
  const progress=core.newProgress();
  Object.assign(progress,{seenHeroes:['h01','h02'],seenMonsters:['slime','bat'],heroCounts:{h01:1},speciesKills:{slime:1},
    codex:{acknowledgedHeroes:['h01','h02'],acknowledgedMonsters:['slime','bat'],goal:{kind:'hero',id:'h02'}}});
  const legacy={...core.DEFAULT_SAVE,coins:321,killCount:1,monsterSpeciesId:'bat',progress,
    hero:{...core.newHeroProgress(),equipped:roll,collection:[roll],reincarnations:1}};
  await loadFixture(legacy);await click(menu,'#tab-codex');await click(menu,'.codex-heroes');
  const selectedArt=await art('hero','h01');const seenArt=await art('hero','h02');
  await click(menu,'.codex-monsters');
  const killedArt=await art('monster','slime');const spawnedArt=await art('monster','bat');
  const migrated=await readState();
  check('v07-codex-strict-legacy',revealed(selectedArt)&&masked(seenArt)&&revealed(killedArt)&&masked(spawnedArt)&&
    migrated.coins===321&&migrated.hero.collection[0]?.formId==='h01', {selectedArt,seenArt,killedArt,spawnedArt});
  check('v07-codex-legacy-ack-normalization',
    JSON.stringify(migrated.progress.codex.acknowledgedHeroes)===JSON.stringify(['h01'])&&
    JSON.stringify(migrated.progress.codex.acknowledgedMonsters)===JSON.stringify(['slime']),migrated.progress.codex);
  const goal=await evaluate(menu,"({name:document.querySelector('.goal-name').textContent,status:document.querySelector('.goal-status').textContent})");
  check('v07-codex-unacquired-goal',goal.name.includes('미')&&!goal.status.includes('완료'),goal);
  await screenshot(menu,'v07-legacy-silhouettes');

  // Real offer and choice actions: seeing candidates never counts as acquisition.
  await loadFixture({...core.DEFAULT_SAVE,level:core.heroRequiredLevel(0),progress:core.newProgress()});
  await click(menu,'#tab-hero');await click(menu,'#hero .hero-opportunity > button:not(:disabled)');
  await until(async () => (await readState()).hero?.choices.length===3,'v7 offer');
  const offered=await readState();const chosenId=offered.hero.choices[0].formId;
  await click(menu,'#tab-codex');await click(menu,'.codex-heroes');
  const beforeChoices=await Promise.all(offered.hero.choices.map(choice=>art('hero',choice.formId)));
  check('v07-codex-offer-stays-silhouette',beforeChoices.every(masked),{choices:offered.hero.choices,art:beforeChoices});
  await chooseGoal('hero',chosenId);
  await click(menu,'#tab-hero');await click(menu,'#hero .hero-choice button:not(:disabled)');
  await until(async () => (await readState()).hero?.reincarnations===1,'v7 accepted hero');
  await click(menu,'#tab-codex');await click(menu,'.codex-heroes');
  const afterChoices=await Promise.all(offered.hero.choices.map(choice=>art('hero',choice.formId)));
  const summary=await evaluate(menu,"({goal:document.querySelector('.goal-status').textContent,unread:document.querySelector('.discovery-count').textContent})");
  check('v07-codex-selection-reveals-one',revealed(afterChoices[0])&&afterChoices.slice(1).every(masked)&&
    summary.goal.includes('완료')&&summary.unread.includes('영웅 1'),{art:afterChoices,summary});
  await click(menu,'.discovery-ack');
  const acked=await flush();
  check('v07-codex-acquired-ack-only',JSON.stringify(acked.progress.codex.acknowledgedHeroes)===JSON.stringify([chosenId]),acked.progress.codex);
  await field.loadURL('about:blank');await field.loadFile(resolve(ROOT,'static/index.html'));await flush();
  await click(menu,'#tab-codex');await click(menu,'.codex-heroes');
  check('v07-codex-restart-preservation',revealed(await art('hero',chosenId))&&
    JSON.stringify((await readState()).progress.codex)===JSON.stringify(acked.progress.codex),(await readState()).progress.codex);

  // Current h70 requirements and a valid third-slot offer; diagnostic fixture only.
  // Observe the production action relay without replacing the menu click or reducer.
  const rareOwned=Array.from({length:10},(_,index)=>({formId:`h${String(index+1).padStart(2,'0')}`,buffPercent:15}));
  const rareChoices=[{formId:'h11',buffPercent:15},{formId:'h12',buffPercent:16},{formId:'h70',buffPercent:25}];
  const rareProgress=core.newProgress();
  Object.assign(rareProgress,{heroCounts:Object.fromEntries(rareOwned.map(hero=>[hero.formId,1])),
    speciesKills:{slime:30000},seenMonsters:['slime'],seenHeroes:rareOwned.map(hero=>hero.formId),
    codex:{acknowledgedHeroes:rareOwned.map(hero=>hero.formId),acknowledgedMonsters:['slime'],goal:null}});
  const rareHero={...core.newHeroProgress(),equipped:rareOwned[0],collection:rareOwned,reincarnations:10,
    choices:rareChoices,offerSerial:41,offerLevel:core.heroRequiredLevel(10)};
  await loadFixture({...core.DEFAULT_SAVE,level:rareHero.offerLevel,xp:7,coins:321,killCount:30000,rebirths:10,souls:3,
    monsterIndex:80,monsterSpeciesId:'slime',monsterHp:core.monsterForIndex(80,'slime').maxHp.toString(),
    hero:rareHero,progress:rareProgress});
  await click(menu,'#tab-codex');await click(menu,'.codex-heroes');
  const rareMasked=await art('hero','h70');
  await chooseGoal('hero','h70');
  await click(menu,'#tab-hero');
  const rareBefore=await flush();
  const rareCards=await evaluate(menu,`Array.from(document.querySelectorAll('#hero .hero-choice')).map(card=>({
    name:card.querySelector('.name').textContent,label:card.querySelector('canvas').getAttribute('aria-label'),
    rarity:card.querySelector('.stars').textContent,disabled:card.querySelector('button').disabled}))`);
  const rareValid=rareBefore.hero.offerSerial===41&&rareBefore.hero.offerLevel===core.heroRequiredLevel(10)&&
    core.heroReady(rareBefore.level,rareBefore.hero)&&core.eligibleHeroIds(rareBefore).includes('h70')&&
    JSON.stringify(rareBefore.hero.choices)===JSON.stringify(rareChoices)&&masked(rareMasked)&&
    !core.acquiredDiscoveries(rareBefore).heroes.includes('h70')&&rareCards.length===3&&
    rareCards.every((card,index)=>card.name===core.heroForm(rareChoices[index].formId).name&&!card.disabled)&&
    rareCards[2].label===core.heroForm('h70').name&&rareCards[2].rarity.includes('레어');
  if(!rareValid) {
    check('v07-rare-third-choice-ui',false,{fixture:true,stage:'before-choice',rareBefore,rareCards,rareMasked});
    throw new Error('Current h70 third-choice diagnostic fixture is invalid');
  }
  await evaluate(field,`window.__v07RareActions=[];
    window.desmon.onAction(action=>{if(action.type==='heroChoose')window.__v07RareActions.push(action);});true;`);
  await screenshot(menu,'v07-rare-third-choice-offer');
  await click(menu,'#hero .hero-choices > .hero-choice:nth-child(3) button');
  await until(async ()=>(await readState()).hero?.reincarnations===rareBefore.hero.reincarnations+1,'native h70 third choice');
  const rareAfter=await flush();
  const rareActions=await evaluate(field,'window.__v07RareActions');
  await click(menu,'#tab-codex');await click(menu,'.codex-heroes');
  const rareRevealed=await art('hero','h70');
  const rareUnselected=await Promise.all(rareChoices.slice(0,2).map(choice=>art('hero',choice.formId)));
  const rareNotice=await evaluate(menu,`({goal:document.querySelector('.goal-status').textContent,
    unread:document.querySelector('.discovery-count').textContent,
    previews:Array.from(document.querySelectorAll('.discovery-preview .discovery-name')).map(el=>el.textContent)})`);
  await screenshot(menu,'v07-rare-third-choice-acquired');
  await click(menu,'.discovery-ack');
  const rareAcked=await flush();
  const rareHistory=rareAfter.progress.reincarnationHistory.at(-1);
  check('v07-rare-third-choice-ui',rareActions.length===1&&rareActions[0].formId==='h70'&&
    rareActions[0].offerSerial===rareBefore.hero.offerSerial&&rareAfter.hero.offerSerial===rareBefore.hero.offerSerial&&
    rareAfter.hero.equipped.formId==='h70'&&rareAfter.hero.equipped.buffPercent===25&&
    rareAfter.hero.collection.length===rareOwned.length+1&&
    JSON.stringify(rareAfter.hero.collection.filter(hero=>hero.formId!=='h70'))===JSON.stringify(rareOwned)&&
    rareAfter.hero.collection.some(hero=>hero.formId==='h70'&&hero.buffPercent===25)&&
    rareAfter.progress.heroCounts.h70===1&&rareHistory?.formId==='h70'&&
    rareHistory.number===rareBefore.hero.reincarnations+1&&rareHistory.level===rareBefore.level&&
    rareAfter.progress.reincarnationHistory.length===rareBefore.progress.reincarnationHistory.length+1&&
    rareAfter.hero.reincarnations===rareBefore.hero.reincarnations+1&&rareAfter.hero.choices.length===0&&
    rareAfter.hero.offerLevel===undefined&&rareAfter.hero.restRemainingMs>0&&rareAfter.level===1&&rareAfter.xp===0&&
    rareAfter.monsterIndex===0&&rareAfter.rebirths===rareBefore.rebirths+1&&rareAfter.coins===rareBefore.coins&&
    rareAfter.killCount===rareBefore.killCount&&revealed(rareRevealed)&&rareUnselected.every(masked)&&
    rareNotice.goal.includes('완료')&&rareNotice.unread.includes('영웅 1 · 몬스터 0')&&
    JSON.stringify(rareNotice.previews)===JSON.stringify([core.heroForm('h70').name])&&
    !rareAfter.progress.codex.acknowledgedHeroes.includes('h70')&&
    rareAcked.progress.codex.acknowledgedHeroes.includes('h70')&&rareAcked.progress.codex.acknowledgedHeroes.length===11&&
    rareAcked.progress.codex.acknowledgedHeroes.every(id=>core.acquiredDiscoveries(rareAcked).heroes.includes(id)),
    {fixture:true,naturalAcquisition:false,before:rareBefore,cards:rareCards,actions:rareActions,after:rareAfter,
      masked:rareMasked,revealed:rareRevealed,unselected:rareUnselected,notice:rareNotice,ack:rareAcked.progress.codex});

  // Native field input makes the first kill; holding a PvP companion is insufficient.
  await loadFixture({...core.DEFAULT_SAVE,monsterSpeciesId:'bat',monsterHp:'1',progress:core.newProgress()});
  await click(menu,'#tab-codex');await click(menu,'.codex-monsters');await chooseGoal('monster','bat');
  const preKill=await art('monster','bat');
  await click(field,'#game');await until(async () => (await readState()).progress?.speciesKills?.bat>0,'first native bat kill');
  const postKill=await art('monster','bat');
  const killGoal=await evaluate(menu,"document.querySelector('.goal-status').textContent");
  check('v07-codex-first-kill-reveals',masked(preKill)&&revealed(postKill)&&killGoal.includes('완료'),{preKill,postKill,killGoal});
  await screenshot(menu,'v07-first-kill-codex');

  const highParty=[{id:'c1',speciesId:'slime',bossIndex:8,level:11,stars:0},
    {id:'c2',speciesId:'bat',bossIndex:8,level:250,stars:0},
    {id:'c3',speciesId:'ghost',bossIndex:8,level:Number.MAX_SAFE_INTEGER,stars:0},
    {id:'c4',speciesId:'golem',bossIndex:8,level:10,stars:0},
    {id:'c5',speciesId:'dragon',bossIndex:8,level:1,stars:0}];
  await loadFixture({...core.DEFAULT_SAVE,monsterIndex:999,monsterSpeciesId:'slime',
    monsterHp:core.monsterForIndex(999,'slime').maxHp.toString(),companions:highParty,nextCompanionId:6,
    pvpParty:highParty.map(c=>c.id),progress:core.newProgress()});
  const highSaved=await flush();
  await field.loadURL('about:blank');await field.loadFile(resolve(ROOT,'static/index.html'));await flush();
  const highResumed=await readState();
  check('v07-level-over-10-save-reload',JSON.stringify(highSaved.companions)===JSON.stringify(highParty)&&
    JSON.stringify(highResumed.companions)===JSON.stringify(highParty),{expected:highParty,saved:highSaved.companions,resumed:highResumed.companions});
  await click(menu,'#tab-codex');await click(menu,'.codex-monsters');
  check('v07-codex-owned-without-kill-masked',masked(await art('monster','bat')),
    {art:await art('monster','bat'),note:'Synthetic transferred companion; no species kill record.'});

  // These are native controls over the isolated high-level fixture, not earned progression.
  const reincarnateButton=async level=>evaluate(menu,`(() => {
    const cards=Array.from(document.querySelectorAll('#roster > .card'));
    const matches=cards.map((card,index)=>({card,index})).filter(({card})=>card.querySelector('.name').textContent.endsWith(${JSON.stringify(`Lv ${level}`)}));
    if(matches.length!==1)throw new Error('Ambiguous companion fixture target');
    return '#roster > .card:nth-child('+(matches[0].index+1)+') > .row:not(.reincarnation-confirmation) > button:nth-child(3)';
  })()`);
  const confirmation=()=>evaluate(menu,`(() => {
    const panel=document.querySelector('.reincarnation-confirmation');
    return panel?{result:panel.querySelector('.reincarnation-result').textContent,
      power:panel.querySelector('.reincarnation-power').textContent,
      exact:panel.querySelector('.reincarnation-power').getAttribute('title'),
      aria:panel.querySelector('.reincarnation-power').getAttribute('aria-label')}:null;
  })()`);
  await click(menu,'#tab-roster');
  const target=highParty[0],expectedPower=core.companionReincarnationPreview(target);
  await click(menu,await reincarnateButton(target.level));
  const displayedPower=await confirmation();const firstClickState=await readState();
  await screenshot(menu,'v07-companion-reincarnation-preview');
  await click(menu,'.reincarnation-confirmation > button:last-of-type');
  const cancelled=await readState();
  check('v07-companion-reincarnation-cancel',displayedPower!==null&&await confirmation()===null&&
    JSON.stringify(firstClickState.companions)===JSON.stringify(highParty)&&JSON.stringify(cancelled.companions)===JSON.stringify(highParty),
    {fixture:true,displayedPower,before:highParty,afterFirstClick:firstClickState.companions,afterCancel:cancelled.companions});
  await click(menu,await reincarnateButton(target.level));
  await click(menu,'.reincarnation-confirmation > button:first-of-type');
  await until(async ()=>(await readState()).companions.find(c=>c.id===target.id)?.level===1,'native companion reincarnation');
  const confirmed=(await flush()).companions.find(c=>c.id===target.id);
  check('v07-companion-reincarnation-confirm',displayedPower?.result.includes('Lv.11 → Lv.1')&&
    displayedPower?.result.includes('★0 → ★1')&&displayedPower?.exact===`${expectedPower.beforePower} → ${expectedPower.afterPower}`&&
    displayedPower?.aria===`기본 힘 ${expectedPower.beforePower}에서 ${expectedPower.afterPower}로 변경`&&
    confirmed?.level===1&&confirmed?.stars===1&&core.companionPower(confirmed)===expectedPower.afterPower,
    {fixture:true,before:target,displayedPower,after:confirmed,beforePower:String(expectedPower.beforePower),
      afterPower:confirmed?String(core.companionPower(confirmed)):null});
  await click(menu,await reincarnateButton(250));
  const beforeChange=await confirmation();
  const changeSave=await flush();
  await loadFixture({...changeSave,companions:changeSave.companions.map(c=>c.id==='c2'?{...c,level:251}:c)});
  await until(async ()=>await confirmation()===null,'changed companion invalidates confirmation');
  const changed=(await readState()).companions.find(c=>c.id==='c2');
  const changedNotice=await evaluate(menu,"document.querySelector('#result').textContent");
  check('v07-companion-reincarnation-target-change-invalidates',beforeChange!==null&&changed?.level===251&&changed?.stars===0&&
    changedNotice.includes('환생 확인을 취소'),{fixture:true,change:'isolated save target level 250 -> 251 through field reload/stateChanged',
      beforeChange,after:changed,notice:changedNotice});

  // Real HTTP client and production server handler, with an injected MemoryStore/fetch.
  // No listener, remote host, production authentication or real PvP service is involved.
  const {createApp}=require(resolve(ROOT,'dist/electron/server/app.js'));
  const {MemoryStore}=require(resolve(ROOT,'dist/electron/server/store.js'));
  const {createNetClient}=require(resolve(ROOT,'dist/electron/main/net.js'));
  const {IPC}=require(resolve(ROOT,'dist/electron/shared/ipc.js'));
  const {client,calls,responses}=createMockPvp({createApp,MemoryStore,createNetClient});
  const register=async name=>{const result=await client.register(name);if(!result.ok)throw new Error('Mock player registration failed');return result.value;};
  const me=await register('E2E_Player');const foe=await register('E2E_Rival');
  const snapshot=(name,party,bestIndex=8)=>({name,bestIndex,rebirths:0,companions:party,party:party.map(c=>c.id),hero:{formId:'h01',buffPercent:15}});
  const upload=await client.upload(foe.token,snapshot('E2E_Rival',highParty));
  const directory=await client.opponents(me.token);
  // A viewer needs a snapshot before requesting a preview.
  await client.upload(me.token,snapshot('E2E_Player',highParty.map(c=>({...c,level:1})),0));
  const preview=upload.ok?await client.match(me.token,foe.playerId):null;
  check('v07-level-over-10-network-roundtrip',upload.ok&&directory.ok&&
    JSON.stringify(directory.value.opponents.find(row=>row.playerId===foe.playerId)?.party)===JSON.stringify(highParty)&&
    preview?.ok&&JSON.stringify(preview.value.opponent.party)===JSON.stringify(highParty),{upload,directory,preview});
  // Preserve the directory UI diagnostic even when the future high-level contract fails.
  if(!upload.ok)await client.upload(foe.token,snapshot('E2E_Rival',highParty.map(c=>({...c,level:1}))));
  for(let index=1;index<50;index++) {
    const name=index===1?'E2E_Second':`E2E_Foe${String(index+1).padStart(2,'0')}`;
    const opponent=await register(name);
    const result=await client.upload(opponent.token,snapshot(name,highParty,8*(index+1)));
    if(!result.ok)throw new Error(`50-player native fixture upload failed: ${name} ${JSON.stringify(result)}`);
  }
  let holdNextDirectory=false,pendingDirectory;
  for(const channel of [IPC.GET_IDENTITY,IPC.PVP_OPPONENTS,IPC.PVP_MATCH,IPC.THEFTS])ipcMain.removeHandler(channel);
  ipcMain.handle(IPC.GET_IDENTITY,()=>({name:'E2E_Player',playerId:me.playerId,online:true}));
  ipcMain.handle(IPC.PVP_OPPONENTS,()=>{
    if(!holdNextDirectory)return client.opponents(me.token);
    holdNextDirectory=false;
    return new Promise(done=>{pendingDirectory=async ()=>done(await client.opponents(me.token));});
  });
  ipcMain.handle(IPC.PVP_MATCH,(_event,payload)=>client.match(me.token,payload?.opponentId));
  ipcMain.handle(IPC.THEFTS,()=>Promise.resolve({ok:true,value:{thefts:[],removed:[]}}));
  await menu.loadFile(resolve(ROOT,'static/menu.html'));await pause(200);await click(menu,'#tab-battle');
  await until(async ()=>await evaluate(menu,"document.querySelectorAll('#opponents .opponent-card').length===50"),'fifty selectable opponents');
  const readRows=()=>evaluate(menu,`Array.from(document.querySelectorAll('#opponents .opponent-card')).map(row=>{
    const canvas=row.querySelector('.hero-art');const pixels=canvas?.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    return {id:row.dataset.playerId,text:row.innerText,rankName:row.querySelector(':scope > .name')?.textContent,
      record:row.querySelector('.record')?.textContent,party:row.querySelectorAll('.party .mini').length,
      partyNames:Array.from(row.querySelectorAll('.party .name')).map(el=>el.textContent),
      heroLabel:canvas?.getAttribute('aria-label'),paintedHero:pixels?Array.from(pixels).some((v,i)=>i%4===3&&v>0):false,
      button:!!row.querySelector('button:not(:disabled)')};
  })`);
  const rows=await readRows();
  check('v07-pvp-party-in-every-row',rows.length===50&&new Set(rows.map(row=>row.id)).size===50&&
    rows.every(row=>row.paintedHero&&row.heroLabel&&!row.heroLabel.includes('실루엣')&&row.button&&row.party===5&&
      /^#\d+ E2E_/.test(row.rankName)&&row.record==='0승 0패'&&row.partyNames.some(name=>name.includes(String(Number.MAX_SAFE_INTEGER))))&&
    rows.some(row=>row.text.includes('E2E_Rival')&&row.partyNames.some(name=>name.includes(String(Number.MAX_SAFE_INTEGER)))),rows);

  // Real Chromium default keyboard behavior. No DOM click/focus or synthetic KeyboardEvent.
  await evaluate(menu,`window.__v07KeyboardTrace=[];
    for(const type of ['keydown','keypress','keyup','click','focusin'])document.addEventListener(type,event=>{
      const target=event.target;window.__v07KeyboardTrace.push({type:event.type,key:event.key??null,code:event.code??null,
        charCode:event.charCode??null,isTrusted:event.isTrusted,control:target?.id??null,
        playerId:target?.closest?.('[data-player-id]')?.dataset.playerId??null,
        activeId:document.activeElement?.closest('[data-player-id]')?.dataset.playerId??null});
      if(window.__v07KeyboardTrace.length>500)window.__v07KeyboardTrace.shift();
    },{capture:true,passive:true});true;`);
  const inputTrace=[];
  const focus=()=>evaluate(menu,`({control:document.activeElement?.id??null,
    playerId:document.activeElement?.closest('[data-player-id]')?.dataset.playerId??null,tag:document.activeElement?.tagName??null,
    text:document.activeElement?.textContent?.slice(0,160)??null,tabIndex:document.activeElement?.tabIndex??null,
    disabled:document.activeElement?.disabled??null,ariaDisabled:document.activeElement?.getAttribute('aria-disabled')??null,
    documentFocused:document.hasFocus()})`);
  const key=async (keyCode,modifiers=[])=>{
    const entry={keyCode,modifiers,events:nativeKeyEvents(keyCode,modifiers),before:await focus(),windowFocused:menu.isFocused()};
    inputTrace.push(entry);
    menu.focus();
    for(const event of entry.events)await menu.webContents.sendInputEvent(event);
    await pause(40);
    entry.after=await focus();
  };
  const selection=()=>evaluate(menu,`(() => {
    const row=document.querySelector('#opponents .opponent-card.selected');const button=row?.querySelector('button');
    return {playerId:row?.dataset.playerId??null,pressed:button?.getAttribute('aria-pressed')??null,
      busy:button?.getAttribute('aria-disabled')??null,preview:document.querySelector('#opponent').innerText};
  })()`);
  const selections=[];
  const selectWith=async (method,id,activate)=>{
    const requestStart=calls.length;
    const before=await focus();
    try {
      await activate();
      await until(()=>responses.some(response=>response.requestIndex>=requestStart),'native selected preview response');
      await until(async ()=>{const view=await selection();return view.playerId===id&&view.pressed==='true'&&view.busy==='false';},'native selected row ready');
      const response=responses.filter(response=>response.requestIndex>=requestStart).at(-1);
      selections.push({method,expectedPlayerId:id,request:calls[response.requestIndex],response,dom:await selection(),focus:await focus()});
    } catch(error) {
      const details={method,expectedPlayerId:id,error:String(error),before,after:await focus(),windowFocused:menu.isFocused(),
        requestStart,requests:calls.slice(requestStart),requestTail:calls.slice(-5),responses:responses.slice(-5),
        selection:await selection(),inputTrace,domEvents:await evaluate(menu,'window.__v07KeyboardTrace'),rows:(await readRows()).slice(0,3)};
      check('v07-pvp-native-input-failure',false,details);
      await screenshot(menu,'v07-pvp-native-input-failure');
      throw error;
    }
  };
  await click(menu,'#find');
  await until(async ()=>await evaluate(menu,"document.querySelector('#find').getAttribute('aria-disabled')==='false'"),'directory refreshed before keyboard');
  await key('Tab');const firstFocus=await focus();
  await key('Tab');const secondFocus=await focus();
  await key('Tab',['shift']);const previousFocus=await focus();
  await selectWith('Enter',rows[0].id,()=>key('Enter'));
  await key('Tab');
  await selectWith('Space',rows[1].id,()=>key('Space'));
  const domEvents=await evaluate(menu,'window.__v07KeyboardTrace');
  check('v07-pvp-keyboard-navigation',firstFocus.playerId===rows[0].id&&secondFocus.playerId===rows[1].id&&
    previousFocus.playerId===rows[0].id&&selections.every(entry=>entry.focus.playerId===entry.expectedPlayerId)&&
    domEvents.some(event=>event.type==='keypress'&&event.isTrusted&&event.charCode===13&&event.playerId===rows[0].id)&&
    domEvents.some(event=>event.type==='keypress'&&event.isTrusted&&event.charCode===32&&event.playerId===rows[1].id),
    {driver:'webContents.sendInputEvent keyDown/char/keyUp',firstFocus,secondFocus,previousFocus,selections:[...selections],inputTrace:[...inputTrace],domEvents});

  // Store DOM references only as diagnostic observations; never mutate game or focus through JS.
  await evaluate(menu,`window.__v07PvpProbe={button:document.activeElement,
    rows:Array.from(document.querySelectorAll('#opponents .opponent-card')).map(row=>({id:row.dataset.playerId,node:row})),stateChanges:0};
    window.desmon.onStateChanged(()=>{window.__v07PvpProbe.stateChanges++;});true;`);
  const retained=()=>evaluate(menu,`({sameButton:window.__v07PvpProbe.button===document.activeElement,
    sameRows:window.__v07PvpProbe.rows.every(({id,node})=>document.querySelector('[data-player-id="'+id+'"]')===node),
    stateChanges:window.__v07PvpProbe.stateChanges,playerId:document.activeElement?.closest('[data-player-id]')?.dataset.playerId??null})`);
  const waitStarted=Date.now();await pause(5200);
  const afterSave=await retained();
  const refreshWithRowFocused=async (id,change)=>{
    holdNextDirectory=true;await click(menu,'#find');
    await until(()=>typeof pendingDirectory==='function','held diagnostic directory request');
    const current=await readRows();const index=current.findIndex(row=>row.id===id);
    if(index<0)throw new Error('Focus target absent before diagnostic refresh');
    for(let step=0;step<=index;step++)await key('Tab');
    const before=await focus();
    await change();
    const release=pendingDirectory;pendingDirectory=undefined;await release();
    await until(async ()=>await evaluate(menu,"document.querySelector('#find').getAttribute('aria-disabled')==='false'"),'held directory response rendered');
    return {before,after:await focus()};
  };
  const reorder=await refreshWithRowFocused(rows[1].id,async ()=>{
    const result=await client.upload(foe.token,snapshot('E2E_Rival',highParty,9998));
    if(!result.ok)throw new Error('Diagnostic reorder upload failed');
  });
  const afterRefresh=await retained();
  check('v07-pvp-focus-retained',Date.now()-waitStarted>=5200&&afterSave.stateChanges>0&&afterSave.sameButton&&afterSave.sameRows&&
    reorder.before.playerId===rows[1].id&&reorder.after.playerId===rows[1].id&&afterRefresh.sameButton&&afterRefresh.sameRows,
    {elapsedMs:Date.now()-waitStarted,afterSave,reorder,afterRefresh,refreshFixture:'response held while native Tab restores target focus; actual server score reorder'});
  await screenshot(menu,'v07-pvp-selected-list');

  // A 51st higher-ranked opponent removes the selected lowest row via the real 50-row API cap.
  // This is directory removal, not a claim that a production account was deleted.
  const lowest=(await readRows()).at(-1);
  await selectWith('mouse',lowest.id,()=>click(menu,`#opponents [data-player-id="${lowest.id}"] button`));
  const removal=await refreshWithRowFocused(lowest.id,async ()=>{
    const replacement=await register('E2E_NewTop');
    const result=await client.upload(replacement.token,snapshot('E2E_NewTop',highParty,9999));
    if(!result.ok)throw new Error('Diagnostic directory replacement failed');
  });
  const afterRemoval=await evaluate(menu,`({ids:Array.from(document.querySelectorAll('#opponents .opponent-card')).map(row=>row.dataset.playerId),
    selected:document.querySelectorAll('#opponents .opponent-card.selected').length,
    previewParty:document.querySelectorAll('#opponent .mini').length,battleDisabled:document.querySelector('#battle-go').disabled,
    note:document.querySelector('#opponent').innerText})`);
  check('v07-pvp-removed-row-focus-fallback',removal.before.playerId===lowest.id&&removal.after.control==='find'&&
    afterRemoval.ids.length===50&&!afterRemoval.ids.includes(lowest.id)&&afterRemoval.selected===0&&afterRemoval.previewParty===0&&afterRemoval.battleDisabled,
    {fixture:'51st higher-ranked server snapshot removes lowest directory row',removedPlayerId:lowest.id,removal,afterRemoval});
  check('v07-pvp-selected-id',selections.length===3&&selections.every(entry=>entry.request?.body?.opponentId===entry.expectedPlayerId),{selections});
  check('v07-pvp-preview-id-roundtrip',selections.length===3&&selections.every(entry=>entry.request?.body?.opponentId===entry.expectedPlayerId&&
    entry.response.playerId===entry.expectedPlayerId&&entry.response.status===200&&entry.response.bot===false&&typeof entry.response.matchId==='string'&&
    entry.dom.playerId===entry.expectedPlayerId&&entry.dom.pressed==='true'&&entry.dom.busy==='false'),{selections});
  await screenshot(menu,'v07-pvp-removed-row-fallback');
};
module.exports.createMockPvp=createMockPvp;
module.exports.nativeKeyEvents=nativeKeyEvents;
