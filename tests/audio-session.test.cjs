const test=require('node:test');
const assert=require('node:assert/strict');
const {Player}=require('../audio.js');

function fixture(previous='auto'){
 const events=[],audio=[],spoken=[],errors=[];let type=previous;
 const session={get type(){return type;},set type(v){events.push('session:'+v);type=v;}};
 class Audio{constructor(src){this.src=src;audio.push(this);}play(){events.push('audio:'+type);return Promise.resolve();}pause(){this.paused=true;}}
 class Utterance{constructor(text){this.text=text;}}
 const env={navigator:{audioSession:session},Audio,SpeechSynthesisUtterance:Utterance,speechSynthesis:{getVoices:()=>[{lang:'ru-RU',voiceURI:'ru'}],cancel(){},speak(u){events.push('speech:'+type);spoken.push(u);}}};
 return {events,audio,spoken,errors,session,env,player:new Player({env,onError:e=>errors.push(e)})};
}

test('固定录音在同一次点击内先请求playback，结束后恢复会话',()=>{
 const f=fixture();
 try{f.player.play({src:'m.mp3'});assert.deepEqual(f.events,['session:playback','audio:playback']);f.audio[0].onplaying();f.audio[0].onended();assert.equal(f.session.type,'auto');assert.equal(f.player.playbackSession,null);}
 finally{f.player.stop();}
});

test('系统朗读同步请求媒体播放模式，结束后恢复先前类型',()=>{
 const f=fixture('ambient');
 try{f.player.play({text:'Привет!'});assert.deepEqual(f.events,['session:playback','speech:playback']);f.spoken[0].onstart();f.spoken[0].onend();assert.equal(f.session.type,'ambient');}
 finally{f.player.stop();}
});

test('不支持或拒绝AudioSession的浏览器仍能播放，设置失败不阻塞',()=>{
 const navigators=[undefined,{},Object.defineProperty({},'audioSession',{get(){throw Error('blocked');}}),{audioSession:{get type(){return 'auto';},set type(v){throw Error('unsupported');}}}];
 for(const navigator of navigators){
  const f=fixture();f.env.navigator=navigator;
  try{assert.doesNotThrow(()=>f.player.play({src:'m.mp3'}));assert.equal(f.audio.length,1);assert.equal(f.player.playbackSession,null);assert.doesNotThrow(()=>f.player.play({text:'Привет!'}));assert.equal(f.spoken.length,1);assert.equal(f.errors.length,0);}
  finally{f.player.stop();}
 }
});

test('打断播放与旧回调不会释放新会话，也不覆盖外部会话变更',()=>{
 const f=fixture('ambient');
 try{
  f.player.play({src:'m.mp3'});f.player.play({src:'t.mp3'});assert.equal(f.audio[0].paused,true);assert.equal(f.session.type,'playback');
  f.audio[0].onended();f.audio[0].onerror();assert.equal(f.session.type,'playback');assert.equal(f.player.current,f.audio[1]);
  f.session.type='play-and-record';f.player.stop();assert.equal(f.session.type,'play-and-record');
  f.player.play({src:'m.mp3'});assert.equal(f.session.type,'playback');f.player.stop();assert.equal(f.session.type,'play-and-record');
 }finally{f.player.stop();}
});

test('播放拒绝、朗读异常和缺少声音时释放所持会话',async()=>{
 const f=fixture();
 try{
  f.env.Audio=class{play(){return Promise.reject(Error('blocked'));}pause(){}};
  f.player.play({src:'m.mp3'});await Promise.resolve();assert.equal(f.session.type,'auto');assert.equal(f.errors.length,1);
  f.env.speechSynthesis.speak=()=>{throw Error('voice failed');};f.player.play({text:'Привет!'});assert.equal(f.session.type,'auto');assert.equal(f.errors.length,2);
  f.env.speechSynthesis.getVoices=()=>[];f.player.play({text:'Привет!'});assert.equal(f.session.type,'auto');assert.equal(f.errors.length,3);
 }finally{f.player.stop();}
});
