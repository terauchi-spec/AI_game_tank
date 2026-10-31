// Science-lab theme and fixed furniture sizes; shared indoor AI and mission rules.
function isLaboratoryStage(){return stageMode==='indoor'&&typeof indoorLaboratory!=='undefined'&&indoorLaboratory;}
const LABORATORY_ART={
 floor:'lab-floor',wall:'lab-wall-horizontal',wallVertical:'lab-wall-vertical',
 operations_table:'lab-bench',desk:'lab-bench',shelf:'lab-storage',cabinet:'lab-storage',
 personal_lockers:'lab-storage',weapon_rack:'lab-storage',container:'lab-samples',
 equipment:'lab-analyzer',server_rack:'lab-analyzer',generator:'lab-reactor',bed:'lab-medical',
 shell_pallet_hd:'lab-samples',waste_tank:'lab-waste-tank',cooling_unit:'lab-cooling-unit',
 transport_container:'lab-transport-container',ultra_freezer:'lab-freezer',centrifuge:'lab-centrifuge',incubator:'lab-incubator',wash_station:'lab-wash-sink',
 stairs_up:'lab-stairs',stairs_down:'lab-stairs',building:'lab-building'
};
// Fixed world dimensions for each lab sprite, shared by every placement path.
// Aspect ratios match the tightly cropped transparent runtime assets.
const LABORATORY_PROP_SIZES={
 "lab-bench": {
  "w": 112,
  "h": 35.4375
 },
 "lab-storage": {
  "w": 96,
  "h": 36.375
 },
 "lab-analyzer": {
  "w": 84,
  "h": 57.75
 },
 "lab-reactor": {
  "w": 112,
  "h": 62.5625
 },
 "lab-medical": {
  "w": 34.53125,
  "h": 104
 },
 "lab-samples": {
  "w": 56,
  "h": 31.5
 },
 "lab-waste-tank": {
  "w": 45.7734375,
  "h": 54
 },
 "lab-cooling-unit": {
  "w": 72,
  "h": 45.5625
 }
};
Object.assign(LABORATORY_PROP_SIZES,{
 "lab-transport-container": {
  "w": 96,
  "h": 44.625
 },
 "lab-freezer": {
  "w": 98.0,
  "h": 54.359375
 },
 "lab-centrifuge": {
  "w": 96.0,
  "h": 77.25
 },
 "lab-incubator": {
  "w": 104.0,
  "h": 58.09375
 },
 "lab-wash-sink": {
  "w": 112.0,
  "h": 40.25
 },
 "wooden_crate": {
  "w": 80,
  "h": 55.625
 }
});
// Furniture covers grow by 10%; explosives and wooden crates keep their existing sizes.
const LABORATORY_COVER_SCALE=1.1;
const LABORATORY_VERTICAL_ART={
 "lab-bench": "lab-bench-vertical",
 "lab-storage": "lab-storage-vertical",
 "lab-analyzer": "lab-analyzer-vertical",
 "lab-reactor": "lab-reactor-vertical",
 "lab-samples": "lab-samples-vertical",
 "lab-transport-container": "lab-transport-container-vertical",
 "lab-freezer": "lab-freezer-vertical",
 "lab-centrifuge": "lab-centrifuge-vertical",
 "lab-incubator": "lab-incubator-vertical",
 "lab-wash-sink": "lab-wash-sink-vertical"
};
const LABORATORY_VERTICAL_SIZES={
 "lab-bench-vertical": {
  "w": 42.875,
  "h": 112
 },
 "lab-storage-vertical": {
  "w": 28.5,
  "h": 96
 },
 "lab-analyzer-vertical": {
  "w": 42.984375,
  "h": 84
 },
 "lab-reactor-vertical": {
  "w": 46.375,
  "h": 112
 },
 "lab-samples-vertical": {
  "w": 21.21875,
  "h": 56
 },
 "lab-transport-container-vertical": {
  "w": 47.625,
  "h": 96
 },
 "lab-freezer-vertical": {
  "w": 39.4296875,
  "h": 98
 },
 "lab-centrifuge-vertical": {
  "w": 58.5,
  "h": 96
 },
 "lab-incubator-vertical": {
  "w": 43.0625,
  "h": 104
 },
 "lab-wash-sink-vertical": {
  "w": 34.125,
  "h": 112
 }
};
Object.assign(LABORATORY_PROP_SIZES,LABORATORY_VERTICAL_SIZES);
// Tank and sample-case silhouettes grow 2x in both axes. Furniture and cargo
// resolve these same dimensions before placing, colliding or drawing.
for(const asset of ['lab-waste-tank','lab-samples','lab-samples-vertical']){
 const size=LABORATORY_PROP_SIZES[asset];size.w*=2;size.h*=2;
}
for(const [kind,asset] of Object.entries(LABORATORY_ART))if(LABORATORY_VERTICAL_ART[asset])LABORATORY_ART[kind+'_vertical']=LABORATORY_VERTICAL_ART[asset];
const LABORATORY_COVER_SIZES=Object.create(null);
for(const asset of [...Object.keys(LABORATORY_VERTICAL_ART),...Object.values(LABORATORY_VERTICAL_ART),'lab-medical']){
 const size=LABORATORY_PROP_SIZES[asset];LABORATORY_COVER_SIZES[asset]={w:size.w*LABORATORY_COVER_SCALE,h:size.h*LABORATORY_COVER_SCALE};
}
// Enlarge both sink orientations a further 10% from the previous release.
for(const asset of ['lab-wash-sink','lab-wash-sink-vertical']){
 const size=LABORATORY_COVER_SIZES[asset];size.w*=1.1;size.h*=1.1;
}
function laboratoryBaseArt(kind){return kind.endsWith('_vertical')?kind.slice(0,-9):kind;}
function laboratoryPlacementKinds(kind){return LABORATORY_ART[kind+'_vertical']?[kind,kind+'_vertical']:[kind];}
function laboratoryPropSize(kind){const asset=kind==='wooden_crate'?kind:LABORATORY_ART[kind];return LABORATORY_COVER_SIZES[asset]||LABORATORY_PROP_SIZES[asset]||null;}
// Cargo uses the same source art, but has an independent physical size.
const LABORATORY_OBJECT_ART={barrel:'waste_tank',crate:'cooling_unit',shellPallet:'container'};
function laboratoryObjectSize(kind,art=null){const key=art||LABORATORY_OBJECT_ART[kind];return LABORATORY_PROP_SIZES[key==='wooden_crate'?key:LABORATORY_ART[key]]||null;}
function drawLaboratoryPropSprite(image,o){
 // Each orientation uses its own authored image. No per-frame image rotation.
 const scale=Math.min(o.w/image.naturalWidth,o.h/image.naturalHeight);
 const w=image.naturalWidth*scale,h=image.naturalHeight*scale;
 g.save();g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
 g.drawImage(image,o.x+(o.w-w)/2,o.y+(o.h-h)/2,w,h);g.restore();return true;
}
function drawLaboratoryObject(o){
 const image=laboratoryImage(o.laboratoryArt);
 if(image)return drawLaboratoryPropSprite(image,o);
 // Lightweight loading fallback uses precisely the same bounds.
 g.fillStyle=o.kind==='barrel'?'#68715b':'#777368';g.fillRect(o.x,o.y,o.w,o.h);
 g.strokeStyle='#353a32';g.lineWidth=1;g.strokeRect(o.x,o.y,o.w,o.h);return true;
}
const laboratoryImages=Object.create(null),laboratoryFloorPatterns=new WeakMap();
let laboratoryFloorTile=null;
function laboratoryImage(kind){
 if(kind==='wooden_crate'){if(!COVER_IMG.crate)COVER_IMG.crate=makeAssetImage(COVER_ASSET_SRC.crate);return assetOK(COVER_IMG.crate)?COVER_IMG.crate:null;}
 const key=LABORATORY_ART[kind];if(!key)return null;
 if(!laboratoryImages[key]){
  const image=new Image();image.decoding='async';image.src='assets/indoor/laboratory/'+key+'.webp'+'?v=overhead-r4';
  laboratoryImages[key]=image;
 }
 const image=laboratoryImages[key];return assetOK(image)?image:null;
}
function prepareLaboratoryAssets(){for(const kind of Object.keys(LABORATORY_ART))if(kind!=='floor')laboratoryImage(kind);}
function laboratoryFloorPattern(context){
 let pattern=laboratoryFloorPatterns.get(context);
 if(!pattern){
  // Seamless off-white resin flooring, with faint wear and no tile joints.
  // Created once, reused by the existing bounded floor raster cache.
  if(!laboratoryFloorTile){
   const tile=document.createElement('canvas');tile.width=512;tile.height=512;
   const q=gameCanvasContext(tile);q.fillStyle='#cfcec5';q.fillRect(0,0,512,512);
   let seed=731;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
   for(let i=0;i<160;i++){
    const x=24+random()*464,y=24+random()*464,r=3+random()*16;
    const stain=q.createRadialGradient(x,y,0,x,y,r);
    stain.addColorStop(0,'rgba(83,78,65,.035)');stain.addColorStop(1,'rgba(83,78,65,0)');
    q.fillStyle=stain;q.fillRect(x-r,y-r,r*2,r*2);
   }
   laboratoryFloorTile=tile;
  }
  pattern=context.createPattern(laboratoryFloorTile,'repeat');if(pattern)laboratoryFloorPatterns.set(context,pattern);
 }
 return pattern||'#cfcec5';
}
function drawLaboratoryWall(c){
 const horizontal=c.w>=c.h,image=laboratoryImage(horizontal?'wall':'wallVertical');
 // A seamless rectangular face matches the existing collider, including after wall fragmentation.
 if(!image){g.fillStyle='#eeece5';g.fillRect(c.x,c.y,c.w,c.h);return true;}
 return drawAssetSprite(image,c.x+c.w/2,c.y+c.h/2,c.w*1.03,c.h*1.03,0,1);
}
function laboratoryAssetStamp(){
 let stamp='lab';for(const key of Object.keys(laboratoryImages)){const im=laboratoryImages[key];stamp+='|'+key+':'+(assetOK(im)?im.naturalWidth+'x'+im.naturalHeight:'0');}
 return stamp;
}

