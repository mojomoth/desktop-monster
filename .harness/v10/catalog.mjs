#!/usr/bin/env node
// Generate the public catalog from production TypeScript, never from a copied table.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import ts from 'typescript';
const root=process.cwd(),require=createRequire(import.meta.url),temporary=mkdtempSync(join(tmpdir(),'desmon-catalog-'));
const hash=data=>createHash('sha256').update(data).digest('hex');
try {
  const sourceFiles=readdirSync(resolve(root,'src/core')).filter(file=>file.endsWith('.ts')).sort();
  for(const file of sourceFiles){const source=readFileSync(resolve(root,'src/core',file),'utf8');writeFileSync(resolve(temporary,file.replace(/\.ts$/,'.js')),ts.transpileModule(source,{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,strict:true}}).outputText);}
  const c=require(resolve(temporary,'index.js'));
  const heroes=['h00',...c.HERO_FORMS.map(h=>h.id)];
  const catalog={version:'0.10.0',generatedBy:'node .harness/v10/catalog.mjs generate',
    sourceHashes:Object.fromEntries(['equipment.ts','hero.ts','discovery.ts','progression.ts'].map(file=>[file,hash(readFileSync(resolve(root,'src/core',file)))])),
    formulas:{displayedAttack:'floor(trainedBase × (10000 + weaponBps) × (10000 + sum(accessoryBps)) / 100000000)',
      enhancedPrimary:'floor(templateBaseBps × rollPercent × (10 + enhancement) / 1000)',
      enhanceCost:'template.enhanceBase × 2^existingEnhancement',safeThrough:5,
      riskySuccess:`${c.EQUIPMENT_BALANCE.successK} / (${c.EQUIPMENT_BALANCE.successK} + targetEnhancement - 5)`,
      expansionPrice:'expansionBase × 2^previousExpansions',shopRefreshMs:c.EQUIPMENT_BALANCE.shopRefreshMs},
    balance:c.EQUIPMENT_BALANCE,legendaryBosses:c.EPIC_BOSSES,
    items:c.EQUIPMENT_CATALOG.map(def=>({...def,attackUnit:def.kind==='weapon'?'percent':'basis-points',
      compatibleHeroIds:heroes.filter(formId=>c.canEquip({id:'e1',templateId:def.id,enhancement:'0',roll:100,seed:1,attempts:'0'},formId,def.requiredLevel)),
      acquisition:def.rarity==='epic'?{shop:false,bossOnly:true,legendaryBossId:def.epicBossId,bossAnyEpicDropChanceBps:c.EQUIPMENT_BALANCE.epicDropBps,lootTableSize:c.epicLootForBoss(def.epicBossId).length,conditionalTemplateProbability:{numerator:c.EQUIPMENT_BALANCE.epicDropBps,denominator:10000*c.epicLootForBoss(def.epicBossId).length}}
        :{shop:true,bossOnly:true,bossEquipmentChanceBps:c.EQUIPMENT_BALANCE.bossDropBps,rarityWeight:({common:60,uncommon:32,rare:8})[def.rarity],pool:'uniform within rarity and requiredLevel <= max(5,currentLevel+5)'}}))};
  assert.equal(catalog.items.length,224);assert.equal(new Set(catalog.items.map(i=>i.id)).size,224);
  const tiers=c.EQUIPMENT_BALANCE.requiredLevels,rarities=c.EQUIPMENT_RARITIES;
  const body=['# DesMon 0.10.0 equipment catalog','','Generated from production TypeScript. The complete 224 names, powers, prices, class compatibility and acquisition sources are in [EQUIPMENT_CATALOG.json](EQUIPMENT_CATALOG.json).',
    '', 'There are 128 weapons (8 families × 4 rarities × 4 current-level requirements) and 96 accessories (3 shapes × 2 secondary effects × 4 rarities × 4 variants). Equipped slots are one weapon and four generic accessories. Each duplicate copy has a distinct UID.',
    '', '| Rarity | Base buy price | Weapon bonus at required level '+tiers.join(' / ')+' |', '|---|---:|---|',
    ...rarities.map((rarity,index)=>`| ${rarity} | ${rarity==='epic'?'Boss only':c.EQUIPMENT_BALANCE.prices[index]+'G × tier multiplier'} | ${c.EQUIPMENT_BALANCE.weaponAttack.map(n=>n*c.EQUIPMENT_BALANCE.rarityPower[index]+'%').join(' / ')} |`),
    '', 'Tier price multipliers are 1/2/4/8. Rolls are 90–110%. Accessories add their primary attack basis points together; their four variants use 1/2/3/4 times the accessory base. h00 accepts every family but must still meet the current-level requirement. Other forms use the explicit compatibility list in JSON.',
    '', 'Regenerate after numerical or compatibility changes:', '', '```sh', 'node .harness/v10/catalog.mjs generate', 'node .harness/v10/catalog.mjs verify', '```', '', 'The verifier recompiles current core, recomputes all 224 entries and checks both artifacts byte-for-byte. It does not trust stale dist output.'];
  const outputs={'docs/v0.10/EQUIPMENT_CATALOG.json':JSON.stringify(catalog,null,2)+'\n','docs/v0.10/CATALOG.md':body.join('\n')+'\n'};
  const mode=process.argv[2];assert(['generate','verify'].includes(mode),'Usage: catalog.mjs generate|verify');
  for(const [file,text] of Object.entries(outputs)){if(mode==='generate')writeFileSync(resolve(root,file),text);else assert.equal(readFileSync(resolve(root,file),'utf8'),text,'Stale generated catalog '+file);}
  console.log(JSON.stringify({passed:true,mode,items:catalog.items.length,weapons:catalog.items.filter(i=>i.kind==='weapon').length,accessories:catalog.items.filter(i=>i.kind==='accessory').length}));
} finally {rmSync(temporary,{recursive:true,force:true});}
