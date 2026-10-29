(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CourseLoader=api;})(globalThis,function(){
  'use strict';
  class Loader {
    constructor(core, base = new URL('./', location.href)) {
      this.core=core;this.base=new URL(base);this.cacheName='ru-pocket-data-'+encodeURIComponent(this.base.pathname);this.loaded=new Map();this.pending=new Map();this.stale=new Set();
    }
    async cache(){try{return typeof caches!=='undefined'?await caches.open(this.cacheName):null;}catch(_){return null;}}
    async json(path,validate,preferCache=false){
      const url=new URL(path,this.base);if(url.origin!==this.base.origin||!url.pathname.startsWith(this.base.pathname))throw new Error('内容地址超出课程范围。');
      const cache=await this.cache(),key=new Request(url.href),hit=await cache?.match(key);
      const parse=async r=>validate(await r.json());
      if(preferCache&&hit){try{return {data:await parse(hit.clone()),cached:true};}catch(_){await cache.delete(key);}}
      const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),8000);
      try{const res=await fetch(url,{cache:'no-store',signal:ctrl.signal});if(!res.ok)throw new Error('HTTP '+res.status);const data=await parse(res.clone());try{await cache?.put(key,res);}catch(_){}return {data,cached:false};}
      catch(err){if(hit){try{return {data:await parse(hit.clone()),cached:true,stale:!preferCache};}catch(_){}}
        throw new Error('这份内容尚未下载，或暂时无法更新。请联网后重试。',{cause:err});
      }finally{clearTimeout(timer);}
    }
    async init(){const r=await this.json('courses/catalog.json',this.core.validateCatalog);this.catalog=r.data;this.catalogOffline=r.cached;return r.data;}
    async load(week){
      const meta=this.catalog.weeks.find(w=>w.week===Number(week));if(!meta)throw new Error('目录里没有这一周。');
      if(this.loaded.has(meta.week))return this.loaded.get(meta.week);
      if(this.pending.has(meta.week))return this.pending.get(meta.week);
      const task=(async()=>{
        let result;
        try{result=await this.json(meta.file+'?v='+meta.revision,p=>{
          this.core.validatePack(p);if(p.week!==meta.week||JSON.stringify(p.lessons.map(x=>x.day))!==JSON.stringify(meta.lessons.map(x=>x.day)))throw new Error('课程与目录不一致。');return p;
        },true);}catch(err){
          // A corrected pack may be unavailable offline: retain a validated older copy.
          const cache=await this.cache();const keys=await cache?.keys()||[];
          for(const key of keys.reverse())if(new URL(key.url).pathname===new URL(meta.file,this.base).pathname){try{const p=this.core.validatePack(await (await cache.match(key)).json());if(p.week===meta.week){result={data:p,stale:true};break;}}catch(_) {}}
          if(!result)throw err;
        }
        if(result.stale)this.stale.add(meta.week);
        this.loaded.set(meta.week,result.data);return result.data;
      })();this.pending.set(meta.week,task);try{return await task;}finally{this.pending.delete(meta.week);}
    }
    async downloaded(week){const meta=this.catalog.weeks.find(x=>x.week===week);if(!meta)return false;const cache=await this.cache();return Boolean(await cache?.match(new URL(meta.file+'?v='+meta.revision,this.base)));}
    async cacheAssets(paths,onProgress=()=>{}){
      const cache=await this.cache();if(!cache)throw new Error('当前浏览器无法保留离线文件。');let done=0;
      for(const path of [...new Set(paths)]){
        const url=new URL(path,this.base);if(url.origin!==this.base.origin||!url.pathname.startsWith(this.base.pathname))throw new Error('音频地址无效。');
        if(!await cache.match(url)){const c=new AbortController(),t=setTimeout(()=>c.abort(),15000);try{const r=await fetch(url,{cache:'reload',signal:c.signal});if(!r.ok)throw new Error('文件未下载成功：'+path);await cache.put(url,r);}finally{clearTimeout(t);}}
        onProgress(++done,paths.length);
      }
    }
  }
  return {Loader};
});
