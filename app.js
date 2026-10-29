(() => {
  'use strict';
  const course = window.RU90_COURSE, core = window.RU90Core;
  const main = document.getElementById('main'), KEY = 'ru90_week1_v2';
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  const speakerIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m11 5-5 4H3v6h3l5 4V5Z"/><path d="M15 8c2 2 2 6 0 8m3-11c4 4 4 10 0 14"/></svg>';
  let state;
  try { state = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (_) {}
  if (!state || state.schema !== 2 || !state.days) state = { schema:2, days:{}, dates:[], voiceURI:'' };
  if (!Array.isArray(state.dates)) state.dates = [];
  let storageError = false, toastTimer, voices = [], activeUtterance = null;
  function toast(msg) { $('toast').textContent = msg; $('toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3200); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) { if (!storageError) toast('浏览器暂时无法保存进度，请用设置里的“导出学习记录”保留备份。'); storageError = true; } }
  function dayState(n) { return state.days[n] || (state.days[n] = { completed:false, firstResult:null, runs:[], attempt:null }); }
  function freshAttempt() { return { id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7), startedAt:new Date().toISOString(), index:0, records:{}, work:{} }; }
  function attemptFor(n) { const d = dayState(n); if (!d.attempt) { d.attempt = freshAttempt(); save(); } return d.attempt; }
  function route() { const m = location.hash.match(/^#day\/(\d+)\/(learn|practice|result)$/); return m ? { day:Number(m[1]), view:m[2] } : { view:'home' }; }
  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
  function stopAudio() { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); activeUtterance = null; }
  function refreshVoices() {
    voices = 'speechSynthesis' in window ? window.speechSynthesis.getVoices().filter(v => /^ru(?:-|_)?/i.test(v.lang)) : [];
    $('voiceSelect').innerHTML = voices.length ? voices.map(v => `<option value="${esc(v.voiceURI)}" ${v.voiceURI===state.voiceURI?'selected':''}>${esc(v.name)}${v.localService?' · 本地':' · 可能需要联网'}</option>`).join('') : '<option value="">暂未检测到俄语声音</option>';
    $('voiceSelect').disabled = !voices.length;
    $('voiceStatus').textContent = !('speechSynthesis' in window) ? '当前浏览器不支持朗读。可先完成文字学习，听力会标记待练。' : voices.length ? `找到${voices.length}个俄语声音。请先试听，确认设备音量已打开。` : '暂未检测到俄语声音。听力可切换文字辅助，但会保留“待听力练习”标记。';
  }
  function say(text, rate = .88, onStart) {
    refreshVoices();
    if (!voices.length || !('SpeechSynthesisUtterance' in window)) { toast('暂未检测到俄语声音。可以先看文字，听力题会单独标记待练。'); return false; }
    stopAudio();
    const u = new SpeechSynthesisUtterance(core.normalize(text).replace(/\[[^\]]*\]/g, '').replace(/…/g,''));
    u.lang = 'ru-RU'; u.rate = rate;
    u.voice = voices.find(v => v.voiceURI === state.voiceURI) || voices.find(v => v.localService) || voices[0];
    u.onstart = () => { if (onStart) onStart(); };
    u.onerror = e => { if (!['interrupted','canceled'].includes(e.error)) toast('这次没有成功播放。请确认音量与俄语声音，或先用文字辅助。'); };
    activeUtterance = u; window.speechSynthesis.speak(u); return true;
  }
  function audioButton(text, label='听发音', rate=.88) { return `<button class="audio-mini" data-say="${esc(text)}" data-rate="${rate}" aria-label="${esc(label+'：'+text)}">♪ ${esc(label)}</button>`; }
  function shell(d, view, body) {
    const step = { learn:0, practice:1, result:2 }[view];
    return `<div class="container"><div class="page-top"><button class="back" data-home>← 返回课程</button><span class="soft-tag">DAY ${String(d.day).padStart(2,'0')} · ${esc(d.kind)}</span></div><div class="lesson-layout"><aside class="lesson-sidebar"><div class="eyebrow">WEEK 01 · ${esc(d.minutes)}</div><h2>${esc(d.title)}</h2><p>${esc(d.goal)}</p><ol class="side-track">${['学习卡片','动手练习','回顾与记录'].map((s,i)=>`<li class="${i===step?'current':i<step?'passed':''}"><span class="side-dot">${i<step?'✓':i+1}</span>${s}</li>`).join('')}</ol><p>首周共102项练习与场景任务。<br>先理解，再开口；错项留到复习时再练。</p></aside><section class="lesson-main" aria-label="第${d.day}天课程">${body}</section></div></div>`;
  }
  function renderHome() {
    const completed = course.lessons.filter(d => dayState(d.day).completed).length;
    const next = course.lessons.find(d => !dayState(d.day).completed)?.day || 7;
    const finished = Object.values(state.days).reduce((n,d)=>n+Object.keys(d.attempt?.records||{}).length,0);
    main.innerHTML = `<div class="container"><section class="hero"><div><div class="eyebrow">90 DAYS · RUSSIAN FOR TRAVEL</div><h1>从第一声你好，<br>走向下一次旅行。</h1><p>每天10—15分钟。把字母、短句、听力和开口练习，<br class="desktop-break">装进一堂真正学得完的小课。</p><button class="primary" data-open-day="${next}">${completed===7?'再练第7天':dayState(next).attempt?'继续第'+next+'天':'开始第'+next+'天'} <span class="arrow">↗</span></button><small>首周7课已开放 · 无需登录</small></div><div class="hero-art" aria-hidden="true"><div class="postcard"><div class="stamp">DAY 01</div><strong lang="ru">Приве́т!</strong><span>你好，下一段旅程。</span><svg class="route-line" viewBox="0 0 180 22" fill="none"><path d="M4 16C30-7 56 25 87 12S138 1 172 7" stroke="#7e9673" stroke-dasharray="3 4"/><circle cx="4" cy="16" r="3" fill="#173d35"/><circle cx="172" cy="7" r="3" fill="#173d35"/></svg></div><div class="hero-caption">哈萨克斯坦 · 吉尔吉斯斯坦 · 下一站</div></div></section><div class="stats-strip"><div class="stats-text"><b>${completed}<small style="font-size:12px;font-weight:400"> / 7</small></b>首周已学课程</div><div class="stats-text"><b>${finished}</b>本轮已做任务</div><div class="stats-text"><b>${core.streak(state.dates)}</b>连续学习天数</div></div><div class="week-intro"><div><div class="eyebrow muted">YOUR FIRST WEEK</div><h2>先学会开口，再一点点走远。</h2><p>前5天认识20个字母，周末把它们放进一次交流。</p></div><span class="soft-tag">第1周 · 7堂小课</span></div><div class="day-list">${course.lessons.map(d=>{ const s=dayState(d.day); const isActive=d.day===next; return `<button class="day-card ${isActive?'active':''}" data-open-day="${d.day}"><span class="day-number"><span>DAY</span><b>${String(d.day).padStart(2,'0')}</b></span><span class="day-info"><h3>${esc(d.title)}</h3><p>${esc(d.subtitle)}</p><span class="card-meta">${s.completed?`<span class="check-icon">✓</span> 已学完 · ${s.lastResult?.pendingAudio?'有听力待练':s.lastResult?.mastered?'本轮表现不错':'建议再复习'}`:`${esc(d.kind)} · ${d.questions.length}项任务 · 10—15分钟`}</span></span><span class="chevron">↗</span></button>`; }).join('')}</div><div class="week-note"><span class="note-number">♪</span><div><strong>先听，再看；说出来，才算试过。</strong>听力题先隐藏文字，答完再看解析。长句先整句听说，拼读题只用已经教过的字母。口语由你自行核对。</div></div><details class="roadmap"><summary>看看后面的90天路线 <span>D08—90 · 已规划，样课待制作 ＋</span></summary><div class="roadmap-body">${course.roadmap.slice(7).map(d=>`<div class="plan-row"><b>D${String(d.day).padStart(2,'0')}</b><span>${esc(d.title)}</span><small>${esc(d.kind)} · 规划</small></div>`).join('')}</div></details></div>`;
    const weak=[];
    for(const d of course.lessons){const s=dayState(d.day);if(!s.lastResult)continue;for(const id of s.lastResult.weakIds){const q=d.questions.find(q=>q.id===id);if(q)weak.push({d,q});}}
    if(weak.length)main.querySelector('.container').insertAdjacentHTML('beforeend',`<details class="roadmap"><summary>我的复习清单 <span>${weak.length}项 · 错项、提示与待练听力 ＋</span></summary><div class="roadmap-body">${weak.map(({d,q})=>`<div class="weak-item" style="margin-top:8px"><b>第${d.day}天 · ${esc(q.bucket)}</b><p>${esc(q.prompt)}</p><p>${esc(q.type==='oral'?q.reference:q.explanation)}</p><button class="plain-button" data-open-day="${d.day}">回到这一课 →</button></div>`).join('')}</div></details>`);
    save();
  }
  function renderLearn(d) {
    const a = attemptFor(d.day), count = Object.keys(a.records).length;
    main.innerHTML = shell(d,'learn',`<div class="eyebrow muted">DAY ${String(d.day).padStart(2,'0')} · ${esc(d.subtitle)}</div><h1 style="margin-top:9px">${esc(d.title)}</h1><p class="lead">${esc(d.goal)}</p>${d.letters.length?`<h3 class="section-label">01 认识今天的字母 <span>先听字母名，再看音值</span></h3><div class="letters">${d.letters.map(l=>`<div class="letter"><strong lang="ru">${l.upper} ${l.lower}</strong><small>${esc(l.ipa)}</small>${audioButton(l.audio,'字母名')}</div>`).join('')}</div><div class="letter-details">${d.letters.map(l=>`<p><b lang="ru">${l.upper}</b> · ${esc(l.note)} ${audioButton(l.sample,'听示范')}</p>`).join('')}</div>`:''}<div class="reading-note"><b>拼读小练习</b><br>${esc(d.reading)}</div>${d.vocabulary.length?`<h3 class="section-label">02 带上几个实用表达 <span>长句先整句听说</span></h3><div class="vocab-list">${d.vocabulary.map(v=>`<div class="vocab-row"><div><div class="ru" lang="ru">${esc(v.ru)}</div><div class="zh">${esc(v.zh)}</div><div class="usage">${esc(v.note)}</div></div>${audioButton(v.ru,'听')}</div>`).join('')}</div>`:''}<h3 class="section-label">${d.vocabulary.length?'03':'01'} 今天先说这两句</h3>${d.phrases.map(p=>`<div class="phrase-card"><div class="ru" lang="ru">${esc(p.ru)}</div><p>${esc(p.zh)}</p><div class="audio-line">${audioButton(p.ru,'常速',.95)}${audioButton(p.ru,'慢速',.7)}</div></div>`).join('')}<h3 class="section-label">记住这几点就够了</h3><ul class="notes">${d.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul><div class="lesson-bottom"><span class="muted">${count?`已做${count}／${d.questions.length}项，可继续。`:`接下来${d.questions.length}项练习，最后有开口任务。`}</span><button class="primary dark" data-start-practice="${d.day}">${count===d.questions.length?'查看本课结果':count?'继续练习':'开始练习'} <span class="arrow">→</span></button></div>`);
  }
  function qContext() {
    const r=route(), d=course.lessons.find(x=>x.day===r.day); if(!d)return null;
    const a=attemptFor(d.day), q=d.questions[a.index]; if(!q)return null;
    const w=a.work[q.id]||(a.work[q.id]={matched:[],order:[],mistakes:0,selected:null,assisted:false,textOnly:false,audioPlayed:false});
    return {d,a,q,w,record:a.records[q.id]};
  }
  function optionsHTML(q,a,w,record) {
    const ready=q.type!=='listen'||w.audioPlayed||w.textOnly||record;
    return `<div class="option-grid">${core.shuffled(q.options,q.id+a.id).map((o,i)=>`<button class="option ${record&&(o===q.answer)?'correct':''} ${record&&record.submission===o&&!record.correct?'wrong':''}" data-choice="${esc(o)}" ${record||!ready?'disabled':''}><span class="option-letter">${String.fromCharCode(65+i)}</span><span>${esc(o)}</span></button>`).join('')}</div>`;
  }
  function renderQuestion() {
    const c=qContext(); if(!c){renderHome();return;}
    const {d,a,q,w,record}=c; let body='';
    if(q.type==='choice'||q.type==='listen') {
      if(q.type==='listen') body+=`<div class="listen-card"><button class="listen-main" data-play-question=".88" aria-label="播放俄语听力">${speakerIcon}</button><p id="listenStatus">${w.audioPlayed?'已播放，可以重听。':'先点播放，再作答。'}</p><div class="speed-row"><button data-play-question=".7">慢速重听</button><button data-play-question=".95">常速重听</button></div>${!voices.length?'<div class="sound-warning">暂未检测到俄语声音。可用文字辅助，听力会记为待练。</div>':''}${w.textOnly||record?`<div class="listen-reveal" lang="ru">${esc(q.reveal)}</div>`:''}</div>`;
      body+=optionsHTML(q,a,w,record);
    } else if(q.type==='match') {
      body=`<div class="match-grid"><div class="match-col">${q.pairs.map((p,i)=>`<button class="match-button ${w.matched.includes(i)?'matched':w.selected===i?'selected':''}" data-match-left="${i}" aria-label="大写${p[0]}" ${record||w.matched.includes(i)?'disabled':''}>${esc(p[0])}</button>`).join('')}</div><div class="match-col">${core.shuffled(q.pairs.map((p,i)=>i),q.id+a.id).map(i=>`<button class="match-button ${w.matched.includes(i)?'matched':''}" data-match-right="${i}" aria-label="小写${q.pairs[i][1]}" ${record||w.matched.includes(i)?'disabled':''}>${esc(q.pairs[i][1])}</button>`).join('')}</div></div><div class="match-message" role="status">${esc(w.message||'先点左边的大写，再点右边的小写。')}</div>`;
    } else if(q.type==='order') {
      body=`<div class="order-answer" aria-label="已经排列的句子">${w.order.length?w.order.map((i,j)=>`<button class="token" data-remove-token="${j}" ${record?'disabled':''}>${esc(q.tokens[i])}</button>`).join(''):'<span class="order-placeholder">按顺序点击下面的词块，放到这里。</span>'}</div><div class="token-bank">${core.shuffled(q.tokens.map((p,i)=>i),q.id+a.id).map(i=>`<button class="token ${w.order.includes(i)?'used':''}" data-add-token="${i}" ${record||w.order.includes(i)?'disabled':''}>${esc(q.tokens[i])}</button>`).join('')}</div>${!record?`<div class="order-check"><button class="plain-button" data-clear-order>重新排列</button><button class="primary dark" data-check-order ${w.order.length!==q.tokens.length?'disabled':''}>检查顺序</button></div>`:''}`;
    } else if(q.type==='oral') {
      body=`<div class="oral-box"><h3>先开口，再记录自检</h3><ul class="checklist">${q.checks.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><p class="muted small">应用不会自动评判发音。独立说完后选择下面一项；记录后会显示参考。</p>${w.assisted?`<div class="feedback reference" style="white-space:pre-line">${esc(q.reference)}</div>`:''}</div>${!record?`<div class="self-options">${[['independent','我能独立说出来'],['assisted','看提示后能说出来'],['practice','我尝试了，还需要练习']].map(([v,t])=>`<label class="self-option"><input type="radio" name="self" value="${v}" ${w.self===v?'checked':''} ${w.assisted&&v==='independent'?'disabled':''}>${t}</label>`).join('')}</div><button class="primary dark wide" data-record-oral ${!w.self?'disabled':''}>记录自检</button>`:''}`;
    }
    let footer='';
    if(record) {
      const heading=q.type==='oral'?'已经记录你的尝试':record.textOnly?'文字辅助已完成 · 听力留待补练':record.correct?'答对了，记住这个用法。':'先记住这一点，继续练。';
      const ref=q.type==='oral'?q.reference:q.type==='order'?q.tokens.join(' '):null;
      footer=`<div class="feedback ${record.correct===false?'wrong':''}" aria-live="polite"><h3>${heading}</h3><p>${esc(q.explanation)}</p>${ref?`<div class="reference" lang="ru">${esc(ref)}</div>`:''}${record.assisted?'<p class="small muted">本题使用过提示，已单独记录。</p>':''}<button class="primary dark" data-next-question>${a.index===d.questions.length-1?'查看本课结果':'记住了，继续'} <span class="arrow">→</span></button></div>`;
    } else {
      footer=`<div class="quiz-help"><span class="muted small">先尝试一次，保留首次记录。</span><button class="plain-button" data-show-help>${q.type==='listen'?'听不到？用文字辅助':q.type==='oral'?'需要提示：看参考':'查看学习提示'}</button></div>${w.showHelp&&q.type!=='listen'&&q.type!=='oral'?`<div class="reading-note">${esc(q.hint)}<br>${d.letters.length?d.letters.map(l=>`${l.upper}／${l.lower}`).join(' · '):''}<br>${d.phrases.map(p=>esc(p.ru)+' — '+esc(p.zh)).join('<br>')}</div>`:''}`;
    }
    main.innerHTML=shell(d,'practice',`<div class="quiz-top"><div class="progress" role="progressbar" aria-label="本课练习进度" aria-valuenow="${a.index}" aria-valuemin="0" aria-valuemax="${d.questions.length}"><span style="width:${a.index/d.questions.length*100}%"></span></div><span class="quiz-counter">${String(a.index+1).padStart(2,'0')} / ${d.questions.length}</span></div><div class="question-category"><span class="question-dot"></span>${esc(q.bucket)}${q.type==='match'?' · 字形配对':q.type==='order'?' · 词块排序':q.type==='oral'?' · 自行说出来':''}</div><h1 class="question-text">${esc(q.prompt)}</h1>${body}${footer}`);
  }
  function finishIfReady(d,a) {
    const result=core.summarize(d,a.records); if(!result.complete)return;
    core.completeDay(dayState(d.day),d,a,core.localDate());
    const date=core.localDate(); if(!state.dates.includes(date))state.dates.push(date); save();
  }
  function grade(correct,submission,extra={}) {
    const c=qContext();if(!c||c.record)return;const {d,a,q,w}=c;
    a.records[q.id]={correct,submission,assisted:Boolean(w.assisted),textOnly:Boolean(w.textOnly),time:new Date().toISOString(),...extra};
    finishIfReady(d,a);save();renderQuestion();
    requestAnimationFrame(()=>main.querySelector('.feedback')?.scrollIntoView({behavior:'smooth',block:'nearest'}));
  }
  function renderResult(d) {
    const ds=dayState(d.day),a=attemptFor(d.day),s=core.summarize(d,a.records);
    if(!s.complete){main.innerHTML=shell(d,'result',`<div class="empty-state"><h1>还有${s.total-s.finished}项任务没完成</h1><p class="lead">完成本课练习与开口自检后，才会记录学习完成。</p><button class="primary dark" data-resume="${d.day}">继续练习</button></div>`);return;}
    finishIfReady(d,a);const first=ds.firstResult;
    main.innerHTML=shell(d,'result',`<div class="result-head"><div class="result-badge">✓</div><div class="eyebrow muted">DAY ${String(d.day).padStart(2,'0')} COMPLETE</div><h1 style="margin-top:8px">${d.day===7?'第一周，已经走出第一步。':'今天的这一步，完成了。'}</h1><p>${esc(d.goal)}</p></div><div class="result-stats"><div class="result-stat"><b>${s.rate===null?'—':s.rate+'%'}</b><span>本轮首答正确率 ${s.correct}/${s.objective}</span></div><div class="result-stat"><b>${s.finished}/${s.total}</b><span>已完成任务</span></div><div class="result-stat"><b>${s.independent}/${s.oral}</b><span>口头独立完成 · 自检</span></div></div><div class="result-first">首次完成记录：${first.rate===null?'无可计分客观题':first.rate+'%（'+first.correct+'/'+first.objective+'）'}。后续重练会另记成绩，不会覆盖首次记录。${s.pendingAudio?`<br>${s.pendingAudio}项使用了文字辅助，未计入听力得分；有俄语声音时再补练。`:''}${s.assisted?`<br>本轮${s.assisted}项使用提示。`:''}</div><h3 class="section-label">${s.weakIds.length?'下次回来，先看这几项':'把今天的表达带走'}</h3><div class="weak-list">${s.weakIds.length?s.weakIds.slice(0,6).map(id=>{const q=d.questions.find(q=>q.id===id);return `<div class="weak-item"><b>${esc(q.prompt)}</b><p>${esc(q.type==='oral'?q.reference:q.explanation)}</p></div>`;}).join(''):d.phrases.map(p=>`<div class="phrase-card"><div class="ru" lang="ru">${esc(p.ru)}</div><p>${esc(p.zh)}</p>${audioButton(p.ru,'再听一次')}</div>`).join('')}</div><p class="result-note">${s.mastered?'本轮客观题和口头自检表现不错。隔一天再回忆一次，更容易留住。':'已经完成学习。错项、需要提示的表达与待练听力分别保留，之后再回来练。'}${d.day===7?' 第8—90天目前展示课程规划，完整样课会按相同结构继续制作。':''}</p><div class="result-actions"><button class="secondary" data-retry="${d.day}">再练这一课</button>${d.day<7?`<button class="primary dark" data-open-day="${d.day+1}">看看第${d.day+1}天 →</button>`:'<button class="primary dark" data-home>回到课程首页</button>'}</div>`);
  }
  function render() {
    stopAudio(); const r=route();const d=course.lessons.find(x=>x.day===r.day);
    if(r.view==='home'||!d){renderHome();return;}
    if(r.view==='learn')renderLearn(d);else if(r.view==='practice')renderQuestion();else renderResult(d);
  }
  main.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b||b.disabled)return;
    if(b.hasAttribute('data-home')){go('#home');return;}
    if(b.dataset.openDay){go('#day/'+b.dataset.openDay+'/learn');return;}
    if(b.dataset.say){say(b.dataset.say,Number(b.dataset.rate)||.88);return;}
    if(b.dataset.startPractice){const n=Number(b.dataset.startPractice),a=attemptFor(n),d=course.lessons[n-1];if(core.summarize(d,a.records).complete)go('#day/'+n+'/result');else go('#day/'+n+'/practice');return;}
    if(b.dataset.resume){const n=Number(b.dataset.resume),a=attemptFor(n),d=course.lessons[n-1];a.index=d.questions.findIndex(q=>!a.records[q.id]);save();go('#day/'+n+'/practice');return;}
    if(b.dataset.retry){const n=Number(b.dataset.retry);dayState(n).attempt=freshAttempt();save();go('#day/'+n+'/practice');return;}
    const c=qContext();if(!c)return;const {d,a,q,w,record}=c;
    if(b.hasAttribute('data-next-question')){if(!record)return;if(a.index<d.questions.length-1){a.index++;save();renderQuestion();main.scrollIntoView({block:'start'});}else go('#day/'+d.day+'/result');return;}
    if(record)return;
    if(b.dataset.playQuestion){const aid=a.id,qid=q.id;say(q.audio,Number(b.dataset.playQuestion),()=>{if(dayState(d.day).attempt?.id!==aid)return;w.audioPlayed=true;save();const cc=qContext();if(cc?.q.id===qid&&route().view==='practice'){main.querySelectorAll('[data-choice]').forEach(x=>x.disabled=false);const el=$('listenStatus');if(el)el.textContent='已播放，可以作答或重听。';}});return;}
    if(b.hasAttribute('data-show-help')){w.assisted=true;if(q.type==='listen')w.textOnly=true;else if(q.type==='oral'){if(w.self==='independent')w.self='assisted';}else w.showHelp=true;save();renderQuestion();return;}
    if(b.hasAttribute('data-choice')){if(q.type==='listen'&&!w.audioPlayed&&!w.textOnly)return;grade(b.dataset.choice===q.answer,b.dataset.choice);return;}
    if(b.hasAttribute('data-match-left')){w.selected=Number(b.dataset.matchLeft);w.message='再选择右边对应的小写字母。';save();renderQuestion();return;}
    if(b.hasAttribute('data-match-right')){const n=Number(b.dataset.matchRight);if(w.selected===null){toast('先选左边的大写字母。');return;}if(w.selected===n){w.matched.push(n);w.message='配对成功。';}else{w.mistakes++;w.message='这两个字形不对应，再看一眼。首次尝试已记录。';}w.selected=null;save();if(w.matched.length===q.pairs.length)grade(w.mistakes===0,w.matched.slice(),{mistakes:w.mistakes});else renderQuestion();return;}
    if(b.hasAttribute('data-add-token')){w.order.push(Number(b.dataset.addToken));save();renderQuestion();return;}
    if(b.hasAttribute('data-remove-token')){w.order.splice(Number(b.dataset.removeToken),1);save();renderQuestion();return;}
    if(b.hasAttribute('data-clear-order')){w.order=[];save();renderQuestion();return;}
    if(b.hasAttribute('data-check-order')){if(w.order.length===q.tokens.length)grade(w.order.every((v,i)=>v===i),w.order.map(i=>q.tokens[i]).join(' '));return;}
    if(b.hasAttribute('data-record-oral')){if(w.self)grade(null,w.self,{self:w.assisted&&w.self==='independent'?'assisted':w.self});return;}
  });
  main.addEventListener('change',e=>{if(e.target.name==='self'){const c=qContext();if(c&&!c.record){c.w.self=e.target.value;save();const b=main.querySelector('[data-record-oral]');if(b)b.disabled=false;}}});
  $('homeLink').addEventListener('click',()=>go('#home'));
  document.querySelector('.skip').addEventListener('click',e=>{e.preventDefault();main.focus();main.scrollIntoView({block:'start'});});
  $('settingsBtn').addEventListener('click',()=>{refreshVoices();$('settingsDialog').showModal();});
  document.querySelector('[data-close-dialog]').addEventListener('click',()=>$('settingsDialog').close());
  $('voiceSelect').addEventListener('change',e=>{state.voiceURI=e.target.value;save();});
  $('testVoice').addEventListener('click',()=>say('Приве́т!'));
  $('exportProgress').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='russian-progress-'+core.localDate()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  window.addEventListener('hashchange',()=>{render();window.scrollTo({top:0,behavior:'instant'});});
  function connection(){ $('connectionState').textContent=navigator.onLine?'首周样课':'离线学习'; }
  window.addEventListener('online',connection);window.addEventListener('offline',connection);connection();
  if('speechSynthesis' in window)window.speechSynthesis.addEventListener('voiceschanged',refreshVoices);
  refreshVoices();setTimeout(refreshVoices,500);setTimeout(refreshVoices,1500);render();
  if('serviceWorker' in navigator&&location.protocol!=='file:'){
    navigator.serviceWorker.register('./sw.js').then(reg=>{
      if(reg.waiting)reg.waiting.postMessage({type:'SKIP_WAITING'});
      reg.addEventListener('updatefound',()=>{const worker=reg.installing;if(worker)worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&reg.waiting)reg.waiting.postMessage({type:'SKIP_WAITING'});});});
    }).catch(()=>toast('课程可以正常使用；这次离线缓存没有完成，请联网后再打开一次。'));
    let refreshing=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(refreshing)return;refreshing=true;toast('离线课程已准备好。');});
  }
})();
