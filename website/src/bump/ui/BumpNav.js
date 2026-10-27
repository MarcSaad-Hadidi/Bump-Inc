import {installTouchInspection} from './touchInspection.js';
import {installLandingMetadata} from '../seo/landing.js';
import {expertiseLinks,searchEditorialPages} from '../seo/navigation.js';
import{updateFallbackContrast}from'/runtime/assets/BumpContrast.js';
import {r as React,j as R} from '/runtime/assets/components-BdJai906.js';
import {r as useChapterNav,a as useSceneStore} from '/runtime/assets/(_locale).editions.winter2026-CdSmWtXg.js';
import {Dialog,Brief} from '/runtime/assets/BumpContent.js';
import {content} from '/runtime/assets/BumpData.js';
import {MotionPanel,LocationPopover,ArrowUpRight,CloseIcon} from '/runtime/assets/BumpUI.js';
import BackgroundMusic from './BackgroundMusic.js';
import DeviceMotionControl from './DeviceMotionControl.js';
import BumpClarityConsent from './BumpClarityConsent.js';
import {isBumpProductionHost,ANALYTICS_PREFERENCES_EVENT} from './clarityConsentCore.js';
const h=(tag,props,...children)=>R.jsxs(tag,{...props,...(children.length?{children:children.flat()}: {})});
const searchIcon=()=>h('svg',{width:15,height:15,viewBox:'0 0 24 24',fill:'none','aria-hidden':true},h('circle',{cx:10,cy:10,r:6,stroke:'currentColor',strokeWidth:1.7}),h('path',{d:'m15 15 5 5',stroke:'currentColor',strokeWidth:1.7}));
function ChapterLink({item,index,onNavigate,className}){
  const nav=useChapterNav({index,handle:item.handle,onNavigate});
  return h('a',{href:'#'+item.handle,className:className||'',onClick:e=>nav.handleClick(e,index),onMouseEnter:nav.handleMouseEnter,onMouseLeave:nav.handleMouseLeave,'aria-current':nav.isActive?'location':undefined},item.title);
}
export default function BumpNav({navItems}){
  React.useEffect(()=>installTouchInspection(),[]);
  React.useEffect(()=>installLandingMetadata(),[]);
  const english=document.documentElement.lang==='en';
  const [menu,setMenu]=React.useState(false),[search,setSearch]=React.useState(false),[brief,setBrief]=React.useState(false),[query,setQuery]=React.useState('');
  const [tone,setTone]=React.useState('dark');
  React.useEffect(()=>{
    let frame=0;
    const update=()=>{
      frame=0;
      const y=(document.querySelector('.bump-header')?.getBoundingClientRect().height||60)/2;
      let next='dark';
      for(const element of document.querySelectorAll('main section>div:first-child>[data-nav-theme],main section>div:first-child>.bg-light')){
        const bounds=element.getBoundingClientRect();
        if(bounds.top<=y&&bounds.bottom>y)next=element.classList.contains('bg-light')?'light':element.dataset.navTheme||'dark';
      }
      // The earlier IA wipe already places its lower painting caption on paper.
      const paperCaption=document.querySelector('#online>div:first-child>div:first-child>[data-nav-style=solid]')?.getBoundingClientRect();
      if(paperCaption&&paperCaption.top<=y+100&&paperCaption.bottom>y)next='light';
      updateFallbackContrast();
      document.documentElement.dataset.bumpTone=next;
      setTone(previous=>previous===next?previous:next);
    };
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
    // A finite guided journey can finish within the sampling throttle's final
    // 80ms. Recheck its settled surface so floating ink never keeps that frame.
    const settled=()=>{updateFallbackContrast(true);schedule();};
    const observer=new ResizeObserver(schedule);
    const main=document.querySelector('main');if(main)observer.observe(main);
    window.addEventListener('scroll',schedule,{passive:true});
    window.addEventListener('resize',schedule);
    window.addEventListener('bump:scroll-settled',settled);
    schedule();
    return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);window.removeEventListener('bump:scroll-settled',settled);};
  },[]);
  React.useEffect(()=>{
    const mark=()=>{const ready=!!document.querySelector('canvas[data-engine]');document.documentElement.dataset.bumpWebgl=String(ready);return ready;};
    if(mark())return;
    const observer=new MutationObserver(()=>{if(mark())observer.disconnect();});
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-engine']});
    return()=>observer.disconnect();
  },[]);
  const menuAnchor=React.useRef(null),searchAnchor=React.useRef(null),menuButton=React.useRef(null),searchButton=React.useRef(null),searchInput=React.useRef(null);
  const home=useChapterNav({index:0,handle:'hero'});
  const atHero=useSceneStore(state=>state.activeSection===0);
  React.useEffect(()=>{const open=()=>setBrief(true);window.addEventListener('bump:brief',open);if(new URLSearchParams(location.search).get('projet')==='1'){setBrief(true);const url=new URL(location.href);url.searchParams.delete('projet');history.replaceState(history.state,'',url.pathname+url.search+url.hash);}return()=>window.removeEventListener('bump:brief',open);},[]);
  React.useEffect(()=>{setMenu(false);setSearch(false);},[atHero]);
  React.useEffect(()=>{
    if(!menu&&!search)return;
    const outside=event=>{if(menu&&!menuAnchor.current?.contains(event.target))setMenu(false);if(search&&!searchAnchor.current?.contains(event.target))setSearch(false);};
    const key=event=>{if(event.key==='Escape'){event.preventDefault();if(menu){setMenu(false);menuButton.current?.focus();}if(search){setSearch(false);searchButton.current?.focus();}}};
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key);};
  },[atHero,menu,search]);
  React.useEffect(()=>{if(search)searchInput.current?.focus();},[atHero,search]);
  const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const results=content.chapters.flatMap((c,i)=>c.groups.flatMap(g=>g.cards.map(x=>({...x,index:i+1,chapter:c})))).filter(c=>normalize((c.title+' '+c.descriptionHtml+' '+c.chapter.title).replace(/<[^>]*>/g,' ')).includes(normalize(query.trim())));
  const pageResults=searchEditorialPages(query,english?'en':'fr');
  const heroMenu=h('div',{className:'bump-hero-nav-anchor',ref:menuAnchor},
    h('button',{type:'button',ref:menuButton,className:'bump-nav-trigger','aria-expanded':menu,'aria-controls':'bump-menu',onClick:()=>{setSearch(false);setMenu(!menu);},onKeyDown:event=>{if(event.key==='ArrowDown'){event.preventDefault();setSearch(false);setMenu(true);requestAnimationFrame(()=>menuAnchor.current?.querySelector('a')?.focus());}}},'Expertises',h('img',{src:'/runtime/media/25177a62ed-global-16-shrevon-down.svg',width:12,height:12,alt:''})),
    h(MotionPanel,{open:menu,id:'bump-menu',className:'bump-hero-dropdown',role:'navigation','aria-label':english?'Expertise and chapters':'Expertises et chapitres'},
      h('p',{className:'bump-menu-label'},english?'Our expertise':'Nos expertises'),
      h('div',{className:'bump-service-links'},...expertiseLinks(english?'en':'fr').map((item,i)=>h('a',{href:item.path,key:item.id},h('span',{'aria-hidden':true},String(i+1).padStart(2,'0')),item.label,h(ArrowUpRight,{})))),
      h('div',{className:'bump-editorial-links'},h('a',{href:english?'/en/expertise':'/expertises'},english?'All expertise':'Toutes les expertises',h(ArrowUpRight,{}))),
      h('p',{className:'bump-menu-label bump-menu-label--chapters'},english?'Explore the experience':'Explorer l’expérience'),
      h('div',{className:'bump-menu-chapters'},...navItems.map((item,i)=>h('div',{className:'bump-hero-dropdown-row',key:item.handle},h('span',{'aria-hidden':true},String(i+1).padStart(2,'0')),h(ChapterLink,{item,index:i+1,onNavigate:()=>setMenu(false)})))),
      h('div',{className:'bump-editorial-links'},h('a',{href:english?'/en/faq':'/faq'},english?'Frequently asked questions':'Questions fréquentes',h(ArrowUpRight,{}))),
      h('div',{className:'bump-editorial-links'},h('a',{href:english?'/en/use-cases':'/cas-d-usage'},english?'Illustrative case studies':'Études de cas illustratives',h(ArrowUpRight,{}))),
      isBumpProductionHost(window.location.hostname)&&h('button',{
        type:'button',
        className:'bump-analytics-menu-button',
        'aria-haspopup':'dialog',
        'aria-controls':'bump-clarity-notice',
        onClick:()=>{
          setMenu(false);
          window.dispatchEvent(new Event(ANALYTICS_PREFERENCES_EVENT));
        },
      },english?'Analytics preferences':'Préférences statistiques')));
  const heroSearch=h('div',{className:'bump-hero-search-anchor',ref:searchAnchor},
    h('button',{type:'button',ref:searchButton,className:'bump-nav-trigger bump-hero-search-trigger','aria-label':'Rechercher','aria-expanded':search,'aria-controls':'bump-hero-search',onClick:()=>{setMenu(false);setSearch(!search);}},h('span',{className:'bump-search-label-text'},'Rechercher'),searchIcon()),
    h(MotionPanel,{open:search,expand:true,id:'bump-hero-search',className:'bump-hero-search-panel',onEntered:()=>searchInput.current?.focus({preventScroll:true})},
      h('form',{role:'search',onSubmit:event=>{event.preventDefault();if(query.trim())searchAnchor.current?.querySelector('.bump-hero-search-results a')?.click();}},
        searchIcon(),h('input',{ref:searchInput,type:'search',value:query,onChange:event=>setQuery(event.target.value),placeholder:'Que recherchez-vous ?','aria-label':'Rechercher un service',autoComplete:'off'}),
        h('button',{type:'submit','aria-label':'Afficher les résultats',disabled:!query.trim()},h(ArrowUpRight,{})),
        h('button',{type:'button',className:'bump-search-close','aria-label':'Fermer la recherche',onClick:()=>{setSearch(false);searchButton.current?.focus();}},h(CloseIcon,{}))),
      h('div',{className:'bump-hero-search-results'+(query.trim()?' has-results':''),'aria-label':'Résultats de recherche','aria-hidden':!query.trim()},h('div',{},query.trim()?(pageResults.length||results.length?[...pageResults.map(item=>h('div',{key:item.path},h('span',{},english?'Explore in detail':'Découvrir en détail'),h('a',{href:item.path,onClick:()=>setSearch(false)},item.label))),...results.slice(0,Math.max(2,8-pageResults.length)).map(item=>h('div',{key:item.handle},h('span',{},item.chapter.divisionLabel),h(ChapterLink,{item:{handle:item.chapter.handle,title:item.title},index:item.index,onNavigate:()=>setSearch(false)})))]:h('p',{role:'status'},'Aucun résultat. Essayez un autre terme.')):null))));
  return h(React.Fragment,{},h('div',{className:'bump-opening-progress',role:'status'},h('span',{},'L’élan se prépare'),h('span',{className:'bump-opening-track','aria-hidden':true},h('i',{}))),h('a',{className:'bump-skip',href:'#main-content'},'Aller au contenu'),h('header',{className:'bump-header bump-hero-header','data-hero':atHero,'data-tone':tone},
    h('a',{className:'bump-nav-logo',href:english?'/en':'/',onClick:e=>home.handleClick(e,0),'aria-label':'Bump — accueil'},h('span',{className:'bump-brand-mark','aria-hidden':true}),h('span',{},'Bump')),h(LocationPopover,{onOpen:()=>{setMenu(false);setSearch(false);}}),
    h('nav',{'aria-label':'Navigation principale',className:'bump-top-links'},heroMenu,heroSearch),
    h('div',{className:'bump-header-actions'},h('a',{className:'bump-language-switch',href:(english?'/':'/en')+location.hash,onClick:event=>{event.currentTarget.href=(english?'/':'/en')+location.hash;},lang:english?'fr':'en',hrefLang:english?'fr':'en','aria-label':english?'Passer en français':'Switch to English',title:english?'Français':'English','data-bump-locale-switch':'true'},english?'FR':'EN'),h('button',{type:'button',className:'bump-project-button','aria-label':'Parlons de votre projet',onClick:()=>setBrief(true)},h('span',{className:'bump-project-full'},'Parlons de votre projet'),h('span',{className:'bump-project-short'},'Projet'),h(ArrowUpRight,{})))),
    h(Brief,{open:brief,onClose:()=>setBrief(false)}),h(BackgroundMusic,{}),h(DeviceMotionControl,{}),h(BumpClarityConsent,{}));
}
