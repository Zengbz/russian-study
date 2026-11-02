const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),videos=require('../videos.js');
const example=()=>JSON.parse(fs.readFileSync(path.join(root,'videos/lesson-01.json')));

test('提供的十课链接按课号写入，保留BV号并去除分享追踪参数',()=>{
 const expected=['BV1dT4y1A7Ma','BV1CgFPzwEMV','BV1c5FPz8EBE','BV1FiFAzxEMQ','BV1c5FPz8Ebc','BV1FiFAzxEpW','BV1rVFPzFEiW','BV1QQFAz5EXM','BV1rVFPzFEss','BV1rVFPzFEas'];
 const rows=Array.from({length:10},(_,i)=>videos.validateItem(JSON.parse(fs.readFileSync(path.join(root,`videos/lesson-${String(i+1).padStart(2,'0')}.json`)))));
 assert.deepEqual(rows.map(x=>x.bvid),expected);assert.deepEqual(rows.map(x=>x.order),Array.from({length:10},(_,i)=>i+1));
 assert.ok(rows.every(x=>x.categories.includes('俄语教程')&&x.p===1&&!videos.sourceUrl(x).includes('vd_source')));
});

test('视频来源仅接受B站BV号，分类由条目提供，排序和分页不改原数组',()=>{
 const a=videos.validateItem(example()),b={...example(),id:'next-video',bvid:'BV1dT4y1A7Mb',order:2,categories:['发音','俄语教程']};
 const catalog=videos.validateCatalog({schemaVersion:1,kind:'video-catalog',videos:[a,b]});
 assert.deepEqual(videos.categories(catalog.videos),['俄语教程','发音']);
 assert.deepEqual(videos.list(catalog.videos,'全部','asc').items.map(x=>x.order),[1,2]);
 assert.deepEqual(videos.list(catalog.videos,'全部','desc').items.map(x=>x.order),[2,1]);
 assert.deepEqual(videos.list(catalog.videos,'发音').items.map(x=>x.id),['next-video']);
 assert.equal(videos.list(catalog.videos,'全部','asc',3,1).page,2);
 assert.equal(videos.embedUrl(a),'https://player.bilibili.com/player.html?bvid=BV1dT4y1A7Ma&p=1&autoplay=0&danmaku=0');
 assert.equal(videos.sourceUrl(a),'https://www.bilibili.com/video/BV1dT4y1A7Ma/?p=1');
 assert.deepEqual(catalog.videos,[a,b]);
 assert.throws(()=>videos.validateItem({...a,bvid:'https://other.test/video'}));
 assert.throws(()=>videos.validateItem({...a,categories:['全部']}));
 assert.throws(()=>videos.validateItem({...a,title:'<script>oops</script>',url:'https://other.test'}));
 assert.throws(()=>videos.validateCatalog({...catalog,videos:[a,{...b,order:1}]}));
});

test('新增一份视频JSON即可自动出现在目录和分类，无需更改旧课程',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ru-video-build-'));
 try{
  for(const f of fs.readdirSync(root,{withFileTypes:true}).filter(e=>e.isFile()))fs.copyFileSync(path.join(root,f.name),path.join(dir,f.name));
  for(const d of ['assets','courses','scripts','modules','videos'])fs.cpSync(path.join(root,d),path.join(dir,d),{recursive:true});
  const before=fs.readFileSync(path.join(dir,'app.js')),oldWeek=fs.readFileSync(path.join(dir,'courses/week1-course.json'));
  const next={...example(),id:'pronunciation-part-eleven',bvid:'BV1dT4y1A7Mb',title:'第11课',order:11,categories:['发音','入门'],p:2};
  fs.writeFileSync(path.join(dir,'videos/pronunciation-part-eleven.json'),JSON.stringify(next));
  execFileSync(process.execPath,[path.join(dir,'scripts/build.mjs')],{stdio:'pipe'});
  const c=videos.validateCatalog(JSON.parse(fs.readFileSync(path.join(dir,'site/videos/catalog.json'))));
  assert.equal(c.videos.length,11);assert.deepEqual(videos.categories(c.videos),['俄语教程','发音','入门']);
  assert.ok(fs.existsSync(path.join(dir,'site/videos/pronunciation-part-eleven.json')));
  assert.deepEqual(fs.readFileSync(path.join(dir,'app.js')),before);assert.deepEqual(fs.readFileSync(path.join(dir,'courses/week1-course.json')),oldWeek);
  next.order=1;fs.writeFileSync(path.join(dir,'videos/pronunciation-part-eleven.json'),JSON.stringify(next));
  assert.throws(()=>execFileSync(process.execPath,[path.join(dir,'scripts/build.mjs')],{stdio:'pipe'}));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
