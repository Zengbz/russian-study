(function(root){
 'use strict';
 class ModuleUI {
  constructor(options){Object.assign(this,options);}
  state(id){return PocketModules.moduleState(this.getState(),id);}
  progress(d){return PocketModules.lessonState(this.getState(),d.moduleId,d.id);}
  url(d,view='learn'){return `#module/${d.moduleId}/lesson/${d.id}/${view}`;}
  listUrl(id,category='all',page=1){return `#module/${id}/category/${category}/page/${page}`;}
  backUrl(id){const b=this.state(id).browse||{};return this.listUrl(id,b.category||'all',b.page||1);}
  remember(d,view){this.state(d.moduleId).resume={id:d.id,view};this.save();}
  async home(){
   const el=document.getElementById('moduleHome');if(!el)return;
   try{
    const c=await this.repo.init();if(!el.isConnected)return;
    const s=this.getState();
    el.innerHTML=c.modules.length?`<div class="module-section-heading"><div><div class="eyebrow muted">LEARN BY TOPIC</div><h2>按主题，多学一点</h2></div><span class="small muted">自由选择 · 独立进度</span></div><div class="module-entry-grid">${c.modules.map(m=>{const units=m.categories.flatMap(c=>c.lessons),done=units.filter(l=>s.modules?.[m.id]?.lessons?.[l.id]?.completed).length,resume=s.modules?.[m.id]?.resume,valid=resume&&units.some(l=>l.id===resume.id);return `<article class="module-entry"><span class="module-symbol" aria-hidden="true">${this.esc(m.symbol||'Я')}</span><div class="module-entry-copy"><h3>${this.esc(m.title)}</h3><p>${this.esc(m.summary)}</p><small>${m.categories.length}类 · ${units.length}个专题 · 已完成${done}个</small><div class="module-entry-actions"><button class="primary dark" data-module-open="${m.id}">进入${this.esc(m.title)} ↗</button>${valid?`<button class="plain-button" data-module-resume="${m.id}">继续上次专题 →</button>`:''}</div></div></article>`;}).join('')}</div>`:'';
   }catch(_){if(el.isConnected)el.innerHTML='<div class="module-unavailable"><span>拓展模块暂时无法读取，每日课程可继续使用。</span><button class="plain-button" data-module-home-retry>重试模块</button></div>';}
  }
  async render(r,serial,current){
   this.main.innerHTML='<div class="container"><p>正在读取专题…</p></div>';
   await this.repo.init();if(serial!==current())return;
   if(r.view==='catalog'){this.catalog(r);return;}
   const d=await this.repo.lesson(r.moduleId,r.id);if(serial!==current())return;
   if(r.view==='learn')this.learn(d);
   else if(r.view==='practice'){const a=this.attemptFor(d.day);a.index=Math.min(a.index,d.questions.length-1);this.renderQuestion();}
   else this.result(d);
  }
  catalog(r){
   const m=this.repo.metadata(r.moduleId),state=this.state(m.id),prior=state.browse||{};
   let category=r.category||prior.category||'all';if(category!=='all'&&!m.categories.some(c=>c.id===category))category='all';
   const items=m.categories.filter(c=>category==='all'||c.id===category).flatMap(c=>c.lessons.map(l=>({...l,categoryId:c.id,categoryTitle:c.title})));
   const paged=PocketModules.paginate(items,r.page||prior.page||1,6);state.browse={category,page:paged.page};this.save();
   const progress=state.lessons||{},done=m.categories.flatMap(c=>c.lessons).filter(l=>progress[l.id]?.completed).length,total=m.categories.reduce((n,c)=>n+c.lessons.length,0);
   this.main.innerHTML=`<div class="container module-catalog"><div class="page-top"><button class="back" data-home>← 返回首页</button><span class="soft-tag">专题课程 · 随时学</span></div><section class="module-hero"><div><div class="eyebrow">TOPIC LIBRARY</div><h1>${this.esc(m.title)}</h1><p>${this.esc(m.summary)}</p><p class="small muted">任意选择专题；完成后独立记录，不计入每日打卡。</p></div><div class="module-total"><b>${done}<small> / ${total}</small></b><span>已完成专题</span></div></section><nav class="module-categories" aria-label="专题分类">${[{id:'all',title:'全部',count:total},...m.categories.map(c=>({id:c.id,title:c.title,count:c.lessons.length}))].map(c=>`<button data-module-category="${c.id}" data-module-id="${m.id}" class="${category===c.id?'selected':''}" aria-pressed="${category===c.id}">${this.esc(c.title)} <small>${c.count}</small></button>`).join('')}</nav><div class="module-list-heading"><p>${this.esc(category==='all'?'全部专题':m.categories.find(c=>c.id===category).title)} · ${paged.total}个</p>${category!=='all'?`<button class="plain-button" data-module-download="${category}" data-module-id="${m.id}">下载本分类</button>`:''}</div><div class="module-topic-grid">${paged.items.map((l,i)=>{const p=progress[l.id],attempt=p?.attempt,n=Object.keys(attempt?.records||{}).length;return `<button class="module-topic" data-module-read="${l.id}" data-module-id="${m.id}"><span class="module-topic-top"><span class="module-category-label">${this.esc(l.categoryTitle)}</span><span class="module-level ${l.level==='进阶'?'advanced':''}">${this.esc(l.level)}</span></span><h2>${this.esc(l.title)}</h2><p>${this.esc(l.goal)}</p><span class="module-topic-bottom"><span>${p?.completed?'✓ 已完成'+(p.lastResult?.pendingAudio?' · 听力待练':''):n?`继续练习 · ${n}/${l.tasks}`:'讲解＋'+l.tasks+'项练习'}</span><span aria-hidden="true">↗</span></span></button>`;}).join('')}</div><nav class="module-pagination" aria-label="专题分页"><button class="secondary" data-module-page="${paged.page-1}" data-module-id="${m.id}" ${paged.page===1?'disabled':''}>上一页</button><span aria-live="polite">第 ${paged.page} / ${paged.pages} 页</span><button class="secondary" data-module-page="${paged.page+1}" data-module-id="${m.id}" ${paged.page===paged.pages?'disabled':''}>下一页</button></nav></div>`;
  }
  shell(d,view,body){
   const m=this.repo.metadata(d.moduleId);
   return `<div class="container"><div class="page-top"><button class="back" data-module-back="${d.moduleId}">← 返回${this.esc(m.title)}</button><span class="soft-tag">${this.esc(d.categoryTitle)}</span></div><div class="lesson-layout"><aside class="lesson-sidebar"><div class="eyebrow">${this.esc(d.level)} · 自由学习</div><h2>${this.esc(d.title)}</h2><p>${this.esc(d.goal)}</p><p class="small muted">专项进度独立保存。</p><button class="plain-button" data-alphabet>查33个字母 →</button></aside><section class="lesson-main module-lesson"><nav class="module-lesson-nav" aria-label="专题内容">${[['learn','讲解','read'],['practice','练习','practice'],['result','学习记录','result']].map(([key,label,action])=>`<button class="${view===key?'selected':''}" data-module-${action}="${d.id}" data-module-id="${d.moduleId}" aria-current="${view===key?'page':'false'}">${label}</button>`).join('')}</nav>${body}</section></div></div>`;
  }
  learn(d){
   this.remember(d,'learn');const progress=this.progress(d),a=progress.attempt,n=Object.keys(a?.records||{}).length;
   const m=this.repo.metadata(d.moduleId),all=m.categories.flatMap(c=>c.lessons),prereqs=(d.prerequisites||[]).map(id=>all.find(l=>l.id===id)).filter(Boolean);
   const sections=d.sections.map(s=>`<section class="grammar-section"><h2>${this.esc(s.title)}</h2><p class="grammar-explanation">${this.esc(s.text)}</p>${s.table?`<div class="grammar-table-scroll" tabindex="0" role="region" aria-label="${this.esc(s.title)}对照表"><table class="grammar-table"><thead><tr>${s.table.headers.map(x=>`<th scope="col">${this.esc(x)}</th>`).join('')}</tr></thead><tbody>${s.table.rows.map(row=>`<tr>${row.map((x,i)=>`<${i?'td':'th scope="row"'}>${this.esc(x)}</${i?'td':'th'}>`).join('')}</tr>`).join('')}</tbody></table></div>`:''}${(s.examples||[]).map(e=>`<div class="grammar-example"><div><p lang="ru">${this.esc(e.ru)}</p><span>${this.esc(e.zh)}</span></div>${this.audioButton(e.ru,'听例句')}</div>`).join('')}</section>`).join('');
   this.main.innerHTML=this.shell(d,'learn',`<div class="eyebrow">${this.esc(d.level)} · ${this.esc(d.categoryTitle)}</div><h1>${this.esc(d.title)}</h1><p class="lead">${this.esc(d.goal)}</p>${prereqs.length?`<div class="module-prereqs">建议先看：${prereqs.map(l=>`<button class="plain-button" data-module-read="${l.id}" data-module-id="${d.moduleId}">${this.esc(l.title)}</button>`).join('')}<span>可自由跳读</span></div>`:''}${sections}<div class="sticky-actions"><span class="small muted">${d.questions.length}项练习 · 不计每日打卡</span><button class="primary dark" data-module-practice="${d.id}" data-module-id="${d.moduleId}">${n?'继续专项练习':'开始专项练习'} →</button></div>`);
  }
  result(d){
   const p=this.progress(d),a=p.attempt;
   if(!a||!this.core.summarize(d,a.records).complete){this.main.innerHTML=this.shell(d,'result',`<h1>专题学习记录</h1><p class="lead">${this.esc(d.title)}</p><p>${a?'本轮已完成'+Object.keys(a.records).length+'/'+d.questions.length+'项练习。':'还没有完成一轮专项练习。'}</p><button class="primary dark" data-module-practice="${d.id}" data-module-id="${d.moduleId}">继续专项练习 →</button>`);return;}
   this.finish(d,a);this.save();const s=this.core.summarize(d,a.records),weak=d.questions.filter(q=>s.weakIds.includes(q.id));
   this.main.innerHTML=this.shell(d,'result',`<div class="result-head"><div class="result-badge">✓</div><h1>这个专题，练过了。</h1><p>${this.esc(d.title)}</p></div><div class="result-stats"><div class="result-stat"><b>${s.rate===null?'—':s.rate+'%'}</b><span>本轮首答 ${s.correct}/${s.objective}</span></div><div class="result-stat"><b>${s.finished}/${s.total}</b><span>专项任务</span></div><div class="result-stat"><b>${s.independent}/${s.oral}</b><span>口头独立 · 自检</span></div></div><p class="result-note">专项记录独立保存，不增加每日课程完成数或打卡天数。${s.pendingAudio?` ${s.pendingAudio}项听力使用文字辅助，仍需练习。`:''}</p><div class="result-first">首次完成：${p.firstResult.rate===null?'无可计分题':p.firstResult.rate+'%'}；重练保留首次记录。</div>${weak.length?`<h2 class="section-label">这几处，再巩固一下</h2><div class="weak-list">${weak.map(q=>`<div class="weak-item"><b>${this.esc(q.prompt)}</b><p>${this.esc(q.explanation)}</p></div>`).join('')}</div>`:'<p class="result-note">本轮没有记录错项。之后可换熟悉词语再造句。</p>'}<div class="result-actions"><button class="secondary" data-module-read="${d.id}" data-module-id="${d.moduleId}">回看讲解</button><button class="secondary" data-module-retry="${d.id}" data-module-id="${d.moduleId}">重练本专题</button><button class="primary dark" data-module-back="${d.moduleId}">选择其他专题 →</button></div>`);
  }
  async handleClick(b){
   if(b.hasAttribute('data-module-home-retry')){await this.repo.init(true).catch(()=>{});await this.home();return true;}
   const id=b.dataset.moduleId;
   if(b.dataset.moduleOpen){this.go('#module/'+b.dataset.moduleOpen);return true;}
   if(b.dataset.moduleResume){const m=b.dataset.moduleResume,r=this.state(m).resume;this.go(r?this.url({moduleId:m,id:r.id},r.view||'learn'):'#module/'+m);return true;}
   if(b.dataset.moduleBack){this.go(this.backUrl(b.dataset.moduleBack));return true;}
   if(b.dataset.moduleCategory){this.go(this.listUrl(id,b.dataset.moduleCategory,1));return true;}
   if(b.dataset.modulePage){this.go(this.listUrl(id,this.state(id).browse?.category||'all',Number(b.dataset.modulePage)));return true;}
   if(b.dataset.moduleRead){this.go(this.url({moduleId:id,id:b.dataset.moduleRead},'learn'));return true;}
   if(b.dataset.moduleResult){this.go(this.url({moduleId:id,id:b.dataset.moduleResult},'result'));return true;}
   if(b.dataset.modulePractice){const d=await this.repo.lesson(id,b.dataset.modulePractice),a=this.attemptFor(d.day);this.remember(d,'practice');this.go(this.url(d,this.core.summarize(d,a.records).complete?'result':'practice'));return true;}
   if(b.dataset.moduleRetry){const d=await this.repo.lesson(id,b.dataset.moduleRetry);this.progress(d).attempt=this.freshAttempt();this.remember(d,'practice');this.go(this.url(d,'practice'));return true;}
   if(b.dataset.moduleDownload){b.disabled=true;b.textContent='正在下载…';try{await this.repo.download(id,b.dataset.moduleDownload);this.toast('本分类已保存；词句离线朗读仍需本地俄语声音。');}finally{b.disabled=false;b.textContent='下载本分类';}return true;}
   return false;
  }
 }
 root.PocketModuleUI={ModuleUI};
})(globalThis);
