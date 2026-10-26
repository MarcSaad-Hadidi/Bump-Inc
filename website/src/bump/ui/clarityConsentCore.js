// Analytics is strictly opt-in and restricted to Bump's official hostnames.
// The tracker is NOT imported at module initialization.
export const CLARITY_ID = 'z3i6jyq003';
export const CONSENT_KEY = 'bump.clarity.analytics-consent.v1';
export const DENIAL_KEY = 'bump.clarity.analytics-denied.v1';

export function isBumpProductionHost(hostname) {
  return hostname === 'bumpconsultation.ca' || hostname === 'www.bumpconsultation.ca';
}

export function readAnalyticsChoice(storage, sessionStorage) {
  try {
    // A session-level explicit refusal takes priority over an older grant.
    if (sessionStorage?.getItem(DENIAL_KEY) === 'denied') return 'denied';
  } catch { /* Continue with the primary store. */ }

  try {
    const value = storage?.getItem(CONSENT_KEY);
    if (value === 'granted') {
      // Never auto-start tracking from a stale grant in read-only storage.
      // Without a working write path, later revocations could not be saved.
      storage.setItem(CONSENT_KEY, value);
      return storage.getItem(CONSENT_KEY) === 'granted' ? 'granted' : null;
    }
    return value === 'denied' ? 'denied' : null;
  } catch {
    return null; // Blocked or read-only storage must not imply consent.
  }
}

export function saveAnalyticsChoice(storage, choice, sessionStorage) {
  let persisted = false;
  try {
    storage?.setItem(CONSENT_KEY, choice);
    persisted = storage?.getItem(CONSENT_KEY) === choice;
  } catch { /* Try a session-level denial if persistent storage failed. */ }

  if (choice === 'denied') {
    try {
      sessionStorage?.setItem(DENIAL_KEY, 'denied');
      persisted = sessionStorage?.getItem(DENIAL_KEY) === 'denied' || persisted;
    } catch { /* Do not reload if no storage can retain the denial. */ }
  } else {
    try {
      sessionStorage?.removeItem(DENIAL_KEY);
      if (sessionStorage?.getItem(DENIAL_KEY) === 'denied') persisted = false;
    } catch { persisted = false; }
  }
  return persisted;
}

export function loadClarity(win, doc) {
  // A stopped instance cannot reliably be restarted by injecting another tag.
  // The React owner refreshes the document with a newly persisted grant first.
  if (win.__bumpClarityStopped) return false;
  if (win.__bumpClarityLoaded) {
    win.clarity?.('consentv2', {ad_Storage: 'denied', analytics_Storage: 'granted'});
    return false;
  }
  win.__bumpClarityLoaded = true;
  win.clarity = win.clarity || function () {
    (win.clarity.q = win.clarity.q || []).push(arguments);
  };
  win.clarity('consentv2', {ad_Storage: 'denied', analytics_Storage: 'granted'});
  const script = doc.createElement('script');
  script.async = true;
  script.src = 'https://www.clarity.ms/tag/' + CLARITY_ID;
  doc.head.appendChild(script);
  return true;
}

export function revokeClarity(win, {reload = true} = {}) {
  if (!win.__bumpClarityLoaded) return false;
  // Consent V2 alone may continue cookieless capture; stop collection too.
  win.clarity?.('consentv2', {ad_Storage: 'denied', analytics_Storage: 'denied'});
  win.clarity?.('stop');
  win.__bumpClarityStopped = true;
  // Do not reload into a stale granted choice if consent storage failed.
  if (reload) win.location.reload();
  return true;
}
