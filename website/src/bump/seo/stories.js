import {text} from './site.js';
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const symbols = {
  document: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>',
  connect: '<path d="M4 7h13l-3-3M20 17H7l3 3M17 7l-3 3M7 17l3-3"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18"/>',
  brain: '<path d="M9 4a4 4 0 0 0-6 4c-3 2-2 7 1 8 0 4 5 6 8 3V5c-1-3-4-4-6-2m9 1a4 4 0 0 1 6 4c3 2 2 7-1 8 0 4-5 6-8 3M6 9l3 1m-4 5 4-1m9-5-3 1m4 5-4-1"/>',
  person: '<circle cx="12" cy="7" r="4"/><path d="M4 22v-4a8 8 0 0 1 16 0v4"/>',
  pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  key: '<circle cx="8" cy="9" r="5"/><path d="m12 13 8 8m-4-4 3-3m-6 0 3-3"/>',
};
export const storyIcon = name => '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (symbols[name] || symbols.document) + '</svg>';
const mark = '<span class="seo-mark" aria-hidden="true"></span>';
const cursor = '<svg class="story-cursor" viewBox="0 0 24 28" aria-hidden="true"><path d="m3 2 17 15-8 1-4 7Z"/></svg>';
const step = (index, title, body, icon = 'check', extra = '') => '<div class="story-step ' + extra + '"><span class="story-step-number" aria-hidden="true">' + String(index + 1).padStart(2, '0') + '</span>' + storyIcon(icon) + '<div><strong>' + escape(title) + '</strong><p>' + escape(body) + '</p></div></div>';
const notes = (page, fr, en) => {
  const descriptions = page.locale === 'fr' ? fr : en;
  return '<div class="story-notes" data-story-steps>' + page.figure.map((title, i) => step(i, title, descriptions[i], ['document','check','connect'][i])).join('') + '</div>';
};
const connector = '<svg class="story-signal" viewBox="0 0 300 34" preserveAspectRatio="none" aria-hidden="true"><path d="M50 0v12h200V0M150 12v22"/><path class="story-packet" d="M50 0v12h100v22M150 0v34M250 0v12H150v22"/></svg>';

