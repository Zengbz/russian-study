(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PocketVideos=api;})(globalThis,function(){
 'use strict';
 const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
 const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
 const good=(x,max)=>typeof x==='string'&&x.trim()===x&&x.length>0&&x.length<=max&&![...x].some(c=>c.charCodeAt(0)<32);
 function validateItem(v){
  if(!plain(v)||Object.keys(v).some(k=>!['id','title','description','provider','bvid','p','order','categories'].includes(k)))throw Error('视频条目格式无效。');
  if(!/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(v.id||'')||!good(v.title,120)||!good(v.description,400)||v.provider!=='bilibili'||!/^BV[0-9A-Za-z]{10}$/.test(v.bvid||''))throw Error('视频编号、名称或BV号无效。');
  if(!Number.isSafeInteger(v.order)||v.order<1||v.order>999999||!Number.isInteger(v.p)||v.p<1||v.p>1000)throw Error('视频顺序和分P必须是正整数。');
  if(!Array.isArray(v.categories)||v.categories.length<1||v.categories.length>8||v.categories.some(x=>!good(x,24)||x==='全部')||new Set(v.categories).size!==v.categories.length)throw Error('视频分类标签无效。');
  return v;
 }
 function validateCatalog(c){
  if(!plain(c)||c.schemaVersion!==1||c.kind!=='video-catalog'||!Array.isArray(c.videos))throw Error('视频目录格式无效。');
  const ids=new Set(),orders=new Set();for(const entry of c.videos){validateItem(entry);if(ids.has(entry.id)||orders.has(entry.order))throw Error('视频编号或顺序重复。');ids.add(entry.id);orders.add(entry.order);}
  return c;
 }
 function categories(items){return [...new Set(items.flatMap(x=>x.categories))].sort((a,b)=>a.localeCompare(b,'zh-CN'));}
 function list(items,category='全部',sort='asc',page=1,size=8){
  const filtered=items.filter(x=>category==='全部'||x.categories.includes(category));
  const ordered=filtered.slice().sort((a,b)=>sort==='desc'?b.order-a.order:a.order-b.order);
  const pages=Math.max(1,Math.ceil(ordered.length/size)),current=Math.max(1,Math.min(Number(page)||1,pages));
  return {items:ordered.slice((current-1)*size,current*size),page:current,pages,total:ordered.length};
 }
 function embedUrl(v){validateItem(v);return `https://player.bilibili.com/player.html?bvid=${v.bvid}&p=${v.p}&autoplay=0&danmaku=0`;}
 function sourceUrl(v){validateItem(v);return `https://www.bilibili.com/video/${v.bvid}/?p=${v.p}`;}
 class Repository {
  constructor(loader){this.loader=loader;this.catalog=null;this.pending=null;this.offline=false;}
  async init(force=false){if(this.catalog&&!force)return this.catalog;if(this.pending)return this.pending;
   const task=(async()=>{const result=await this.loader.json('videos/catalog.json',validateCatalog);this.catalog=result.data;this.offline=result.cached;return this.catalog;})();
   this.pending=task;try{return await task;}finally{this.pending=null;}
  }
  get(id){return this.catalog?.videos.find(v=>v.id===id);}
 }
 return {validateItem,validateCatalog,categories,list,embedUrl,sourceUrl,Repository};
});
