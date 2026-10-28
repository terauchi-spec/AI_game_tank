const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createGameEngine}=require('./helpers/game-engine.cjs'),root=path.join(__dirname,'..');
function setup(){
 const e=createGameEngine(root,{seed:7});e.run("stageMode='beginner';skill='throw';reset(false);covers=[];objects=[];water=[];bridges=[];mud=[];bushes=[];cars=[];etanks=[];humans=[];bullets=[];bombs=[];allies=[];hound=null;p.x=800;p.y=1000;p.tank=null;rebuildSpatialGrid();humans=[{x:500,y:1000,face:0,alive:true,st:1,target:'p',lost:99,stun:0,cd:99,ct:2,bu:true,plantT:.01,plantA:0,path:[],sharePause:0,foundPause:0}];update(.01)");return e;
}
test('blue soldier releases a mine from its position and follows the existing safe landing point',()=>{
 const {run}=setup();assert.equal(run('bombs.length'),1);assert.equal(run("bombs[0].own"),'e');
 assert.equal(run('bombs[0].sx'),500);assert.equal(run('bombs[0].sy'),1000);assert.equal(run('bombs[0].tx'),run('enemyBombPoint({x:500,y:1000},0,100).x'));
 assert.ok(run('bombs[0].x>500&&bombs[0].x<bombs[0].tx'));assert.ok(run('bombs[0].fly>0'));assert.equal(run('bombs[0].t'),4);
 run('humans=[];update(.15)');assert.ok(run('bombs[0].x>540&&bombs[0].x<560'));assert.equal(run('bombs[0].y'),1000);
 run('update(.2)');assert.ok(run('bombs[0].fly<=0'));assert.equal(run('bombs[0].x'),598);assert.equal(run('bombs[0].y'),1000);
});
test('airborne enemy mines do not trigger on player contact, and landed mines retain their damage',()=>{
 const {run}=setup();run('humans=[];p.x=bombs[0].x;p.y=bombs[0].y;update(0)');assert.equal(run('state'),'play');assert.equal(run('bombs.length'),1);
 run('p.x=800;update(.4);p.x=bombs[0].x;p.y=bombs[0].y;update(0)');assert.equal(run('bombs.length'),0);assert.equal(run('state'),'dying');
});
test('enemy mines keep the four-second ground lifetime and player throws remain unchanged',()=>{
 const {run}=setup();run('humans=[];update(.4);update(3.5)');assert.equal(run('bombs.length'),1);run('update(.2)');assert.equal(run('bombs.length'),0);
 run("p.x=800;p.y=1000;p.scd=0;p.body=0;skill='throw';useSkill(1000,1000)");assert.equal(run("bombs[0].own"),'p');assert.equal(run('bombs[0].fly'),.35);run('update(.4)');assert.ok(run('bombs[0].fly<=0'));assert.equal(run('bombs[0].x'),910);
});
test('mine render follows an arc with a ground shadow and leaves player and grounded graphics unchanged',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const start=html.indexOf("for(const b of bombs){const own=b.own==='p',rr="),source=html.slice(start,html.indexOf('for(const w of waves)',start));
 for(const [own,fly,lift] of [['e',.35,0],['e',.175,24],['e',0,0],['p',.175,0]]){
  const circles=[],shadows=[],stack=[];let y=0;
  const g={beginPath(){},fill(){},stroke(){},fillRect(){},save(){stack.push(y);},restore(){y=stack.pop();},translate(_x,dy){y+=dy;},arc(x,cy,r){circles.push({x,y:cy+y,r});},ellipse(x,cy){shadows.push({x,y:cy+y});}};
  const bomb={own,fly,x:550,y:1000};vm.runInNewContext(source,{bombs:[bomb],g,performance:{now:()=>1000}});
  assert.equal(circles[0].y,1000-lift);assert.equal(bomb.y,1000);assert.equal(shadows.length,lift>0?1:0);assert.equal(stack.length,0);assert.equal(y,0);
 }
});
