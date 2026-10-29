const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const core=require('../core.js'),{Player}=require('../audio.js'),{Loader}=require('../loader.js');
const root=path.join(__dirname,'..'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f)));
test('前三周21课301题，后两周42道输入题且旧题编号保留',()=>{
 const packs=[1,2,3].map(w=>core.validatePack(read(`courses/week${w}-course.json`))),lessons=packs.flatMap(p=>p.lessons),qs=lessons.flatMap(l=>l.questions);
 assert.equal(lessons.length,21);assert.equal(qs.length,301);assert.equal(qs.filter(q=>q.type==='input').length,42);assert.equal(new Set(qs.map(q=>q.id)).size,301);
 assert.deepEqual(packs[0].lessons.flatMap(l=>l.questions.map(q=>q.id)),read('tests/fixtures/week1-legacy.json').lessons.flatMap(l=>l.questions.map(q=>q.id)));
 for(const p of packs.slice(1))for(const l of p.lessons){assert.ok(l.questions.length>=14);assert.ok(l.questions.some(q=>q.type==='oral'));assert.ok(l.questions.filter(q=>q.type==='input').length>=3);}
});
test('33字母分组完整，全部名称与音值具有本地文件，М不指向эм录音',()=>{
 const a=read('alphabet.json');assert.equal(a.length,33);assert.equal(new Set(a.map(l=>l.upper)).size,33);
 for(const [group,count]of Object.entries({vowel:10,voiced:6,voiceless:6,sonorant:5,unpaired:4,sign:2}))assert.equal(a.filter(l=>l.group===group).length,count);
 for(const l of a)for(const k of ['soundFile','nameFile'])assert.ok(fs.statSync(path.join(root,l[k])).size>1000,l.upper+' '+k);
 const m=a.find(l=>l.upper==='М');assert.equal(m.name,'эм');assert.notEqual(m.soundFile,m.nameFile);
});
test('拼写判题容忍重音、空格、大小写、句末标点，保留关键字母',()=>{
 assert.equal(core.gradeInput({answers:['Где метро?']},'  ГДЕ   метро́！ ').correct,true);
 assert.equal(core.gradeInput({answers:['отель']},'отел').correct,false);
 assert.equal(core.gradeInput({answers:['чай']},'чаи').correct,false);
 assert.equal(core.gradeInput({answers:['моё']},'мое').correct,false);
 assert.equal(core.gradeInput({answers:['моё'],normalization:{strictYo:false}},'мое').correct,true);
 assert.equal(core.gradeInput({answers:['Да'],normalization:{caseSensitive:true}},'да').correct,false);
 assert.equal(core.gradeInput({answers:['Спасибо!'],normalization:{punctuation:true}},'Спасибо').correct,false);
 assert.equal(core.gradeInput({answers:['Меня зовут Анна.','Я Анна.']},'я анна').correct,true);
 assert.equal(core.gradeInput({answers:['мама']},'мaмa').valid,false);assert.equal(core.gradeInput({answers:['да']},' ').valid,false);
});
test('字符差异保留正确段，并分别标出多字、漏字、错字',()=>{
 const diff=core.textDiff('отел','отель');assert.equal(diff.map(d=>d.text).join(''),'отель');assert.deepEqual(diff.at(-1),{kind:'missing',text:'ь'});
 assert.ok(core.textDiff('отелл','отель').some(x=>x.kind==='wrong'));
});
test('相同词块交换不误判；同侧重复配对标签在发布前拒绝',()=>{
 assert.equal(core.gradeOrder({tokens:['Я','турист.','Я','программист.']},[2,1,0,3]),true);
 assert.equal(core.gradeOrder({tokens:['Я','турист.','Я','программист.']},[0,3,2,1]),false);
 const p=read('courses/week2-course.json');p.lessons[0].questions[0].pairs=[['М','中性'],['Н','中性']];assert.throws(()=>core.validatePack(p),/标签不能重复/);
});
test('抄写不计独立分，文字辅助听写保留待练，首次成绩不覆盖',()=>{
 const lesson=read('courses/week2-course.json').lessons[0],records=Object.fromEntries(lesson.questions.map(q=>[q.id,q.type==='oral'?{self:'independent'}:{correct:true}]));
 const copy=lesson.questions.find(q=>q.practiceOnly);records[copy.id]={correct:false};const r=core.summarize(lesson,records);assert.equal(r.rate,100);assert.ok(!r.weakIds.includes(copy.id));
 const d=read('courses/week2-course.json').lessons[1],q=d.questions.find(q=>q.mode==='dictation');assert.equal(core.summarize(d,{[q.id]:{correct:true,textOnly:true}}).pendingAudio,1);
});
test('备份兼容旧schema2，拒绝不完整备份和原型字段',()=>{
 assert.equal(core.validateProgress({schema:2,days:{},dates:[]}).schema,2);
 assert.throws(()=>core.validateProgress({schema:2,days:{1:{attempt:{index:1}}},dates:[]}));
 assert.throws(()=>core.validateProgress(JSON.parse('{"schema":2,"days":{},"dates":[],"__proto__":{}}')));
});
test('目录不限周数，允许缺号，拒绝重复课号与外部地址',()=>{
 const week=n=>({week:n,file:`courses/week${n}-course.json`,revision:'a'.repeat(64),lessons:[{day:n*7}]}),c={schemaVersion:2,weeks:[week(1),week(200)]};assert.equal(core.validateCatalog(c).weeks.length,2);
 c.weeks[1].lessons[0].day=7;assert.throws(()=>core.validateCatalog(c));c.weeks[1]=week(200);c.weeks[1].file='https://bad.test/a.json';assert.throws(()=>core.validateCatalog(c));
});
test('新增任意周JSON可自动发现，既有周数不写死',()=>{
 const os=require('node:os'),{execFileSync}=require('node:child_process'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'ru-course-build-'));
 try{
  for(const f of ['index.html','styles.css','app.js','core.js','loader.js','audio.js','sw.js','alphabet.json','roadmap.json','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png','AUDIO-CREDITS.html','.nojekyll'])fs.copyFileSync(path.join(root,f),path.join(dir,f));
  for(const d of ['assets','courses','scripts'])fs.cpSync(path.join(root,d),path.join(dir,d),{recursive:true});
  const existingFiles=fs.readdirSync(path.join(root,'courses')).filter(f=>/^week[1-9]\d*-course\.json$/.test(f));
  const existing=existingFiles.map(f=>read('courses/'+f)),weeks=existing.map(p=>p.week).sort((a,b)=>a-b);
  const extraWeek=Math.max(...weeks)+1000,extraDay=Math.max(...existing.flatMap(p=>p.lessons.map(l=>l.day)))+1000;
  const p=read('courses/week2-course.json');p.week=extraWeek;p.lessons=p.lessons.slice(0,1);p.lessons[0].day=extraDay;p.lessons[0].questions.forEach((q,i)=>q.id='d'+extraDay+'-q'+i);
  fs.writeFileSync(path.join(dir,'courses/week'+extraWeek+'-course.json'),JSON.stringify(p));
  execFileSync(process.execPath,[path.join(dir,'scripts/build.mjs')],{stdio:'pipe'});
  const catalog=JSON.parse(fs.readFileSync(path.join(dir,'site/courses/catalog.json')));assert.deepEqual(catalog.weeks.map(w=>w.week),[...weeks,extraWeek]);assert.equal(catalog.weeks.find(w=>w.week===extraWeek).lessons[0].day,extraDay);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('连续点击打断旧音频，旧事件不改变新播放状态',()=>{
 const audio=[],states=[];class FakeAudio{constructor(src){this.src=src;audio.push(this);}play(){return Promise.resolve();}pause(){this.paused=true;}}
 const player=new Player({env:{Audio:FakeAudio,speechSynthesis:{cancel(){}}},onState:(...s)=>states.push(s)});
 player.play({src:'m.mp3',key:'m'});player.play({src:'t.mp3',key:'t'});assert.equal(audio[0].paused,true);audio[0].onplaying();assert.notDeepEqual(states.at(-1),['playing','m']);audio[1].onplaying();assert.deepEqual(states.at(-1),['playing','t']);player.play({src:'t.mp3',key:'t'});assert.equal(audio.length,3);player.stop();
});
test('每次系统朗读新建utterance，恢复暂停，支持俄语语音选择',()=>{
 let resumed=0,cancelled=0;const said=[];class U{constructor(t){this.text=t;}}
 const voice={lang:'ru-RU',voiceURI:'v',localService:true};const p=new Player({env:{SpeechSynthesisUtterance:U,speechSynthesis:{paused:true,getVoices:()=>[voice],cancel:()=>cancelled++,resume:()=>resumed++,speak:u=>said.push(u)}},normalize:core.normalize});
 p.play({text:'Приве́т!'});p.play({text:'Приве́т!'});assert.notEqual(said[0],said[1]);assert.equal(said[1].text,'Привет!');assert.equal(said[1].voice,voice);assert.equal(resumed,2);assert.ok(cancelled>=2);p.stop();
});
test('课程包缓存按revision更新，离线可回退旧包，坏JSON不写入缓存',async()=>{
 const original={fetch:global.fetch,caches:global.caches};let offline=false,version=1;const store=new Map(),cache={match:async k=>store.get(typeof k==='string'?k:k.url||k.href)?.clone(),put:async(k,v)=>store.set(k.url||k.href,v.clone()),keys:async()=>[...store.keys()].map(x=>new Request(x)),delete:async k=>store.delete(k.url)};
 global.caches={open:async()=>cache};const pack=read('courses/week2-course.json');global.fetch=async()=>{if(offline)throw Error('offline');return new Response(version===1?JSON.stringify(pack):'broken');};
 try{const loader=new Loader(core,'https://example.test/repo/');const meta={week:2,file:'courses/week2-course.json',revision:'a'.repeat(64),lessons:pack.lessons.map(l=>({day:l.day}))};loader.catalog={schemaVersion:2,weeks:[meta]};await loader.load(2);assert.equal(store.size,1);offline=true;loader.loaded.clear();meta.revision='b'.repeat(64);assert.equal((await loader.load(2)).week,2);assert.ok(loader.stale.has(2));offline=false;version=2;await assert.rejects(loader.json('bad.json',core.validatePack));assert.equal(store.size,1);}finally{Object.assign(global,original);}
});