function expertise(page, t) {
  return '<div class="story-compass"><span class="story-compass-question">' + t('Votre besoin', 'Your business need') + '</span><svg viewBox="0 0 420 250" aria-hidden="true"><path d="M210 28v87M210 125 75 180m135-55 135 55"/><circle cx="210" cy="125" r="46"/></svg><div class="story-compass-core">' + mark + '<strong>Bump</strong></div><div data-story-steps class="story-compass-levers">' +
    step(0,t('Simplifier', 'Simplify'),t('Relier vos processus', 'Connect your workflows'),'connect','story-lever--workflow') +
    step(1,t('Construire', 'Build'),t('IA et logiciels utiles', 'Useful AI and software'),'code','story-lever--software') +
    step(2,t('Protéger', 'Protect'),t('Renforcer vos systèmes', 'Strengthen your systems'),'shield','story-lever--security') +
    '</div></div><p class="story-takeaway">' + t('Trois expertises. Un point de départ : votre réalité.', 'Three areas of expertise. One starting point: your reality.') + '</p>';
}
function workflow(page, t) {
  return '<div class="story-workflow-sources" data-story-sources><span>' + storyIcon('mail') + t('Courriel', 'Email') + '</span><span>' + storyIcon('document') + t('Formulaire', 'Form') + '</span><span>' + storyIcon('connect') + 'CRM</span></div>' + connector +
    '<div class="story-workflow-track" data-story-steps><div class="story-step story-request">' + storyIcon('document') + '<div><small>' + t('NOUVELLE DEMANDE', 'NEW REQUEST') + '</small><strong>' + t('Un besoin à qualifier', 'A request to qualify') + '</strong><p>' + t('Les informations arrivent au bon endroit.', 'Information reaches the right place.') + '</p></div><span class="story-ticket">D—024</span></div>' +
    '<div class="story-step story-gate">' + storyIcon('person') + '<div><strong>' + t('Votre équipe garde la main', 'Your team stays in control') + '</strong><p>' + t('Une étape attend votre validation.', 'A step waits for your approval.') + '</p></div><span class="story-approval-tag">' + t('Validation', 'Approval') + '</span>' + cursor + '</div>' +
    '<div class="story-step story-workflow-sync">' + storyIcon('check') + '<div><strong>' + t('Les outils sont synchronisés', 'Tools are synchronized') + '</strong><p>' + t('CRM, suivi interne et confirmation.', 'CRM, internal tracking and confirmation.') + '</p></div></div></div>' +
    '<p class="story-takeaway">' + t('Moins de recopies. Un suivi qui reste visible.', 'Less re-entry. A process you can follow.') + '</p>';
}
function ai(page, t) {
  return '<div class="story-ai-workspace"><div class="story-ai-sources" data-story-sources><span>' + storyIcon('document') + t('Documents', 'Documents') + '</span><span>' + storyIcon('connect') + 'CRM</span><span>' + storyIcon('code') + 'ERP</span></div><div class="story-ai-brief"><span class="story-mini-label">' + storyIcon('brain') + t('SYNTHÈSE EXPLIQUÉE', 'EXPLAINED SUMMARY') + '</span><blockquote>' + t('Des demandes incomplètes nécessitent un suivi de votre équipe.', 'Incomplete requests need a follow-up from your team.') + '</blockquote><div class="story-ai-citations"><span>01 · CRM</span><span>02 · ' + t('Formulaires', 'Forms') + '</span></div><div class="story-ai-proposal">' + storyIcon('check') + t('Préparer les prochaines actions', 'Prepare next actions') + '<small>' + t('À valider par votre équipe', 'For your team to approve') + '</small></div></div></div>' +
    notes(page, ['Du contexte, avec les accès convenus.', 'Une réponse reliée à ses sources.', 'Une décision humaine avant d’agir.'], ['Context with agreed access.', 'An answer tied to its sources.', 'A human decision before action.']);
}
function software(page, t) {
  return '<div class="story-software-app"><div class="story-app-top">' + mark + '<strong>' + t('Espace opérations', 'Operations workspace') + '</strong><span>DEMO</span></div><div class="story-app-body"><aside><span class="story-app-nav">' + storyIcon('document') + t('Demandes', 'Requests') + '</span><span>' + storyIcon('person') + t('Équipe', 'Team') + '</span><span>' + storyIcon('connect') + t('Connexions', 'Connections') + '</span></aside><div class="story-app-main"><div class="story-app-title"><strong>' + t('Chaque demande, au bon endroit.', 'Every request in the right place.') + '</strong><span>+ ' + t('Nouvelle', 'New') + '</span></div><div class="story-app-requests" data-story-steps>' +
    step(0,t('Qualifier le besoin', 'Qualify the need'),t('Demande reçue · D—024', 'Request received · D—024'),'document') +
    step(1,t('Attribuer un responsable', 'Assign an owner'),t('Une personne, une prochaine action.', 'One person, one next action.'),'person') +
    step(2,t('Voir le travail avancer', 'Follow the work'),t('État mis à jour dans l’espace commun.', 'Status updated in the shared workspace.'),'check') +
    '</div><div class="story-app-connection">' + storyIcon('connect') + t('Outils existants reliés par API', 'Existing tools connected through APIs') + '</div>' + cursor + '</div></div></div><p class="story-takeaway">' + t('Le logiciel suit votre manière de travailler.', 'Software follows the way you work.') + '</p>';
}
function security(page, t) {
  return '<div class="story-security-map"><span class="story-security-scope">' + storyIcon('shield') + t('Périmètre autorisé', 'Authorized scope') + '</span><svg viewBox="0 0 420 220" aria-hidden="true"><path d="m80 65 130 60 130-60M80 175l130-50 130 50M80 65v110m260-110v110"/><circle cx="210" cy="125" r="34"/><path class="story-security-scan" d="M210 125V25"/></svg><div class="story-security-core">' + storyIcon('shield') + '</div><span class="story-security-node node-app">' + storyIcon('code') + t('Applications', 'Applications') + '</span><span class="story-security-node node-access">' + storyIcon('key') + t('Accès', 'Access') + '</span><span class="story-security-node node-systems">' + storyIcon('connect') + t('Systèmes', 'Systems') + '</span><span class="story-security-node node-data">' + storyIcon('document') + t('Données', 'Data') + '</span><span class="story-security-finding">' + t('Vérifier · corriger · confirmer', 'Review · fix · verify') + '</span></div>' +
    notes(page, ['Des règles claires avant tout examen.', 'Des constats expliqués et priorisés.', 'Des correctifs suivis d’une vérification.'], ['Clear rules before examination.', 'Explained, prioritized findings.', 'Agreed fixes followed by verification.']);
}
function approach(page, t) {
  const labels = [['Audit','Audit'],['Analyse','Analysis'],['Proposition','Proposal'],['Implantation','Implementation'],['Maintenance','Maintenance']];
  const descriptions = [
    ['Voir votre fonctionnement réel.', 'See how you really work.'],
    ['Choisir le changement utile.', 'Choose a useful change.'],
    ['Convenir du cadre et des livrables.', 'Agree on scope and deliverables.'],
    ['Construire, vérifier et transmettre.', 'Build, verify and hand over.'],
    ['Suivre et faire évoluer la solution.', 'Support and evolve the solution.'],
  ];
  return '<div class="story-method-heading"><span>' + t('CARNET DE MISSION', 'ENGAGEMENT NOTES') + '</span><i>' + t('Un cap partagé.', 'A shared direction.') + '</i></div><div class="story-method-road" data-story-steps>' + labels.map((label,i) => step(i,t(...label),t(...descriptions[i]),['document','brain','check','code','connect'][i])).join('') + '</div><p class="story-takeaway">' + t('Vous savez où vous allez, et pourquoi.', 'You know where you are going, and why.') + '</p>';
}
function about(page, t) {
  return '<div class="story-about-atelier"><span class="story-about-place">' + storyIcon('pin') + 'Montréal, Québec</span><div class="story-about-duo"><div>' + storyIcon('person') + '<span>' + t('Comprendre', 'Understand') + '</span></div><span class="story-about-join">' + mark + '</span><div>' + storyIcon('person') + '<span>' + t('Construire ensemble', 'Build together') + '</span></div></div><p class="story-about-number">02<span>' + t('entrepreneurs', 'entrepreneurs') + '</span></p><div class="story-about-principles" data-story-steps>' +
    step(0,t('Un ancrage local', 'Local roots'),t('Un point de départ à Montréal.', 'Starting in Montréal.'),'pin') +
    step(1,t('Une relation directe', 'Direct collaboration'),t('À l’écoute des PME et de leurs équipes.', 'Listening to SMBs and their teams.'),'person') +
    step(2,t('Un horizon ouvert', 'Room to grow'),t('Une ambition qui se construit dans le temps.', 'An ambition built over time.'),'connect') +
    '</div></div>';
}
function faq(page, t) {
  const items = page.faqs.slice(0,3);
  return '<div class="story-faq-questions" data-story-steps>' + items.map((item,i) => '<a class="story-step" href="#question-' + (i+1) + '"><span aria-hidden="true">0' + (i+1) + '</span><strong>' + escape(item.q) + '</strong><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></a>').join('') + '</div><div class="story-faq-answer"><span>' + t('UNE PREMIÈRE RÉPONSE', 'A FIRST ANSWER') + '</span><div class="story-faq-answer-stack">' + items.map((item,i) => '<p class="story-faq-answer-copy' + (i === 0 ? ' is-visible' : '') + '" data-story-answer-copy aria-hidden="' + (i !== 0) + '">' + escape(item.a) + '</p>').join('') + '</div></div><p class="story-takeaway">' + t('Une question précise ouvre la bonne conversation.', 'A clear question starts the right conversation.') + '</p>';
}
function cases(page,t){
  return '<div class="story-case-ledger" data-story-steps>'+[
    [t('Le besoin réel','The real need'),t('Demandes, documents, interventions ou accès.','Requests, documents, service work or access.')],
    [t('Le parcours proposé','The proposed workflow'),t('Des étapes, des outils et une décision humaine.','Steps, tools and a human decision.')],
    [t('La vérification attendue','The expected verification'),t('Des essais définis avant de passer à l’action.','Checks defined before moving forward.')],
  ].map((item,i)=>step(i,item[0],item[1],['document','connect','check'][i])).join('')+'</div><p class="story-takeaway">'+t('Scénarios fictifs. Aucun résultat client revendiqué.','Fictional scenarios. No client outcomes claimed.')+'</p>';
}
const scenes = {expertise, workflow, ai, software, security, approach, about, faq,cases};
export function renderStoryFigure(page) {
  const t = (fr,en) => text(page.locale,fr,en);
  const scene = Object.hasOwn(scenes,page.id) ? scenes[page.id] : expertise;
  return '<figure class="seo-explainer seo-story-figure story--' + escape(page.id) + '" data-seo-flow data-story="' + escape(page.id) + '" tabindex="0" aria-label="' + escape(t('Parcours illustratif', 'Illustrative journey')) + '"><div class="seo-explainer-bar"><span class="seo-explainer-brand">' + mark + 'Bump</span><span>' + t('Scénario illustratif', 'Illustrative scenario') + '</span></div>' + scene(page,t) + '</figure>';
}

