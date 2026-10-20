const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),source=fs.readFileSync(path.join(__dirname,'../js/infiltration-world.js'),'utf8');
function harness(){
 let seed=191,canvases=0,readbacks=0,pixelUploads=0;const images=[],fills=[],rasters=[];
 const context=()=>new Proxy({createRadialGradient:()=>({addColorStop(){}}),getImageData(x,y,w,h){readbacks++;return {data:new Uint8ClampedArray(w*h*4)};},putImageData(){pixelUploads++;},globalAlpha:1,drawImage:(...a)=>images.push(a),fillRect(...r){fills.push({r,color:this.fillStyle});}},{get:(o,k)=>k in o?o[k]:()=>{}});
 const g=context(),c={stageMode:'indoor',state:'play',WH:12800,WW:960,W:480,H:440,p:{},scoreStats:{},
  R:()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},ZONE_STYLE:{'敵迷路基地':{p:[]}},module:{exports:{}},
  document:{body:{classList:{remove(){}}},createElement:()=>{canvases++;return{width:0,height:0};}},
  Image:class{},gameCanvasContext:()=>context(),assetOK:im=>!!im?.naturalWidth,g,
  rebuildSpatialGrid(){},say(){},damageObjectsInRadius(){},markMazeWallChunkDirty(){},invalidateStaticRaster(){},
  drawStaticRaster:(...a)=>rasters.push(a),coverHitCircle:()=>null,rockHitEllipse:()=>null,objectHitRect:o=>o,
  cannonCoverDebris(){},CCol:['#888','#777'],FRAG_COLORS:{1:['#777','#666']},COVER_IMG:{},
  drawAssetSprite:()=>true};
 vm.createContext(c);
 const cut=(start,end)=>html.slice(html.indexOf(start),html.indexOf(end,html.indexOf(start)));
 vm.runInContext(source+`;setupInfiltrationWorld();setupInfiltrationMission();`,c);
 vm.runInContext(cut('function centerRect(','function rockHitEllipse(')+cut('function drawCoverAsset(','// 建物の足元に残す')+
  cut('const BUILDING_SHADOW_KDS=','function drawBridgeFancy(')+cut('function carve(','function useSkill('),c);
 vm.runInContext(`api={world:indoorWorld,props:drawInfiltrationProps,carve,hit:coverHitRect,asset:drawCoverAsset,fragment:drawCoverFragment,
  get covers(){return covers;},get marks(){return buildingGroundMarks;},ground:drawBuildingGroundMarks,setup:setupInfiltrationWorld,gridPoint:indoorGridPoint,frame:()=>fragmentDrawFrame++,load:(key,im)=>indoorPropImages[key]=im};`,c);
 return{c,api:c.api,images,fills,rasters,get canvases(){return canvases;},get readbacks(){return readbacks;},get pixelUploads(){return pixelUploads;}};
}

test('infiltration furniture chips use the original WebP, preserve holes and reuse the fragment canvas',()=>{
 const h=harness(),a=h.api,f=a.world.floors[0];
 const prop=f.props.find(q=>Math.min(q.w,q.h)>60&&Math.max(q.w,q.h)>100);assert.ok(prop);
 const image={naturalWidth:253,naturalHeight:384};
 const center={x:prop.x+prop.w/2,y:prop.y+prop.h/2},cell=a.gridPoint(f.navigation.grid,center);
 assert.equal(f.navigation.grid.solid[cell],1);
 assert.ok(a.carve(center.x,center.y,36,false,null)>0);
 assert.equal(a.covers.includes(prop),false);const group=prop.indoorDamageGroup;
 assert.ok(group&&group.remaining>0&&group.primaryFragment);
 const fragments=a.covers.filter(q=>q._fragmentGroup===group);assert.equal(fragments.length,group.remaining);
 assert.ok(fragments.every(q=>q.indoorProp&&q.propArt===prop.propArt));
 assert.equal(fragments.some(q=>{const r=a.hit(q);return r&&center.x>=r.x&&center.x<=r.x+r.w&&center.y>=r.y&&center.y<=r.y+r.h;}),false);
 assert.equal(f.navigation.grid.solid[cell],0,'destroyed furniture no longer blocks the guard navigation grid');
 a.frame();a.props(prop.x-30,prop.y-30);assert.equal(h.canvases,0,'an unloaded WebP cannot be cached as a permanent gray fallback');
 a.load(prop.propArt,image);a.frame();a.props(prop.x-30,prop.y-30);assert.ok(h.images.some(q=>q[0]===image),'survivors draw the furniture image, not wall art');
 const count=h.images.length,canvases=h.canvases;assert.equal(canvases,1);
 a.frame();a.props(prop.x-30,prop.y-30);assert.equal(h.images.length,count);assert.equal(h.canvases,canvases,'unchanged frames reuse the damage cache');
 const first=group.primaryFragment;assert.ok(a.carve(first.x+first.w/2,first.y+first.h/2,12,false,null)>0);
 assert.notEqual(group.primaryFragment,first);assert.ok(group.primaryFragment);
 a.frame();a.props(prop.x-30,prop.y-30);assert.equal(h.canvases,canvases,'another hit rebuilds the existing cache');
 a.carve(center.x,center.y,Math.hypot(prop.w,prop.h)+20,false,null);
 assert.equal(group.remaining,0);assert.equal(group.primaryFragment,null);
 const before=h.images.filter(q=>q[0]===image).length;a.frame();a.props(prop.x-30,prop.y-30);
 assert.equal(h.images.filter(q=>q[0]===image).length,before,'the intact furniture cannot reappear after destruction');
});

