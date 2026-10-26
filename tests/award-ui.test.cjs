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
test('result opens, displays earned titles, visits 34-title collection and stats, and returns to result',()=>{
 const c=harness();c.recordRunAchievements(c.scoreStats);c.syncResultScreen();assert.ok(c.document.body.classList.contains('result-open'));assert.match(c.nodes.get('resTitle').innerHTML,/完遂の達人|不屈の生還者/);assert.match(c.nodes.get('resDetail').innerHTML,/100%/);
 c.nodes.get('resHome').click();assert.ok(c.document.body.classList.contains('trophy-open'));assert.equal(c.nodes.get('trophyGrid').children.length,34);assert.equal(c.nodes.get('trophyBack').textContent,'評価画面');
 c.nodes.get('trophyTabStats').click();assert.equal(c.nodes.get('trophyStats').hidden,false);c.nodes.get('trophyTabTitles').click();assert.equal(c.nodes.get('trophyGrid').children.length,34);c.nodes.get('trophyBack').click();assert.ok(!c.document.body.classList.contains('trophy-open'));assert.ok(c.document.body.classList.contains('result-open'));
});
test('legacy award data never inflates the visible 34 titles',()=>{
 const c=harness();c.storage.set(c.run('TITLE_ARCHIVE_KEY'),JSON.stringify({titles:{v2_single_1_elite:{count:8},v3_ghost_agent:{count:4}},medals:{untouched:{count:4}},runs:9}));c.openTrophyArchive();assert.equal(c.nodes.get('trophyGrid').children.length,34);assert.match(c.nodes.get('trophyOverview').innerHTML,/>0<\/strong> \/ 34/);
});

test('a completed archive shows all 34 titles and the no-ribbon mythic graphic',()=>{
 const c=harness(),ids=Array.from(c.run('TITLE_COLLECTION_TARGETS'));c.storage.set(c.run('TITLE_ARCHIVE_KEY'),JSON.stringify({titles:Object.fromEntries(ids.map(id=>[id,{count:1}])),runs:32}));c.openTrophyArchive();assert.match(c.nodes.get('trophyOverview').innerHTML,/>34<\/strong> \/ 34/);
 const myth=c.nodes.get('trophyGrid').children.find(card=>card.classList.contains('mythic'));assert.ok(myth);assert.ok(!myth.className.includes('locked'));assert.match(myth.children[1].innerHTML,/v3_mythic_complete\.webp/);assert.equal(myth.children[0].children[0].textContent,'神話級');assert.equal(myth.children[0].children[1].textContent,'戦場の神話');
});

test('the all-stage legendary stays immediately before mythic even when one is locked',()=>{
 const c=harness();c.storage.set(c.run('TITLE_ARCHIVE_KEY'),JSON.stringify({titles:{v3_mythic_complete:{count:1}},runs:32}));c.openTrophyArchive();
 const cards=c.nodes.get('trophyGrid').children;assert.match(cards.at(-2).children[1].innerHTML,/v3_all_stages_clear\.webp/);assert.match(cards.at(-1).children[1].innerHTML,/v3_mythic_complete\.webp/);assert.equal(cards.at(-2).children[0].children[0].textContent,'伝説級');
});

test('career ranks follow all 16 thresholds, count repeats, and cap at general',()=>{
 const c=harness(),id=c.run('TITLE_CATALOG[0].id');
 const ranks=c.run('CAREER_RANKS');assert.equal(ranks.length,16);
 assert.equal(c.careerRank({titles:{}}).name,'二等兵');
 for(let i=1;i<ranks.length;i++){
  const [name,threshold]=ranks[i];
  const before=c.careerRank({titles:{[id]:{count:threshold-1}}});
  if(threshold>1)assert.equal(before.name,ranks[i-1][0]);
  const reached=c.careerRank({titles:{[id]:{count:threshold}}});
  assert.equal(reached.name,name);assert.equal(reached.level,i+1);assert.equal(reached.total,threshold);
 }
 const top=c.careerRank({titles:{[id]:{count:10000}}});assert.equal(top.name,'大将');assert.equal(top.next,null);assert.equal(top.remaining,0);
 const second=c.run('TITLE_CATALOG[1].id');const legacy=c.careerRank({titles:{[id]:{at:'old'},[second]:{count:9},removed_title:{count:9999}}});assert.equal(legacy.total,10);assert.equal(legacy.name,'軍曹');
});

test('current career rank agrees on collection, stats and result, and viewing does not award titles twice',()=>{
 const c=harness(),id=c.run('TITLE_CATALOG[0].id');
 c.storage.set(c.run('TITLE_ARCHIVE_KEY'),JSON.stringify({titles:{[id]:{count:39}},runs:9}));
 c.recordRunAchievements(c.scoreStats);const total=c.careerRank().total;
 c.syncResultScreen();c.openTrophyArchive();
 assert.equal(c.nodes.get('resCareerRank').textContent,c.nodes.get('trophyCareerRank').textContent);
 assert.match(c.nodes.get('resCareerRank').textContent,/現在の階級：少尉/);
 assert.match(c.nodes.get('resCareerRank').textContent,new RegExp('称号の累計獲得：'+total+'回'));
 c.nodes.get('trophyTabStats').click();assert.match(c.nodes.get('trophyCareerRank').textContent,/現在の階級：少尉/);
 c.recordRunAchievements(c.scoreStats);assert.equal(c.careerRank().total,total);
 c.storage.set(c.run('TITLE_ARCHIVE_KEY'),JSON.stringify({titles:{},runs:0}));c.renderTrophyArchive();assert.match(c.nodes.get('trophyCareerRank').textContent,/現在の階級：二等兵/);
});
