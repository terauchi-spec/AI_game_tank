// 潜入だけの等倍背景キャッシュ。AI・当たり判定・動的な演出は元の処理を使う。
const INDOOR_RASTER_TILE=256,INDOOR_RASTER_LIMIT=4*1024*1024;
const indoorRenderStats={world:null,phases:Object.create(null),tiles:0,pixels:0,builds:0,hits:0,fallbacks:0};
const indoorRasterTiles=new Map();
let indoorRasterWorld=null,indoorRasterCovers=null,indoorRasterCoverCount=-1,indoorRasterClock=0;
let indoorRasterWallMembers=new Map(),indoorRasterPropMembers=new Map();
if(typeof window!=='undefined')window.tankIndoorRenderDiagnostics=indoorRenderStats;
function indoorMeasureDraw(name,fn,args){
  if(stageMode!=='indoor'||debugMode<=0)return fn.apply(null,args);
  const at=performance.now();
  try{return fn.apply(null,args);}finally{
    indoorRecordRenderTime(name,performance.now()-at);
  }
}
function indoorRecordRenderTime(name,t){
  const s=indoorRenderStats.phases[name]||(indoorRenderStats.phases[name]={count:0,total:0,max:0,last:0});
  s.count++;s.total+=t;s.last=t;s.max=Math.max(s.max,t);
}
function indoorDisposeRaster(entry){
  indoorRasterTiles.delete(entry.key);indoorRenderStats.pixels-=entry.canvas.width*entry.canvas.height;
  entry.canvas.width=entry.canvas.height=1;indoorRenderStats.tiles=indoorRasterTiles.size;
}
function clearInfiltrationRenderCache(){
  for(const e of indoorRasterTiles.values())indoorDisposeRaster(e);
  indoorRasterWorld=null;indoorRasterCovers=null;indoorRasterCoverCount=-1;
  indoorRasterWallMembers=new Map();indoorRasterPropMembers=new Map();
  indoorRenderStats.world=null;indoorRenderStats.phases=Object.create(null);
  indoorRenderStats.builds=indoorRenderStats.hits=indoorRenderStats.fallbacks=0;
}
function indoorResetRenderCache(){
  clearInfiltrationRenderCache();indoorRasterWorld=indoorWorld;indoorRenderStats.world=indoorWorld;
  for(const floor of indoorWorld?.floors||[])for(const prop of floor.props)indoorIndexRasterMember(indoorRasterPropMembers,prop);
}
function indoorIndexRasterMember(map,o){
  // Includes sprite overhang, rotated art, fragment bleed and the equipment shadow.
  const pad=Math.max(12,Math.max(o.w,o.h)*.06),t=INDOOR_RASTER_TILE;
  const x0=Math.max(0,Math.floor((o.x-pad)/t)),x1=Math.min(Math.ceil(WW/t)-1,Math.floor((o.x+o.w+pad)/t));
  const y0=Math.max(0,Math.floor((o.y-pad)/t)),y1=Math.min(Math.ceil(WH/t)-1,Math.floor((o.y+o.h+pad)/t));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
    const key=x+':'+y;let list=map.get(key);if(!list)map.set(key,list=[]);list.push(o);
  }
}
function indoorSyncWallRasterMembers(){
  if(indoorRasterCovers===covers&&indoorRasterCoverCount===covers.length)return;
  const next=new Map();
  for(const c of covers)if(c.indoorWall)indoorIndexRasterMember(next,c);
  // Reuse unchanged lists, so damage only invalidates tiles containing changed walls.
  for(const [key,list] of next){const old=indoorRasterWallMembers.get(key);
    if(old&&old.length===list.length&&list.every((c,i)=>c===old[i]))next.set(key,old);
  }
  indoorRasterWallMembers=next;indoorRasterCovers=covers;indoorRasterCoverCount=covers.length;
}
function indoorRasterAssetStamp(layer){
  if(typeof isLaboratoryStage==='function'&&isLaboratoryStage())return laboratoryAssetStamp()+'/'+indoorWorld.currentFloor;
  const ready=im=>assetOK(im)?(im.naturalWidth||im.width)+':'+(im.naturalHeight||im.height):'0';
  if(layer==='walls')return ready(COVER_IMG.maze_wall)+'/'+ready(COVER_IMG.maze_wall_vertical);
  if(layer==='floor')return indoorWorld.currentFloor+'/'+ready(indoorConcreteImage)+'/'+ready(TERRAIN_IMG['丘陵'])+'/'+ready(indoorPropImages.stairs_up)+'/'+ready(indoorPropImages.stairs_down);
  let stamp='';for(const name in INDOOR_PROP_ASPECT)stamp+=name+':'+ready(indoorPropImages[name])+';';return stamp;
}
function indoorRasterGroups(members){
  const groups=new Map();
  for(const c of members||[]){const group=c._fragmentGroup||c.indoorDamageGroup;
    if(group)groups.set(group,group.revision);
  }
  return groups;
}
function indoorRasterValid(e,assets,members){
  if(!e||e.assets!==assets||e.members!==members)return false;
  for(const [group,revision] of e.groups)if(group.revision!==revision)return false;
  // A furniture object gains its damage group in place on the first hit.
  for(const c of members||[]){const group=c._fragmentGroup||c.indoorDamageGroup;if(group&&!e.groups.has(group))return false;}
  return true;
}
function indoorPaintWallRaster(x,y,members){
  for(const c of members||[]){if(c.fr)drawCoverFragmentGroup(c);else drawCoverAsset(c);}
}
const indoorUncachedFloors=drawInfiltrationFloors,indoorUncachedProps=drawInfiltrationProps;
function indoorPaintFloorRaster(x,y){indoorUncachedFloors(x,y,false);}
function indoorPaintPropRaster(x,y){indoorUncachedProps(x,y);}
function indoorBuildRaster(key,layer,x,y,assets,members,paint){
  let entry=indoorRasterTiles.get(key);
  const w=Math.min(INDOOR_RASTER_TILE,WW-x),h=Math.min(INDOOR_RASTER_TILE,WH-y);
  if(!entry){
    while(indoorRenderStats.pixels+w*h>INDOOR_RASTER_LIMIT&&indoorRasterTiles.size)indoorDisposeRaster(indoorRasterTiles.values().next().value);
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    entry={key,layer,canvas};indoorRenderStats.pixels+=w*h;
  }
  const context=gameCanvasContext(entry.canvas),previous=g,groups=indoorRasterGroups(members),lastDraws=[];
  // The shared fragment renderer draws a group once per frame. Each tile is a
  // separate clipped destination; preserve its bookkeeping for the live renderer.
  for(const group of groups.keys()){lastDraws.push([group,group.lastDraw]);group.lastDraw=-1;}
  context.setTransform(1,0,0,1,0,0);context.clearRect(0,0,w,h);context.imageSmoothingEnabled=false;
  context.save();context.translate(-x,-y);g=context;
  try{paint(x,y,members);}finally{
    g=previous;context.restore();for(const [group,last] of lastDraws)group.lastDraw=last;
  }
  entry.assets=assets;entry.members=members;entry.groups=groups;
  indoorRasterTiles.delete(key);indoorRasterTiles.set(key,entry);
  indoorRenderStats.tiles=indoorRasterTiles.size;indoorRenderStats.builds++;return entry;
}
function indoorDrawRasterLayer(layer,cx,cy,paint){
  // The desktop's existing half-size intermediate canvas stays unchanged.
  if(stageMode!=='indoor'||!indoorWorld||!MOBILE_VIEW)return false;
  if(indoorRasterWorld!==indoorWorld)indoorResetRenderCache();
  if(layer==='walls'&&!(typeof isLaboratoryStage==='function'&&isLaboratoryStage())&&(!assetOK(COVER_IMG.maze_wall)||!assetOK(COVER_IMG.maze_wall_vertical)))return false;
  if(layer==='walls')indoorSyncWallRasterMembers();
  const t=INDOOR_RASTER_TILE,margin=24;
  const x0=Math.max(0,Math.floor((cx-margin)/t)),x1=Math.min(Math.ceil(WW/t)-1,Math.floor((cx+W+margin)/t));
  const y0=Math.max(0,Math.floor((cy-margin)/t)),y1=Math.min(Math.ceil(WH/t)-1,Math.floor((cy+H+margin)/t));
  // Keep the entire visible set resident; unusually tall viewports use the
  // original renderer rather than repeatedly evicting still-visible tiles.
  if((x1-x0+1)*(y1-y0+1)*t*t*3>INDOOR_RASTER_LIMIT)return false;
  const assets=indoorRasterAssetStamp(layer),map=layer==='walls'?indoorRasterWallMembers:indoorRasterPropMembers;
  const visible=[];let builds=0,ready=true,began=0;
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
    const key=layer+':'+x+':'+y,members=layer==='floor'?null:map.get(x+':'+y)||null;
    let e=indoorRasterTiles.get(key);
    if(!indoorRasterValid(e,assets,members)){
      // Bound cold-start/damage work; until complete, draw the original layer.
      if(builds<2&&(builds===0||performance.now()-began<2)){
        if(!builds)began=performance.now();
        e=indoorBuildRaster(key,layer,x*t,y*t,assets,members,paint);builds++;
      }else{ready=false;continue;}
    }
    indoorRasterTiles.delete(key);indoorRasterTiles.set(key,e);visible.push({e,x:x*t,y:y*t});
  }
  if(!ready){indoorRenderStats.fallbacks++;return false;}
  g.save();g.imageSmoothingEnabled=false;
  for(const q of visible){g.drawImage(q.e.canvas,q.x,q.y);indoorRenderStats.hits++;}
  g.restore();return true;
}
function indoorCachedFloors(cx,cy){
  if(!indoorDrawRasterLayer('floor',cx,cy,indoorPaintFloorRaster))return indoorUncachedFloors(cx,cy);
  // EXIT pulses and the escape progress ring are never part of the static raster.
  for(const f of indoorWorld.floors)drawInfiltrationExitsForFloor(f,cx,cy);
}
function indoorCachedProps(cx,cy){
  if(!indoorDrawRasterLayer('props',cx,cy,indoorPaintPropRaster))return indoorUncachedProps(cx,cy);
}
function indoorCachedWalls(cx,cy){return indoorDrawRasterLayer('walls',cx,cy,indoorPaintWallRaster);}
function drawInfiltrationWallChunks(cx,cy){return indoorCachedWalls(cx,cy);}
drawInfiltrationFloors=function(cx,cy){return indoorMeasureDraw('floor',indoorCachedFloors,arguments);};
drawInfiltrationProps=function(cx,cy){return indoorMeasureDraw('props',indoorCachedProps,arguments);};
const indoorUncachedLighting=drawInfiltrationLighting,indoorUncachedOpenings=drawInfiltrationOpenings;
drawInfiltrationLighting=function(cx,cy){return indoorMeasureDraw('lighting',indoorUncachedLighting,arguments);};
drawInfiltrationOpenings=function(){
  if(stageMode!=='indoor'||debugMode<=0)return indoorUncachedOpenings.apply(null,arguments);
  const at=performance.now(),propsBefore=indoorRenderStats.phases.props?.total||0;
  try{return indoorUncachedOpenings.apply(null,arguments);}finally{
    // Openings also draw the equipment layer. Count that layer separately.
    const propsTime=(indoorRenderStats.phases.props?.total||0)-propsBefore;
    indoorRecordRenderTime('doors',Math.max(0,performance.now()-at-propsTime));
  }
};
function indoorRenderDiagnosticsText(){
  const labels={floor:'床',walls:'壁',props:'設備',lighting:'照明',doors:'扉窓'};
  let text='\n潜入描画 平均／最大ms';
  for(const key in labels){const s=indoorRenderStats.phases[key];if(s?.count)text+='\n'+labels[key]+' '+(s.total/s.count).toFixed(1)+'／'+s.max.toFixed(1);}
  return text+'\n背景再利用 '+indoorRenderStats.hits+'／生成 '+indoorRenderStats.builds+'区画 '+(indoorRenderStats.pixels*4/1048576).toFixed(1)+'MB';
}