test('indoor walls leave no ground foundation mark before damage',()=>{
 const h=harness(),a=h.api,wall={x:100,y:100,w:120,h:22,kd:1};
 a.asset(wall);a.asset({...wall,indoorWall:true});
 assert.equal(h.fills.length,0,'both wall renderers keep their original artwork without a rim');
 assert.equal(a.marks.length,0);a.ground(0,0);assert.equal(h.rasters.length,0);
});
test('partial and complete wall destruction leave one persistent building-style ground shadow',()=>{
 const h=harness(),a=h.api;
 const wall=a.world.floors[0].walls.find(q=>!q.indoorStairWall&&q.w>80);assert.ok(wall);
 const x=wall.x+wall.w/2,y=wall.y+wall.h/2;
 assert.ok(a.carve(x,y,26,false,null)>0);
 assert.equal(a.marks.length,1);const mark=a.marks[0];
 assert.deepEqual([mark.x,mark.y,mark.w,mark.h],[wall.x,wall.y,wall.w,wall.h]);assert.equal(mark.kind,'concrete');
 const pieces=()=>a.covers.filter(q=>q.indoorWall&&q.fr&&q.ox0===wall.x&&q.oy0===wall.y);
 assert.ok(pieces().length>0);
 a.ground(wall.x-20,wall.y-20);assert.equal(h.rasters.length,1);
 const raster=h.rasters[0],canvasCount=h.canvases;
 assert.deepEqual(raster.slice(1),[wall.x,wall.y,wall.w,wall.h],'no outline outside the wall footprint');
 a.ground(wall.x-20,wall.y-20);assert.equal(h.canvases,canvasCount,'reuse the building shadow sprite');
 a.carve(x,y,Math.hypot(wall.w,wall.h)+20,false,null);
 assert.equal(pieces().length,0);assert.equal(a.marks.filter(q=>q.x===wall.x&&q.y===wall.y).length,1,'fragment hits cannot duplicate marks');
 const n=h.rasters.length;a.ground(wall.x-20,wall.y-20);
 assert.ok(h.rasters.slice(n).some(q=>q[0]===raster[0]&&q[1]===wall.x&&q[2]===wall.y),'shadow survives the final fragment');
 const count=h.rasters.length;a.ground(wall.x+5000,wall.y+5000);assert.equal(h.rasters.length,count,'offscreen marks are skipped');
 a.setup();assert.equal(a.marks.length,0,'restart clears old destruction marks');
});
test('misses leave no wall mark, and later fragment damage can create the first mark',()=>{
 const h=harness(),a=h.api;
 const wall=a.world.floors[0].walls.find(q=>!q.indoorStairWall&&q.w>80);assert.ok(wall);
 a.carve(wall.x-100,wall.y-100,1,false,null);assert.equal(a.marks.length,0);
 // Splitting without removing a 14px tile must not count as destruction.
 a.carve(wall.x+1,wall.y+1,.1,false,null);assert.equal(a.marks.length,0);
 const piece=a.covers.find(q=>q.indoorWall&&q.fr&&q.ox0===wall.x&&q.oy0===wall.y);assert.ok(piece);
 a.carve(piece.x+piece.w/2,piece.y+piece.h/2,1,false,null);
 assert.equal(a.marks.length,1);assert.equal(a.marks[0].w,wall.w);
});
test('outdoor building ground marks retain their original sprite and padding',()=>{
 const h=harness();h.c.stageMode='base';h.c.buildingGroundMarks=[{x:100,y:100,w:120,h:80,kind:'concrete'}];
 h.api.ground(0,0);assert.deepEqual(h.rasters[0].slice(1),[96,98.2,128,84.6]);
});

