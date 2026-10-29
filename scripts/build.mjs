import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const core=createRequire(import.meta.url)('../core.js');
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
const alphabet=JSON.parse(fs.readFileSync(path.join(root,'alphabet.json')));
for(const l of alphabet)for(const key of ['soundFile','nameFile'])if(!l[key]||!fs.existsSync(path.join(root,l[key])))throw Error('缺少字母录音：'+l.upper+' '+key+' '+l[key]);
const runtime=['index.html','styles.css','app.js','core.js','loader.js','audio.js','sw.js','alphabet.json','roadmap.json','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png','AUDIO-CREDITS.html','.nojekyll'];
const out=path.join(root,process.argv[2]||'site');
if(!['site','dist'].includes(path.basename(out))||path.dirname(out)!==root)throw Error('仅允许输出到项目的site/或dist/。');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
for(const f of runtime)fs.copyFileSync(path.join(root,f),path.join(out,f));
for(const f of ['assets','courses'])fs.cpSync(path.join(root,f),path.join(out,f),{recursive:true});
console.log(JSON.stringify({weeks:weeks.length,lessons:days.size,questions:ids.size,output:out}));
