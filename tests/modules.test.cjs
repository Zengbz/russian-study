const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {execFileSync}=require('node:child_process'),crypto=require('node:crypto');
const core=require('../core.js'),modules=require('../modules.js'),{Loader}=require('../loader.js');
const root=path.join(__dirname,'..'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f))),clone=x=>JSON.parse(JSON.stringify(x));
const manifest=()=>read('modules/grammar/module.json'),pack=()=>read('modules/grammar/basics.json');
function registry(p=pack(),m=manifest()){
 return {schemaVersion:1,kind:'module-catalog',modules:[{...m,categories:[{id:p.id,title:p.title,summary:p.summary,order:p.order,file:`modules/${m.id}/${p.id}.json`,revision:'a'.repeat(64),lessons:p.lessons.map(l=>({id:l.id,title:l.title,goal:l.goal,level:l.level,tasks:l.questions.length}))}]}]};
}
function attempt(d,id='run-1'){
 return {id,index:d.questions.length-1,records:Object.fromEntries(d.questions.map(q=>[q.id,q.type==='oral'?{self:'independent'}:{correct:true}])),work:{}};
}
test('模块数据与每日课号分离，所有分类、先学链接和题号有效',()=>{
 const ids=new Set(),modulesRoot=path.join(root,'modules');let grammarTopics=0,grammarInputs=0;
 for(const entry of fs.readdirSync(modulesRoot,{withFileTypes:true}).filter(e=>e.isDirectory()&&!e.name.startsWith('.'))){
  const m=modules.validateManifest(read(`modules/${entry.name}/module.json`)),lessons=[];assert.equal(entry.name,m.id);
  for(const f of fs.readdirSync(path.join(modulesRoot,entry.name)).filter(f=>f.endsWith('.json')&&f!=='module.json')){
   const p=modules.validatePack(read(`modules/${entry.name}/${f}`),core);assert.equal(p.moduleId,m.id);assert.equal(f,p.id+'.json');lessons.push(...p.lessons);
   for(const l of p.lessons){assert.equal(l.day,undefined);for(const q of l.questions){assert.ok(!ids.has(q.id));ids.add(q.id);}}
  }
  const lessonIds=new Set(lessons.map(l=>l.id));assert.equal(lessonIds.size,lessons.length);
  for(const l of lessons)for(const id of l.prerequisites||[])assert.ok(lessonIds.has(id),`${l.id} -> ${id}`);
  if(m.id==='grammar'){grammarTopics=lessons.length;grammarInputs=lessons.flatMap(l=>l.questions).filter(q=>q.type==='input').length;}
 }
 // These are minimum guarantees, so adding future topics does not require editing tests.
 assert.ok(grammarTopics>=36);assert.ok(grammarInputs>=72);
});
test('所有模块输入题可接受省略重音与大小写，仍拒绝关键字母错误',()=>{
 for(const f of ['basics','cases','modifiers','verbs','patterns','numbers'])for(const l of read(`modules/grammar/${f}.json`).lessons)for(const q of l.questions){
  if(q.type==='input')for(const a of q.answers)assert.equal(core.gradeInput(q,'  '+a.toLocaleUpperCase('ru-RU').replace(/\s+/g,'   ')+'  ').correct,true,q.id);
  if(q.type==='order')assert.equal(core.gradeOrder(q,q.tokens.map((_,i)=>i)),true,q.id);
 }
 const yo=read('modules/grammar/basics.json').lessons.find(l=>l.id==='basics-gender').questions.find(q=>q.type==='input'&&q.mode==='cloze');assert.equal(core.gradeInput(yo,'мое').correct,false);
 const drink=read('modules/grammar/verbs.json').lessons.find(l=>l.id==='verbs-special').questions.find(q=>q.type==='input'&&q.mode==='cloze');assert.equal(core.gradeInput(drink,'пёте').correct,false);assert.equal(core.gradeInput(drink,'пьете').correct,false);
});
test('专题路由与分页适用于任意模块，不受90课或固定页数限制',()=>{
 assert.deepEqual(modules.parseRoute('#module/travel/category/transit/page/2'),{track:'module',moduleId:'travel',category:'transit',page:2,view:'catalog'});
 assert.deepEqual(modules.parseRoute('#module/travel/lesson/ticket-request/practice'),{track:'module',moduleId:'travel',id:'ticket-request',view:'practice'});
 assert.equal(modules.parseRoute('#module/constructor'),null);assert.equal(modules.parseRoute('#module/travel/category/all/page/0'),null);
 const items=Array.from({length:41},(_,i)=>i);assert.deepEqual(modules.paginate(items,7).items,[36,37,38,39,40]);assert.equal(modules.paginate(items,999).page,7);assert.equal(modules.paginate(items,-1).page,1);assert.equal(modules.paginate([],1).pages,1);
 assert.deepEqual(modules.parseKey(modules.key('travel','ticket-request')),{moduleId:'travel',id:'ticket-request'});
});
test('完成、重练专题均不改变每日课程、打卡、每日继续位置或复习队列',()=>{
 const state={schema:2,days:{1:{completed:true}},dates:['2026-10-01'],resume:{day:2,view:'learn'},review:{'d1-q1':{day:1}}};
 const before=clone(state),d={...pack().lessons[0],track:'module',moduleId:'grammar'},a=attempt(d);a.records[d.questions[0].id].correct=false;
 modules.lessonState(state,'grammar',d.id).attempt=a;modules.complete(state,d,a,core);modules.complete(state,d,a,core);
 const p=state.modules.grammar.lessons[d.id],first=clone(p.firstResult);assert.equal(p.runs.length,1);assert.ok(p.firstResult.rate<100);
 const retry=attempt(d,'run-2');p.attempt=retry;modules.complete(state,d,retry,core);assert.equal(p.runs.length,2);assert.equal(p.lastResult.rate,100);assert.deepEqual(p.firstResult,first);
 for(const field of ['days','dates','resume','review'])assert.deepEqual(state[field],before[field]);
 assert.deepEqual(state.modules.grammar.resume,{id:d.id,view:'result'});
 const incomplete=attempt(d,'incomplete');delete incomplete.records[d.questions.at(-1).id];assert.throws(()=>modules.complete(state,d,incomplete,core),/所有任务/);
});
test('模块备份兼容旧schema2，跨模块合并且保留未导入的记录',()=>{
 const state={schema:2,days:{},dates:[]};modules.lessonState(state,'grammar','existing').completed=true;modules.lessonState(state,'travel','ticket').completed=true;
 const before=clone(state);modules.mergeProgress(state,core.validateProgress({schema:2,days:{},dates:[]}));assert.deepEqual(state,before);
 const incoming={schema:2,days:{},dates:[],modules:{grammar:{lessons:{added:{completed:false,attempt:{index:1,records:{},work:{}}}},browse:{category:'all',page:2}}}};
 modules.mergeProgress(state,core.validateProgress(incoming));assert.ok(state.modules.grammar.lessons.existing.completed);assert.ok(state.modules.grammar.lessons.added);assert.ok(state.modules.travel.lessons.ticket.completed);
 const bad=clone(incoming);bad.modules.grammar.lessons.added.attempt.work=[];assert.throws(()=>core.validateProgress(bad));
 bad.modules.grammar.lessons.added.attempt.work={};bad.modules.grammar.browse.page=0;assert.throws(()=>core.validateProgress(bad));
 assert.throws(()=>core.validateProgress(JSON.parse('{"schema":2,"days":{},"dates":[],"modules":{"__proto__":{"lessons":{}}}}')));
});
test('目录、表格、音频路径和题号错误在发布前被拒绝',()=>{
 const p=pack();p.lessons[0].sections[0].table.rows[0].pop();assert.throws(()=>modules.validatePack(p,core),/表格/);
 const q=pack();q.lessons[0].questions[0].id='d1-q1';assert.throws(()=>modules.validatePack(q,core),/题号/);
 const a=pack();a.lessons[0].questions[0].audioFile='https://other.test/x.mp3';assert.throws(()=>modules.validatePack(a,core),/音频/);
 const c=registry();c.modules[0].categories[0].file='modules/../basics.json';assert.throws(()=>modules.validateCatalog(c));
 const reserved=registry();reserved.modules[0].categories[0].id='all';assert.throws(()=>modules.validateCatalog(reserved));
});
test('同分类并发加载合并请求，离线保留有效缓存，坏模块不污染每日目录',async()=>{
 const original={fetch:global.fetch,caches:global.caches},store=new Map();let offline=false,broken=false,hits=0;
 const p=pack(),catalog=registry(p),cache={match:async k=>store.get(k.url||k.href)?.clone(),put:async(k,v)=>store.set(k.url||k.href,v.clone()),delete:async k=>store.delete(k.url),keys:async()=>[...store.keys()].map(x=>new Request(x))};
 global.caches={open:async()=>cache};global.fetch=async url=>{hits++;if(offline)throw Error('offline');return new Response(broken?'broken':JSON.stringify(new URL(url).pathname.endsWith('/catalog.json')?catalog:p));};
 try{
  const loader=new Loader(core,'https://example.test/repo/'),daily=read('courses/catalog.json');loader.catalog=daily;
  const repo=new modules.Repository(loader,core);await repo.init();const n=hits;await Promise.all([repo.load('grammar','basics'),repo.load('grammar','basics')]);assert.equal(hits,n+1);
  const lesson=repo.loadedLesson('grammar',p.lessons[0].id);assert.equal(lesson.track,'module');assert.equal(lesson.day,modules.key('grammar',lesson.id));assert.equal(loader.catalog,daily);
  offline=true;const offlineRepo=new modules.Repository(loader,core);await offlineRepo.init();assert.equal(offlineRepo.offline,true);assert.equal((await offlineRepo.lesson('grammar',lesson.id)).id,lesson.id);
  offline=false;broken=true;const size=store.size;await assert.rejects(loader.json('modules/bad.json',modules.validateCatalog));assert.equal(store.size,size);assert.equal(loader.catalog,daily);
  // A failed refresh keeps the last usable directory, and does not clear loaded lessons.
  const usableCatalog=repo.catalog;store.delete('https://example.test/repo/modules/catalog.json');await assert.rejects(repo.init(true));assert.equal(repo.catalog,usableCatalog);assert.ok(repo.loadedLesson('grammar',lesson.id));
 }finally{Object.assign(global,original);}
});
test('仅新增模块文件夹和分类JSON即可生成首页目录，无需修改程序或既有模块',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ru-modules-'));
 try{
  for(const f of fs.readdirSync(root,{withFileTypes:true}).filter(e=>e.isFile()))fs.copyFileSync(path.join(root,f.name),path.join(dir,f.name));
  for(const d of ['assets','courses','scripts','modules'])fs.cpSync(path.join(root,d),path.join(dir,d),{recursive:true});
  const originalApp=fs.readFileSync(path.join(dir,'app.js')),originalGrammar=fs.readFileSync(path.join(dir,'modules/grammar/basics.json'));
  const m={...manifest(),id:'travel',title:'旅行专项',order:20},p=pack();p.moduleId='travel';p.id='tickets';p.title='买票';p.lessons=p.lessons.slice(0,1);p.lessons[0].id='ticket-request';p.lessons[0].prerequisites=[];p.lessons[0].questions.forEach((q,i)=>q.id='travel-ticket-q'+i);
  fs.mkdirSync(path.join(dir,'modules/travel'));fs.writeFileSync(path.join(dir,'modules/travel/module.json'),JSON.stringify(m));fs.writeFileSync(path.join(dir,'modules/travel/tickets.json'),JSON.stringify(p));
  const next=clone(p);next.id='hotel';next.title='住宿';next.lessons[0].id='hotel-request';next.lessons[0].questions.forEach((q,i)=>q.id='travel-hotel-q'+i);fs.writeFileSync(path.join(dir,'modules/travel/hotel.json'),JSON.stringify(next));
  execFileSync(process.execPath,[path.join(dir,'scripts/build.mjs')],{stdio:'pipe'});
  const c=modules.validateCatalog(JSON.parse(fs.readFileSync(path.join(dir,'site/modules/catalog.json')))),travel=c.modules.find(m=>m.id==='travel');assert.equal(travel.categories.length,2);assert.equal(travel.categories.flatMap(c=>c.lessons).length,2);
  const meta=travel.categories.find(c=>c.id==='tickets');assert.equal(meta.revision,crypto.createHash('sha256').update(JSON.stringify(p)).digest('hex'));assert.ok(fs.existsSync(path.join(dir,'site',meta.file)));
  assert.deepEqual(fs.readFileSync(path.join(dir,'app.js')),originalApp);assert.deepEqual(fs.readFileSync(path.join(dir,'modules/grammar/basics.json')),originalGrammar);
  const repo=new modules.Repository({json:async(_,validate)=>({data:validate(c),cached:false})},core);repo.catalog=c;assert.equal(repo.metadata('travel').title,'旅行专项');
  // Duplicate topic IDs fail validation before a broken catalog can be published.
  next.lessons[0].id='ticket-request';fs.writeFileSync(path.join(dir,'modules/travel/hotel.json'),JSON.stringify(next));assert.throws(()=>execFileSync(process.execPath,[path.join(dir,'scripts/build.mjs')],{stdio:'pipe'}));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
