const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),reading=require('../reading.js'),core=require('../core.js');
const all=fs.readdirSync(path.join(root,'reading')).filter(f=>f.endsWith('.json')&&f!=='catalog.json').map(f=>reading.validateItem(JSON.parse(fs.readFileSync(path.join(root,'reading',f)))));

test('八篇材料按日常到旅行排序，每句有真人MP3、原句编号和逐词释义',()=>{
 assert.equal(all.length,8);const sorted=all.slice().sort((a,b)=>a.order-b.order);
 assert.deepEqual(sorted.map(x=>x.category),['日常','日常','日常','旅行','旅行','旅行','旅行','旅行']);
 assert.equal(all.reduce((n,x)=>n+x.segments.length,0),27);
 const ids=new Set();for(const item of all)for(const s of item.segments){assert.ok(!ids.has(s.source.audioId));ids.add(s.source.audioId);const bytes=fs.readFileSync(path.join(root,s.audioFile));assert.equal(bytes.toString('ascii',0,3),'ID3');assert.ok(bytes.length>1500);}
 assert.throws(()=>reading.validateItem({...sorted[0],segments:[{...sorted[0].segments[0],gloss:[{ru:'нетакого',zh:'无'}]}]}));
 assert.throws(()=>reading.validateItem({...sorted[0],segments:[{...sorted[0].segments[0],audioFile:'https://elsewhere.test/a.mp3'},sorted[0].segments[1]]}));
});

test('三步揭示：第一步不泄露俄文，第二步不显示中文，第三步显示词义和录音归属',async()=>{
 globalThis.PocketReading=reading;require('../reading-ui.js');const item=all.find(x=>x.id==='greetings');const main={innerHTML:''},state={schema:2,days:{},dates:[]};let saves=0;
 const ui=new globalThis.PocketReadingUI.ReadingUI({loader:{},main,esc:x=>String(x),go:()=>{},stopAudio:()=>{},getState:()=>state,save:()=>saves++});
 ui.repo.loaded.set(item.id,item);ui.renderDetail(item);assert.doesNotMatch(main.innerHTML,/Доброе утро|早上好|CC BY 4\.0/);assert.match(main.innerHTML,/data-src="reading\/audio\/25296.mp3"/);
 const previous=globalThis.location;globalThis.location={hash:'#reading/greetings'};
 try{await ui.handleClick({dataset:{readingStep:'1'},hasAttribute:()=>false});assert.match(main.innerHTML,/Доброе утро/);assert.doesNotMatch(main.innerHTML,/早上好|Inego ·/);assert.equal(saves,0);
  await ui.handleClick({dataset:{readingStep:'2'},hasAttribute:()=>false});assert.match(main.innerHTML,/早上好/);assert.match(main.innerHTML,/CC BY 4\.0/);assert.match(main.innerHTML,/Tatoeba 原句/);assert.deepEqual(state.reading.completed,{greetings:true});assert.deepEqual(state.dates,[]);assert.equal(saves,1);
 }finally{globalThis.location=previous;}
 assert.equal(core.validateProgress(state).reading.completed.greetings,true);
 assert.throws(()=>core.validateProgress({...state,reading:{completed:{greetings:'yes'}}}));
});

test('新增JSON和MP3即可自动进入目录，原有课程无须修改',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ru-reading-build-'));
 try{
  for(const f of fs.readdirSync(root,{withFileTypes:true}).filter(e=>e.isFile()))fs.copyFileSync(path.join(root,f.name),path.join(dir,f.name));
  for(const d of ['assets','courses','scripts','modules','videos','reading'])fs.cpSync(path.join(root,d),path.join(dir,d),{recursive:true});
  const original=fs.readFileSync(path.join(dir,'app.js'));
  const item=JSON.parse(JSON.stringify(all[0]));item.id='next-lesson';item.order=9;item.category='机场';item.title='新增听读';
  for(const s of item.segments){s.source.audioId+=2000000;s.audioFile=`reading/audio/${s.source.audioId}.mp3`;fs.copyFileSync(path.join(root,'reading/audio',String(s.source.audioId-2000000)+'.mp3'),path.join(dir,s.audioFile));}
  fs.writeFileSync(path.join(dir,'reading/next-lesson.json'),JSON.stringify(item));
  execFileSync(process.execPath,[path.join(dir,'scripts/build.mjs')],{stdio:'pipe'});
  const catalog=reading.validateCatalog(JSON.parse(fs.readFileSync(path.join(dir,'site/reading/catalog.json'))));assert.equal(catalog.items.length,9);assert.equal(catalog.items.at(-1).category,'机场');assert.ok(fs.existsSync(path.join(dir,'site/reading/audio',item.segments[0].source.audioId+'.mp3')));assert.deepEqual(fs.readFileSync(path.join(dir,'app.js')),original);
  fs.rmSync(path.join(dir,item.segments[0].audioFile));assert.throws(()=>execFileSync(process.execPath,[path.join(dir,'scripts/build.mjs')],{stdio:'pipe'}),/Command failed/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
