// Run from any directory: node tests/enemy-dogs.cjs
// Deterministic logic checks with collision/render stubs; not a browser test.
const path=require('path');const root=path.resolve(__dirname,'..');
const fs=require('fs'),vm=require('vm'),assert=require('assert'),{performance}=require('perf_hooks');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function fn(name){const start=html.indexOf('function '+name+'(');assert(start>=0,name);const end=html.indexOf('\n}',start);return html.slice(start,end+2)}
const c={R:Math.random,performance,console,Math,WW:960,WH:12800,W:840,H:720,cam:0,camX:0,skill:'hound',debugMode:2,scoreStats:{foundEntries:0},commanderRallying:false,commanderSignals:[],humans:[],p:{x:700,y:300,dig:5},hound:{x:10,y:10,col:'#222222',state:'lost',face:0,stun:0},
D:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),missionSpot:(x,y)=>({x,y}),hitsC:()=>false,patrolLineClear:()=>true,inSlowTerrainAt:()=>false,inWaterAt:()=>false,
sfx:()=>{},burst:()=>{},humanMemory:()=>5,targetObj:()=>c.p,foundModePause:()=>.5,enemyModePaused:()=>{},cancelPatrolChat:()=>{},commanderWhistle:()=>{if(!c.commanderRallying)c.commanderSignals.push({})},mv:(h,x,y)=>{if(c.dogHandlerStepAllowed(h,h.x+x,h.y+y)){h.x+=x;h.y+=y}},houndTrailTarget:()=>({x:10,y:10}),stunHound:n=>{c.hound.stun=n;},g:new Proxy({globalAlpha:1},{get:(t,p)=>p in t?t[p]:(()=>{}),set:(t,p,v)=>(t[p]=v,true)})};
vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(root,'js/enemy-dogs.js'),'utf8')+'\n'+fn('houndTryStep')+'\n'+fn('drawHound')+'\n'+fn('enterHumanFound')+'\n'+html.split('\n').find(l=>l.startsWith('function stunHoundAtBlast(')),c);
const run=s=>vm.runInContext(s,c);
run('spawnEnemyDogs()');assert.equal(run('enemyDogs.length'),2);assert(run('enemyDogs.every(d=>D(d,d.handler)>=50&&D(d,d.handler)<=200)'));
run("var d=enemyDogs[0],h=d.handler;Object.assign(h,{x:300,y:300});Object.assign(d,{x:400,y:300});enemyDogs=[d];p.x=701;updateEnemyDogs(.016)");assert.equal(run('d.state'),'patrol');
run('d.x=400;d.y=300;p.x=700;updateEnemyDogs(.016)');assert.equal(run('d.state'),'chase');
run('var max=0,min=999;for(var i=0;i<200;i++){updateEnemyDogs(.016);max=Math.max(max,D(d,h));min=Math.min(min,D(d,h));}');assert(run('h.x>300'));assert(run('max<=200&&min>=50'));console.log('PASS two spawns, 300px boundary/stealth bypass, pursuit/pull/leash');
run("Object.assign(d,{x:650,y:300,barkCooldown:0});Object.assign(h,{x:550,y:300,st:0});var near={x:1150,y:300,alive:true,st:0},far={x:1150.01,y:300,alive:true,st:0};humans=[h,near,far];updateEnemyDogs(.001)");assert.equal(run('d.barkT'),.9);assert.equal(run('h.st'),1);assert.equal(run('near.st'),1);assert.equal(run('far.st'),0);assert.equal(c.commanderSignals.length,0);
run('near.st=0;updateEnemyDogs(.1)');assert.equal(run('near.st'),0);console.log('PASS 50px bark, 500px boundary, no commander cascade, cooldown');
run('stunHoundAtBlast(d.x,d.y,95)');assert.equal(run('d.stun'),5);assert.equal(run('d.barkT'),0);run('var before=d.x;updateEnemyDogs(1)');assert.equal(run('d.x'),run('before'));run('d.stun=0;h.alive=false;updateEnemyDogs(.016)');assert.equal(run('d.state'),'lost');assert.equal(run('d.handler'),null);
const own=c.hound;run('drawHound(d);drawHound();drawEnemyDogs();');assert.strictEqual(c.hound,own);console.log('PASS explosion stun/recovery state, orphan wandering, shared drawing preserves skill hound');
run('d.handler=h;h.alive=true;h.x=100;h.y=300;d.x=300;d.y=300;');assert.equal(run('dogHandlerStepAllowed(h,99,300)'),false);assert.equal(run('dogHandlerStepAllowed(h,101,300)'),true);
run('d.handler=null;d.state="lost"');let t=performance.now();run('for(var i=0;i<10000;i++)updateEnemyDogs(.016)');console.log('10000 one-dog updates:',(performance.now()-t).toFixed(1)+'ms');
for(const name of ['bombBlast','cannonImpact','airBombBlast'])assert(fn(name).includes('stunHoundAtBlast'),name);assert(fn('playerCannonGroundImpact').includes('cannonImpact'));assert(fn('explodeObject').includes('playerCannonGroundImpact'));assert(html.includes('spawnCommanderClasses();spawnEnemyDogs();'));console.log('PASS bomb/cannon/object explosion hooks and reset spawn hook');
