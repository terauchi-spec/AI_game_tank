const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {createGameEngine}=require('./helpers/game-engine.cjs'),root=path.join(__dirname,'..');
test('rocket colliders cover nose, full body and wheels, with empty outer corners passable',()=>{
 const c={};vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(root,'js/frontline.js'),'utf8'),c);
 const expected=['frontline_rocket_lower','frontline_rocket_middle','frontline_rocket_upper'];
 for(let i=0;i<3;i++){
  const a=c.frontlineRocketGeometry({x:480,y:5000},i),hit=(u,v)=>a.hitRects.some(r=>a.x+u*a.width>=r.x&&a.x+u*a.width<=r.x+r.w&&a.y+v*a.height>=r.y&&a.y+v*a.height<=r.y+r.h);
  assert.equal(a.asset,expected[i]);
  for(const [x,y] of [[.5,.02],[.5,.98],[.09,.5],[.91,.5]])assert.ok(hit(x,y),`${i}: ${x},${y}`);
  assert.equal(hit(.01,.5),false);assert.equal(hit(.1,.02),i!==2);
 }
});
test('rocket draws complete sprite once after grass; middle antennas retain their split layers',()=>{
 const calls=[],im={naturalWidth:432,naturalHeight:1080},c={stageMode:'front',mission:{points:[{antenna:{x:10,y:10,width:216,height:540,cutY:280,rocket:true,asset:'rocket'}}]},W:960,H:800,COVER_IMG:{rocket:im},assetOK:()=>true,g:{drawImage:(...a)=>calls.push(a)}};
 vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(root,'js/frontline.js'),'utf8'),c);
 c.drawFrontlineAntennas(0,0);assert.equal(calls.length,0);c.drawFrontlineAntennas(0,0,true);assert.equal(calls.length,1);assert.equal(calls[0].length,5);
 c.mission.points[0].antenna.rocket=false;c.drawFrontlineAntennas(0,0);c.drawFrontlineAntennas(0,0,true);assert.equal(calls.length,3);assert.equal(calls[2].length,9);
});
for(const seed of [7,17,42])test(`advanced rockets avoid solid scenery with working full-length collision (seed ${seed})`,()=>{
 const h=createGameEngine(root,{seed});h.run("stageMode='front';frontlineBeginner=false;intermediateStageId='';reset(false);");
 const result=JSON.parse(h.run(`JSON.stringify(mission.points.map(q=>{const a=q.antenna,box={x:a.x,y:a.y,w:a.width,h:a.height};return {rocket:a.rocket,overlaps:covers.filter(c=>!c.frontAntenna&&frontlineRocketOverlap(box,coverSpriteRect(c)||c)).length+objects.filter(o=>frontlineRocketOverlap(box,frontlineRocketObjectRect(o))).length,top:hitsC(a.x+a.width*.5,a.y+a.height*.03,2),bottom:hitsC(a.x+a.width*.5,a.y+a.height*.98,2)}}))`));
 assert.equal(result.length,3);for(const a of result){assert.equal(a.rocket,true);assert.equal(a.overlaps,0);assert.equal(a.top,true);assert.equal(a.bottom,true);}
});
test('middle stage preserves its two small antennas and final large antenna',()=>{
 const h=createGameEngine(root,{seed:7});h.run("stageMode='front';frontlineBeginner=false;intermediateStageId='frontIntermediate';reset(false);");
 assert.deepEqual(JSON.parse(h.run('JSON.stringify(mission.points.map(q=>q.antenna.asset))')),['frontline_antenna_small','frontline_antenna_small','frontline_antenna_large']);
 assert.deepEqual(JSON.parse(h.run('JSON.stringify(mission.points.map(q=>q.antenna.collider.h))')),[20,20,44]);
});

test('advanced victory centers the last rocket and leaves sparkles on the success frame',()=>{
 const calls=[];
 const gm=new Proxy({}, {get:(target,key)=>target[key]||((...args)=>calls.push([key,...args]))});
 const c={stageMode:'front',areaDebugEnabled:false,state:'play',cam:0,camX:0,W:480,H:640,WW:960,WH:12800,gm,successFrameDrawn:true};
 vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(root,'js/frontline.js'),'utf8'),c);
 const point={x:480,y:3000,done:true};point.antenna=c.frontlineRocketGeometry(point,2);
 c.mission={index:1,points:[point]};assert.equal(c.beginFrontlineVictory(),true);
 c.updateFrontlineVictory(1);
 const camera=c.frontlineVictoryCamera();assert.equal(camera.y+320,point.antenna.y+270);
 c.cam=camera.y;c.camX=camera.x;c.drawFrontlineVictorySignal();
 assert.ok(calls.some(([op])=>op==='fill'));assert.ok(!calls.some(([op])=>op==='arc'));
 calls.length=0;c.updateFrontlineVictory(2);assert.equal(c.state,'succeeded');assert.equal(c.successFrameDrawn,false);
 c.drawFrontlineVictorySignal();assert.ok(calls.some(([op])=>op==='fill'));
});
