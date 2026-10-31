// Science-lab theme and fixed furniture sizes; shared indoor AI and mission rules.
function isLaboratoryStage(){return stageMode==='indoor'&&typeof indoorLaboratory!=='undefined'&&indoorLaboratory;}
const LABORATORY_ART={
 floor:'lab-floor',wall:'lab-wall-horizontal',wallVertical:'lab-wall-vertical',
 operations_table:'lab-bench',desk:'lab-bench',shelf:'lab-storage',cabinet:'lab-storage',
 personal_lockers:'lab-storage',weapon_rack:'lab-storage',container:'lab-samples',
 equipment:'lab-analyzer',server_rack:'lab-analyzer',generator:'lab-reactor',bed:'lab-medical',
 shell_pallet_hd:'lab-samples',waste_tank:'lab-waste-tank',cooling_unit:'lab-cooling-unit',
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
function laboratoryPropSize(kind){return LABORATORY_PROP_SIZES[LABORATORY_ART[kind]]||null;}
// Shared explosive rules are retained; only lab artwork and physical sizes differ.
const LABORATORY_OBJECT_ART={barrel:'waste_tank',crate:'cooling_unit',shellPallet:'container'};
function laboratoryObjectSize(kind){return laboratoryPropSize(LABORATORY_OBJECT_ART[kind]);}
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

// Laboratory rooms keep their shared mission/guard roles, but use research layouts.
const LABORATORY_ROOM_ROLES={
 guard_post:{id:'central_lab',name:'中央実験室',furniture:['desk','desk','equipment','cabinet'],cargo:['shellPallet']},
 utilities:{id:'utilities',name:'純水・冷却設備室',furniture:['generator','equipment','cabinet'],cargo:['crate','barrel']},
 communications:{id:'analysis',name:'機器分析室',furniture:['server_rack','equipment','desk','cabinet'],cargo:['crate','shellPallet']},
 operations:{id:'experiment',name:'実験室',furniture:['operations_table','desk','equipment','cabinet'],cargo:['barrel','shellPallet']},
 armory:{id:'reagent_storage',name:'試薬保管室',furniture:['cabinet','shelf','personal_lockers','container'],cargo:['shellPallet','shellPallet']},
 inspection:{id:'inspection',name:'検査室',furniture:['bed','equipment','cabinet'],cargo:['shellPallet']}
};
function laboratoryFurnishFloor({rooms,walls,doors,stair,postRoom,postTile,postGuards,furniture,explosiveObjects}){
 // Planning happens once during map creation. No runtime layout searches.
 furniture.length=0;explosiveObjects.length=0;
 const sx=INDOOR_SCALE_X,sy=INDOOR_SCALE_Y,all=[],guardSpace=[];
 const overlap=(a,b,pad=0)=>a.x<b.x+b.w+pad&&a.x+a.w>b.x-pad&&a.y<b.y+b.h+pad&&a.y+a.h>b.y-pad;
 const doorLanes=doors.map(d=>d.vertical?{x:d.x-26,y:d.y-35,w:52,h:70}:{x:d.x-46,y:d.y-18,w:92,h:36});
 const stairSpace={x:stair.x-52/sx,y:stair.y-140/sy,w:104/sx,h:280/sy};
 const fits=(o,room)=>{
  const area=room.tiles.reduce((sum,t)=>sum+Math.max(0,Math.min(o.x+o.w,t.x+t.w)-Math.max(o.x,t.x))*Math.max(0,Math.min(o.y+o.h,t.y+t.h)-Math.max(o.y,t.y)),0);
  return Math.abs(area-o.w*o.h)<.01&&!walls.some(q=>overlap(o,q,4))&&!doorLanes.some(q=>overlap(o,q,5))&&
   !all.some(q=>overlap(o,q,7))&&!guardSpace.some(q=>overlap(o,q,3))&&!overlap(o,stairSpace);
 };
 function place(room,artKind,{cargoKind=null,primary=false,post=false,near=null,slot=0}={}){
  const size=laboratoryPropSize(artKind),w=size.w/sx,h=size.h/sy;
  const tiles=room.tiles.slice().sort((a,b)=>a.y-b.y||a.x-b.x),candidates=[];
  // Work surfaces form north/south rows; cabinets line the edges. Equipment and
  // waste/cooling units are grouped near the main work station when possible.
  for(let i=0;i<tiles.length;i++){
   const t=tiles[(i+slot)%tiles.length],margin=16;
   const positions=post?[[margin,(t.h-h)/2],[(t.w-w)/2,(t.h-h)/2]]:artKind==='bed'?
    [[margin,(t.h-h)/2],[t.w-w-margin,(t.h-h)/2],[margin,46],[t.w-w-margin,46],[margin,margin],[t.w-w-margin,margin],[margin,t.h-h-margin],[t.w-w-margin,t.h-h-margin],[(t.w-w)/2,margin],[(t.w-w)/2,t.h-h-margin]]:
    [[(t.w-w)/2,margin],[(t.w-w)/2,t.h-h-margin],
     [margin,(t.h-h)/2],[t.w-w-margin,(t.h-h)/2],
     [margin,margin],[t.w-w-margin,margin],[margin,t.h-h-margin],[t.w-w-margin,t.h-h-margin],
     [margin,46],[t.w-w-margin,46],[margin,t.h-h-46],[t.w-w-margin,t.h-h-46],
     [(t.w-w)/2,46],[(t.w-w)/2,t.h-h-46]];
   for(const [dx,dy] of positions)if(dx>=12&&dy>=12&&dx+w<=t.w-12&&dy+h<=t.h-12)candidates.push({x:t.x+dx,y:t.y+dy,w,h});
  }
  if(post)candidates.sort((a,b)=>Math.hypot(a.x+a.w/2-postTile.x-90,a.y+a.h/2-postTile.y-90)-Math.hypot(b.x+b.w/2-postTile.x-90,b.y+b.h/2-postTile.y-90));
  else if(near)candidates.sort((a,b)=>Math.hypot((a.x+a.w/2-near.x)*sx,(a.y+a.h/2-near.y)*sy)-Math.hypot((b.x+b.w/2-near.x)*sx,(b.y+b.h/2-near.y)*sy));
  let checks=0;
  for(const q of candidates){
   const o={...q,zone:post?'post':'room',roomId:room.id,purpose:room.purpose,laboratoryRole:room.laboratoryRole};
   if(!fits(o,room))continue;
   if(++checks>12)break;
   if(!indoorRoomEquipmentWalkable(room,[...walls,...all,o]))continue;
   if(cargoKind){Object.assign(o,{kind:cargoKind,laboratoryArt:LABORATORY_OBJECT_ART[cargoKind],group:'lab-'+room.id+'-'+slot});explosiveObjects.push(o);}
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
   // Two rows around the enlarged central bench keep the same guard count/AI.
   const rows=[Math.ceil(postGuards.length/2),Math.floor(postGuards.length/2)];
   for(let i=0;i<postGuards.length;i++){
    const row=i<rows[0]?0:1,k=row?i-rows[0]:i,n=rows[row],h=postGuards[i];
    h.x=center.x+(n===1?0:(k/(n-1)-.5)*primary.w*.7);
    h.y=center.y+(row?1:-1)*(primary.h/2+25/sy);
    h.face=Math.atan2(center.y-h.y,center.x-h.x);h.waypoints=[{x:h.x,y:h.y}];
    guardSpace.push({x:h.x-13/sx,y:h.y-13/sy,w:26/sx,h:26/sy});
   }
  }
  const target=Math.min(7,Math.max(3,room.size+1));
  for(let slot=1;slot<target;slot++){
   const art=plan.furniture[1+(slot-1)%(plan.furniture.length-1)];
   place(room,art,{slot,near:slot===1&&plan.id!=='reagent_storage'?center:null});
  }
  for(const [slot,kind] of plan.cargo.entries())place(room,LABORATORY_OBJECT_ART[kind],{cargoKind:kind,slot,near:center});
 }
}
