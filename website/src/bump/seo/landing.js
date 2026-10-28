// Remix hydrates the retained painting shell and owns its original head. Restore
// the same build-generated SEO records after hydration without loading the full
// editorial catalog into the scene bundle. No HTML or executable script is read.
const allowed = {meta: ['name', 'property', 'content'], link: ['rel', 'href', 'hreflang', 'type'], script: ['type']};

export function applyLandingMetadata(records, document) {
  for (const record of records) {
    if (record.tag === 'title') {
      if (document.title !== record.text) document.title = record.text;
      continue;
    }
    if (!allowed[record.tag]) continue;
    if (record.tag === 'script' && record.attrs?.type !== 'application/ld+json') continue;
    if (record.tag === 'link' && !['canonical', 'alternate', 'author'].includes(record.attrs?.rel)) continue;
    const keys = record.tag === 'meta' ? [record.attrs.name ? 'name' : 'property'] : record.tag === 'link' ? ['rel', 'hreflang', 'type'] : ['type'];
    let element = [...document.head.querySelectorAll(record.tag)].find(node => keys.every(key => (node.getAttribute(key) || '') === (record.attrs[key] || '')));
    if (!element) { element = document.createElement(record.tag); document.head.appendChild(element); }
    for (const key of allowed[record.tag]) {
      if (record.attrs[key] !== undefined && element.getAttribute(key) !== record.attrs[key]) element.setAttribute(key, record.attrs[key]);
    }
    if (record.tag === 'script' && element.textContent !== record.text) element.textContent = record.text;
  }
}

export function installLandingMetadata() {
  const controller = new AbortController(); let observer, frame = 0, records;
  const apply = () => { frame = 0; if (records) applyLandingMetadata(records, document); };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(apply); };
  fetch('/bump/seo/landing-meta.json', {signal: controller.signal, cache: 'no-cache'})
    .then(response => response.ok ? response.text() : Promise.reject(new Error('Metadata not available')))
    .then(source => {
      const payload = JSON.parse(source.replaceAll('__BUMP_ORIGIN__', location.origin));
      records = payload[document.documentElement.lang === 'en' ? 'en' : 'fr'];
      if (!Array.isArray(records)) return;
      apply();
      observer = new MutationObserver(schedule);
      observer.observe(document.head, {childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['content', 'href']});
    }).catch(() => { /* The initial HTML still has its full build-time metadata. */ });
  return () => { controller.abort(); observer?.disconnect(); cancelAnimationFrame(frame); records = null; };
}
