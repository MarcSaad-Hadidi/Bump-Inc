import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { MagnifyingGlass, CaretDown, ArrowUpRight, ArrowUp, ArrowRight, Play, X, List } from '@phosphor-icons/react';
import { asset, content, roman, imageDimensions } from './assets';
import { ledes, demoCopy, featureCopy } from './copy';
import RiveDemo from './RiveDemo';
const HeroScene = lazy(() => import('./HeroScene'));

function Bag() { return <span className="shopify-bag" aria-hidden="true"/>; }

function useDialog(open, onClose) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open || !ref.current) return;
    const dialog = ref.current;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => { if(dialog.open) dialog.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, [open, onClose]);
  return ref;
}

function VideoDialog({ source, youtubeId, title, onClose }) {
  const stableClose = useRef(onClose).current;
  const ref = useDialog(true, stableClose);
  return <dialog className="video-backdrop" ref={ref} aria-label={title} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div className="video-dialog">
      <button className="video-close" aria-label="Close video" onClick={onClose}><X size={25}/></button>
      {youtubeId ? <iframe src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&start=0`} title={`${title} — YouTube video player`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen/> : <video src={source} controls autoPlay playsInline />}
    </div>
  </dialog>;
}

function Header({ light, onNavigate }) {
  const [open, setOpen] = useState(null);
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const header = useRef(null);
  const search = useRef(null);
  const allFeatures = content.chapters.flatMap(c => c.features.map(f => ({...f,chapter:c})));
  const results = query.trim() ? allFeatures.filter(f => `${f.title} ${f.handle} ${f.chapter.title}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0,submitted ? Infinity : 6) : [];
  useEffect(() => {
    const close = e => { if (!header.current?.contains(e.target)) setOpen(null); };
    const keys = e => { if (e.key === 'Escape') { setOpen(null); search.current?.blur(); } };
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', keys);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', keys); };
  }, []);
  useEffect(() => { if (open === 'search') search.current?.focus(); }, [open]);
  return <header ref={header} className={`site-header ${light ? 'light' : ''}`}>
    <a className="brand" href="#top" onClick={() => {setOpen(null);onNavigate();}} aria-label="Shopify Editions home"><Bag/><span>Shopify Editions</span><span className="season">Winter '26</span></a>
    <button className={`editions-toggle ${open === 'editions' ? 'is-open' : ''}`} onClick={() => setOpen(open === 'editions' ? null : 'editions')} aria-expanded={open === 'editions'}>Editions<CaretDown size={13}/></button>
    <button className="search-toggle" onClick={() => setOpen(open === 'search' ? null : 'search')} aria-expanded={open === 'search'}>Search<MagnifyingGlass size={15}/></button>
    <div className="header-right"><a href="https://www.shopify.com/" target="_blank" rel="noreferrer">Shopify.com</a><a className="start-button" href="https://www.shopify.com/free-trial" target="_blank" rel="noreferrer">Start for free</a></div>
    {open === 'editions' && <div className="editions-menu">{content.editions.slice(0,4).map(e => <a key={e.editionKey} href={e.url || '#top'} onClick={()=>setOpen(null)} target={e.url ? '_blank' : undefined} rel="noreferrer"><img src={e.logo} alt=""/><span><span>{e.name}</span><small>{e.description}</small></span></a>)}<a className="all-editions" href="https://www.shopify.com/editions" target="_blank" rel="noreferrer">View all Editions<ArrowUpRight size={15}/></a></div>}
    {open === 'search' && <div className="search-panel"><form onSubmit={e => {e.preventDefault();setSubmitted(true);}}><label className="sr-only" htmlFor="edition-search">Search updates</label><input id="edition-search" ref={search} value={query} onChange={e => {setQuery(e.target.value);setSubmitted(false);}} placeholder="Search updates" autoComplete="off"/><button type="button" className="clear-search" disabled={!query.trim()} onClick={()=>{setQuery('');setSubmitted(false);search.current.focus();}}>CLEAR</button><button aria-label="Submit search" disabled={!query.trim()}><MagnifyingGlass size={20}/></button></form>
      <div className="search-results"><div><p className="eyebrow">{query ? 'Suggestions' : 'Popular searches'}</p>{(query ? [query, ...content.chapters.filter(c=>c.title.toLowerCase().includes(query.toLowerCase())).map(c=>c.title)] : ['Sidekick','AI','Shop Pay','POS']).slice(0,5).map((s,i)=><button className="search-suggestion" key={s+i} onClick={()=>{setQuery(s);setSubmitted(true);}}>{s}</button>)}</div><div aria-live="polite"><p className="eyebrow">{query ? `${submitted ? 'Search results' : 'Updates'}${results.length ? '' : ' — no matches'}` : 'Explore the edition'}</p>{query ? results.map(f=><a key={f.handle} href={`#${f.handle}`} onClick={()=>{setOpen(null);onNavigate();}}><span>{f.title}</span><small>{f.chapter.title}</small><ArrowRight size={16}/></a>) : content.chapters.slice(0,4).map(c=><a href={`#${c.handle}`} key={c.handle} onClick={()=>{setOpen(null);onNavigate();}}>{c.title}<ArrowRight size={16}/></a>)}{query && !results.length && <p className="no-results">Try a chapter name or a product, such as Sidekick or checkout.</p>}</div></div>
      <button className="search-all" disabled={!query.trim()} onClick={()=>setSubmitted(true)}>Search for “{query || 'all updates'}”<ArrowRight size={18}/></button>
    </div>}
  </header>;
}

