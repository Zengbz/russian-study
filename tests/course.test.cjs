const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const course=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/week1-legacy.json'),'utf8'));
const core=require('../core.js');
const recordsFor=(d,correct=true)=>Object.fromEntries(d.questions.map(q=>[q.id,q.type==='oral'?{correct:null,self:'independent'}:{correct,assisted:false,textOnly:false}]));

test('首周102项任务、20字母、90天路线及题目完整性',()=>{
 assert.equal(course.lessons.length,7);assert.equal(course.letters.length,20);assert.equal(course.roadmap.length,90);
 assert.equal(course.lessons.flatMap(d=>d.questions).length,102);
 assert.equal(course.lessons.flatMap(d=>d.questions).filter(q=>q.type==='oral').length,8);
 const ids=new Set();
 for(const d of course.lessons){
  const allowed=new Set(course.letters.slice(0,Math.min(d.day,5)*4).map(x=>x.upper));
  for(const q of d.questions){
   assert.ok(!ids.has(q.id));ids.add(q.id);assert.ok(q.explanation);
   if(q.type==='choice'||q.type==='listen'){
    assert.equal(new Set(q.options.map(core.normalize)).size,q.options.length);
    assert.equal(q.options.filter(x=>x===q.answer).length,1);
   }
   if(q.type==='listen')assert.ok(q.audio&&q.reveal);
   if(q.type==='match')for(const [upper,lower]of q.pairs){assert.ok(allowed.has(upper));assert.equal(lower,upper.toLowerCase());}
  }
 }
});
test('选择题答案位置有变化，重进同一轮时顺序稳定',()=>{
 const qs=course.lessons.flatMap(d=>d.questions).filter(q=>q.options);
 const positions=new Set(qs.map(q=>core.shuffled(q.options,q.id+'attempt').indexOf(q.answer)));
 assert.ok(positions.size>=3);
 assert.deepEqual(core.shuffled(['a','b','c','d'],'same'),core.shuffled(['a','b','c','d'],'same'));
});
test('去重音保留ё和Й，不把两种字母错误合并',()=>{
 assert.equal(core.normalize('метро́'),'метро');assert.equal(core.normalize('всё'),'всё');assert.equal(core.normalize('Й'),'Й');
});
test('漏做开口任务时不能完成课程',()=>{
 const d=course.lessons[0],records=recordsFor(d);delete records[d.questions.at(-1).id];
 assert.throws(()=>core.completeDay({},d,{id:'a',records},'2026-10-29'),/所有任务/);
});
test('文字辅助不冒充听力得分，且掌握状态保留待练标记',()=>{
 const d=course.lessons[0],records=recordsFor(d);const q=d.questions.find(x=>x.type==='listen');
 records[q.id]={correct:true,textOnly:true,assisted:true};
 const result=core.summarize(d,records);assert.equal(result.objective,13);assert.equal(result.pendingAudio,1);assert.equal(result.mastered,false);
});
test('首次成绩不会被重练覆盖，同轮完成不会重复增加记录',()=>{
 const d=course.lessons[0],s={},records=recordsFor(d);records[d.questions[0].id].correct=false;
 const first={id:'first',records};core.completeDay(s,d,first,'2026-10-29');core.completeDay(s,d,first,'2026-10-29');
 assert.equal(s.runs.length,1);const rate=s.firstResult.rate;
 core.completeDay(s,d,{id:'second',records:recordsFor(d)},'2026-10-30');
 assert.equal(s.firstResult.rate,rate);assert.equal(s.lastResult.rate,100);assert.equal(s.runs.length,2);
 const restored=JSON.parse(JSON.stringify(s));assert.equal(restored.firstResult.rate,rate);assert.equal(restored.runs.length,2);
});
test('口头提示与需要练习分别记录，不授予独立掌握',()=>{
 const d=course.lessons[0],records=recordsFor(d);records[d.questions.at(-1).id]={correct:null,self:'practice'};
 const result=core.summarize(d,records);assert.equal(result.independent,0);assert.equal(result.mastered,false);assert.ok(result.weakIds.includes(d.questions.at(-1).id));
});
test('连续天数使用本地日历，允许今天尚未完成',()=>{
 const now=new Date(2026,0,1,0,30);assert.equal(core.localDate(now),'2026-01-01');
 assert.equal(core.streak(['2025-12-30','2025-12-31'],now),2);assert.equal(core.streak(['2025-12-31','2026-01-01'],now),2);
 assert.equal(core.streak(['2025-12-29'],now),0);
});
test('Service Worker在仓库子路径预缓存，离线返回课程，缺失脚本不回退成HTML',async()=>{
 const scope='https://example.test/russian-travel/';let offline=false,skip=0,claim=0;
 const handlers={},stores=new Map();
 const key=req=>typeof req==='string'?req:req instanceof URL?req.href:req.url;
 const fakeFetch=async req=>{if(offline)throw new Error('offline');return new Response('asset:'+new URL(key(req)).pathname);};
 const caches={
  open:async name=>{if(!stores.has(name))stores.set(name,new Map());const store=stores.get(name);return{
   addAll:async reqs=>{for(const req of reqs)store.set(key(req),await fakeFetch(req));},
   put:async(req,res)=>store.set(key(req),res.clone()),match:async req=>store.get(key(req))?.clone()
  };},keys:async()=>[...stores.keys()],delete:async name=>stores.delete(name)
 };
 const context={URL,Request,Response,caches,fetch:fakeFetch,self:{registration:{scope},location:{origin:'https://example.test'},skipWaiting:async()=>skip++,clients:{claim:async()=>claim++},addEventListener:(type,fn)=>handlers[type]=fn}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'sw.js'),'utf8'),context);
 let pending;handlers.install({waitUntil:p=>pending=p});await pending;handlers.activate({waitUntil:p=>pending=p});await pending;
 assert.equal(skip,1);assert.equal(claim,1);const stored=[...stores.values()][0];
 assert.ok([...stored.keys()].every(k=>k.startsWith(scope)));assert.ok(stored.has(scope+'app.js?v=pocket-2-1'));
 offline=true;
 const run=req=>{let result;handlers.fetch({request:req,respondWith:p=>result=p});return result;};
 const nav=await run({method:'GET',url:scope+'index.html',mode:'navigate'});assert.match(await nav.text(),/index.html/);
 const js=await run({method:'GET',url:scope+'app.js?v=pocket-2-1',mode:'cors'});assert.match(await js.text(),/app.js/);
 await assert.rejects(run({method:'GET',url:scope+'missing.js',mode:'cors'}),/offline/);
 assert.equal(run({method:'GET',url:'https://elsewhere.test/file',mode:'cors'}),undefined);
});
