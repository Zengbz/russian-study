(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PocketModules=api;})(globalThis,function(){
 'use strict';
 const forbidden=new Set(['constructor','prototype','__proto__']);
 const slug=s=>typeof s==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(s)&&!forbidden.has(s);
 const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
 const text=s=>typeof s==='string'&&Boolean(s.trim());
 function validateManifest(m){
  if(!object(m)||m.schemaVersion!==1||m.kind!=='learning-module'||!slug(m.id)||!text(m.title)||!text(m.summary)||!Number.isFinite(m.order))throw Error('模块说明格式无效。');
  if(m.symbol!==undefined&&(!text(m.symbol)||m.symbol.length>8))throw Error('模块图标应为简短文字。');
  return m;
 }
 function validatePack(p,core){
  if(!object(p)||p.schemaVersion!==1||p.kind!=='lesson-category'||!slug(p.moduleId)||!slug(p.id)||p.id==='all'||!text(p.title)||!text(p.summary)||!Number.isFinite(p.order)||!Array.isArray(p.lessons)||!p.lessons.length)throw Error('模块分类格式无效。');
  const ids=new Set();
  for(const l of p.lessons){
   if(!slug(l.id)||ids.has(l.id)||!text(l.title)||!text(l.goal)||!['基础','进阶'].includes(l.level)||!Array.isArray(l.sections)||!l.sections.length)throw Error('专题编号或讲解不完整。');ids.add(l.id);
   for(const s of l.sections){
    if(!object(s)||!text(s.title)||!text(s.text))throw Error('专题讲解缺少标题或正文。');
    if(s.table&&(!Array.isArray(s.table.headers)||s.table.headers.length<2||!s.table.headers.every(text)||!Array.isArray(s.table.rows)||!s.table.rows.length||s.table.rows.some(r=>!Array.isArray(r)||r.length!==s.table.headers.length||!r.every(text))))throw Error('语法表格格式无效。');
    if(s.examples&&(!Array.isArray(s.examples)||s.examples.some(e=>!text(e.ru)||!text(e.zh))))throw Error('例句格式无效。');
   }
   if(l.prerequisites&&(!Array.isArray(l.prerequisites)||!l.prerequisites.every(slug)))throw Error('建议先学的专题编号无效。');
   for(const q of l.questions||[]){
    if(!text(q.id)||!q.id.startsWith(p.moduleId+'-'))throw Error('模块题号必须以模块编号开头。');
    if(q.audioFile&&(!q.audioFile.startsWith('modules/'+p.moduleId+'/assets/')||q.audioFile.includes('..')||/[?#\\]/.test(q.audioFile)))throw Error('模块音频必须位于本模块assets内。');
   }
  }
  // Reuse the established question validator without giving topics day numbers.
  core.validatePack({schemaVersion:2,week:1,title:p.title,lessons:p.lessons.map((l,i)=>({...l,day:i+1,letters:[],vocabulary:[],phrases:[],notes:[]}))});
  return p;
 }
 function validateCatalog(c){
  if(!object(c)||c.schemaVersion!==1||c.kind!=='module-catalog'||!Array.isArray(c.modules))throw Error('拓展模块目录格式无效。');
  const ids=new Set();
  for(const m of c.modules){
   validateManifest(m);if(ids.has(m.id)||!Array.isArray(m.categories)||!m.categories.length)throw Error('模块重复或分类缺失。');ids.add(m.id);
   const cats=new Set(),lessons=new Set();
   for(const p of m.categories){
    if(!slug(p.id)||p.id==='all'||cats.has(p.id)||!text(p.title)||!text(p.summary)||!Number.isFinite(p.order)||p.file!==`modules/${m.id}/${p.id}.json`||!/^[a-f0-9]{64}$/.test(p.revision)||!Array.isArray(p.lessons)||!p.lessons.length)throw Error('模块分类路径或版本无效。');cats.add(p.id);
    for(const l of p.lessons){if(!slug(l.id)||lessons.has(l.id)||!text(l.title)||!text(l.goal)||!['基础','进阶'].includes(l.level)||!Number.isSafeInteger(l.tasks)||l.tasks<1)throw Error('专题目录重复或不完整。');lessons.add(l.id);}
   }
  }
  return c;
 }
 function key(moduleId,id){if(!slug(moduleId)||!slug(id))throw Error('专题编号无效。');return 'module:'+moduleId+':'+id;}
 function parseKey(s){const m=String(s).match(/^module:([a-z][a-z0-9-]*):([a-z][a-z0-9-]*)$/);return m&&slug(m[1])&&slug(m[2])?{moduleId:m[1],id:m[2]}:null;}
 function parseRoute(hash){
  let m=hash.match(/^#module\/([a-z][a-z0-9-]*)\/lesson\/([a-z][a-z0-9-]*)\/(learn|practice|result)$/);
  if(m&&slug(m[1])&&slug(m[2]))return {track:'module',moduleId:m[1],id:m[2],view:m[3]};
  m=hash.match(/^#module\/([a-z][a-z0-9-]*)(?:\/category\/(all|[a-z][a-z0-9-]*)\/page\/([1-9]\d*))?$/);
  return m&&slug(m[1])?{track:'module',moduleId:m[1],category:m[2]||null,page:Number(m[3]||0),view:'catalog'}:null;
 }
 function moduleState(state,moduleId){
  if(!slug(moduleId))throw Error('模块编号无效。');state.modules||={};state.modules[moduleId]||={lessons:{}};state.modules[moduleId].lessons||={};return state.modules[moduleId];
 }
 function lessonState(state,moduleId,id){if(!slug(id))throw Error('专题编号无效。');const s=moduleState(state,moduleId);return s.lessons[id]||(s.lessons[id]={completed:false,firstResult:null,runs:[],attempt:null});}
 function complete(state,lesson,attempt,core){
  const s=lessonState(state,lesson.moduleId,lesson.id),result=core.completeDay(s,lesson,attempt,core.localDate());
  moduleState(state,lesson.moduleId).resume={id:lesson.id,view:'result'};return result;
 }
 function mergeProgress(state,incoming){
  if(!incoming.modules)return;state.modules||={};
  for(const [id,m]of Object.entries(incoming.modules)){const old=moduleState(state,id);state.modules[id]={...old,...m,lessons:{...old.lessons,...m.lessons}};}
 }
 function paginate(items,page=1,size=6){const pages=Math.max(1,Math.ceil(items.length/size)),p=Math.min(pages,Math.max(1,Number.isSafeInteger(page)?page:1));return {items:items.slice((p-1)*size,p*size),page:p,pages,total:items.length};}
 class Repository {
  constructor(loader,core){this.loader=loader;this.core=core;this.catalog=null;this.pendingInit=null;this.loaded=new Map();this.pending=new Map();this.offline=false;}
  async init(refresh=false){
   if(this.catalog&&!refresh)return this.catalog;if(this.pendingInit)return this.pendingInit;
   const task=this.loader.json('modules/catalog.json',validateCatalog).then(r=>{this.catalog=r.data;this.offline=r.cached;if(refresh)this.loaded.clear();return r.data;});
   this.pendingInit=task;try{return await task;}finally{this.pendingInit=null;}
  }
  metadata(moduleId){const m=this.catalog?.modules.find(m=>m.id===moduleId);if(!m)throw Error('尚未找到这个模块，请检查模块更新。');return m;}
  category(moduleId,id){const c=this.metadata(moduleId).categories.find(c=>c.id===id);if(!c)throw Error('没有这个分类。');return c;}
  async load(moduleId,categoryId){
   const meta=this.category(moduleId,categoryId),k=moduleId+'/'+categoryId+'/'+meta.revision;
   if(this.loaded.has(k))return this.loaded.get(k);if(this.pending.has(k))return this.pending.get(k);
   const task=this.loader.json(meta.file+'?v='+meta.revision,p=>{validatePack(p,this.core);if(p.moduleId!==moduleId||p.id!==categoryId||JSON.stringify(p.lessons.map(l=>l.id))!==JSON.stringify(meta.lessons.map(l=>l.id)))throw Error('专题与模块目录不一致。');return p;},true).then(r=>{this.loaded.set(k,r.data);return r.data;});
   this.pending.set(k,task);try{return await task;}finally{this.pending.delete(k);}
  }
  loadedLesson(moduleId,id){
   const m=this.metadata(moduleId),cat=m.categories.find(c=>c.lessons.some(l=>l.id===id));if(!cat)return null;
   const p=this.loaded.get(moduleId+'/'+cat.id+'/'+cat.revision),l=p?.lessons.find(l=>l.id===id);return l?{...l,track:'module',moduleId,categoryId:cat.id,categoryTitle:cat.title,day:key(moduleId,id),phrases:[]}:null;
  }
  async lesson(moduleId,id){const cat=this.metadata(moduleId).categories.find(c=>c.lessons.some(l=>l.id===id));if(!cat)throw Error('没有这个专题。');await this.load(moduleId,cat.id);return this.loadedLesson(moduleId,id);}
  async download(moduleId,categoryId){
   const cache=await this.loader.cache();if(!cache)throw Error('当前浏览器无法保存离线文件。');
   const meta=this.category(moduleId,categoryId),p=await this.load(moduleId,categoryId);
   await cache.put(new Request(new URL(meta.file+'?v='+meta.revision,this.loader.base)),new Response(JSON.stringify(p),{headers:{'Content-Type':'application/json'}}));
   await this.loader.cacheAssets(p.lessons.flatMap(l=>l.questions.map(q=>q.audioFile).filter(Boolean)));
  }
 }
 return {slug,validateManifest,validatePack,validateCatalog,key,parseKey,parseRoute,moduleState,lessonState,complete,mergeProgress,paginate,Repository};
});
