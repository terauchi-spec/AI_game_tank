const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function harness(){
 let now=0,seq=0;const timers=new Map();
 const c={Image:class{},performance:{now:()=>now},setTimeout(fn,ms){const id=++seq;timers.set(id,{fn,at:now+ms});return id;},clearTimeout:id=>timers.delete(id),COVER_IMG:{},ASSET_DIR:'assets/',GAME_VERSION:'test'};
 vm.createContext(c);vm.runInContext(html.slice(html.indexOf('const ASSET_LOAD_TIMEOUT_MS='),html.indexOf('function assetOK(')),c);
 vm.runInContext(fs.readFileSync(path.join(root,'js/jungle.js'),'utf8'),c);
 const run=s=>vm.runInContext(s,c);run('assetInitStarted=true');
 return{c,run,timers,advance(ms){now+=ms;for(const [id,t] of timers)if(t.at<=now){timers.delete(id);t.fn();}}};
}
test('one stalled jungle image releases the gameplay loading gate after 15 seconds',()=>{
 const h=harness();h.run('loadJungleAssets()');const images=Object.values(h.c.COVER_IMG);
 images.slice(1).forEach(im=>im.onload());assert.equal(h.run('assetsLoading()'),true);
 h.advance(14999);assert.equal(h.run('assetsLoading()'),true);
 h.advance(1);assert.equal(h.run('assetsLoading()'),false);
 assert.equal(h.run('assetLoadDone'),6);assert.equal(h.run('assetLoadFailed'),1);assert.equal(h.timers.size,0);
 images[0].onload();images[0].onerror();assert.equal(h.run('assetLoadDone'),6);assert.equal(h.run('assetLoadFailed'),1);
});
test('successful and failed requests settle once and cancel their timeout',()=>{
 const h=harness();h.c.calls=0;h.run('globalThis.good=makeAssetImage("good",()=>calls++);globalThis.bad=makeAssetImage("bad")');
 h.c.good.onload();h.c.good.onload();h.c.bad.onerror();h.c.bad.onerror();
 assert.equal(h.c.calls,1);assert.equal(h.timers.size,0);h.advance(30000);
 assert.equal(h.run('assetLoadDone'),2);assert.equal(h.run('assetLoadFailed'),1);assert.equal(h.run('assetsLoading()'),false);
});
test('late success still refreshes dependent rendering once without reopening the loading gate',()=>{
 const h=harness();h.c.calls=0;h.run('globalThis.slow=makeAssetImage("slow",()=>calls++)');h.advance(15000);
 assert.equal(h.run('assetsLoading()'),false);assert.equal(h.c.calls,0);
 h.c.slow.onload();h.c.slow.onload();assert.equal(h.c.calls,1);assert.equal(h.run('assetLoadDone'),1);assert.equal(h.run('assetsLoading()'),false);
});
