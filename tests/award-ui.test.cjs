const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function harness(){
 const nodes=new Map();
 function node(){const classes=new Set();return {children:[],style:{},classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k),toggle(k,on){on?classes.add(k):classes.delete(k);}},append(...v){this.children.push(...v)},replaceChildren(...v){this.children=v},getAttribute(k){return this[k]},removeAttribute(k){delete this[k]},addEventListener(k,fn){this[k]=fn}};}
 for(const m of html.matchAll(/\bid="([^"]+)"/g))nodes.set(m[1],node());
 const storage=new Map();
 const c={document:{body:node(),getElementById:id=>{assert.ok(nodes.has(id),'removed/missing element '+id);return nodes.get(id)},createElement:node},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},areaDebugEnabled:false,skillDebugAll:false,debugMode:0,p:{y:1000},ZONES:[],stageMode:'base',STAGE_NAMES:{base:'破壊'},SK:[],highScoreData:{score:100},renderStageUnlock(){},distanceMeters:v=>Math.round(v/10),formatRunTime:v=>String(v),readSkillProgress:()=>({unlocked:[]}),loadHighScore:()=>({score:100,rank:'F'}),performance:{now:()=>0},requestAnimationFrame(){},matchMedia:()=>({matches:true}),sfx(){},rollSkillChoices(){},bombReq:false,cannonReq:false,interact:false,skillReq:false,trophyReturnToResult:false};
 vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/award-icons.js'),'utf8'),c);
 vm.runInContext(html.slice(html.indexOf('function newScoreStats()'),html.indexOf('function humanMemory(')),c);
 vm.runInContext(html.slice(html.indexOf('const RES_AXES='),html.indexOf("document.getElementById('resRetry')")),c);
 for(const id of ['resHome','trophyBack','trophyTabTitles','trophyTabStats']){const line=html.split('\n').find(l=>l.startsWith("document.getElementById('"+id+"').addEventListener"));vm.runInContext(line,c);}
 c.scoreStats=c.newScoreStats();Object.assign(c.scoreStats,{objectiveDamage:1,final:{cleared:true,total:500,rank:'B'}});c.state='win';c.nodes=nodes;c.storage=storage;c.run=s=>vm.runInContext(s,c);return c;
}
test('result opens, displays earned titles, visits 32-title collection and stats, and returns to result',()=>{
 const c=harness();c.recordRunAchievements(c.scoreStats);c.syncResultScreen();assert.ok(c.document.body.classList.contains('result-open'));assert.match(c.nodes.get('resTitle').innerHTML,/完遂の達人|不屈の生還者/);assert.match(c.nodes.get('resDetail').innerHTML,/100%/);
 c.nodes.get('resHome').click();assert.ok(c.document.body.classList.contains('trophy-open'));assert.equal(c.nodes.get('trophyGrid').children.length,32);assert.equal(c.nodes.get('trophyBack').textContent,'評価画面');
 c.nodes.get('trophyTabStats').click();assert.equal(c.nodes.get('trophyStats').hidden,false);c.nodes.get('trophyTabTitles').click();assert.equal(c.nodes.get('trophyGrid').children.length,32);c.nodes.get('trophyBack').click();assert.ok(!c.document.body.classList.contains('trophy-open'));assert.ok(c.document.body.classList.contains('result-open'));
});
test('legacy award data never inflates the visible 32 titles',()=>{
 const c=harness();c.storage.set(c.run('TITLE_ARCHIVE_KEY'),JSON.stringify({titles:{v2_single_1_elite:{count:8},v3_ghost_agent:{count:4}},medals:{untouched:{count:4}},runs:9}));c.openTrophyArchive();assert.equal(c.nodes.get('trophyGrid').children.length,32);assert.match(c.nodes.get('trophyOverview').innerHTML,/>0<\/strong> \/ 32/);
});
