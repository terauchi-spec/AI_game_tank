const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function harness(){
 let seed=3;const calls=[];
 const gm=new Proxy({}, {get:(o,k)=>o[k]||((...args)=>calls.push([k,...args])),set:(o,k,v)=>(o[k]=v,true)});
 const c={WW:960,WH:12800,W:480,H:800,TANK_HIT:28,cars:[],etanks:[],p:{x:480,y:10000,body:0},stageMode:'front',areaDebugEnabled:false,mission:{points:[],index:0,enemyRoster:[],enemyRosterIndex:0},humans:[],enemyDogs:[],allies:[],allySeq:0,covers:[],gm,
 R:()=>((seed=(seed*1664525+1013904223)>>>0)/2**32),D:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),hitsM:()=>false,hitsC:()=>false,inWaterAt:()=>false,inBase:()=>false,patrolLineClear:()=>true,missionSpot:(x,y)=>({x,y}),setSkillCooldown(){},sfx(){},say(){},
 mv:(a,dx,dy)=>{a.x+=dx;a.y+=dy;},dogMoveAround:(h,q,sp,dt)=>{const angle=Math.atan2(q.y-h.y,q.x-h.x);h.x+=Math.cos(angle)*sp*dt;h.y+=Math.sin(angle)*sp*dt;}};
 vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/frontline.js'),'utf8'),c);
 vm.runInContext(html.slice(html.indexOf('function missionAllies('),html.indexOf('function setupMission(')),c);
 vm.runInContext(html.slice(html.indexOf('function moveAllySmart('),html.indexOf('function stunHuman(')),c);
 vm.runInContext(html.slice(html.indexOf('function summonAlly('),html.indexOf('let partner=null;')),c);
 c.calls=calls;c.get=s=>vm.runInContext(s,c);return c;
}
test('spawn points are above the camera in narrow and wide views, including paired dogs',()=>{
 const c=harness();for(const width of [320,480,840]){c.W=width;for(const hasDog of [false,true]){const q=c.frontlineSpawnSpot(hasDog),v=c.frontlineView();assert.ok(q.y<v.y-60);assert.ok(q.x>v.x&&q.x<v.x+width);if(hasDog)assert.ok(q.y+75<v.y-60);}}
});
test('blocked or top-of-world entries defer spawning instead of teleporting on screen',()=>{
 const c=harness();c.hitsM=()=>true;assert.equal(c.frontlineSpawnSpot(),null);assert.equal(c.spawnFrontlineWave(),0);c.hitsM=()=>false;c.p.y=100;assert.equal(c.frontlineSpawnSpot(),null);assert.equal(c.spawnFrontlineWave(),0);
});
test('waves stop at 16 live infantry and spawn without a detected target or a patrol route',()=>{
 const c=harness();for(let i=0;i<20;i++)c.spawnFrontlineWave(6);assert.equal(c.humans.length,16);assert.ok(c.humans.every(h=>h.frontMarch&&h.face===Math.PI/2&&h.st===0&&h.path.length===0));
});
test('reserve infantry classes are retained; dogs enter only with their handler',()=>{
 const c=harness(),dog={},handler={alive:true,dogHandler:true,dog},blue={alive:true,commander:'blue'},white={alive:true,commander:'white',elite:true};dog.handler=handler;c.humans=[handler,blue,white];c.enemyDogs=[dog];c.setupFrontlineArmy();assert.ok(c.humans.includes(handler)&&c.humans.includes(blue)&&c.humans.includes(white));assert.equal(c.enemyDogs.length,1);assert.equal(c.enemyDogs[0].handler,handler);assert.equal(dog.y-handler.y,75);
});
test('southbound movement does not reverse into a patrol loop',()=>{
 const c=harness(),h={x:400,y:9000,frontLaneX:400,frontMarch:true};for(let i=0;i<100;i++)c.moveFrontlineEnemy(h,.1,30);assert.ok(Math.abs(h.y-9300)<1e-6);assert.equal(h.frontLaneX,400);
});
test('off-screen retirements cannot count as kills and remove dog pairs',()=>{
 const c=harness(),h={x:400,y:c.frontlineView().y+c.H+210,alive:true,frontMarch:true};c.humans=[h];c.enemyDogs=[{handler:h}];c.cleanupFrontlineArmy(1);assert.equal(h.frontRetired,true);assert.equal(h.scoreCounted,true);assert.equal(c.humans.length,0);assert.equal(c.enemyDogs.length,0);
});
test('unrecorded combat deaths remain until ordinary score tracking counts them',()=>{
 const c=harness();c.humans=[{alive:false,scoreCounted:false}];c.cleanupFrontlineArmy(1);assert.equal(c.humans.length,1);c.humans[0].scoreCounted=true;c.cleanupFrontlineArmy(1);assert.equal(c.humans.length,0);
});
test('frontline soldier speeds are assigned once in the 50–100% range; reinforcements share it',()=>{
 const c=harness();c.missionAllies(9000);assert.equal(c.allies.length,6);const speeds=c.allies.map(a=>a.speedScale);assert.ok(speeds.every(s=>s>=.5&&s<=1));assert.ok(new Set(speeds).size>1);c.summonAlly();const a=c.allies.at(-1);assert.ok(a.speedScale>=.5&&a.speedScale<=1);c.stageMode='base';c.summonAlly();assert.equal(c.allies.at(-1).speedScale,1);
});
test('50% and 100% soldiers actually cover half and full baseline distance, without changing partners',()=>{
 const c=harness();for(const scale of [.5,1]){const a={x:0,y:0,speedScale:scale};c.moveAllySmart(a,{x:0,y:1000},135,1);assert.ok(Math.abs(a.y-135*scale)<1e-6);}const partner={x:0,y:0};c.moveAllySmart(partner,{x:0,y:1000},135,1);assert.equal(partner.y,135);
});
test('capture gauge has correct fraction, countdown and contested/paused labels',()=>{
 const c=harness();let v=c.frontlineCaptureVisual({progress:3,capturing:true});assert.equal(v.fraction,.25);assert.equal(v.remaining,9);assert.equal(v.label,'制圧まで 9.0秒');assert.ok(c.frontlineCaptureVisual({progress:6,contested:true}).label.includes('敵が範囲内'));assert.ok(c.frontlineCaptureVisual({progress:6}).label.includes('一時停止'));assert.equal(c.frontlineCaptureVisual({progress:99}).fraction,1);
});
test('capture ring is drawn only on the active circle, and quarter time draws a quarter arc',()=>{
 const c=harness(),q={},m={index:0,points:[q],progress:3,capturing:true};c.drawFrontlineCaptureRing(q,100,200,m);const arcs=c.calls.filter(x=>x[0]==='arc');assert.equal(arcs.length,2);assert.ok(Math.abs(arcs[1][5]-arcs[1][4]-Math.PI/2)<1e-6);const count=c.calls.length;c.drawFrontlineCaptureRing({},100,200,m);assert.equal(c.calls.length,count);
});
test('navigation anchor stays below the top-right area label at different viewport widths',()=>{
 const c=harness();for(const width of [480,840]){c.W=width;const q=c.frontlineArrowPosition();assert.equal(q.x,width-26);assert.ok(q.y>40);assert.ok(q.y+13<100);}
});
test('frontline-specific initialization leaves other stages alone',()=>{
 const c=harness();c.stageMode='base';const original=[{alive:true}];c.humans=original;c.setupFrontlineArmy();assert.equal(c.humans,original);assert.equal(c.spawnFrontlineWave(),0);
});
