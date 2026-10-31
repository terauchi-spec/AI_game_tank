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
  "w": 60.0,
  "h": 18.984375
 },
 "lab-storage": {
  "w": 40.0,
  "h": 15.15625
 },
 "lab-analyzer": {
  "w": 34.0,
  "h": 23.375
 },
 "lab-reactor": {
  "w": 40.0,
  "h": 22.34375
 },
 "lab-medical": {
  "w": 21.25,
  "h": 64.0
 },
 "lab-samples": {
  "w": 22.0,
  "h": 12.375
 },
 "lab-waste-tank": {
  "w": 25.429688,
  "h": 30.0
 },
 "lab-cooling-unit": {
  "w": 34.0,
  "h": 21.515625
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
