const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function harness(){
 const commands=[],rasters=[],images=[],canvases=[];let depth=0;
 function context(){const states=[];return new Proxy({globalAlpha:1,imageSmoothingEnabled:false,
  save(){depth++;states.push({globalAlpha:this.globalAlpha,imageSmoothingEnabled:this.imageSmoothingEnabled});},
  restore(){depth--;Object.assign(this,states.pop());}
 },{get:(o,k)=>k in o?o[k]:(...args)=>commands.push([k,...args])});}
 const c={Math,state:'play',document:{createElement(){const v={};canvases.push(v);return v;}},gameCanvasContext:context,g:context(),
  drawStaticRaster(...args){rasters.push(args);commands.push(['raster',...args]);},Image:class{constructor(){this.complete=false;this.naturalWidth=0;images.push(this);}}};
 vm.createContext(c);
 for(const p of ['js/player-tank-art.js','js/truck-art.js','js/armored-car-art.js'])vm.runInContext(fs.readFileSync(path.join(root,p),'utf8'),c);
 vm.runInContext(html.slice(html.indexOf('function truckShape('),html.indexOf('function fighterShape(')),c);
 vm.runInContext(html.slice(html.indexOf('function armoredShape('),html.indexOf('function enemyIsWalking(')),c);
 return{c,commands,rasters,images,canvases,depth:()=>depth,ready(){c.loadArmoredCarArtwork();Object.assign(images[0],{complete:true,naturalWidth:157,naturalHeight:256});Object.assign(images[1],{complete:true,naturalWidth:147,naturalHeight:256});}};
}
test('armored car loads two source images once and keeps the complete pixel fallback until both images are ready',()=>{
 const h=harness();h.c.loadArmoredCarArtwork();h.c.loadArmoredCarArtwork();
 assert.equal(h.images.length,2);assert.equal(h.images[0].src,'assets/vehicles/player/armored/hull.webp?v=2026.11.22.0840');assert.equal(h.images[1].src,'assets/vehicles/player/armored/turret.webp?v=2026.11.22.0840');
 assert.equal(h.c.drawArmoredCarArt(0,0,0,0),false);
 Object.assign(h.images[0],{complete:true,naturalWidth:157,naturalHeight:256});
 assert.equal(h.c.drawArmoredCarArt(0,0,0,0),false);
 h.c.armoredShape(0,0,0,0);assert.equal(h.rasters.length,0);assert.ok(h.commands.some(c=>c[0]==='fillRect'));assert.equal(h.depth(),0);
});
test('six pixel tires precede separate aspect-correct hull and turret images with independent rotations',()=>{
 const h=harness();h.ready();h.c.g.globalAlpha=.45;
 h.c.armoredShape(10,20,.3,1.2,{});
 assert.equal(h.rasters.length,6);assert.equal(h.canvases.length,1);
 const stamps=h.commands.filter(c=>c[0]==='drawImage');assert.equal(stamps.length,2);
 assert.ok(Math.abs(stamps[0][4]/stamps[0][5]-157/256)<1e-12);
 assert.ok(Math.abs(stamps[1][4]/stamps[1][5]-147/256)<1e-12);
 assert.equal(h.commands.filter(c=>c[0]==='raster').length,6);
 assert.equal(h.commands.slice(0,h.commands.findIndex(c=>c[0]==='drawImage')).filter(c=>c[0]==='raster').length,6);
 const rotations=h.commands.filter(c=>c[0]==='rotate').map(c=>c[1]);assert.deepEqual(rotations,[.3+Math.PI/2,1.2+Math.PI/2]);
 assert.equal(new Set(h.rasters.map(a=>a[5])).size,2);assert.equal(new Set(h.rasters.map(a=>a[6])).size,3);
 const left=Math.min(...h.rasters.map(a=>a[5])),right=Math.max(...h.rasters.map(a=>a[5]+a[7]));
 assert.ok(Math.abs(right-left-29*1.76)<1e-9);
 assert.equal(h.c.g.globalAlpha,.45);assert.equal(h.c.g.imageSmoothingEnabled,false);assert.equal(h.depth(),0);
});
test('truck and armored cars share a single tread strip and keep per-vehicle signed motion phases',()=>{
 const h=harness();h.ready();h.c.loadTruckArtwork();Object.assign(h.images[2],{complete:true,naturalWidth:162,naturalHeight:256});
 const truck={},armored={};h.c.truckShape(0,0,0,28,false,truck);h.c.armoredShape(0,0,0,0,armored);
 assert.equal(h.canvases.length,1);assert.equal(new Set(h.rasters.map(a=>a[0])).size,1);
 h.rasters.length=0;h.c.armoredShape(6,0,0,0,armored);assert.equal(h.rasters[0][2],3);
 h.rasters.length=0;h.c.armoredShape(6,0,0,1.3,armored);assert.equal(h.rasters[0][2],3);
 h.c.state='paused';h.c.armoredShape(12,0,0,1.3,armored);h.c.state='play';
 h.rasters.length=0;h.c.armoredShape(10,0,0,1.3,armored);assert.equal(h.rasters[0][2],2);
 for(let i=0;i<30;i++)h.c.armoredShape(10,0,0,1.3,armored);
 assert.equal(h.images.length,3);assert.equal(h.canvases.length,1);assert.equal(h.depth(),0);
});
test('parked and driven armored cars use the same persistent vehicle object; turret-only calls stay suppressed',()=>{
 const c={p:{},seen:[],armoredShape(...args){c.seen.push(args);}};vm.createContext(c);
 vm.runInContext(html.split('\n').find(l=>l.startsWith('function drawVehicle(v,')),c);
 const v={kind:'tank',t:{id:'armored'}};c.drawVehicle(v,10,20,0,.2);c.p.tank=v;c.drawVehicle(v,12,20,0,.4);
 assert.equal(c.seen.length,2);assert.equal(c.seen[0][4],v);assert.equal(c.seen[1][4],v);
 c.drawVehicle(v,12,20,0,.4,'turret');assert.equal(c.seen.length,2);
});
