const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'js/intro.js'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function harness({storage=new Map(),fail=false,reducedMotion=true}={}){
 const nodes=new Map(),classes=new Set(['title-open']),get=id=>{
  if(!nodes.has(id))nodes.set(id,{style:{values:{},setProperty(k,v){this.values[k]=v;}},getBoundingClientRect:()=>({top:0}),hidden:false,textContent:'',value:'',scrollTop:100,attrs:{},events:{},getAttribute(k){return this.attrs[k]??null;},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},addEventListener(k,fn){this.events[k]=fn;},focus(){this.focused=true;},blur(){this.focused=false;}});return nodes.get(id);
 };
 let timerId=0;const timers=new Map();
 const c={setTimeout(fn){const id=++timerId;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),matchMedia:()=>({matches:reducedMotion}),now:1000,performance:{now:()=>c.now},state:'title',keys:{KeyD:true,ArrowUp:true},bombReq:true,cannonReq:true,interact:true,skillReq:true,mdown:true,rolls:0,rollSkillChoices(){this.rolls++;},sfx(){},document:{body:{classList:{add:k=>classes.add(k),remove:k=>classes.delete(k)}},getElementById:get},localStorage:{getItem(k){if(fail)throw Error('blocked');return storage.get(k)||null;},setItem(k,v){if(fail)throw Error('blocked');storage.set(k,v);},removeItem(k){if(fail)throw Error('blocked');storage.delete(k);}}};
 // Stub is called as a global function, not as an object method.
 c.rollSkillChoices=()=>c.rolls++;
 vm.createContext(c);vm.runInContext(source,c);
 const next=()=>{c.now+=500;get('introConversation').events.click({target:{closest:()=>null}});},submit=value=>{get('introName').value=value;get('introNameForm').events.submit({preventDefault(){}});};
 const toName=()=>{for(let i=0;i<5;i++)next();},finish=()=>{for(let i=0;i<5;i++)next();};return {c,get,classes,storage,next,submit,toName,finish,timers,tick(){const [id,fn]=timers.entries().next().value;timers.delete(id);fn();}};
}
test('first start shows instructor 0 and first page, then saves name and opens personalized second page before skills',()=>{
 const h=harness(),{c,get}=h;c.startFromTitle();assert.equal(c.state,'intro');assert.equal(c.rolls,0);assert.ok(h.classes.has('intro-open'));assert.ok(!h.classes.has('title-open'));assert.match(get('introInstructor').src,/instructor_0.webp/);assert.equal(get('introDialogue').textContent,'よくきたな！');
 h.toName();assert.equal(get('introNameForm').hidden,false);assert.equal(get('introDialogue').hidden,true);assert.equal(get('introName').focused,true);h.submit('こっそり隊長');assert.equal(get('introName').attrs['aria-invalid'],'true');assert.equal(h.storage.size,0);
 h.submit('こっそり01');assert.equal(h.storage.get('tankGamePlayerNameV1'),'こっそり01');assert.equal(c.state,'intro');assert.match(get('introDialogue').textContent,/ほほう、こっそり01か/);assert.equal(get('introName').focused,false);assert.equal(get('introNameForm').hidden,true);assert.equal(get('introScreen').scrollTop,0);
 h.finish();assert.equal(c.state,'skill');assert.equal(c.rolls,1);assert.equal(get('introScreen').hidden,true);assert.ok(!h.classes.has('intro-open'));for(const k of Object.keys(c.keys))assert.equal(c.keys[k],false);for(const k of ['bombReq','cannonReq','interact','skillReq','mdown'])assert.equal(c[k],false);h.next();assert.equal(c.rolls,1);
});
test('saved names skip intro across reloads, including after name confirmation before the last page is closed',()=>{
 const storage=new Map(),h=harness({storage});h.c.startFromTitle();h.toName();h.submit('タンク10');const reload=harness({storage});reload.c.startFromTitle();assert.equal(reload.c.state,'skill');assert.equal(reload.c.rolls,1);assert.equal(reload.get('introInstructor').src,undefined);
});
test('name validation accepts 1–10 allowed characters, normalizes full width and half width forms, and rejects invalid names',()=>{
 const h=harness();for(const n of ['A','abc123','あいうえお','アイウエオ','ヴァンガード','たんくー','0123456789'])assert.ok(h.c.normalizeIntroName(n),n);
 assert.equal(h.c.normalizeIntroName('ＡＢ１２'),'AB12');assert.equal(h.c.normalizeIntroName('ﾀﾝｸ'),'タンク');
 for(const n of ['', ' ', 'abcdefghijk','こっそり隊長','a b','a_b','<script>','😀','test!'])assert.equal(h.c.normalizeIntroName(n),'',n);
 const invalid=harness({storage:new Map([['tankGamePlayerNameV1','<b>']])});invalid.c.startFromTitle();assert.equal(invalid.c.state,'intro');
});
test('IME confirmation cannot submit early; storage failure allows the current session to continue and explains the limit',()=>{
 const h=harness({fail:true});h.c.startFromTitle();h.toName();h.get('introName').events.compositionstart();h.submit('たんく');assert.equal(h.get('introNameForm').hidden,false);h.get('introName').events.compositionend();h.submit('たんく');assert.match(h.get('introSaveNote').textContent,/保存できません/);assert.match(h.get('introDialogue').textContent,/たんく/);h.finish();h.c.state='title';h.c.startFromTitle();assert.equal(h.c.state,'skill');
});
test('all title entry points use the intro gate and input handlers ignore gameplay shortcuts during entry',()=>{
 assert.match(html,/if\(hitRect\(px,py,r.start\)\)\{startFromTitle\(\)/);assert.match(html,/if\(state==='title'\)\{e.preventDefault\(\);startFromTitle\(\)/);assert.match(html,/getElementById\('titleStart'\)\.addEventListener\('click',\(\)=>\{startFromTitle\(\)/);
 for(const kind of ['keydown','keypress','keyup'])assert.ok(html.includes("addEventListener('"+kind+"',e=>{\n if(state==='intro')return;"));
 assert.match(html,/function drawMenuOnlyState\(\)\{\n if\(state==='intro'\)return true;/);
});

 test('the title activation cannot skip the opening conversation and conversation focus cannot trigger next on key release',()=>{
 const h=harness();h.c.startFromTitle();h.get('introConversation').events.click({target:{closest:()=>null}});assert.equal(h.get('introNameForm').hidden,true);assert.equal(h.get('introDialogue').focused,true);assert.match(h.get('introDialogue').textContent,/よくきたな/);h.toName();assert.equal(h.get('introNameForm').hidden,false);
 });
 test('confirmed data reset clears persistent and session names so the intro starts again without a reload; cancellation preserves them',()=>{
 const h=harness();h.c.startFromTitle();h.toName();h.submit('タンコ');h.next();
 const a=html.indexOf("document.getElementById('trophyReset').addEventListener('click'");const snippet=html.slice(a,html.indexOf('\n}',a));
 Object.assign(h.c,{confirm:()=>false,TITLE_ARCHIVE_KEY:'titles',SCORE_KEY:'score',RUN_HISTORY_KEY:'runs',SKILL_PROGRESS_KEY:'skills',STAGE_PROGRESS_KEY:'stages',STAGE_RECORDS_KEY:'records',loadHighScore:()=>({}),renderTrophyArchive(){}});
 vm.runInContext(snippet,h.c);h.get('trophyReset').events.click();assert.equal(h.c.readIntroName(),'タンコ');h.c.confirm=()=>true;h.get('trophyReset').events.click();assert.equal(h.c.readIntroName(),'');assert.equal(h.get('introName').value,'');h.c.state='title';h.c.startFromTitle();assert.equal(h.c.state,'intro');assert.equal(h.get('introNameForm').hidden,true);assert.match(h.get('introDialogue').textContent,/よくきたな/);
 });

test('intro copy explicitly overrides the legacy mobile paragraph hiding while hidden pages and empty notices stay hidden',()=>{
 const css=fs.readFileSync(path.join(root,'css/intro.css'),'utf8');
 assert.match(html,/@media \(pointer:coarse\)\{[\s\S]*?p\{display:none\}/);
 assert.match(css,/#introScreen p\{[^}]*display:block;[^}]*opacity:1;/);
 assert.match(css,/#introScreen\[hidden\],#introScreen \[hidden\]\{display:none!important\}/);
 assert.match(css,/#introNameError:empty,#introSaveNote:empty\{display:none\}/);
});

test('each window tap advances one phrase, ignores form taps and double taps, and final conversation uses the saved name',()=>{
 const h=harness();h.c.startFromTitle();const seen=[h.get('introDialogue').textContent];
 for(let i=0;i<4;i++){h.next();seen.push(h.get('introDialogue').textContent);assert.equal(h.get('introNameForm').hidden,true);}
 assert.equal(seen.length,new Set(seen).size);assert.match(seen.join(''),/よくきたな！ここは、こっそり戦車師団/);assert.match(seen[4],/自分の名前もなのらん/);h.next();assert.equal(h.get('introNameForm').hidden,false);
 h.get('introConversation').events.click({target:{closest:()=>({})}});assert.equal(h.get('introNameForm').hidden,false);
 h.submit('タンク');const second=[h.get('introDialogue').textContent];h.get('introConversation').events.click({target:{closest:()=>null}});assert.equal(h.get('introDialogue').textContent,second[0]);
 for(let i=0;i<4;i++){h.next();second.push(h.get('introDialogue').textContent);assert.equal(h.c.state,'intro');}
 assert.match(second.join(''),/ほほう、タンクか/);assert.match(second[3],/ではゆけ！タンクよ/);assert.match(second[4],/真のこっそり魂をみせるのだ！/);assert.equal(h.get('introNext').attrs['aria-label'],'スキル選択へ');h.next();assert.equal(h.c.state,'skill');
});
test('Enter and Space advance the focused conversation once, while repeats do not',()=>{
 const h=harness();h.c.startFromTitle();h.c.now+=500;let prevented=false;h.get('introDialogue').events.keydown({key:'Enter',repeat:false,preventDefault(){prevented=true;}});assert.ok(prevented);assert.match(h.get('introDialogue').textContent,/司令本部/);h.c.now+=500;h.get('introDialogue').events.keydown({key:' ',repeat:true,preventDefault(){}});assert.match(h.get('introDialogue').textContent,/司令本部/);
});

test('speech reveals one character per tick, tap completes before advancing, and only one timer is active',()=>{
 const h=harness({reducedMotion:false});h.c.startFromTitle();assert.equal(h.get('introDialogue').textContent,'よ');assert.equal(h.timers.size,1);assert.equal(h.get('introNext').hidden,true);
 h.tick();assert.equal(h.get('introDialogue').textContent,'よく');assert.equal(h.timers.size,1);h.next();assert.equal(h.get('introDialogue').textContent,'よくきたな！');assert.equal(h.get('introNext').hidden,false);assert.equal(h.timers.size,0);
 h.next();assert.equal(h.get('introDialogue').textContent,'こ');assert.equal(h.timers.size,1);while(h.timers.size)h.tick();assert.match(h.get('introDialogue').textContent,/司令本部だ！/);assert.equal(h.get('introNext').hidden,false);
 h.next();assert.equal(h.timers.size,1);h.c.resetIntroName();assert.equal(h.timers.size,0);h.c.state='title';h.c.startFromTitle();assert.equal(h.timers.size,1);h.c.enterIntroSkillSelection();assert.equal(h.timers.size,0);
});

test('name form moves above the keyboard and reacts to visible viewport resize and pan only during name entry',()=>{
 const h=harness(),events={};h.c.visualViewport={height:700,offsetTop:0,addEventListener:(n,f)=>events[n]=f};
 // Viewport listeners register when the intro script loads.
 vm.runInContext(source.slice(source.indexOf("if(typeof visualViewport!=='undefined'){"),source.indexOf('function showIntroStep(){')),h.c);
 h.c.startFromTitle();assert.ok(!h.classes.has('intro-naming'));h.toName();assert.ok(h.classes.has('intro-naming'));const values=h.get('introScreen').style.values;assert.equal(values['--intro-form-top'],'12px');assert.equal(values['--intro-form-height'],'676px');
 h.c.visualViewport.height=300;h.c.visualViewport.offsetTop=42;events.resize();assert.equal(values['--intro-form-height'],'276px');assert.equal(values['--intro-form-top'],'54px');h.c.visualViewport.offsetTop=70;events.scroll();assert.equal(values['--intro-form-top'],'82px');
 h.submit('タンク');assert.ok(!h.classes.has('intro-naming'));h.c.visualViewport.height=500;events.resize();assert.equal(values['--intro-form-height'],'276px');h.finish();assert.ok(!h.classes.has('intro-naming'));
});
