// Destructive only inside an explicitly named, disposable local database.
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url), {Pool}=require('pg');
const {PgStore}=require('../../dist/electron/server/pgStore.js');
const {createApp,matches}=require('../../dist/electron/server/app.js');
const {MemoryStore}=require('../../dist/electron/server/store.js');
const [url,output]=process.argv.slice(2), parsed=new URL(url);
if(!['127.0.0.1','localhost'].includes(parsed.hostname)||parsed.pathname!=='/desmon_v09')throw Error('Disposable local desmon_v09 database required');
const pool=new Pool({connectionString:url}), checks=[];
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const member=n=>({id:'c'+n,speciesId:'slime',bossIndex:7,level:1,stars:0});
const snap=(n,level)=>({name:'Fixture'+n,...(level===undefined?{}:{level}),bestIndex:n%2,rebirths:n%3,companions:[member(1)],party:['c1']});
try{
  await pool.query('DROP TABLE IF EXISTS players CASCADE');
  // Exactly the surviving v3 schema, before the new columns/trigger exist.
  await pool.query(`CREATE TABLE players(id uuid PRIMARY KEY, token_hash text UNIQUE NOT NULL,nickname text NOT NULL,snapshot jsonb,best_index integer DEFAULT 0 NOT NULL,rebirths integer DEFAULT 0 NOT NULL,stolen_ids jsonb DEFAULT '[]' NOT NULL,last_pvp_at double precision,updated_at timestamptz DEFAULT now() NOT NULL,thefts jsonb DEFAULT '[]' NOT NULL,wins integer DEFAULT 0 NOT NULL,losses integer DEFAULT 0 NOT NULL)`);
  await pool.query('INSERT INTO players(id,token_hash,nickname,snapshot,stolen_ids) VALUES($1,$2,$3,$4,$5)',[id(99),'legacy','Legacy',snap(99,10),JSON.stringify(['c1'])]);
  const pg=await PgStore.connect(url), memory=new MemoryStore();
  assert.deepEqual((await pg.getById(id(99))).revokedIds,['c1']);
  assert.deepEqual((await pg.getById(id(99))).snapshot.companions,[]);checks.push('legacy schema migration/backfill filters revoked companion');
  await pool.query('DELETE FROM players WHERE id=$1',[id(99)]);
  for(let n=1;n<=4;n++)for(const store of [pg,memory]){
    await store.createPlayer({id:id(n),tokenHash:'token'+n,name:'Fixture'+n});
    await store.putSnapshot(id(n),snap(n,n===4?undefined:n===3?Number.MAX_SAFE_INTEGER:40));
  }
  for(const store of [pg,memory])await store.recordBattle(id(2),id(3));
  for(const metric of [undefined,'level','pvpWins','bestIndex','rebirths']){
    const normalize=rows=>rows.map(r=>({id:r.id,snapshot:r.snapshot,wins:r.wins,losses:r.losses}));
    assert.deepEqual(normalize(await pg.top(10,metric)),normalize(await memory.top(10,metric)));
    for(let n=1;n<=4;n++){const r=await memory.getById(id(n));const key={...r.snapshot,wins:r.wins};assert.equal(await pg.rank(key,metric),await memory.rank(key,metric));}
  }
  checks.push('all four metrics and legacy default match MemoryStore including ties/huge level/legacy missing level/defense loss');
  for(let n=1;n<=40;n++)await pg.setStolenIds(id(1),Array.from({length:Math.min(n,32)},(_,i)=>'c'+(n-i)));
  await pool.query('UPDATE players SET stolen_ids=$2,snapshot=$3 WHERE id=$1',[id(1),'[]',{...snap(1,40),companions:Array.from({length:40},(_,i)=>member(i+1)),party:['c1','c40']}]);
  const restored=await pg.getById(id(1));assert.equal(restored.revokedIds.length,40);assert.deepEqual(restored.snapshot.companions,[]);assert.deepEqual(restored.snapshot.party,[]);
  checks.push('40 removals survive legacy truncation and direct old-service snapshot overwrite');
  const serial1=await pg.transaction(s=>s.allocateTransferId(id(1),'s'));
  await pool.query('UPDATE players SET transfer_high_water=0,stolen_ids=$2 WHERE id=$1',[id(1),'[]']);
  const serial2=await pg.transaction(s=>s.allocateTransferId(id(1),'s'));
  assert.ok(Number(serial2.slice(1))>Number(serial1.slice(1)));
  await assert.rejects(pg.transaction(async s=>{await s.allocateTransferId(id(1),'s');await s.setLastPvpAt(id(1),123);throw Error('rollback');}));
  const serial3=await pg.transaction(s=>s.allocateTransferId(id(1),'r'));assert.equal(Number(serial3.slice(1)),Number(serial2.slice(1))+1);
  assert.equal((await pg.getById(id(1))).lastPvpAt,null);checks.push('durable serial ignores rewind and transaction rollback restores all writes');
  await pool.query('UPDATE players SET token_hash=$2 WHERE id=$1',[id(2),createHash('sha256').update('fixture-auth').digest('hex')]);
  const deps={store:pg,now:()=>1000,randomUUID:()=>id(80),randomBytesHex:n=>'8'.padStart(n*2,'0'),randomSeed:()=>7};
  let app=createApp(deps);
  const call=(path,body)=>app.handle({method:body?'POST':'GET',path,body:body??null,query:{},auth:'fixture-auth',ip:'fixture'});
  const match=await call('/v1/pvp/match',{opponentId:id(3)});assert.equal(match.status,200);
  const battle=await call('/v1/pvp',{matchId:match.body.matchId,party:['c1']});assert.equal(battle.status,200);
  const after=await pg.getById(id(2));matches.clear();app=createApp(deps);
  assert.deepEqual(await call('/v1/pvp',{matchId:match.body.matchId,party:['c1']}),battle);
  assert.deepEqual(await pg.getById(id(2)),after);
  const me=await call('/v1/me');assert.equal(me.status,200);assert.equal(me.body.version,9);assert.deepEqual(me.body.lastMatch.result,battle.body);
  checks.push('actual HTTP handler commits and retries PostgreSQL battle receipt after server restart exactly once');
  const again=await PgStore.connect(url);assert.deepEqual((await again.getById(id(1))).revokedIds,restored.revokedIds);checks.push('second migration is idempotent');
  const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
  writeFileSync(output,JSON.stringify({version:9,passed:true,at:new Date().toISOString(),database:(await pool.query('SHOW server_version')).rows[0].server_version,checks,sourceHashes:Object.fromEntries(['src/server/pgStore.ts','src/server/store.ts','src/server/app.ts','dist/electron/server/pgStore.js','.harness/v9/postgres-check.mjs'].map(p=>[p,hash(p)]))},null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({passed:true,checks}));
  await again.pool.end();await pg.pool.end();
}catch(error){console.error(error);process.exitCode=1;}finally{await pool.end();}
