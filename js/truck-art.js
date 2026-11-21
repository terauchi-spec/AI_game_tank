// One decoded body image and one shared pixel tread strip for friendly trucks.
let truckArtworkImage=null,truckTireStrip=null;
function loadTruckArtwork(){
 if(truckArtworkImage)return truckArtworkImage;
 truckArtworkImage=new Image();truckArtworkImage.decoding='async';
 truckArtworkImage.src='assets/vehicles/player/truck/body.webp';
 return truckArtworkImage;
}
function truckTirePhase(vehicle,x,y,body){
 // Real displacement also covers coasting; idle and empty-fuel stops never advance.
 return vehicle?tankTrackPhase(vehicle,x,y,body,true)||0:0;
}
function drawTruckArt(x,y,body,sz,vehicle=null){
 const image=loadTruckArtwork();
 if(!image.complete||!(image.naturalWidth>0))return false;
 if(!truckTireStrip){
  truckTireStrip=document.createElement('canvas');truckTireStrip.width=8;truckTireStrip.height=32;
  const q=gameCanvasContext(truckTireStrip);
  q.fillStyle='#090b0c';q.fillRect(0,0,8,32);
  q.fillStyle='#252a2d';q.fillRect(1,0,6,32);
  q.fillStyle='#41494c';for(let yy=0;yy<32;yy+=4){q.fillRect(1,yy,2,1);q.fillRect(5,yy+1,2,1);}
 }
 const width=sz*1.54,height=width*image.naturalHeight/image.naturalWidth;
 const tireWidth=width*.125,tireHeight=height*.194;
 const phase=((truckTirePhase(vehicle,x,y,body)%4)+4)%4;
 g.save();g.translate(x,y);g.rotate(body+Math.PI/2);
 // Keep the existing game shadow; the WebP contains no ground shadow.
 g.save();g.translate(3,5);g.globalAlpha*=.28;g.fillStyle='#000';g.beginPath();g.roundRect(-sz*.76,-sz*1.18,sz*1.52,sz*2.36,sz*.12);g.fill();g.restore();
 g.imageSmoothingEnabled=false;
 for(const yy of [-height*.22,height*.356])for(const side of [-1,1]){
  drawStaticRaster(truckTireStrip,0,phase,8,20,side*width*.422-tireWidth/2,yy-tireHeight/2,tireWidth,tireHeight);
 }
 g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
 g.drawImage(image,-width/2,-height/2,width,height);
 g.restore();return true;
}
