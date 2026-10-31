const {test}=require('node:test'),assert=require('node:assert/strict');
const mod=import('../server/worker.mjs');
const sample=(extra={})=>({name:'たんく01',stage:'beginner',skill:'throw',score:1234,rank:'B',titles:['v3_single_0'],debug:false,...extra});
function storageHarness(){
 const data=new Map();let tail=Promise.resolve();const tx={async get(k){return structuredClone(data.get(k));},async put(k,v){data.set(k,structuredClone(v));},async delete(k){data.delete(k);}};
 return {data,storage:{...tx,transaction(fn){const promise=tail.then(()=>fn(tx));tail=promise.catch(()=>{});return promise;}}};
}
test('scores validate allowed names, normal stages, skills, ranks and bounded data; debug and invalid input are rejected',async()=>{
 const {validateScore}=await mod;assert.equal(validateScore(sample()).name,'たんく01');assert.equal(validateScore(sample({stage:'decisive'})).stage,'decisive');assert.equal(validateScore(sample({name:'ＡＢ１２'})).name,'AB12');
 for(const extra of [{name:'<img>'},{name:'abcdefghijkl'},{stage:'frontOni'},{stage:'areaDebug'},{debug:true},{debug:undefined},{score:NaN},{score:-1},{score:1.1},{score:1e10},{rank:'Z'},{skill:'bad'},{titles:['<svg>']},{titles:Array(41).fill('v3_single_0')}])assert.equal(validateScore(sample(extra)),null,JSON.stringify(extra));
});
test('top thirty keep one best per player, preserve metadata at that score, and use earliest score for ties',async()=>{
 const {insertBest}=await mod;let rows=[];for(let i=0;i<50;i++)rows=insertBest(rows,{player:'p'+i,score:i,at:i,name:'name'+i});assert.equal(rows.length,30);assert.equal(rows[0].score,49);assert.equal(rows.at(-1).score,20);
 const same=insertBest(rows,{player:'p49',score:48,at:100,name:'renamed'});assert.equal(same,rows);assert.equal(same[0].name,'name49');rows=insertBest(rows,{player:'p49',score:70,at:101,name:'new'});assert.equal(rows[0].name,'new');assert.equal(rows.filter(v=>v.player==='p49').length,1);
 rows=insertBest(rows,{player:'new',score:70,at:102});assert.equal(rows[0].player,'p49');assert.equal(rows[1].player,'new');
});
test('durable storage atomically saves stage and overall boards, preserves stage-specific snapshots and survives recreation',async()=>{
 const {Scoreboard}=await mod,h=storageHarness(),board=new Scoreboard(h),id='12345678-1234-1234-1234-123456789012';
 const post=(player,entry)=>board.fetch(new Request('https://game.test/api/leaderboard',{method:'POST',body:JSON.stringify({player,entry})}));
 await Promise.all(Array.from({length:50},(_,i)=>post(i.toString(16).padStart(8,'0')+'-1234-1234-1234-123456789012',sample({score:100+i}))));assert.equal(h.data.get('board:overall').length,30);assert.equal(h.data.get('board:overall')[0].score,149);
 await post(id,sample({score:2000}));await post(id,sample({stage:'indoor',score:3000,skill:'sniper',titles:['v3_single_1_elite']}));await post(id,sample({score:500}));
 const revived=new Scoreboard(h);const all=await (await revived.fetch(new Request('https://game.test/api/leaderboard'))).json();assert.equal(all.entries[0].stage,'indoor');assert.equal(all.entries[0].skill,'sniper');assert.equal(all.entries[0].player,undefined);
 const stage=await (await revived.fetch(new Request('https://game.test/api/leaderboard?board=beginner'))).json();assert.equal(stage.entries[0].score,2000);assert.equal(stage.entries[0].skill,'throw');assert.equal((await revived.fetch(new Request('https://game.test/api/leaderboard?board=invalid'))).status,400);
});
test('worker routes static assets unchanged and rejects cross-origin, invalid or oversized uploads',async()=>{
 const {default:worker}=await mod;let calls=0;const env={ASSETS:{fetch:async()=>new Response('asset')},SCOREBOARD:{idFromName:()=>1,get:()=>({fetch:async()=>{calls++;return Response.json({ok:true});}})}};
 assert.equal(await (await worker.fetch(new Request('https://game.test/index.html'),env)).text(),'asset');
 const post=(body,origin='https://game.test')=>new Request('https://game.test/api/leaderboard',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body});
 assert.equal((await worker.fetch(post(JSON.stringify(sample()),'https://other.test'),env)).status,403);assert.equal((await worker.fetch(post('x'.repeat(5000)),env)).status,413);assert.equal((await worker.fetch(post('{'),env)).status,400);assert.equal(calls,0);
 const response=await worker.fetch(post(JSON.stringify(sample())),env);assert.equal(response.status,200);const cookie=response.headers.get('set-cookie');assert.match(cookie,/__Host-tankPlayer=/);assert.match(cookie,/HttpOnly; Secure; SameSite=Strict/);assert.equal(calls,1);
 assert.equal((await worker.fetch(new Request('https://game.test/api/nope'),env)).status,404);
});
test('submission response identifies actual changed top-30 boards and ranks, excluding unchanged or non-ranking scores',async()=>{
 const {Scoreboard}=await mod,h=storageHarness(),board=new Scoreboard(h),id='12345678-1234-1234-1234-123456789012';
 const post=async(player,entry)=>(await board.fetch(new Request('https://game.test/api/leaderboard',{method:'POST',body:JSON.stringify({player,entry})}))).json();
 const first=await post(id,sample({score:100}));assert.deepEqual(first.updated,[{board:'overall',position:1},{board:'beginner',position:1}]);assert.deepEqual((await post(id,sample({score:100}))).updated,[]);
 for(let i=0;i<30;i++)await post(i.toString(16).padStart(8,'0')+'-1234-1234-1234-123456789012',sample({score:200+i}));assert.deepEqual((await post(id,sample({score:150}))).updated,[]);
 const stageOnly=await post(id,sample({stage:'indoor',score:160}));assert.deepEqual(stageOnly.updated,[{board:'indoor',position:1}]);
});
test('developer reset is protected by server-issued sessions, wrong PINs fail and logout revokes permission',async()=>{
 const {Scoreboard}=await mod,h=storageHarness(),board=new Scoreboard(h),base='https://game.test/api/developer/';
 const call=async(path,body,cookie)=>board.fetch(new Request(base+path,{method:body===undefined?'GET':'POST',headers:cookie?{Cookie:cookie}:{},body:body===undefined?undefined:JSON.stringify(body)}));
 h.data.set('board:overall',[{score:123}]);h.data.set('board:beginner',[{score:123}]);
 assert.equal((await call('reset-scoreboard',{})).status,401);assert.equal(h.data.get('board:overall').length,1);assert.equal((await call('login',{pin:'1111'})).status,401);
 const login=await call('login',{pin:'5555'});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];assert.match(login.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Strict/);assert.equal((await (await call('session',undefined,cookie)).json()).active,true);
 assert.equal((await call('reset-scoreboard',{},cookie)).status,200);assert.equal(h.data.has('board:overall'),false);assert.equal(h.data.has('board:beginner'),false);assert.ok(h.data.has('developer:sessions:fixed-v1'));
 await call('logout',{},cookie);assert.equal((await call('reset-scoreboard',{},cookie)).status,401);assert.equal((await (await call('session',undefined,cookie)).json()).active,false);
});
test('developer login attempts are bounded and cookie-looking forgeries cannot reset the scoreboard',async()=>{
 const {Scoreboard}=await mod,h=storageHarness(),board=new Scoreboard(h),url='https://game.test/api/developer/';
 for(let i=0;i<8;i++)assert.equal((await board.fetch(new Request(url+'login',{method:'POST',body:JSON.stringify({pin:'0000'})}))).status,401);
 assert.equal((await board.fetch(new Request(url+'login',{method:'POST',body:JSON.stringify({pin:'5555'})}))).status,429);
 assert.equal((await board.fetch(new Request(url+'reset-scoreboard',{method:'POST',headers:{Cookie:'__Host-tankDeveloper='+'a'.repeat(64)},body:'{}'}))).status,401);
});


test('new official middle and laboratory stages have independent writable and readable boards',async()=>{
 const {Scoreboard,validateScore}=await mod,h=storageHarness(),board=new Scoreboard(h);
 for(const stage of ['baseIntermediate','frontIntermediate','indoorLab']){
  assert.equal(validateScore(sample({stage})).stage,stage);
  const post=await board.fetch(new Request('https://game.test/api/leaderboard',{method:'POST',body:JSON.stringify({player:'12345678-1234-1234-1234-123456789012',entry:sample({stage})})}));assert.equal(post.status,200);
  const result=await (await board.fetch(new Request('https://game.test/api/leaderboard?board='+stage))).json();assert.equal(result.entries[0].stage,stage);
 }
});