export function storyAction(page) {
  const choices = {
    expertise: ['#domaines','Explorer les expertises','Explore our expertise','Le bon levier, au bon endroit.','The right change, in the right place.'],
    workflow: ['#besoins','Repérer les bons automatismes','Find useful automations','Un processus à simplifier ?','A workflow to simplify?'],
    ai: ['#cas-usage','Choisir un premier usage','Choose a first use case','Une information à mieux exploiter ?','Information you could use better?'],
    software: ['#choix','Cadrer le bon logiciel','Define the right software','Un outil qui vous manque ?','Missing the right tool?'],
    security: ['#autorisation','Définir le périmètre','Define the scope','Un périmètre à sécuriser ?','A scope to secure?'],
    approach: ['#audit','Parcourir les cinq étapes','Explore the five steps','Commençons par comprendre.','Let’s start by understanding.'],
    about: ['#mission','Découvrir notre manière de travailler','Discover how we work','Et si nous avancions ensemble ?','What if we moved forward together?'],
    faq: ['#questions','Trouver une réponse','Find an answer','Il vous reste une question ?','Still have a question?'],
    cases: ['#devis','Explorer les scénarios','Explore the scenarios','Un besoin qui ressemble au vôtre ?','A need that sounds familiar?'],
  };
  const item = choices[page.id] || choices.expertise;
  const target = page.id === 'expertise' || page.id === 'faq' ? item[0] : '#' + page.sections[0].id;
  return {href:target,label:text(page.locale,item[1],item[2]),next:text(page.locale,item[3],item[4])};
}
