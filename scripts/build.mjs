import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const core=createRequire(import.meta.url)('../core.js');
const modules=createRequire(import.meta.url)('../modules.js');
const videos=createRequire(import.meta.url)('../videos.js');
const reading=createRequire(import.meta.url)('../reading.js');
const files=fs.readdirSync(path.join(root,'courses')).filter(f=>/^week[1-9]\d*-course\.json$/.test(f));
if(!files.length)throw Error('courses/ 下没有有效的每周课程。');
const weeks=[],days=new Set(),ids=new Set();
for(const file of files){
 const bytes=fs.readFileSync(path.join(root,'courses',file)),p=core.validatePack(JSON.parse(bytes));
 if(p.week!==Number(file.match(/\d+/)[0]))throw Error(file+' 的week与文件名不一致。');
 for(const l of p.lessons){if(days.has(l.day))throw Error('跨周课号重复：'+l.day);days.add(l.day);for(const q of l.questions){if(ids.has(q.id))throw Error('跨周题号重复：'+q.id);ids.add(q.id);}}
 weeks.push({week:p.week,title:p.title,summary:p.summary||'',file:'courses/'+file,revision:crypto.createHash('sha256').update(bytes).digest('hex'),lessons:p.lessons.map(l=>({day:l.day,title:l.title,subtitle:l.subtitle,kind:l.kind,tasks:l.questions.length}))});
}
weeks.sort((a,b)=>a.week-b.week);const catalog={schemaVersion:2,weeks};core.validateCatalog(catalog);
fs.writeFileSync(path.join(root,'courses/catalog.json'),JSON.stringify(catalog,null,2)+'\n');
// New content modules register themselves through their folder's module.json.
// Neither the home page nor this scanner contains a list of module IDs.
const moduleRoot=path.join(root,'modules'),moduleCatalog={schemaVersion:1,kind:'module-catalog',modules:[]};
if(fs.existsSync(moduleRoot))for(const entry of fs.readdirSync(moduleRoot,{withFileTypes:true})){
 if(!entry.isDirectory()||entry.name.startsWith('.'))continue;
 const dir=path.join(moduleRoot,entry.name),manifest=modules.validateManifest(JSON.parse(fs.readFileSync(path.join(dir,'module.json'))));
 if(manifest.id!==entry.name)throw Error('模块目录名与id不一致：'+entry.name);
 const categories=[],lessonIds=new Set();
 for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.json')&&f!=='module.json')){
  const bytes=fs.readFileSync(path.join(dir,file)),p=modules.validatePack(JSON.parse(bytes),core);
  if(p.moduleId!==manifest.id||file!==p.id+'.json')throw Error('模块分类id与路径不一致：'+file);
  for(const l of p.lessons){
   if(lessonIds.has(l.id))throw Error('同模块专题id重复：'+l.id);lessonIds.add(l.id);
   for(const q of l.questions){if(ids.has(q.id))throw Error('跨课程题号重复：'+q.id);ids.add(q.id);if(q.audioFile&&!fs.existsSync(path.join(root,q.audioFile)))throw Error('缺少模块音频：'+q.audioFile);}
  }
  categories.push({id:p.id,title:p.title,summary:p.summary,order:p.order,file:`modules/${manifest.id}/${file}`,revision:crypto.createHash('sha256').update(bytes).digest('hex'),lessons:p.lessons.map(l=>({id:l.id,title:l.title,goal:l.goal,level:l.level,tasks:l.questions.length}))});
 }
 categories.sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));
 moduleCatalog.modules.push({...manifest,categories});
}
moduleCatalog.modules.sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));modules.validateCatalog(moduleCatalog);
fs.mkdirSync(moduleRoot,{recursive:true});fs.writeFileSync(path.join(moduleRoot,'catalog.json'),JSON.stringify(moduleCatalog,null,2)+'\n');
// Each video is a self-contained JSON entry. A new file is enough to extend the directory.
const videoRoot=path.join(root,'videos'),videoCatalog={schemaVersion:1,kind:'video-catalog',videos:[]};
fs.mkdirSync(videoRoot,{recursive:true});
for(const file of fs.readdirSync(videoRoot).filter(f=>f.endsWith('.json')&&f!=='catalog.json')){
 const video=videos.validateItem(JSON.parse(fs.readFileSync(path.join(videoRoot,file))));
 if(file!==video.id+'.json')throw Error('视频文件名与id不一致：'+file);
 videoCatalog.videos.push(video);
}
videoCatalog.videos.sort((a,b)=>a.order-b.order);videos.validateCatalog(videoCatalog);
fs.writeFileSync(path.join(videoRoot,'catalog.json'),JSON.stringify(videoCatalog,null,2)+'\n');
// Listening/reading lessons are independent JSON packs; the catalog is generated.
const readingRoot=path.join(root,'reading'),readingCatalog={schemaVersion:1,kind:'reading-catalog',items:[]},readingAudio=new Set();
fs.mkdirSync(readingRoot,{recursive:true});
for(const file of fs.readdirSync(readingRoot).filter(f=>f.endsWith('.json')&&f!=='catalog.json')){
 const bytes=fs.readFileSync(path.join(readingRoot,file)),item=reading.validateItem(JSON.parse(bytes));
 if(file!==item.id+'.json')throw Error('听读文件名与编号不一致：'+file);
 for(const segment of item.segments){
  if(readingAudio.has(segment.source.audioId))throw Error('听读录音编号重复：'+segment.source.audioId);
  readingAudio.add(segment.source.audioId);
  const audio=path.join(root,segment.audioFile);
  if(!fs.existsSync(audio)||fs.statSync(audio).size<1500||fs.readFileSync(audio).subarray(0,3).toString()!=='ID3')throw Error('缺少或损坏的MP3录音：'+segment.audioFile);
 }
 readingCatalog.items.push({id:item.id,order:item.order,title:item.title,category:item.category,level:item.level,description:item.description,segments:item.segments.length,file:`reading/${file}`,revision:crypto.createHash('sha256').update(bytes).digest('hex')});
}
readingCatalog.items.sort((a,b)=>a.order-b.order);reading.validateCatalog(readingCatalog);
fs.writeFileSync(path.join(readingRoot,'catalog.json'),JSON.stringify(readingCatalog,null,2)+'\n');
const alphabet=JSON.parse(fs.readFileSync(path.join(root,'alphabet.json')));
for(const l of alphabet)for(const key of ['soundFile','nameFile'])if(!l[key]||!fs.existsSync(path.join(root,l[key])))throw Error('缺少字母录音：'+l.upper+' '+key+' '+l[key]);
const runtime=['index.html','styles.css','app.js','core.js','loader.js','audio.js','modules.js','module-ui.js','videos.js','video-ui.js','reading.js','reading-ui.js','sw.js','alphabet.json','roadmap.json','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png','AUDIO-CREDITS.html','.nojekyll'];
const out=path.join(root,process.argv[2]||'site');
if(!['site','dist'].includes(path.basename(out))||path.dirname(out)!==root)throw Error('仅允许输出到项目的site/或dist/。');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
for(const f of runtime)fs.copyFileSync(path.join(root,f),path.join(out,f));
for(const f of ['assets','courses','modules','videos','reading'])fs.cpSync(path.join(root,f),path.join(out,f),{recursive:true});
console.log(JSON.stringify({weeks:weeks.length,lessons:days.size,questions:weeks.reduce((n,w)=>n+w.lessons.reduce((n,l)=>n+l.tasks,0),0),modules:moduleCatalog.modules.length,topics:moduleCatalog.modules.reduce((n,m)=>n+m.categories.reduce((n,c)=>n+c.lessons.length,0),0),videos:videoCatalog.videos.length,reading:readingCatalog.items.length,recordings:readingAudio.size,output:out}));
