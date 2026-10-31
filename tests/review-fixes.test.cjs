const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),vm=require('node:vm');
const {createGameEngine}=require('./helpers/game-engine.cjs'),{touchInputHarness}=require('./helpers/touch-input.cjs');
const root=path.join(__dirname,'..');
test('focus loss clears a real partner order without issuing its unfinished route',()=>{
 const h=createGameEngine(root);
 h.run("skill='partner';state='play';p={x:0,y:0,tank:null};partner={x:10,y:10,down:false,stunT:0,route:null};startPartnerOrder();updatePartnerOrder(.2);partnerOrder.path.push({x:40,y:40});");
 assert.equal(h.run('partnerOrder.drawing'),true);
 h.run('trainingClearInputs();');
 assert.equal(h.run('partnerOrder.pressed||partnerOrder.drawing'),false);
 assert.equal(h.run('partner.route'),null);
 assert.equal(h.run('state'),'play');
});
test('native cancellation discards a real partner route in tap and slide controls',()=>{
 for(const slide of [false,true]){
  const h=touchInputHarness({savedControlType:slide?'2':'1'});
  vm.runInContext(fs.readFileSync(path.join(root,'js/partner.js'),'utf8'),h.c);
  h.c.skill='partner';h.c.p={x:0,y:0,tank:null};h.c.partner={x:10,y:10,down:false,stunT:0,route:null};
  if(slide){h.start(h.nodes.continuousSurface,1,340,140);h.move(1,340,40);}else h.start(h.nodes.skillBtn,1,340,40);
  h.c.updatePartnerOrder(.2);h.run('partnerOrder.path.push({x:40,y:40})');
  assert.equal(h.run('partnerOrder.drawing'),true);
  h.end(1,{cancel:true});
  assert.equal(h.run('partnerOrder.pressed||partnerOrder.drawing'),false);
  assert.equal(h.c.partner.route,null);
 }
});
test('all nine public clears restore legendary, mythic and highest rank without a decisive clear',()=>{
 const h=createGameEngine(root);
 h.run("localStorage.setItem(STAGE_PROGRESS_KEY,JSON.stringify({version:3,cleared:STAGE_ORDER.filter(s=>s.id!=='decisive').map(s=>s.id),unlocked:[]}));localStorage.setItem(TITLE_ARCHIVE_KEY,JSON.stringify({titles:Object.fromEntries(TITLE_COLLECTION_TARGETS.filter(id=>id!==TITLE_ALL_STAGES.id).map(id=>[id,{count:1}]))}));");
 assert.equal(h.run("stageAvailableForSelection('decisive')"),false);
 assert.equal(h.run('allNormalStagesCleared()'),true);
 assert.equal(h.run('!!readTitleArchive().titles.v3_all_stages_clear'),true);
 assert.equal(h.run('!!readTitleArchive().titles.v3_mythic_complete'),true);
 assert.equal(h.run('careerRank().name'),'大将');
});
