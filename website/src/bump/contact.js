// Public configuration verified from the contact-email PR and Cloudflare.
// The receiving inbox and all verification secrets remain server-side.
export const CONTACT_EMAIL='contact@bumpconsultation.ca';
export const CONTACT_ORIGIN='https://bumpconsultation.ca';
export const CONTACT_SITE_KEY='0x4AAAAAAFnvTBtc-P3OUjx3';
export const CONTACT_ORIGINS=[CONTACT_ORIGIN,'https://www.bumpconsultation.ca'];
export const contactIsAvailable=origin=>CONTACT_ORIGINS.includes(origin);
