import {r as React,j as R} from '/runtime/assets/components-BdJai906.js';
import {installBackgroundMusic,MUSIC_WAVES} from './musicController.js';
const h=(tag,props,...children)=>R.jsxs(tag,{...props,...(children.length?{children}: {})});

export default function BackgroundMusic(){
  const audio=React.useRef(null),button=React.useRef(null);
  React.useEffect(()=>{
    const player=installBackgroundMusic(audio.current,button.current);
    return()=>player.destroy();
  },[]);
  return h(React.Fragment,{},
    h('audio',{ref:audio,src:'/audio/timeless-resonance-background.mp3',loop:true,preload:'none',playsInline:true,hidden:true,'aria-hidden':true,'data-bump-background-audio':'true'}),
    h('button',{ref:button,type:'button',className:'bump-background-music',hidden:true,'aria-label':'Couper la musique d’ambiance'},
      h('svg',{width:18,height:18,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.5,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true},
        h('path',{d:'M11 5 6 9H3v6h3l5 4V5Z'}),h('path',{'data-music-waves':'',d:MUSIC_WAVES})),
      h('span',{'data-music-status':'',className:'bump-music-status',role:'status'})));
}
