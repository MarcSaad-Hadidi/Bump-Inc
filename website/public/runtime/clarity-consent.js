/* Bump public site: Clarity only loads on the real domain after analytics opt-in. */
(() => {
  'use strict';

  const hostname = window.location.hostname;
  if (hostname !== 'bumpconsultation.ca' && hostname !== 'www.bumpconsultation.ca') return;

  const projectId = 'z3i6jyq003';
  const storageKey = 'bump.clarity.analytics-consent.v1';
  const en = document.documentElement.lang.toLowerCase().startsWith('en');
  const labels = en ? {
    heading: 'Help us improve Bump',
    description: 'With your permission, Microsoft Clarity measures clicks, scrolling and session recordings. No Clarity tracking loads before you agree.',
    info: 'Microsoft privacy statement',
    allow: 'Allow analytics',
    refuse: 'Decline',
    settings: 'Analytics preferences',
  } : {
    heading: 'Aidez-nous à améliorer Bump',
    description: 'Avec votre accord, Microsoft Clarity mesure les clics, le défilement et les enregistrements de session. Aucun suivi Clarity ne démarre sans votre consentement.',
    info: 'Confidentialité chez Microsoft',
    allow: 'Autoriser les statistiques',
    refuse: 'Refuser',
    settings: 'Préférences statistiques',
  };

  function element(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    return node;
  }

  const notice = document.createElement('section');
  notice.id = 'bump-clarity-notice';
  notice.className = 'bump-clarity-notice';
  notice.setAttribute('role', 'dialog');
  notice.setAttribute('aria-labelledby', 'bump-clarity-title');
  notice.hidden = true;

  const heading = element('h2', 'bump-clarity-title', labels.heading);
  heading.id = 'bump-clarity-title';
  const description = element('p', 'bump-clarity-description', labels.description);
  const link = element('a', 'bump-clarity-link', labels.info);
  link.href = 'https://privacy.microsoft.com/privacystatement';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';

  const actions = document.createElement('div');
  actions.className = 'bump-clarity-actions';
  const refuse = element('button', 'bump-clarity-button bump-clarity-refuse', labels.refuse);
  refuse.type = 'button';
  const allow = element('button', 'bump-clarity-button bump-clarity-allow', labels.allow);
  allow.type = 'button';
  actions.append(refuse, allow);
  notice.append(heading, description, link, actions);

  const settings = element('button', 'bump-clarity-settings', labels.settings);
  settings.type = 'button';
  settings.setAttribute('aria-haspopup', 'dialog');
  settings.setAttribute('aria-controls', notice.id);
  settings.hidden = true;

  // The retained React client mounts into document itself. Its first commit can
  // replace the entire document/body and detach pre-existing script-owned UI.
  // Keep this small, isolated consent interface attached across those commits.
  function mountControls() {
    if (!document.body) return;
    if (!notice.isConnected) document.body.append(notice);
    if (!settings.isConnected) document.body.append(settings);
  }

  let remountQueued = false;
  const mountObserver = new MutationObserver(() => {
    if ((notice.isConnected && settings.isConnected) || remountQueued) return;
    remountQueued = true;
    queueMicrotask(() => {
      remountQueued = false;
      mountControls();
    });
  });
  mountObserver.observe(document, {childList: true, subtree: true});
  mountControls();

  let started = false;

  function startClarity() {
    if (started) return;
    started = true;

    // Queue Consent V2 before downloading the Microsoft Clarity tracker.
    // Advertising storage is never authorized by this analytics-only choice.
    window.clarity = window.clarity || function () {
      (window.clarity.q = window.clarity.q || []).push(arguments);
    };
    window.clarity('consentv2', {ad_Storage: 'denied', analytics_Storage: 'granted'});

    const tracker = document.createElement('script');
    tracker.async = true;
    tracker.src = 'https://www.clarity.ms/tag/' + projectId;
    const first = document.getElementsByTagName('script')[0];
    if (first && first.parentNode) first.parentNode.insertBefore(tracker, first);
    else document.head.append(tracker);
  }

  function saveConsent(value) {
    try { window.localStorage.setItem(storageKey, value); }
    catch { /* Private browsing or blocked storage: ask again next visit. */ }
  }

  function choose(value) {
    saveConsent(value);
    notice.hidden = true;
    settings.hidden = false;
    if (value === 'granted') startClarity();
    else if (started) {
      // A running third-party script cannot be unloaded: revoke and reload.
      window.clarity('consentv2', {ad_Storage: 'denied', analytics_Storage: 'denied'});
      window.location.reload();
    }
  }

  allow.addEventListener('click', () => choose('granted'));
  refuse.addEventListener('click', () => choose('denied'));
  settings.addEventListener('click', () => {
    notice.hidden = false;
    settings.hidden = true;
  });

  let saved = null;
  try { saved = window.localStorage.getItem(storageKey); }
  catch { /* No consent can be inferred from unavailable storage. */ }

  if (saved === 'granted') {
    settings.hidden = false;
    startClarity();
  } else if (saved === 'denied') {
    settings.hidden = false;
  } else {
    notice.hidden = false;
  }
})();
