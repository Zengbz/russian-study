(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PocketReading=api;})(globalThis,function(){
 'use strict';
 const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
 const text=(x,n=240)=>typeof x==='string'&&x.trim()===x&&x.length>0&&x.length<=n&&![...x].some(c=>c.charCodeAt(0)<32);
 const slug=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,62}[a-z0-9]$/.test(x);
 const keys=(x,allowed)=>Object.keys(x).every(k=>allowed.includes(k));
 function validateItem(v){
  if(!plain(v)||!keys(v,['id','order','title','category','level','description','segments'])||!slug(v.id)||!Number.isSafeInteger(v.order)||v.order<1||v.order>99999||!text(v.title,90)||!text(v.category,20)||v.category==='全部'||!text(v.level,24)||!text(v.description,260)||!Array.isArray(v.segments)||v.segments.length<2||v.segments.length>8)throw Error('听读课格式无效。');
  const audioIds=new Set();
  for(const s of v.segments){
   if(!plain(s)||!keys(s,['ru','zh','gloss','audioFile','source'])||!text(s.ru,220)||!/[А-Яа-яЁё]/u.test(s.ru)||!text(s.zh,240)||!Array.isArray(s.gloss)||!s.gloss.length||s.gloss.length>16||!plain(s.source))throw Error(v.id+'：录音句子格式无效。');
   for(const g of s.gloss)if(!plain(g)||!keys(g,['ru','zh'])||!text(g.ru,60)||!text(g.zh,100)||!s.ru.toLocaleLowerCase('ru').includes(g.ru.toLocaleLowerCase('ru')))throw Error(v.id+'：单词释义必须对应俄文原句。');
   const {sentenceId,audioId,speaker,license}=s.source;
   if(!Number.isSafeInteger(sentenceId)||sentenceId<1||!Number.isSafeInteger(audioId)||audioId<1||!text(speaker,80)||!/^[\w-]+$/.test(speaker)||license!=='CC BY 4.0'||s.audioFile!==`reading/audio/${audioId}.mp3`||audioIds.has(audioId))throw Error(v.id+'：录音来源或路径无效。');
   audioIds.add(audioId);
  }
  return v;
 }
 function validateCatalog(c){
  if(!plain(c)||c.schemaVersion!==1||c.kind!=='reading-catalog'||!Array.isArray(c.items))throw Error('听读目录格式无效。');
  const ids=new Set(),orders=new Set();
  for(const x of c.items){if(!plain(x)||!keys(x,['id','order','title','category','level','description','segments','file','revision'])||!slug(x.id)||ids.has(x.id)||!Number.isSafeInteger(x.order)||orders.has(x.order)||x.order<1||!text(x.title,90)||!text(x.category,20)||!text(x.level,24)||!text(x.description,260)||!Number.isSafeInteger(x.segments)||x.segments<2||x.segments>8||x.file!==`reading/${x.id}.json`||!/^[a-f0-9]{64}$/.test(x.revision))throw Error('听读目录条目无效。');ids.add(x.id);orders.add(x.order);}
  return c;
 }
 function list(items,category='全部',page=1,size=6){const filtered=items.filter(x=>category==='全部'||x.category===category);const pages=Math.max(1,Math.ceil(filtered.length/size)),current=Math.min(pages,Math.max(1,Number(page)||1));return {items:filtered.slice((current-1)*size,current*size),page:current,pages,total:filtered.length};}
 class Repository{
  constructor(loader){this.loader=loader;this.catalog=null;this.loaded=new Map();this.pending=null;}
  async init(force=false){if(this.catalog&&!force)return this.catalog;if(this.pending)return this.pending;const task=(async()=>{const r=await this.loader.json('reading/catalog.json',validateCatalog);this.catalog=r.data;if(force)this.loaded.clear();return this.catalog;})();this.pending=task;try{return await task;}finally{this.pending=null;}}
  meta(id){return this.catalog?.items.find(x=>x.id===id);}
  async load(id){const m=this.meta(id);if(!m)throw Error('目录里没有这篇听读材料。');if(this.loaded.has(id))return this.loaded.get(id);
   const r=await this.loader.json(m.file+'?v='+m.revision,v=>{validateItem(v);if(v.id!==m.id||v.order!==m.order||v.title!==m.title||v.category!==m.category||v.segments.length!==m.segments)throw Error('听读材料与目录不一致。');return v;},true);this.loaded.set(id,r.data);return r.data;
  }
 }
 return {validateItem,validateCatalog,list,Repository};
});
