// Science-lab theme and fixed furniture sizes; shared indoor AI and mission rules.
function isLaboratoryStage(){return stageMode==='indoor'&&typeof indoorLaboratory!=='undefined'&&indoorLaboratory;}
const LABORATORY_ART={
 floor:'lab-floor',wall:'lab-wall-horizontal',wallVertical:'lab-wall-vertical',
 operations_table:'lab-bench',desk:'lab-bench',shelf:'lab-storage',cabinet:'lab-storage',
 personal_lockers:'lab-storage',weapon_rack:'lab-storage',container:'lab-samples',
 equipment:'lab-analyzer',server_rack:'lab-analyzer',generator:'lab-reactor',bed:'lab-medical',
 shell_pallet_hd:'lab-samples',waste_tank:'lab-waste-tank',cooling_unit:'lab-cooling-unit',
 fume_hood:'lab-fume-hood',ultra_freezer:'lab-freezer',centrifuge:'lab-centrifuge',incubator:'lab-incubator',wash_station:'lab-wash-sink',
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
 "lab-fume-hood": {
  "w": 104.0,
  "h": 55.25
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
function laboratoryPropSize(kind){return LABORATORY_PROP_SIZES[kind==='wooden_crate'?kind:LABORATORY_ART[kind]]||null;}
// Shared explosive rules are retained; only lab artwork and physical sizes differ.
const LABORATORY_OBJECT_ART={barrel:'waste_tank',crate:'cooling_unit',shellPallet:'container'};
function laboratoryObjectSize(kind,art=null){return laboratoryPropSize(art||LABORATORY_OBJECT_ART[kind]);}
function drawLaboratoryPropSprite(image,o){
 // Every sprite faces south. Uniform scale preserves the top-down artwork.
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
 guard_post:{id:'central_lab',name:'中央実験室',furniture:['desk','wash_station','fume_hood','cabinet'],required:['wash_station'],cargo:['shellPallet']},
 utilities:{id:'utilities',name:'純水・冷却設備室',furniture:['generator','wash_station','cabinet','equipment'],cargo:['crate','barrel']},
 communications:{id:'analysis',name:'機器分析室',furniture:['centrifuge','server_rack','cabinet','desk'],cargo:['crate','shellPallet']},
 operations:{id:'experiment',name:'実験室',furniture:['fume_hood','operations_table','wash_station','cabinet'],cargo:['barrel','shellPallet']},
 armory:{id:'reagent_storage',name:'試薬保管室',furniture:['ultra_freezer','cabinet','shelf','container'],cargo:['wooden_crate','shellPallet']},
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
  const size=laboratoryPropSize(artKind),w=size.w/sx,h=size.h/sy;
  let candidates=wallCandidates(w,h).filter(o=>inside(o,region));
  if(post){
   candidates=region.tiles.flatMap(t=>[16,(t.w-w)/2].map(dx=>({x:t.x+dx,y:t.y+(t.h-h)/2,w,h,laboratoryWallSide:null})));
   candidates.sort((a,b)=>Math.hypot(a.x+a.w/2-postTile.x-90,a.y+a.h/2-postTile.y-90)-Math.hypot(b.x+b.w/2-postTile.x-90,b.y+b.h/2-postTile.y-90));
  }else if(near)candidates.sort((a,b)=>Math.hypot((a.x+a.w/2-near.x)*sx,(a.y+a.h/2-near.y)*sy)-Math.hypot((b.x+b.w/2-near.x)*sx,(b.y+b.h/2-near.y)*sy));
  let checks=0;
  for(const q of candidates){
   const o={...q,zone:post?'post':hall?'hallway':'room',roomId:region.id,purpose:region.purpose,laboratoryRole:region.laboratoryRole};
   if(!fits(o,region))continue;
   if(++checks>(primary?30:14))break;
   if(!indoorRoomEquipmentWalkable(region,[...walls,...all,o]))continue;
   if(cargoKind){Object.assign(o,{kind:cargoKind,laboratoryArt:artKind,group:'lab-'+region.id+'-'+slot});explosiveObjects.push(o);}
   else{Object.assign(o,{kind:post?'postTable':'laboratoryEquipment',artKind,primaryAsset:primary});furniture.push(o);}
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
    h.x=center.x+(n===1?0:(k/(n-1)-.5)*primary.w*.7);
    h.y=center.y+(row?1:-1)*(primary.h/2+25/sy);
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
 const hallSpecs=[['cabinet',null],['wooden_crate','crate'],['container',null],['wooden_crate','crate'],['cabinet',null],['cooling_unit',null]];
 const eligible=corridors.filter(t=>!t.lobby&&Math.hypot((t.x+90-stair.x)*sx,(t.y+90-stair.y)*sy)>260);
 const used=new Set();
 for(let slot=0;slot<hallSpecs.length;slot++){
  const [art,cargoKind]=hallSpecs[slot];
  for(let k=0;k<eligible.length;k++){
   const t=eligible[(k+slot*3)%eligible.length];if(used.has(t.index))continue;
   const exits=[];
   for(const n of corridors){
    if(n.x===t.x&&Math.abs(n.y-t.y)===180)exits.push({x:t.x+90,y:Math.max(t.y,n.y)});
    if(n.y===t.y&&Math.abs(n.x-t.x)===180)exits.push({x:Math.max(t.x,n.x),y:t.y+90});
   }
   if(!exits.length)continue;
   const region={...t,id:-1,purpose:'corridor',laboratoryRole:'corridor',tiles:[t],doors:exits};
   if(place(region,art,{cargoKind,slot,hall:true})){used.add(t.index);break;}
  }
 }
}