function Navigation({ active, compact, light, onNavigate }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return <aside className={`edition-navigation ${compact ? 'compact' : ''} ${light ? 'light' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
    <a href="#top" className="edition-title" aria-label="The Renaissance Edition" onClick={()=>{setMobileOpen(false);onNavigate();}}><span className="edition-wordmark" aria-hidden="true"/></a>
    <p className="edition-tagline">A new world of commerce.<br/>150+ product updates.</p>
    <button className="mobile-chapters" onClick={()=>setMobileOpen(!mobileOpen)} aria-expanded={mobileOpen}><span>{active < 0 ? 'Explore the edition' : content.chapters[active].title}</span>{mobileOpen ? <X size={19}/> : <List size={19}/>}</button>
    <nav aria-label="Edition chapters">{content.chapters.map((c,i)=><a key={c.handle} href={`#${c.handle}`} className={active===i ? 'active' : ''} aria-current={active===i ? 'location' : undefined} onClick={()=>{setMobileOpen(false);onNavigate();}}><span>{c.title}</span><span className="nav-dots"/><span className="chapter-number">{roman[i]}</span></a>)}</nav>
    <div className="legal"><strong>© Shopify Inc</strong><a href="https://www.shopify.com/legal/terms" target="_blank" rel="noreferrer">Terms of Service</a><a href="https://www.shopify.com/legal/privacy" target="_blank" rel="noreferrer">Privacy Policy</a></div>
  </aside>;
}

function SceneBackground({ active, progressRef, activeRef }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  return <div className="scene-background" aria-hidden="true">
    <picture className={`scene-image hero-background ${active < 0 ? 'current' : ''}`}><source media="(max-width: 767px)" srcSet={asset(content.hero.background.mobile)}/><img src={asset(content.hero.background.desktop)} alt="" fetchPriority="high"/></picture>
    {!failed && <div className={`hero-canvas ${ready && active < 0 ? 'current' : ''}`}><Suspense fallback={null}><HeroScene progressRef={progressRef} activeRef={activeRef} active={active < 0} onReady={()=>setReady(true)} onError={()=>setFailed(true)}/></Suspense></div>}
    {content.chapters.map((c,i)=><picture key={c.handle} className={`scene-image chapter-background ${active === i ? 'current' : ''}`}><source media="(max-width: 767px)" srcSet={asset(c.background.mobile)}/><img src={asset(c.background.desktop)} alt="" loading={i>0 ? 'lazy' : 'eager'}/></picture>)}
    <div className="scene-shade"/>
  </div>;
}

function Feature({ feature, onVideo }) {
  // The upstream Sidekick app-generation entry references the checkout demo.
  // Keep its factual text rather than showing an unrelated Shop Pay animation.
  const media = feature.handle==='sidekick-generates-apps' ? null : feature.media;
  const imageKey = media && (media.image || media.video?.poster || media.customVideo?.posterImage);
  const image = asset(imageKey);
  return <article id={feature.handle} className={`feature-item ${media ? 'has-media' : ''}`}>
    {media?.rive ? <RiveDemo demo={{handle:feature.handle,title:feature.title,media}}/> : image ? media.youtubeId ? <button className="demo-video" aria-label={`Play ${feature.title} video`} onClick={()=>onVideo({youtubeId:media.youtubeId,title:feature.title})}><img {...imageDimensions(imageKey)} src={image} alt={feature.title} loading="lazy"/><span className="glass-play"><Play size={23} weight="fill"/></span></button> : <img className="feature-image" {...imageDimensions(imageKey)} src={image} alt={feature.title} loading="lazy"/> : null}
    <h4>{feature.title}</h4>{featureCopy[feature.handle] && <p>{featureCopy[feature.handle]}</p>}{feature.url && <a href={feature.url} target="_blank" rel="noreferrer">{feature.linkLabel || 'Learn more'}<ArrowUpRight size={13}/></a>}
  </article>;
}

function Demo({ demo, chapter, index, onVideo }) {
  const feature = chapter.features.find(f=>f.handle===demo.handle);
  const [title, description] = demoCopy[demo.handle] || [demo.title, ledes[chapter.handle]];
  const imageKey = demo.media.image || demo.media.video?.poster;
  const image = asset(imageKey);
  return <article id={demo.handle} className={`demo-feature demo-${index} ${demo.media.rive ? 'animated-feature' : ''}`}>
    <div className="demo-description"><h3>{title}</h3><p>{description}</p>{feature?.url && <a className="text-link" href={feature.url} target="_blank" rel="noreferrer">{feature.linkLabel || 'Learn more'}<ArrowUpRight size={14}/></a>}</div>
    <div className="demo-media">{demo.media.rive ? <RiveDemo demo={demo}/> : (demo.media.video?.source || demo.media.youtubeId) ? <button className="demo-video" aria-label={`Play ${demo.title} video`} onClick={()=>onVideo({source:asset(demo.media.video.source),youtubeId:demo.media.youtubeId,title:demo.title})}><img {...imageDimensions(imageKey)} src={image} alt={demo.title} loading="lazy"/><span className="glass-play"><Play size={25} weight="fill"/></span></button> : <img {...imageDimensions(imageKey)} src={image} alt={demo.title} loading="lazy"/>}</div>
  </article>;
}

function Chapter({ chapter, index, onVideo }) {
  const featured = new Set(chapter.demos.map(d=>d.handle));
  const remaining = chapter.features.filter(f=>chapter.handle==='sidekick' ? f.handle!=='sidekick-pulse' : !featured.has(f.handle));
  const groups = ['developer','sidekick'].includes(chapter.handle) ? chapter.groups.filter(g=>g.handles.some(h=>remaining.some(f=>f.handle===h))) : [];
  return <section id={chapter.handle} className={`chapter chapter-${chapter.handle} ${chapter.mode==='light' ? 'light' : ''}`} data-chapter-index={index}>
    <div className="chapter-intro content-column"><div className="chapter-heading"><h2>{chapter.title}</h2></div><p className="chapter-lede"><span className="flourish">{ledes[chapter.handle][0]}</span>{ledes[chapter.handle].slice(1)}</p>
    </div>
    {index===0 && <div className="chapter-intro-video content-column"><button className="intro-video" onClick={()=>onVideo({source:asset(content.introVideo.video),youtubeId:content.introVideo.youtubeId,title:"Sidekick introduction"})} aria-label="Play Sidekick introduction"><img {...imageDimensions(content.introVideo.poster)} src={asset(content.introVideo.poster)} alt="Sidekick introduction"/><span className="glass-play"><Play size={25} weight="fill"/></span></button></div>}
    <div className="chapter-details content-column">{chapter.demos.filter(d=>chapter.handle!=='sidekick'||d.handle==='sidekick-pulse').map((d,i)=><Demo key={d.handle} demo={d} chapter={chapter} index={i} onVideo={onVideo}/>)}
      {remaining.length > 0 && <div className="updates-area">{groups.length ? groups.map(g=><div className="feature-group" key={g.handle}><h3>{g.title}</h3><div className={`feature-grid ${chapter.handle==='sidekick' && g.handle!=='tedious-tasks-simplified' ? 'sidekick-media-grid' : ''}`}>{remaining.filter(f=>g.handles.includes(f.handle)).map(f=><Feature feature={f} key={f.handle} onVideo={onVideo}/>)}</div></div>) : <><h3 className="more-title">{index===0 ? 'More ways to move your business forward' : `More in ${chapter.title}`}</h3><div className="feature-grid">{remaining.map(f=><Feature feature={f} key={f.handle} onVideo={onVideo}/>)}</div></> }</div>}
      <a className="back-to-navigation" href="#top">Back to navigation<ArrowUp size={15}/></a>
    </div>
  </section>;
}

export function App() {
  const [active, setActive] = useState(-1);
  const [compact, setCompact] = useState(false);
  const [video, setVideo] = useState(null);
  const progressRef = useRef(0);
  const activeRef = useRef(true);
  const light = active===11;
  useEffect(() => {
    document.title = "The Renaissance Edition — Winter '26";
    let ticking=false;
    const update=()=>{
      ticking=false;
      const height=innerHeight;
      progressRef.current=Math.min(1,Math.max(0,scrollY/(height*1.5)));
      setCompact(scrollY>height*.15);
      let next=-1;
      for(const el of document.querySelectorAll('[data-chapter-index]')) {
        if(el.getBoundingClientRect().top<height*.6) next=Number(el.dataset.chapterIndex);
        else break;
      }
      setActive(next);activeRef.current=next<0;
    };
    const scroll=()=>{if(!ticking){ticking=true;requestAnimationFrame(update);}};
    update();addEventListener('scroll',scroll,{passive:true});addEventListener('resize',scroll);
    const observer = new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('revealed');}),{threshold:.08});
    document.querySelectorAll('.demo-feature,.feature-group,.updates-area').forEach(el=>observer.observe(el));
    return()=>{removeEventListener('scroll',scroll);removeEventListener('resize',scroll);observer.disconnect();};
  }, []);
  const navigate=()=>setVideo(null);
  return <div className={`app ${light ? 'theme-light' : 'theme-dark'}`}>
    <a className="skip-link" href="#sidekick">Skip to updates</a>
    <SceneBackground active={active} progressRef={progressRef} activeRef={activeRef}/>
    <Header light={light} onNavigate={navigate}/>
    <Navigation active={active} compact={compact} light={light} onNavigate={navigate}/>
    <main id="top"><div className="hero-spacer" aria-label="The Renaissance Edition"/>{content.chapters.map((c,i)=><Chapter chapter={c} index={i} key={c.handle} onVideo={setVideo}/>)}</main>
    {video && <VideoDialog source={video.source} youtubeId={video.youtubeId} title={video.title} onClose={()=>setVideo(null)}/>}
  </div>;
}
