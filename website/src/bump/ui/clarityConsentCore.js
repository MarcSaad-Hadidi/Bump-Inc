// Analytics is strictly opt-in and restricted to Bump's official hostnames.
// The tracker is NOT imported at module initialization.
export const CLARITY_ID = 'z3i6jyq003';
export const CONSENT_KEY = 'bump.clarity.analytics-consent.v1';

export function isBumpProductionHost(hostname) {
  return hostname === 'bumpconsultation.ca' || hostname === 'www.bumpconsultation.ca';
}

export function readAnalyticsChoice(storage) {
  try {
    const value = storage?.getItem(CONSENT_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    // Blocked storage must not imply consent.
    return null;
  }
}

export function saveAnalyticsChoice(storage, choice) {
  try { storage?.setItem(CONSENT_KEY, choice); }
  catch { /* Consent still applies to the current page. */ }
}

export function loadClarity(win, doc) {
  if (win.__bumpClarityLoaded) return false;
  win.__bumpClarityLoaded = true;
  win.clarity = win.clarity || function () {
    (win.clarity.q = win.clarity.q || []).push(arguments);
  };
  // Explicit analytics-only Clarity Consent V2, before loading the script.
  win.clarity('consentv2', {ad_Storage: 'denied', analytics_Storage: 'granted'});
  const script = doc.createElement('script');
  script.async = true;
  script.src = 'https://www.clarity.ms/tag/' + CLARITY_ID;
  doc.head.appendChild(script);
  return true;
}

export function revokeClarity(win) {
  if (win.__bumpClarityLoaded) {
    win.clarity?.('consentv2', {ad_Storage: 'denied', analytics_Storage: 'denied'});
    // A loaded third-party script cannot be unloaded reliably.
    win.location.reload();
    return true;
  }
  return false;
}
