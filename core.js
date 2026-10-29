(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RU90Core = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function normalize(s) { return String(s).normalize('NFD').replace(/\u0301/g, '').normalize('NFC').trim(); }
  function shuffled(input, seed) {
    const out = input.slice(); let n = 2166136261;
    for (const ch of String(seed)) { n ^= ch.charCodeAt(0); n = Math.imul(n, 16777619); }
    for (let i = out.length - 1; i > 0; i--) { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; const j = n % (i + 1); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  }
  function localDate(d = new Date()) { return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-'); }
  function streak(dates, now = new Date()) {
    const active = new Set(dates); const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (!active.has(localDate(cursor))) cursor.setDate(cursor.getDate() - 1);
    let n = 0; while (active.has(localDate(cursor))) { n++; cursor.setDate(cursor.getDate() - 1); } return n;
  }
  function summarize(lesson, records) {
    const all = lesson.questions.map(q => ({ q, r: records[q.id] }));
    const complete = all.every(x => Boolean(x.r));
    const objective = all.filter(x => x.q.type !== 'oral' && !x.q.practiceOnly && x.r && !x.r.textOnly);
    const correct = objective.filter(x => x.r.correct).length;
    const oral = all.filter(x => x.q.type === 'oral' && x.r);
    const pendingAudio = all.filter(x => (x.q.type === 'listen' || x.q.mode === 'dictation') && x.r && x.r.textOnly).length;
    const assisted = all.filter(x => x.r && x.r.assisted).length;
    const independent = oral.filter(x => x.r.self === 'independent').length;
    const rate = objective.length ? Math.round(correct / objective.length * 100) : null;
    return { complete, total: lesson.questions.length, finished: all.filter(x => x.r).length, objective: objective.length, correct, rate, oral: oral.length, independent, assisted, pendingAudio,
      mastered: complete && rate !== null && rate >= 80 && pendingAudio === 0 && independent === oral.length && assisted <= 1,
      weakIds: all.filter(x => !x.q.practiceOnly && x.r && (x.r.correct === false || x.r.textOnly || x.r.assisted || (x.q.type === 'oral' && x.r.self !== 'independent'))).map(x => x.q.id) };
  }
  function completeDay(day, lesson, attempt, date) {
    const summary = summarize(lesson, attempt.records); if (!summary.complete) throw new Error('请先完成本课所有任务。');
    if (day.firstResult == null) day.firstResult = { ...summary, date }; day.lastResult = { ...summary, date }; day.completed = true;
    if (!day.runs) day.runs = []; if (!day.runs.some(x => x.id === attempt.id)) day.runs.push({ id: attempt.id, summary, date }); return summary;
  }
  function writingNormalize(s, rule = {}) {
    let out = normalize(s).replace(/\s+/gu, ' ');
    if (!rule.caseSensitive) out = out.toLocaleLowerCase('ru-RU');
    if (!rule.punctuation) out = out.replace(/[.!?。！？]+$/u, '').trim();
    if (rule.strictYo === false) out = out.replace(/ё/g, 'е').replace(/Ё/g, 'Е');
    return out;
  }
  function gradeInput(question, input) {
    const answers = question.answers || [];
    if (!String(input).trim()) return { valid:false, reason:'请先输入答案。' };
    if (!question.allowLatin && /[a-z]/i.test(input) && !answers.some(x => /[a-z]/i.test(x)))
      return { valid:false, reason:'检测到英文字母，请切换俄语键盘后再提交。这次还没有计分。' };
    return { valid:true, correct:answers.some(x => writingNormalize(x, question.normalization) === writingNormalize(input, question.normalization)), expected:answers[0] };
  }
  function textDiff(actual, expected) {
    const a = Array.from(actual), b = Array.from(expected);
    // Learner answers are short; cap before the quadratic comparison.
    if (a.length > 500 || b.length > 500) return [{kind:'wrong',text:actual},{kind:'missing',text:expected}];
    const dp = Array.from({length:a.length+1}, () => new Uint16Array(b.length+1));
    for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)dp[i][j]=a[i]===b[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
    const out=[];let i=0,j=0;
    function add(kind,text){const last=out[out.length-1];if(last?.kind===kind)last.text+=text;else out.push({kind,text});}
    while(i<a.length||j<b.length){if(i<a.length&&j<b.length&&a[i]===b[j]){add('same',a[i]);i++;j++;}else if(j<b.length&&(i===a.length||dp[i][j+1]>=dp[i+1][j]))add('missing',b[j++]);else add('wrong',a[i++]);}
    return out;
  }
  function gradeOrder(question, order) {
    return order.length===question.tokens.length && new Set(order).size===order.length &&
      order.every((index,i)=>Number.isInteger(index)&&index>=0&&index<question.tokens.length&&question.tokens[index]===question.tokens[i]);
  }
  const TYPES = ['choice','listen','match','order','oral','input'];
  function validatePack(pack) {
    if(!pack || pack.schemaVersion!==2 || !Number.isSafeInteger(pack.week) || pack.week<1 || typeof pack.title!=='string' || !Array.isArray(pack.lessons) || !pack.lessons.length)throw new Error('课程包的版本、周数或课程列表无效。');
    const days=new Set(),ids=new Set();
    for(const l of pack.lessons){
      if(!Number.isSafeInteger(l.day)||l.day<1||days.has(l.day)||typeof l.title!=='string'||!Array.isArray(l.questions)||!l.questions.length)throw new Error('课号重复或课程内容不完整。');
      days.add(l.day);
      for(const field of ['letters','vocabulary','phrases','notes'])if(!Array.isArray(l[field]))throw new Error('课程缺少 '+field);
      for(const q of l.questions){
        if(!q.id||ids.has(q.id)||!TYPES.includes(q.type)||!q.prompt||!q.explanation)throw new Error('题目编号、类型或解析无效。');ids.add(q.id);
        if(['choice','listen'].includes(q.type)&&(!Array.isArray(q.options)||q.options.length<2||new Set(q.options).size!==q.options.length||!q.options.includes(q.answer)))throw new Error('选项或答案无效：'+q.id);
        if(q.type==='input'&&(!Array.isArray(q.answers)||!q.answers.length||q.answers.some(x=>typeof x!=='string'||!x.trim())))throw new Error('输入题缺少答案：'+q.id);
        if(q.type==='order'&&(!Array.isArray(q.tokens)||!q.tokens.length))throw new Error('排序题缺少词块。');
        if(q.type==='match'&&(!Array.isArray(q.pairs)||!q.pairs.length||q.pairs.some(x=>!Array.isArray(x)||x.length!==2)))throw new Error('配对题缺少配对。');
        if(q.type==='match'&&[0,1].some(side=>new Set(q.pairs.map(p=>p[side])).size!==q.pairs.length))throw new Error('配对题的同侧标签不能重复：'+q.id);
        if(q.type==='oral'&&(!Array.isArray(q.checks)||!q.reference))throw new Error('口语题缺少自检标准。');
        if((q.type==='listen'||q.mode==='dictation')&&(!q.audio||!q.reveal))throw new Error('听力题缺少声音文本。');
      }
    }
    return pack;
  }
  function validateCatalog(c) {
    if(!c||c.schemaVersion!==2||!Array.isArray(c.weeks)||!c.weeks.length)throw new Error('课程目录格式无效。');
    const weeks=new Set(),days=new Set();
    for(const w of c.weeks){
      if(!Number.isSafeInteger(w.week)||w.week<1||weeks.has(w.week)||w.file!==`courses/week${w.week}-course.json`||!/^[a-f0-9]{64}$/.test(w.revision)||!Array.isArray(w.lessons)||!w.lessons.length)throw new Error('周目录或路径无效。');weeks.add(w.week);
      for(const l of w.lessons){if(!Number.isSafeInteger(l.day)||l.day<1||days.has(l.day))throw new Error('课号在目录中重复。');days.add(l.day);}
    }
    return c;
  }
  function validateProgress(s) {
    if(!s||s.schema!==2||!s.days||Array.isArray(s.days)||typeof s.days!=='object'||!Array.isArray(s.dates))throw new Error('这不是有效的学习记录备份。');
    for(const [k,d] of Object.entries(s.days)){
      if(!/^\d+$/.test(k)||!d||typeof d!=='object'||(d.runs&&!Array.isArray(d.runs)))throw new Error('学习记录格式无效。');
      if(d.attempt&&(!Number.isInteger(d.attempt.index)||d.attempt.index<0||!d.attempt.records||!d.attempt.work))throw new Error('练习记录不完整。');
    }
    // JSON roundtrip + forbidden-key rejection prevents prototype keys in imports.
    return JSON.parse(JSON.stringify(s),(key,value)=>{if(['__proto__','prototype','constructor'].includes(key))throw new Error('备份包含无效字段。');return value;});
  }
  return { normalize, shuffled, localDate, streak, summarize, completeDay, writingNormalize, gradeInput, gradeOrder, textDiff, validatePack, validateCatalog, validateProgress, TYPES };
});
