import {r as React, j as JSX} from '/runtime/assets/components-BdJai906.js';
import {
  isBumpProductionHost,
  readAnalyticsChoice,
  saveAnalyticsChoice,
  loadClarity,
  revokeClarity,
} from './clarityConsentCore.js';

const h = (tag, props, ...children) => JSX.jsxs(tag, {
  ...props,
  ...(children.length ? {children: children.flat()} : {}),
});

const COPY = {
  fr: {
    heading: 'Aidez-nous à améliorer Bump',
    description: 'Avec votre accord, Microsoft Clarity mesure les clics, le défilement et les enregistrements de session. Aucun suivi Clarity ne démarre sans votre consentement.',
    link: 'Confidentialité chez Microsoft',
    allow: 'Autoriser les statistiques',
    refuse: 'Refuser',
    settings: 'Préférences statistiques',
    error: 'Les préférences ne peuvent pas être enregistrées dans ce navigateur. Le suivi reste désactivé.',
  },
  en: {
    heading: 'Help us improve Bump',
    description: 'With your permission, Microsoft Clarity measures clicks, scrolling and session recordings. No Clarity tracking loads before you agree.',
    link: 'Microsoft privacy statement',
    allow: 'Allow analytics',
    refuse: 'Decline',
    settings: 'Analytics preferences',
    error: 'This browser cannot save your preferences. Tracking remains disabled.',
  },
};

export default function BumpClarityConsent() {
  const enabled = isBumpProductionHost(window.location.hostname);
  const [choice, setChoice] = React.useState(() => {
    if (!enabled) return 'denied';
    try { return readAnalyticsChoice(window.localStorage, window.sessionStorage); }
    catch { return null; }
  });
  const [noticeOpen, setNoticeOpen] = React.useState(() => enabled && choice === null);
  const [saveError, setSaveError] = React.useState(false);

  // The retained Remix application renders its own <html> and <head> with
  // createRoot(document). Mount the stylesheet AFTER that React commit, and
  // clean up on unmount. Unlike a static head link, this survives hydration.
  React.useEffect(() => {
    if (!enabled) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/runtime/clarity-consent.css';
    link.dataset.bumpClarityStyles = 'true';
    document.head.appendChild(link);
    return () => link.remove();
  }, [enabled]);

  // Let visitors reopen consent from the normal site menu. No persistent
  // button should cover the illustrations after a visitor has made a choice.
  React.useEffect(() => {
    if (!enabled) return;
    const open = () => {
      setSaveError(false);
      setNoticeOpen(true);
    };
    window.addEventListener('bump:open-analytics-preferences', open);
    return () => window.removeEventListener('bump:open-analytics-preferences', open);
  }, [enabled]);

  // The consent controls themselves belong to React, not the static HTML
  // document. This preserves their events and positioning through navigation.
  React.useEffect(() => {
    if (enabled && choice === 'granted') loadClarity(window, document);
  }, [enabled, choice]);

  if (!enabled) return null;
  const labels = document.documentElement.lang?.toLowerCase().startsWith('en') ? COPY.en : COPY.fr;

  function choose(next) {
    let persisted = false;
    try {
      persisted = saveAnalyticsChoice(window.localStorage, next, window.sessionStorage);
    } catch { /* Blocked storage: the React state still denies collection. */ }
    if (next === 'granted' && window.__bumpClarityStopped) {
      // Once Clarity has stopped in place, a clean reload is needed to start
      // a fresh instance. This is safe only after consent is persisted.
      if (persisted) {
        window.location.reload();
        return;
      }
      // Fail closed: don't claim we resumed collection or load a second tag.
      setChoice('denied');
      setNoticeOpen(true);
      setSaveError(true);
      return;
    }
    setSaveError(false);
    setChoice(next);
    setNoticeOpen(false);
    if (next === 'denied') revokeClarity(window, {reload: persisted});
  }

  return h(React.Fragment, {},
    h('section', {
      id: 'bump-clarity-notice',
      className: 'bump-clarity-notice',
      role: 'dialog',
      'aria-labelledby': 'bump-clarity-title',
      hidden: !noticeOpen,
    },
      h('h2', {id: 'bump-clarity-title', className: 'bump-clarity-title'}, labels.heading),
      h('p', {className: 'bump-clarity-description'}, labels.description),
      h('a', {
        className: 'bump-clarity-link',
        href: 'https://privacy.microsoft.com/privacystatement',
        target: '_blank',
        rel: 'noopener noreferrer',
      }, labels.link),
      h('div', {className: 'bump-clarity-actions'},
        h('button', {
          type: 'button',
          className: 'bump-clarity-button bump-clarity-refuse',
          onClick: () => choose('denied'),
        }, labels.refuse),
        h('button', {
          type: 'button',
          className: 'bump-clarity-button bump-clarity-allow',
          onClick: () => choose('granted'),
        }, labels.allow),
      ),
      h('p', {className: 'bump-clarity-error', role: 'alert', hidden: !saveError}, labels.error),
    ),
  );
}
