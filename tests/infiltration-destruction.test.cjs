const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),source=fs.readFileSync(path.join(__dirname,'../js/infiltration-world.js'),'utf8');
function harness(){
 let seed=191,canvases=0;const images=[],fills=[],rasters=[];
 const context=()=>new Proxy({globalAlpha:1,drawImage:(...a)=>images.push(a),fillRect(...r){fills.push({r,color:this.fillStyle});}},{get:(o,k)=>k in o?o[k]:()=>{}});
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
  cut('const fragmentRenderCache=','function drawBridgeFancy(')+cut('function carve(','function useSkill('),c);
 vm.runInContext(`api={world:indoorWorld,props:drawInfiltrationProps,carve,hit:coverHitRect,asset:drawCoverAsset,fragment:drawCoverFragment,
  get covers(){return covers;},gridPoint:indoorGridPoint,frame:()=>fragmentDrawFrame++,load:(key,im)=>indoorPropImages[key]=im};`,c);
 return{c,api:c.api,images,fills,rasters,get canvases(){return canvases;}};
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

test('wall foundation shadows are scoped to infiltration and survive in wall fragments',()=>{
 const h=harness(),a=h.api;
 const wall={x:100,y:100,w:120,h:22,kd:1};a.asset(wall);assert.equal(h.fills.length,0,'other stages keep the original wall rendering');
 a.asset({...wall,indoorWall:true});assert.ok(h.fills.some(q=>q.color==='rgba(0,0,0,.72)'&&q.r[2]>wall.w&&q.r[3]>wall.h));
 const existing=a.world.floors[0].walls.find(q=>!q.indoorStairWall&&q.w>80);assert.ok(existing);
 a.carve(existing.x+existing.w/2,existing.y+existing.h/2,26,false,null);
 const fragments=a.covers.filter(q=>q.indoorWall&&q.fr&&q.ox0===existing.x&&q.oy0===existing.y);assert.ok(fragments.length);
 const before=h.fills.length;a.fragment(fragments[0]);assert.ok(h.fills.slice(before).some(q=>q.color==='rgba(0,0,0,.72)'));
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