// Research room recipes. Required machines are placed before optional storage.
const LABORATORY_ROOM_ROLES={
 guard_post:{id:'central_lab',name:'中央実験室',furniture:['desk','wash_station','transport_container','cabinet'],required:['wash_station'],cargo:['shellPallet']},
 utilities:{id:'utilities',name:'純水・冷却設備室',furniture:['generator','wash_station','cabinet','equipment'],cargo:['crate','barrel']},
 communications:{id:'analysis',name:'機器分析室',furniture:['centrifuge','server_rack','cabinet','desk'],cargo:['crate','shellPallet']},
 operations:{id:'experiment',name:'実験室',furniture:['operations_table','wash_station','transport_container','cabinet'],cargo:['barrel','shellPallet']},
 armory:{id:'reagent_storage',name:'試薬保管室',furniture:['ultra_freezer','cabinet','shelf','transport_container','container'],cargo:['wooden_crate','shellPallet']},
 inspection:{id:'inspection',name:'培養・検査室',furniture:['incubator','bed','cabinet','equipment'],cargo:['shellPallet']}
};
function laboratoryFurnishFloor({rooms,walls,doors,stair,postRoom,postTile,postGuards,furniture,explosiveObjects,corridors,entrances}){
 furniture.length=0;explosiveObjects.length=0;
 const sx=INDOOR_SCALE_X,sy=INDOOR_SCALE_Y,all=[],guardSpace=[],gap=4;
 const overlap=(a,b,pad=0)=>a.x<b.x+b.w+pad&&a.x+a.w>b.x-pad&&a.y<b.y+b.h+pad&&a.y+a.h>b.y-pad;
 const doorLanes=doors.map(d=>d.vertical?{x:d.x-26,y:d.y-35,w:52,h:70}:{x:d.x-46,y:d.y-18,w:92,h:36});
 const stairSpace={x:stair.x-54/sx,y:stair.y-145/sy,w:108/sx,h:290/sy};
 const entranceSpace=entrances.map(p=>({x:p.x-100/sx,y:p.y-80/sy,w:200/sx,h:160/sy}));
 // Merge adjacent collinear wall fragments so equipment lines follow real walls,
 // rather than the invisible 180px cells used by the procedural floor generator.
 const horizontal=[],vertical=[];
 for(const wall of walls)(wall.w>=wall.h?horizontal:vertical).push({...wall});
 for(const [list,isHorizontal] of [[horizontal,true],[vertical,false]]){
  list.sort((a,b)=>isHorizontal?a.y-b.y||a.h-b.h||a.x-b.x:a.x-b.x||a.w-b.w||a.y-b.y);
  for(let i=1;i<list.length;i++){
   const a=list[i-1],b=list[i],same=isHorizontal?a.y===b.y&&a.h===b.h&&b.x<=a.x+a.w+.01:a.x===b.x&&a.w===b.w&&b.y<=a.y+a.h+.01;
   if(!same)continue;
   if(isHorizontal)a.w=Math.max(a.x+a.w,b.x+b.w)-a.x;else a.h=Math.max(a.y+a.h,b.y+b.h)-a.y;
   list.splice(i--,1);
  }
 }
 const inside=(o,region)=>Math.abs(region.tiles.reduce((sum,t)=>sum+Math.max(0,Math.min(o.x+o.w,t.x+t.w)-Math.max(o.x,t.x))*Math.max(0,Math.min(o.y+o.h,t.y+t.h)-Math.max(o.y,t.y)),0)-o.w*o.h)<.01;
 const fits=(o,region)=>inside(o,region)&&!walls.some(q=>overlap(o,q,2))&&!doorLanes.some(q=>overlap(o,q,5))&&
  !all.some(q=>overlap(o,q,7))&&!guardSpace.some(q=>overlap(o,q,3))&&!overlap(o,stairSpace)&&!entranceSpace.some(q=>overlap(o,q));
 function wallCandidates(w,h){
  const result=[];
  for(const wall of horizontal){
   if(w>wall.w-32)continue;
   const anchors=[wall.x+16,wall.x+wall.w-w-16,wall.x+(wall.w-w)/2];
   for(let x=wall.x+16;x+w<=wall.x+wall.w-16+.01;x+=w+12/sx)anchors.push(x);
   for(const x of anchors){
    result.push({x,y:wall.y+wall.h+gap/sy,w,h,laboratoryWallSide:'north'});
    result.push({x,y:wall.y-h-gap/sy,w,h,laboratoryWallSide:'south'});
   }
  }
  for(const wall of vertical){
   if(h>wall.h-32)continue;
   const anchors=[wall.y+16,wall.y+wall.h-h-16,wall.y+(wall.h-h)/2];
   for(let y=wall.y+16;y+h<=wall.y+wall.h-16+.01;y+=h+12/sy)anchors.push(y);
   for(const y of anchors){
    result.push({x:wall.x+wall.w+gap/sx,y,w,h,laboratoryWallSide:'west'});
    result.push({x:wall.x-w-gap/sx,y,w,h,laboratoryWallSide:'east'});
   }
  }
  return result;
 }
 function place(region,artKind,{cargoKind=null,primary=false,post=false,near=null,slot=0,hall=false}={}){
  const variants=cargoKind?[artKind]:laboratoryPlacementKinds(artKind);
  let candidates=[];
  for(const placedArt of variants){
   const size=cargoKind?laboratoryObjectSize(cargoKind,placedArt):laboratoryPropSize(placedArt),w=size.w/sx,h=size.h/sy;
   if(post){
    candidates.push(...region.tiles.flatMap(t=>[16,(t.w-w)/2].map(dx=>({x:t.x+dx,y:t.y+(t.h-h)/2,w,h,laboratoryWallSide:null,laboratoryPlacedArt:placedArt}))));
   }else{
    const vertical=size.h>size.w;
    candidates.push(...wallCandidates(w,h).filter(o=>inside(o,region)&&((variants.length===1&&!placedArt.endsWith('_vertical'))||vertical===(o.laboratoryWallSide==='west'||o.laboratoryWallSide==='east'))).map(o=>({...o,laboratoryPlacedArt:placedArt})));
   }
  }
  if(post)candidates.sort((a,b)=>Math.hypot(a.x+a.w/2-postTile.x-90,a.y+a.h/2-postTile.y-90)-Math.hypot(b.x+b.w/2-postTile.x-90,b.y+b.h/2-postTile.y-90));
  else if(near)candidates.sort((a,b)=>Math.hypot((a.x+a.w/2-near.x)*sx,(a.y+a.h/2-near.y)*sy)-Math.hypot((b.x+b.w/2-near.x)*sx,(b.y+b.h/2-near.y)*sy));
  let checks=0;
  for(const q of candidates){
   const o={...q,zone:post?'post':hall?'hallway':'room',roomId:region.id,purpose:region.purpose,laboratoryRole:region.laboratoryRole};
   if(!fits(o,region))continue;
   if(++checks>(primary?30:14))break;
   if(!indoorRoomEquipmentWalkable(region,[...walls,...all,o]))continue;
   if(cargoKind){Object.assign(o,{kind:cargoKind,laboratoryArt:artKind,group:'lab-'+region.id+'-'+slot});explosiveObjects.push(o);}
   else{Object.assign(o,{kind:post?'postTable':'laboratoryEquipment',artKind:q.laboratoryPlacedArt,primaryAsset:primary});furniture.push(o);}
   all.push(o);return o;
  }
  return null;
 }
 for(const room of rooms){
  const plan=LABORATORY_ROOM_ROLES[room.purpose]||LABORATORY_ROOM_ROLES.inspection;
  room.name=plan.name;room.laboratoryRole=plan.id;
  const primary=place(room,plan.furniture[0],{primary:true,post:room===postRoom});
  if(!primary)throw Error('研究所の主設備を配置できません: '+room.name);
  const center={x:primary.x+primary.w/2,y:primary.y+primary.h/2};
  if(room===postRoom){
   const rows=[Math.ceil(postGuards.length/2),Math.floor(postGuards.length/2)];
   for(let i=0;i<postGuards.length;i++){
    const row=i<rows[0]?0:1,k=row?i-rows[0]:i,n=rows[row],h=postGuards[i];
    if(primary.h*sy>primary.w*sx){
     h.x=center.x+(row?1:-1)*(primary.w/2+25/sx);
     h.y=center.y+(n===1?0:(k/(n-1)-.5)*primary.h*.7);
    }else{
     h.x=center.x+(n===1?0:(k/(n-1)-.5)*primary.w*.7);
     h.y=center.y+(row?1:-1)*(primary.h/2+25/sy);
    }
    h.face=Math.atan2(center.y-h.y,center.x-h.x);h.waypoints=[{x:h.x,y:h.y}];
    guardSpace.push({x:h.x-13/sx,y:h.y-13/sy,w:26/sx,h:26/sy});
   }
  }
  // Required workstations and loading crates reserve space before decorative shelves.
  for(const art of plan.required||[])if(!place(room,art,{primary:true,slot:1}))throw Error('研究所の必須設備を配置できません: '+art);
  for(const [slot,token] of plan.cargo.entries()){
   const kind=token==='wooden_crate'?'crate':token,art=token==='wooden_crate'?token:LABORATORY_OBJECT_ART[kind];
   place(room,art,{cargoKind:kind,slot,near:center});
  }
  const target=Math.min(7,Math.max(3,room.size+1));
  for(let slot=1;slot<target;slot++){
   const art=plan.furniture[1+(slot-1)%(plan.furniture.length-1)];
   if((plan.required||[]).includes(art))continue;
   place(room,art,{slot});
  }
 }
 // Small local passage checks retain connections through each corridor cell.
 // No full-building search or layout work is added to the frame loop.
 // Up to 24 wall-side props (was 6), at most two per cell. Required
 // container orientations are tried first; crates and shelving fill the rest.
 const hallSpecs=[['transport_container',null],['transport_container_vertical',null],
  ...Array.from({length:22},(_,i)=>i%2?['wooden_crate','crate']:['cabinet',null])];
 const eligible=corridors.filter(t=>!t.lobby&&Math.hypot((t.x+90-stair.x)*sx,(t.y+90-stair.y)*sy)>260);
 const used=new Map();
 for(let slot=0;slot<hallSpecs.length;slot++){
  const [art,cargoKind]=hallSpecs[slot];
  // Fill unused cells before adding a second object to a cell, distributing
  // cover around the whole perimeter rather than crowding the first corner.
  const ordered=eligible.map((_,k)=>eligible[(k+slot*3)%eligible.length])
   .sort((a,b)=>(used.get(a.index)||0)-(used.get(b.index)||0));
  for(const t of ordered){
   if((used.get(t.index)||0)>=2)continue;
   const exits=[];
   for(const n of corridors){
    if(n.x===t.x&&Math.abs(n.y-t.y)===180)exits.push({x:t.x+90,y:Math.max(t.y,n.y)});
    if(n.y===t.y&&Math.abs(n.x-t.x)===180)exits.push({x:Math.max(t.x,n.x),y:t.y+90});
   }
   if(!exits.length)continue;
   const region={...t,id:-1,purpose:'corridor',laboratoryRole:'corridor',tiles:[t],doors:exits};
   if(place(region,art,{cargoKind,slot,hall:true})){used.set(t.index,(used.get(t.index)||0)+1);break;}
  }
 }
}