test('generators retain the south-facing portrait orientation at two thirds of their previous size',()=>{
 const h=harness();let count=0;
 for(const floor of h.api.world.floors)for(const prop of floor.props.filter(q=>q.propArt==='generator')){
  count++;assert.ok(prop.h>prop.w);assert.ok(Math.abs(prop.h-232*2/3)<1e-8);
  const image={naturalWidth:253,naturalHeight:384};h.api.load('generator',image);
  let rotations=0;h.c.g.rotate=()=>rotations++;h.api.fragment({...prop,fr:1,ox0:prop.x,oy0:prop.y,ow0:prop.w,oh0:prop.h});assert.equal(rotations,0);
 }
 assert.ok(count>0);
});



test('lighter indoor scars compensate ceiling light once and preserve outdoor layering',()=>{
 const h=harness(),a=h.api;
 h.c.buildingGroundMarks=[{x:100,y:100,w:120,h:22,kind:'concrete',indoorWall:true}];
 a.ground(0,0);const indoorSprite=h.rasters.at(-1)[0],canvases=h.canvases;
 assert.equal(h.readbacks,0,'first visible destruction marks must not stall rendering with CPU pixel readbacks');
 assert.equal(h.pixelUploads,0,'shadow compensation stays in canvas compositing');
 a.ground(0,0);assert.equal(h.rasters.at(-1)[0],indoorSprite);
 assert.equal(h.canvases,canvases,'finished scars are reused without per-frame canvas work');
 h.c.stageMode='base';a.ground(0,0);
 assert.notEqual(h.rasters.at(-1)[0],indoorSprite,'outdoor mode retains its original sprite');
 const rgb=[28,34,36],tint=[7,13,15];
 for(const alpha of [0,.006,.15,.35,.58])for(let k=0;k<3;k++){
  const before=Math.round((rgb[k]-tint[k]*alpha)/(1-alpha));
  assert.ok(Math.abs(before*(1-alpha)+tint[k]*alpha-rgb[k])<=.5);
  assert.ok(rgb[k]>tint[k],'scar is lighter than the previous version');
 }
 assert.ok(html.indexOf('drawBuildingGroundMarks(cx,cy);')<html.indexOf('const mazeWallsCached=drawMazeWallChunks(cx,cy);'));
});


test('only existing indoor wall artwork receives a thin inset gray outline',()=>{
 const h=harness(),strokes=[];
 h.c.g.strokeRect=function(...rect){strokes.push({rect,color:this.strokeStyle,width:this.lineWidth});};
 h.c.COVER_IMG.maze_wall_vertical={naturalWidth:24,naturalHeight:320};
 for(const wall of [{x:100,y:100,w:180,h:22,kd:1,indoorWall:true},{x:100,y:100,w:22,h:315,kd:1,indoorWall:true}]){
  strokes.length=0;h.c.stageMode='indoor';assert.equal(h.api.asset(wall),true);
  assert.equal(strokes.length,1);assert.equal(strokes[0].color,'#414541');assert.equal(strokes[0].width,2);
  const [x,y,w,hh]=strokes[0].rect;
  assert.ok(w>0&&hh>0);assert.ok(x>wall.x-5&&y>wall.y-5,'outline stays on the existing wall image');
  for(const stage of ['base','beginner','front']){
   h.c.stageMode=stage;strokes.length=0;h.api.asset(wall);assert.equal(strokes.length,0,'completed stages keep their original wall rendering');
  }
  h.c.stageMode='indoor';strokes.length=0;h.api.asset({...wall,indoorWall:false});assert.equal(strokes.length,0);
 }
 h.c.stageMode='indoor';strokes.length=0;h.c.COVER_IMG.maze_wall_vertical={};
 assert.equal(h.api.asset({x:100,y:100,w:22,h:180,kd:1,indoorWall:true}),false);
 assert.equal(strokes.length,0,'an unloaded wall cannot leave an isolated outline');
});
