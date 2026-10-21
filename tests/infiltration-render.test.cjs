const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../js/infiltration-render.js'),'utf8');
function harness({mobile=true,mode='indoor',height=720}={}){
 let ticks=0,allocations=0;const calls={floor:0,props:0,walls:0,exits:0,lighting:0,doors:0,copies:0};
 const context=()=>new Proxy({drawImage(){calls.copies++;}},{get:(o,k)=>k in o?o[k]:()=>{}});
 const image={complete:true,naturalWidth:32,naturalHeight:32};
 const group={revision:0,lastDraw:73},wall={x:100,y:100,w:100,h:14,indoorWall:true,fr:true,_fragmentGroup:group};
 const prop={x:300,y:350,w:70,h:110,propArt:'cabinet'};
 const c={MOBILE_VIEW:mobile,stageMode:mode,debugMode:1,W:480,H:height,WW:960,WH:12800,
  covers:[wall],g:context(),indoorWorld:{currentFloor:0,floors:[{props:[prop]},{props:[]}]},
  performance:{now:()=>ticks+=.1},window:{},COVER_IMG:{maze_wall:image,maze_wall_vertical:image},
  TERRAIN_IMG:{'丘陵':image},indoorConcreteImage:image,indoorPropImages:{stairs_up:image,stairs_down:image,cabinet:image},
  INDOOR_PROP_ASPECT:{cabinet:1},assetOK:im=>!!im?.complete,gameCanvasContext:canvas=>canvas.context,
  document:{createElement(){allocations++;return{width:1,height:1,context:context()};}},
  drawInfiltrationFloors(x,y,exits){calls.floor++;if(exits!==false)calls.exits++;},
  drawInfiltrationProps(){calls.props++;if(prop.indoorDamageGroup)prop.indoorDamageGroup.lastDraw=999;},
  drawInfiltrationExitsForFloor(){calls.exits++;},drawCoverAsset(){calls.walls++;},
  drawCoverFragmentGroup(c){calls.walls++;c._fragmentGroup.lastDraw=999;},
  drawInfiltrationLighting(){calls.lighting++;},drawInfiltrationOpenings(){c.drawInfiltrationProps(0,0);calls.doors++;}
 };vm.createContext(c);vm.runInContext(source,c);
 const frame=(x=0,y=0)=>{c.drawInfiltrationFloors(x,y);if(!c.drawInfiltrationWallChunks(x,y))c.drawCoverFragmentGroup(wall);c.drawInfiltrationProps(x,y);};
 return{c,calls,group,wall,prop,frame,stats:c.window.tankIndoorRenderDiagnostics,get allocations(){return allocations;}};
}
test('native-size tiles warm gradually, then reuse all static layers without replaying their artwork',()=>{
 const h=harness();h.frame();assert.ok(h.stats.builds<=6,'at most two new tiles per layer in one frame');
 for(let i=0;i<25;i++)h.frame();
 const before={...h.calls},builds=h.stats.builds,allocations=h.allocations,lastDraw=h.group.lastDraw;
 for(let i=0;i<20;i++)h.frame();
 assert.equal(h.stats.builds,builds);assert.equal(h.allocations,allocations);
 for(const phase of ['floor','props','walls'])assert.equal(h.calls[phase],before[phase],phase+' artwork is not replayed');
 assert.ok(h.calls.exits>before.exits,'EXIT is still live on every frame');
 assert.ok(h.stats.hits>0);assert.equal(h.group.lastDraw,lastDraw,'cached copies do not steal the live fragment draw');
 assert.ok(h.stats.pixels<=4*1024*1024);
 for(const e of vm.runInContext('[...indoorRasterTiles.values()]',h.c))assert.ok(e.canvas.width<=256&&e.canvas.height<=256);
});
test('damage revisions, new furniture fragments and removal invalidate only affected tiles',()=>{
 const h=harness();for(let i=0;i<25;i++)h.frame();
 let builds=h.stats.builds;h.group.revision++;h.frame();assert.equal(h.stats.builds-builds,1);
 builds=h.stats.builds;h.prop.indoorDamageGroup={revision:0,lastDraw:41};h.frame();assert.equal(h.stats.builds-builds,1);
 assert.equal(h.prop.indoorDamageGroup.lastDraw,41);
 builds=h.stats.builds;h.c.covers=[];h.frame();assert.equal(h.stats.builds-builds,1,'removed wall leaves no cached ghost');
});
test('asset readiness and current floor invalidate cached placeholders and static scenery',()=>{
 const h=harness();for(let i=0;i<25;i++)h.frame();
 let builds=h.stats.builds;h.c.indoorWorld.currentFloor=1;for(let i=0;i<15;i++)h.frame();assert.ok(h.stats.builds>builds);
 builds=h.stats.builds;h.c.indoorPropImages.cabinet={complete:true,naturalWidth:64,naturalHeight:64};
 for(let i=0;i<15;i++)h.frame();assert.ok(h.stats.builds>builds);
 h.c.COVER_IMG.maze_wall.complete=false;assert.equal(h.c.drawInfiltrationWallChunks(0,0),false,'loading walls retain the original fallback');
});
test('scrolling has a bounded pixel budget and switching worlds or clearing releases all old canvases',()=>{
 const h=harness();for(let y=0;y<10000;y+=512)for(let i=0;i<8;i++)h.frame(400,y);
 assert.ok(h.stats.pixels<=4*1024*1024);assert.ok(h.stats.tiles<=86,'narrow map-edge tiles also stay bounded');
 const old=vm.runInContext('[...indoorRasterTiles.values()].map(e=>e.canvas)',h.c);
 h.c.indoorWorld={currentFloor:0,floors:[{props:[]}]};h.frame();assert.ok(old.every(c=>c.width===1&&c.height===1));
 h.c.clearInfiltrationRenderCache();assert.equal(h.stats.pixels,0);assert.equal(h.stats.tiles,0);assert.equal(h.stats.world,null);
});
test('completed stages and desktop keep their original drawing paths and allocate no indoor rasters',()=>{
 for(const options of [{mode:'base'},{mode:'beginner'},{mode:'front'},{mobile:false},{height:4000}]){
  const h=harness(options);for(let i=0;i<4;i++)h.frame();assert.equal(h.allocations,0);
  assert.equal(h.calls.floor,4);assert.equal(h.calls.props,4);
  if(options.mode&&options.mode!=='indoor')assert.equal(Object.keys(h.stats.phases).length,0);
 }
});
test('debug-only phase timings remain available alongside cache counters',()=>{
 const h=harness();h.frame();h.c.drawInfiltrationLighting();h.c.drawInfiltrationOpenings();h.c.indoorRecordRenderTime('walls',178);
 const text=h.c.indoorRenderDiagnosticsText();for(const label of ['床','壁','設備','照明','扉','背景再利用'])assert.ok(text.includes(label));
 assert.equal(h.stats.phases.walls.max,178);const count=h.stats.phases.lighting.count;
 h.c.debugMode=0;h.c.drawInfiltrationLighting();assert.equal(h.stats.phases.lighting.count,count,'no timer sampling outside debug mode');
});
