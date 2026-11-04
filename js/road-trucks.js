// One bounded traffic event per generated road; inactive roads do no spatial searches.
let roadTruckEvents=[];
function setupRoadTruckEvents(){
 roadTruckEvents=[];
 if(areaDebugEnabled||stageMode!=='base'||!['baseIntermediate','base'].includes(currentStageId()))return;
 for(const road of roadBands){
  const dir=R()<.5?1:-1,unload=R()<.5;
  roadTruckEvents.push({road,dir,unload,passengers:unload?1+(R()*3|0):0,dropped:0,state:'waiting',
   x:0,y:road.y+road.h/2+(road.lanes>1?dir*road.h/4:0),body:dir>0?0:Math.PI,speed:190,t:0});
 }
}
function roadTruckDropSoldier(truck){
 const r=truck.road,back=truck.x-truck.dir*54;
 // Search only the open road around the tailgate; never use freeSpot's distant fallback.
 for(const dx of [0,-24,24,-48,48,-72,72])for(const side of [-1,1]){
  const q={x:back+dx,y:Math.max(r.y+14,Math.min(r.y+r.h-14,truck.y+side*(27+truck.dropped*4)))};
  if(q.x<16||q.x>WW-16||hitsM(q.x,q.y,10)||humans.some(h=>h.alive&&D(h,q)<23)||
   etanks.some(e=>e.alive&&D(e,q)<TANK_HIT+14)||cars.some(c=>c.kind!=='fighter'&&D(c,q)<38)||
   (p&&D(p,q)<(p.tank?40:18)))continue;
  const path=[q];
  for(const offset of [-90,90,-55,55]){
   const to={x:Math.max(16,Math.min(WW-16,q.x+offset)),y:q.y};
   if(D(q,to)>25&&patrolLineClear(q,to,8)){path.push(to);break;}
  }
  if(path.length<2)continue;
  humans.push({x:q.x,y:q.y,path,loop:false,wi:1,dir:1,stk:0,alive:true,st:0,sus:0,lost:0,
   cd:.7,face:Math.atan2(path[1].y-q.y,path[1].x-q.x),target:null,foundPause:0,
   patrolMode:'axis',elite:false,roadReinforcement:true,walkStartX:q.x,walkStartY:q.y});
  truck.dropped++;return true;
 }
 return false;
}
function updateRoadTrucks(dt){
 if(state!=='play'||stageMode!=='base'||areaDebugEnabled)return;
 const cy=Math.max(0,Math.min(WH-H,p.y-H*.6)),cx=Math.max(0,Math.min(WW-W,p.x-W/2));
 for(const truck of roadTruckEvents){
  if(truck.state==='done')continue;
  if(truck.state==='waiting'){
   if(truck.y<cy||truck.y>cy+H)continue;
   truck.x=truck.dir>0?Math.max(-80,cx-80):Math.min(WW+80,cx+W+80);
   truck.stopX=Math.max(100,Math.min(WW-100,cx+W*(.35+R()*.30)));
   truck.state='entering';
  }
  if(truck.state==='unloading'){
   truck.t-=dt;
   if(truck.t<=0){
    if(truck.dropped<truck.passengers){roadTruckDropSoldier(truck);truck.t=.4;}
    else{truck.state='leaving';}
   }
   continue;
  }
  const next=truck.x+truck.dir*truck.speed*dt;
  if(truck.state==='entering'&&truck.unload&&truck.dir*(next-truck.stopX)>=0){
   truck.x=truck.stopX;truck.state='unloading';truck.t=.65;
  }else{
   truck.x=next;
   if(truck.dir>0?truck.x>WW+90:truck.x<-90)truck.state='done';
  }
 }
}
function drawRoadTrucks(cx,cy){
 for(const truck of roadTruckEvents)if(truck.state!=='waiting'&&truck.state!=='done'&&drawPointInView(truck.x,truck.y,cx,cy,90)){
  truckShape(truck.x,truck.y,truck.body,28,true);
 }
}
