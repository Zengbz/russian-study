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
    const objective = all.filter(x => x.q.type !== 'oral' && x.r && !x.r.textOnly);
    const correct = objective.filter(x => x.r.correct).length;
    const oral = all.filter(x => x.q.type === 'oral' && x.r);
    const pendingAudio = all.filter(x => x.q.type === 'listen' && x.r && x.r.textOnly).length;
    const assisted = all.filter(x => x.r && x.r.assisted).length;
    const independent = oral.filter(x => x.r.self === 'independent').length;
    const rate = objective.length ? Math.round(correct / objective.length * 100) : null;
    return { complete, total: lesson.questions.length, finished: all.filter(x => x.r).length, objective: objective.length, correct, rate, oral: oral.length, independent, assisted, pendingAudio,
      mastered: complete && rate !== null && rate >= 80 && pendingAudio === 0 && independent === oral.length && assisted <= 1,
      weakIds: all.filter(x => x.r && (x.r.correct === false || x.r.textOnly || x.r.assisted || (x.q.type === 'oral' && x.r.self !== 'independent'))).map(x => x.q.id) };
  }
  function completeDay(day, lesson, attempt, date) {
    const summary = summarize(lesson, attempt.records); if (!summary.complete) throw new Error('请先完成本课所有任务。');
    if (day.firstResult == null) day.firstResult = { ...summary, date }; day.lastResult = { ...summary, date }; day.completed = true;
    if (!day.runs) day.runs = []; if (!day.runs.some(x => x.id === attempt.id)) day.runs.push({ id: attempt.id, summary, date }); return summary;
  }
  return { normalize, shuffled, localDate, streak, summarize, completeDay };
});
