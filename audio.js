(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PocketAudio=api;})(globalThis,function(){
  'use strict';
  class Player {
    constructor({onState=()=>{},onError=()=>{},getVoice=()=>'',normalize=x=>x,env=globalThis}={}){Object.assign(this,{onState,onError,getVoice,normalize,env});this.serial=0;this.current=null;this.timer=null;this.playbackSession=null;}
    voices(){return this.env.speechSynthesis?.getVoices().filter(v=>/^ru(?:-|_)?/i.test(v.lang))||[];}
    requestPlaybackSession(){
      // Run synchronously in the tap handler, before Audio.play() or speak().
      // Older browsers and blocked/partial implementations keep their defaults.
      try{const session=this.env.navigator?.audioSession;if(!session)return;const previous=session.type;session.type='playback';this.playbackSession={session,previous:previous||'auto'};}catch(_){}
    }
    releasePlaybackSession(){
      const held=this.playbackSession;this.playbackSession=null;
      // Do not overwrite a session changed by another audio feature meanwhile.
      try{if(held&&held.session.type==='playback')held.session.type=held.previous;}catch(_){}
    }
    stop(){this.serial++;clearTimeout(this.timer);if(this.current?.pause)this.current.pause();this.env.speechSynthesis?.cancel();this.current=null;this.releasePlaybackSession();this.onState('idle');}
    play({text='',src='',rate=.88,key='',onStart=()=>{}}){
      this.stop();const id=this.serial;let started=false;
      const valid=()=>this.serial===id;
      const finish=()=>{if(!valid())return;clearTimeout(this.timer);this.current=null;this.releasePlaybackSession();this.onState('idle',key);};
      const fail=()=>{if(!valid())return;this.stop();this.onError('这次声音没有启动，请点一下重试；也可检查音量或俄语声音设置。');};
      const start=()=>{if(!valid()||started)return;started=true;clearTimeout(this.timer);this.onState('playing',key);onStart();this.timer=setTimeout(fail,90000);};
      this.onState('loading',key);this.timer=setTimeout(fail,5000);
      this.requestPlaybackSession();
      if(src){
        const a=new this.env.Audio(src);this.current=a;a.playbackRate=rate/.88;a.onplaying=start;a.onended=finish;a.onerror=fail;
        try{const p=a.play();if(p?.catch)p.catch(fail);}catch(_){fail();}return;
      }
      const voices=this.voices();if(!voices.length||!this.env.SpeechSynthesisUtterance){this.stop();this.onError('未找到俄语声音。请在手机上启用俄语语音，听力也可先用文字辅助。');return;}
      if(this.env.speechSynthesis.paused)this.env.speechSynthesis.resume();
      const u=new this.env.SpeechSynthesisUtterance(this.normalize(text).replace(/\[[^\]]*\]/g,'').replace(/…/g,''));
      u.lang='ru-RU';u.rate=rate;u.voice=voices.find(v=>v.voiceURI===this.getVoice())||voices.find(v=>v.localService)||voices[0];u.onstart=start;u.onend=finish;u.onerror=e=>{if(!['canceled','interrupted'].includes(e.error))fail();};
      this.current=u;try{this.env.speechSynthesis.speak(u);}catch(_){fail();}
    }
  }
  return {Player};
});
