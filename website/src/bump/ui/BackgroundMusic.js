import {r as React,j as R} from '/runtime/assets/components-BdJai906.js';

const preferenceKey='bump.background-music';
const h=(tag,props,...children)=>R.jsxs(tag,{...props,...(children.length?{children}: {})});
const storedChoice=()=>{try{return localStorage.getItem(preferenceKey)!=='off';}catch{return true;}};
const remember=value=>{try{localStorage.setItem(preferenceKey,value?'on':'off');}catch{}};

export default function BackgroundMusic(){
  const audio=React.useRef(null),wanted=React.useRef(storedChoice()),pending=React.useRef(false),request=React.useRef(0);
  const [state,setState]=React.useState(()=>wanted.current?'armed':'paused');
  const pause=React.useCallback(()=>{
    request.current++;pending.current=false;
    audio.current?.pause();setState('paused');
  },[]);
  const play=React.useCallback(()=>{
    const track=audio.current;
    if(!track||!wanted.current||document.hidden||pending.current||!track.paused)return;
    const ticket=++request.current;pending.current=true;setState('loading');
    // The file itself is 18 dB quieter, including on devices with fixed media volume.
    track.volume=1;track.playbackRate=1;
    if(track.error)track.load();
    const failed=error=>{
      if(ticket!==request.current)return;
      pending.current=false;
      if(error.name!=='NotAllowedError'&&error.name!=='AbortError')wanted.current=false;
      setState(error.name==='NotAllowedError'||error.name==='AbortError'?'armed':'error');
    };
    try{track.play()?.catch(failed);}catch(error){failed(error);}
  },[]);
  React.useEffect(()=>{
    const track=audio.current;
    const resume=event=>{
      if(event.type==='keydown'&&(event.ctrlKey||event.metaKey||event.altKey||['Shift','Control','Alt','Meta','Escape','Tab'].includes(event.key)))return;
      if(event.target?.closest?.('.bump-background-music'))return;
      play();
    };
    const visibility=()=>{if(document.hidden)pause();else play();};
    document.addEventListener('pointerup',resume,{passive:true});
    document.addEventListener('click',resume);
    document.addEventListener('keydown',resume);
    document.addEventListener('visibilitychange',visibility);
    play();
    return()=>{
      request.current++;pending.current=false;track?.pause();
      document.removeEventListener('pointerup',resume);
      document.removeEventListener('click',resume);
      document.removeEventListener('keydown',resume);
      document.removeEventListener('visibilitychange',visibility);
    };
  },[play,pause]);
  // Keep the enabled choice distinct from browser autoplay permission. The
  // speaker button can mute it before the first permitted gesture starts it.
  const active=wanted.current&&state!=='error';
  const label=state==='error'?'Réessayer la musique':active?'Couper la musique d’ambiance':'Activer la musique d’ambiance';
  return h(React.Fragment,{},
    h('audio',{ref:audio,src:'/audio/timeless-resonance-background.mp3',loop:true,preload:'none',playsInline:true,hidden:true,'aria-hidden':true,'data-bump-background-audio':'true',
      onPlaying:()=>{pending.current=false;setState('playing');},
      onPause:()=>{pending.current=false;setState('paused');},
      onWaiting:()=>{if(wanted.current)setState('loading');},
      onError:()=>{pending.current=false;wanted.current=false;setState('error');}}),
    h('button',{type:'button',className:'bump-background-music','data-state':state,'aria-label':label,'aria-pressed':active,title:label+' · Timeless Resonance — SoundDino',
      onKeyDown:event=>{if(event.key===' '||event.key==='Enter')event.stopPropagation();},
      onClick:()=>{
        if(active){wanted.current=false;remember(false);pause();}
        else{wanted.current=true;remember(true);play();}
      }},
      h('svg',{width:18,height:18,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.5,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true},
        h('path',{d:'M11 5 6 9H3v6h3l5 4V5Z'}),
        active?h('path',{d:'M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14'}):h('path',{d:'m16 9 5 6m0-6-5 6'}))),
    state==='error'?h('span',{className:'sr-only',role:'status'},'La musique n’a pas pu démarrer. Réessayez avec le bouton son.'):null);
}
