// Optional science-lab skin. All geometry, AI and mission rules remain the advanced indoor rules.
function isLaboratoryStage(){return stageMode==='indoor'&&typeof indoorLaboratory!=='undefined'&&indoorLaboratory;}
const LABORATORY_ART={
 floor:'lab-floor',wall:'lab-wall-horizontal',wallVertical:'lab-wall-vertical',
 operations_table:'lab-bench',desk:'lab-bench',shelf:'lab-storage',cabinet:'lab-storage',
 personal_lockers:'lab-storage',weapon_rack:'lab-storage',container:'lab-samples',
 equipment:'lab-analyzer',server_rack:'lab-analyzer',generator:'lab-reactor',bed:'lab-medical',
 shell_pallet_hd:'lab-samples',automatic_door_cyan:'lab-door',automatic_door_horizontal_cyan:'lab-door',
 stairs_up:'lab-stairs',stairs_down:'lab-stairs',building:'lab-building'
};
const laboratoryImages=Object.create(null),laboratoryFloorPatterns=new WeakMap();
let laboratoryFloorTile=null;
function laboratoryImage(kind){
 const key=LABORATORY_ART[kind];if(!key)return null;
 if(!laboratoryImages[key]){
  const image=new Image();image.decoding='async';image.src='assets/indoor/laboratory/'+key+'.webp'+(key==='lab-floor'?'?v=2000-r2':key.startsWith('lab-wall-')?'?v=2000-r1':'');
  laboratoryImages[key]=image;
 }
 const image=laboratoryImages[key];return assetOK(image)?image:null;
}
function prepareLaboratoryAssets(){for(const kind of Object.keys(LABORATORY_ART))laboratoryImage(kind);}
function laboratoryFloorPattern(context){
 const image=laboratoryImage('floor');if(!image)return '#e9e8df';
 let pattern=laboratoryFloorPatterns.get(context);
 if(!pattern){
  // Build a seamless mirrored tile once, then reuse the cached pattern.
  if(!laboratoryFloorTile){
   const tile=document.createElement('canvas'),w=image.naturalWidth,h=image.naturalHeight;
   tile.width=w*2;tile.height=h*2;const q=gameCanvasContext(tile);
   q.fillStyle='#e9e8df';q.fillRect(0,0,tile.width,tile.height);
   for(let y=0;y<2;y++)for(let x=0;x<2;x++){q.save();q.translate(x?w*2:0,y?h*2:0);q.scale(x?-1:1,y?-1:1);q.drawImage(image,0,0);q.restore();}
   laboratoryFloorTile=tile;
  }
  pattern=context.createPattern(laboratoryFloorTile,'repeat');if(pattern)laboratoryFloorPatterns.set(context,pattern);
 }
 return pattern||'#e9e8df';
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
