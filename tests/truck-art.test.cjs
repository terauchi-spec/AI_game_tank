const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function harness(){
 const commands=[],rasters=[],images=[],canvases=[];let depth=0;
 function context(){
  const states=[];return new Proxy({globalAlpha:1,imageSmoothingEnabled:false,
   save(){depth++;states.push({globalAlpha:this.globalAlpha,imageSmoothingEnabled:this.imageSmoothingEnabled});},
   restore(){depth--;Object.assign(this,states.pop());}
  },{get:(o,k)=>k in o?o[k]:(...args)=>commands.push([k,...args])});
 }
 const c={Math,state:'play',document:{createElement(){const v={};canvases.push(v);return v;}},gameCanvasContext:context,g:context(),
  drawStaticRaster:(...args)=>rasters.push(args),Image:class{constructor(){this.complete=false;this.naturalWidth=0;images.push(this);}}};
 vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(root,'js/player-tank-art.js'),'utf8'),c);
 vm.runInContext(fs.readFileSync(path.join(root,'js/truck-art.js'),'utf8'),c);
 vm.runInContext(html.slice(html.indexOf('function truckShape('),html.indexOf('function fighterShape(')),c);
 return{c,commands,rasters,images,canvases,depth:()=>depth,ready(){c.loadTruckArtwork();Object.assign(images[0],{complete:true,naturalWidth:162,naturalHeight:256});}};
}
test('friendly body loads once and falls back safely while loading or failed; enemy trucks retain their original path',()=>{
 const h=harness();h.c.loadTruckArtwork();h.c.loadTruckArtwork();
 assert.equal(h.images.length,1);assert.equal(h.images[0].src,'assets/vehicles/player/truck/body.webp');
 assert.equal(h.c.drawTruckArt(0,0,0,28),false);
 h.c.truckShape(0,0,0,28);assert.ok(h.commands.some(c=>c[0]==='fillRect'));
 h.images[0].complete=true;assert.equal(h.c.drawTruckArt(0,0,0,28),false);
 h.ready();h.commands.length=0;h.rasters.length=0;
 h.c.truckShape(0,0,0,28,true);assert.equal(h.rasters.length,0);assert.ok(!h.commands.some(c=>c[0]==='drawImage'));
 assert.equal(h.depth(),0);
});
test('friendly truck draws four animated pixel tires below an undistorted WebP body at the old outer width',()=>{
 const h=harness();h.ready();h.commands.length=0;h.c.g.globalAlpha=.6;
 h.c.truckShape(10,20,.3,28,false,{});
 assert.equal(h.rasters.length,4);assert.equal(h.canvases.length,1);
 assert.equal(new Set(h.rasters.map(a=>a[0])).size,1);
 assert.equal(h.canvases[0].width,8);assert.equal(h.canvases[0].height,32);
 const image=h.commands.find(c=>c[0]==='drawImage');assert.ok(image);
 assert.ok(Math.abs(image[4]-28*1.54)<1e-9);assert.ok(Math.abs(image[4]/image[5]-162/256)<1e-12);
 assert.equal(new Set(h.rasters.map(a=>a[5])).size,2);assert.equal(new Set(h.rasters.map(a=>a[6])).size,2);
 assert.equal(h.c.g.globalAlpha,.6);assert.equal(h.c.g.imageSmoothingEnabled,false);assert.equal(h.depth(),0);
});
test('tire animation follows signed displacement, ignores duplicate draws, turning, pause and teleports, and supports coasting',()=>{
 const h=harness(),v={f:100},phase=(x,y=0,body=0)=>h.c.truckTirePhase(v,x,y,body);
 assert.equal(phase(0),0);assert.equal(phase(6),3);assert.equal(phase(6),3);
 assert.equal(phase(6,0,Math.PI/2),3);
 h.c.state='paused';assert.equal(phase(16),3);h.c.state='play';assert.equal(phase(16),3);
 assert.equal(phase(20),5);assert.equal(phase(18),4);assert.equal(phase(500),4);
 v.f=0;assert.equal(phase(500),4);assert.equal(phase(503),5.5);assert.equal(phase(503),5.5);
});
test('multiple friendly trucks share one image and tread strip without repeated allocations',()=>{
 const h=harness();h.ready();const vehicles=[{},{},{}];
 for(let n=0;n<30;n++)for(const v of vehicles)h.c.truckShape(n,0,0,28,false,v);
 assert.equal(h.images.length,1);assert.equal(h.canvases.length,1);assert.equal(h.depth(),0);
 for(let i=0;i<4;i++)assert.equal(h.rasters[i][2],0);
 assert.ok(h.rasters.some(a=>a[2]>0));
});
test('normal drawVehicle passes the persistent truck object while parked and driven',()=>{
 const c={p:{},seen:[],truckShape(...args){c.seen.push(args);}};vm.createContext(c);
 vm.runInContext(html.split('\n').find(l=>l.startsWith('function drawVehicle(v,')),c);
 const v={kind:'truck',t:{id:'truck'}};c.drawVehicle(v,10,20,0,0);c.p.tank=v;c.drawVehicle(v,12,20,0,0);
 assert.equal(c.seen.length,2);assert.equal(c.seen[0][5],v);assert.equal(c.seen[1][5],v);
 assert.equal(c.seen[0][4],false);c.drawVehicle(v,12,20,0,0,'turret');assert.equal(c.seen.length,2);
});
