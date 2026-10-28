export const MUSIC_PREFERENCE = 'bump.background-music';
export const MUSIC_POSITION = 'bump.background-music.position';
export const MUSIC_WAVES = 'M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14';
export const MUSIC_MUTED = 'm16 9 5 6m0-6-5 6';
const players = new WeakMap();

export function musicLabels(locale = 'fr') {
  return String(locale).startsWith('en') ? {
    mute: 'Mute background music', enable: 'Enable background music', retry: 'Retry music',
    error: 'Music could not start. Try again with the sound button.',
  } : {
    mute: 'Couper la musique d’ambiance', enable: 'Activer la musique d’ambiance', retry: 'Réessayer la musique',
    error: 'La musique n’a pas pu démarrer. Réessayez avec le bouton son.',
  };
}

// The same native media controller is used by React and editorial HTML pages.
export function installBackgroundMusic(track, button, {doc = document, win = window, locale = doc.documentElement.lang} = {}) {
  if (players.has(track)) return players.get(track);
  const labels = musicLabels(locale), cleanups = [];
  const read = (storage, key) => {try {return win[storage].getItem(key);} catch {return null;}};
  const write = (storage, key, value) => {try {win[storage].setItem(key, value);} catch {}};
  const choice = () => read('localStorage', MUSIC_PREFERENCE) !== 'off';
  let wanted = choice(), state = wanted ? 'armed' : 'paused', pending = false;
  let request = 0, activePage = true, disposed = false, lastSave = 0;
  const paint = () => {
    const active = wanted && state !== 'error';
    const label = state === 'error' ? labels.retry : active ? labels.mute : labels.enable;
    button.dataset.state = state;
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-pressed', String(active));
    button.title = label + ' · Timeless Resonance — SoundDino';
    button.querySelector('[data-music-waves]')?.setAttribute('d', active ? MUSIC_WAVES : MUSIC_MUTED);
    const status = button.querySelector('[data-music-status]');
    if (status) status.textContent = state === 'error' ? labels.error : '';
    button.hidden = false;
  };
  const save = () => {
    if (track.readyState >= 1 && Number.isFinite(track.currentTime) && track.currentTime >= 0) {
      write('sessionStorage', MUSIC_POSITION, String(track.currentTime));
      lastSave = Date.now();
    }
  };
  const restore = () => {
    const raw = read('sessionStorage', MUSIC_POSITION), position = raw === null ? 0 : Number(raw);
    if (!Number.isFinite(position) || position < 0 || track.readyState < 1) return;
    try {track.currentTime = Number.isFinite(track.duration) && track.duration > 0 ? position % track.duration : position;} catch {}
  };
  const pause = () => {
    request++; pending = false; track.pause(); state = 'paused'; save(); paint();
  };
  const play = () => {
    if (disposed || !activePage || !wanted || doc.hidden || pending || !track.paused) return;
    const ticket = ++request; pending = true; state = 'loading'; paint();
    track.muted = false;
    // Quietness is baked into the supplied track, including on fixed-volume phones.
    track.volume = 1; track.playbackRate = 1;
    if (track.error) track.load();
    const failed = error => {
      if (ticket !== request || disposed) return;
      pending = false;
      state = ['NotAllowedError', 'AbortError'].includes(error?.name) ? 'armed' : 'error';
      paint();
    };
    try {
      Promise.resolve(track.play()).then(() => {
        if (disposed || !wanted || !activePage || doc.hidden) track.pause();
      }, failed);
    } catch (error) {failed(error);}
  };
  const setWanted = value => {
    wanted = value; track.muted = !wanted;
    if (wanted) {state = 'armed'; paint(); play();} else pause();
  };
  const listen = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    cleanups.push(() => target.removeEventListener(type, handler, options));
  };
  const gesture = event => {
    if (event.target?.closest?.('.bump-background-music')) return;
    if (event.type === 'keydown' && (event.ctrlKey || event.metaKey || event.altKey || ['Shift','Control','Alt','Meta','Escape','Tab'].includes(event.key))) return;
    play();
  };
  listen(button, 'click', () => {
    const next = !wanted || state === 'error';
    write('localStorage', MUSIC_PREFERENCE, next ? 'on' : 'off');
    setWanted(next);
  });
  listen(button, 'keydown', event => {if (event.key === ' ' || event.key === 'Enter') event.stopPropagation();});
  listen(track, 'loadedmetadata', restore);
  listen(track, 'playing', () => {
    pending = false;
    if (!wanted || doc.hidden || !activePage || disposed) {track.pause(); return;}
    state = 'playing'; paint();
  });
  listen(track, 'pause', () => {pending = false; state = 'paused'; paint();});
  listen(track, 'waiting', () => {if (wanted && activePage && !doc.hidden) {state = 'loading'; paint();}});
  listen(track, 'error', () => {request++; pending = false; state = 'error'; paint();});
  listen(track, 'timeupdate', () => {if (Date.now() - lastSave >= 5000) save();});
  listen(doc, 'pointerup', gesture, {passive: true});
  listen(doc, 'click', gesture);
  listen(doc, 'keydown', gesture);
  listen(doc, 'visibilitychange', () => {if (doc.hidden) pause(); else play();});
  listen(win, 'storage', event => {if (event.key === MUSIC_PREFERENCE || event.key === null) setWanted(choice());});
  listen(win, 'pagehide', () => {activePage = false; pause();});
  listen(win, 'pageshow', event => {
    if (!event.persisted) return;
    activePage = true; restore(); setWanted(choice());
  });
  track.loop = true; track.muted = !wanted;
  restore(); paint();
  const controller = {destroy() {
    if (disposed) return;
    save(); disposed = true; request++; pending = false;
    cleanups.forEach(cleanup => cleanup()); track.pause(); players.delete(track);
  }};
  players.set(track, controller);
  if (wanted) play();
  return controller;
}
