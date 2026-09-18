import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
export async function until(fn, label, ms = 20000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { const value = await fn(); if (value) return value; await sleep(40); }
  throw Error('Timeout: ' + label);
}
const observe = `(() => {
  const copy = value => JSON.parse(JSON.stringify(value,(_,v)=>typeof v==='bigint'?String(v):v));
  const motions=[];
  const record=()=>{motions.push({...game.getHeroAnim(),replaying:game.isReplaying(),at:performance.now()});if(motions.length>3000)motions.shift();requestAnimationFrame(record);};record();
  globalThis.__v010Read=()=>copy({save:game.toSave(),state:game.getState(),animation:game.getHeroAnim(),motions,replaying:game.isReplaying(),paused,generation});
  return true;
})()`;
export async function controls(runtime) {
  const main = expression => runtime.evaluate(`(()=>{const p=__v010Runtime;return (${expression});})()`);
  const field = expression => main(`p.field.webContents.executeJavaScript(${JSON.stringify(expression)})`);
  const menu = expression => main(`p.menu.webContents.executeJavaScript(${JSON.stringify(expression)})`);
  await main(`(async()=>{
    const d=p.field.webContents.debugger,lines=p.fs.readFileSync(p.e.app.getAppPath()+'/dist/web/renderer/index.js','utf8').split(String.fromCharCode(10));
    const lineNumber=lines.findIndex(line=>line.trim()==='game.draw(ctx);');if(lineNumber<0)throw Error('No frame call');
    d.attach('1.3');await d.sendCommand('Debugger.enable');
    return new Promise((resolve,reject)=>{let breakpointId;const timer=setTimeout(()=>{d.detach();reject(Error('Observer timeout'));},10000);
      const listener=async(_event,method,params)=>{if(method!=='Debugger.paused')return;try{
        const value=await d.sendCommand('Debugger.evaluateOnCallFrame',{callFrameId:params.callFrames[0].callFrameId,expression:${JSON.stringify(observe)},returnByValue:true});
        if(value.exceptionDetails)throw Error(JSON.stringify(value.exceptionDetails));
        await d.sendCommand('Debugger.removeBreakpoint',{breakpointId});await d.sendCommand('Debugger.resume');clearTimeout(timer);d.removeListener('message',listener);d.detach();resolve(true);
      }catch(error){clearTimeout(timer);d.removeListener('message',listener);d.detach();reject(error);}};
      d.on('message',listener);d.sendCommand('Debugger.setBreakpointByUrl',{urlRegex:'/dist/web/renderer/index[.]js$',lineNumber}).then(result=>breakpointId=result.breakpointId,reject);
    });
  })()`);
  const read = () => field('globalThis.__v010Read()');
  const openMenu = async () => {
    await main(`(()=>{p.menu=p.require(p.e.app.getAppPath()+'/dist/electron/main/menuWindow.js').showMenuWindow();return true;})()`);
    await until(() => main('!p.menu.webContents.isLoading()'), 'menu load');
    await until(() => menu(`document.querySelector('#game-content')?.hidden===false`), 'menu ready');
  };
  const click = async selector => {
    const point = await menu(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el||el.disabled)throw Error('Missing/disabled '+${JSON.stringify(selector)});
      el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};})()`);
    await main(`(()=>{p.menu.focus();for(const type of ['mouseDown','mouseUp'])p.menu.webContents.sendInputEvent({type,button:'left',clickCount:1,...${JSON.stringify(point)}});return true;})()`);
    if (selector.startsWith('#tab-')) await until(() => menu(`document.querySelector(${JSON.stringify(selector)})?.getAttribute('aria-selected')==='true'`), 'selected '+selector);
    // sendInputEvent queues native events; capture only after their rendered frame.
    await menu(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
  };
  const input = () => main(`(()=>{p.field.focus();p.field.webContents.sendInputEvent({type:'keyDown',keyCode:'A'});p.field.webContents.sendInputEvent({type:'keyUp',keyCode:'A'});return true;})()`);
  const capture = async (name, target = 'field') => {
    const bytes = Buffer.from(await main(`(async()=>(await p.${target}.webContents.capturePage()).toPNG().toString('base64'))()`), 'base64');
    const path=join(runtime.outputDir,name+'.png');writeFileSync(path,bytes);return {name,path,sha256:createHash('sha256').update(bytes).digest('hex')};
  };
  return {main,field,menu,read,openMenu,click,input,capture};
}
export async function motionCases(runtime, family) {
  const ui=await controls(runtime),result={family,checks:[],screenshots:[],passed:false};
  for(const hz of [1,5,10,20]) {
    const before=await ui.read(),start=performance.now(),duration=2000,count=hz*2;
    for(let i=0;i<count;i++){await ui.input();await sleep(Math.max(0,start+(i+1)*1000/hz-performance.now()));}
    await sleep(80);const after=await ui.read();
    const motions=after.motions.filter(m=>m.at>before.motions.at(-1).at);
    const check={hz,inputs:count,beforeHp:before.save.monsterHp,afterHp:after.save.monsterHp,
      maxPhase:Math.max(...motions.filter(m=>m.state==='attack').map(m=>m.t)),passed:false};
    check.passed=BigInt(after.save.monsterHp)<BigInt(before.save.monsterHp)&&check.maxPhase>=120;
    result.checks.push(check);if(!check.passed)throw Error('Motion/input failed '+family+'/'+hz);
    result.screenshots.push(await ui.capture(`${family}-${hz}hz`));
  }
  await sleep(450);result.settled=(await ui.read()).animation.state==='idle';
  result.passed=result.settled&&result.checks.every(check=>check.passed);return result;
}
export async function equipmentCases(runtime) {
  const ui=await controls(runtime),result={checks:[],screenshots:[],passed:false};
  const check=(name,passed,details={})=>{result.checks.push({name,passed:!!passed,details});if(!passed)throw Error(name);};
  await ui.openMenu();await ui.click('#tab-inventory');
  const initial=await ui.read();
  check('four-accessory-copies',initial.save.equipment.loadout.accessories.length===4&&new Set(initial.save.equipment.loadout.accessories.map(i=>i.id)).size===4);
  result.screenshots.push(await ui.capture('inventory-before','menu'));
  // Production menu → main validation → one live frame. Synthetic fixtures only.
  await ui.menu(`window.desmon.sendAction({type:'heroEquip',formId:'h02'})`);
  const overflow=await until(async()=>{const v=await ui.read();return v.save.hero.equipped.formId==='h02'&&v.save.equipment.temporary.length>=4?v:null;},'hero overflow');
  check('all-incompatible-items-temporary',overflow.save.equipment.temporary.length===5,{ids:overflow.save.equipment.temporary.map(i=>i.id)});
  await ui.main('p.dialogAnswers.push(0)');
  await ui.menu(`window.desmon.sendAction({type:'heroEquip',formId:'h01'})`);await sleep(100);
  const canceled=await ui.read();check('warning-cancel-preserves-items',canceled.save.hero.equipped.formId==='h02'&&JSON.stringify(canceled.save.equipment.temporary)===JSON.stringify(overflow.save.equipment.temporary));
  await ui.click('#tab-inventory');await ui.click('.equipment-sell');
  await until(async()=>(await ui.read()).save.equipment.bag.length===0,'bag sale');
  await ui.click('.equipment-move');
  await until(async()=>(await ui.read()).save.equipment.bag.length===1,'temporary move');
  const beforeEnhance=await ui.read();await ui.menu(`document.querySelector('.equipment-enhance-preview').open=true`);await ui.click('.equipment-enhance');
  const enhanced=await until(async()=>{const v=await ui.read();return v.save.equipment.bag[0]?.enhancement==='1'?v:null;},'enhancement');
  check('enhancement-and-wallet',BigInt(enhanced.save.coins)<BigInt(beforeEnhance.save.coins));
  result.screenshots.push(await ui.capture('inventory-temporary','menu'));
  await ui.main('p.dialogAnswers.push(1)');await ui.menu(`window.desmon.sendAction({type:'heroEquip',formId:'h01'})`);
  const changed=await until(async()=>{const v=await ui.read();return v.save.hero.equipped.formId==='h01'?v:null;},'confirmed hero change');
  const old=new Set(enhanced.save.equipment.temporary.map(i=>i.id));
  const all=[changed.save.equipment.loadout.weapon,...changed.save.equipment.loadout.accessories,...changed.save.equipment.bag,...changed.save.equipment.temporary].filter(Boolean);
  check('confirmed-loss-exact',old.size>0&&all.every(i=>!old.has(i.id)));
  await ui.click('#tab-shop');
  const offer=await ui.menu(`(()=>{const cards=[...document.querySelectorAll('.equipment-card')];return cards.find(c=>c.querySelector('.equipment-buy')&&!c.querySelector('.equipment-buy').disabled)?.dataset.itemId;})()`);
  check('hourly-stock-and-affordable-offer',!!offer&&await ui.menu(`document.querySelector('.equipment-countdown').textContent.includes('1시간마다')`));
  const beforePurchase=await ui.read();await ui.click(`[data-item-id="${offer}"] .equipment-buy`);
  const purchased=await until(async()=>{const v=await ui.read();return v.save.equipment.shop.boughtIds.includes(offer)?v:null;},'shop purchase');
  check('shop-purchase-saved-once',BigInt(purchased.save.coins)<BigInt(beforePurchase.save.coins));
  result.screenshots.push(await ui.capture('shop','menu'));
  await ui.click('#tab-codex');await ui.click('.codex-monsters');
  check('epic-loot-visible',await ui.menu(`document.querySelectorAll('.legendary-loot').length>=56`));
  result.screenshots.push(await ui.capture('epic-codex','menu'));
  result.expectedOnRestart=(await ui.read()).save;
  result.passed=result.checks.every(c=>c.passed);return result;
}
