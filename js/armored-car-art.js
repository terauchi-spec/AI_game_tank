// Approved armored car: independently rotating WebP hull/turret over six pixel tires.
const armoredCarArtwork=new Map();
function armoredCarImage(layer){
 let image=armoredCarArtwork.get(layer);
 if(!image){
  image=new Image();image.decoding='async';
  image.src='assets/vehicles/player/armored/'+layer+'.webp?v=2026.11.22.0840';armoredCarArtwork.set(layer,image);
 }
 return image;
}
function loadArmoredCarArtwork(){armoredCarImage('hull');armoredCarImage('turret');}
function drawArmoredCarArt(x,y,body,ang,vehicle=null){
 const hull=armoredCarImage('hull'),turret=armoredCarImage('turret');
 if(!hull.complete||!(hull.naturalWidth>0)||!turret.complete||!(turret.naturalWidth>0))return false;
 if(typeof sharedVehicleTireStrip!=='function')return false;
 // Match the legacy outer tire width while retaining the approved source aspect ratio.
 const width=29*1.76/.93,height=width*hull.naturalHeight/hull.naturalWidth;
 const tireWidth=width*.15,tireHeight=height*.21;
 const phase=((truckTirePhase(vehicle,x,y,body)%4)+4)%4,strip=sharedVehicleTireStrip();
 g.save();g.translate(x,y);g.rotate(body+Math.PI/2);
 g.save();g.translate(3,4);g.globalAlpha*=.26;g.fillStyle='#000';g.beginPath();
 g.roundRect(-width*.455,-height*.46,width*.91,height*.98,4);g.fill();g.restore();
 g.imageSmoothingEnabled=false;
 for(const row of [.29,.566,.844])for(const side of [-1,1]){
  drawStaticRaster(strip,0,phase,8,20,side*width*.39-tireWidth/2,height*(row-.46)-tireHeight/2,tireWidth,tireHeight);
 }
 g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
 g.drawImage(hull,-width*.5,-height*.46,width,height);g.restore();
 // The detached turret's bearing is below its barrel, at source (135,321) in 270x470.
 const turretWidth=width*.5,turretHeight=turretWidth*turret.naturalHeight/turret.naturalWidth;
 g.save();g.translate(x,y);g.rotate(ang+Math.PI/2);
 g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
 g.drawImage(turret,-turretWidth*.5,-turretHeight*(321/470),turretWidth,turretHeight);
 g.restore();return true;
}
