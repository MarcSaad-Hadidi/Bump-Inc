// Source: bump-pages-seo.zip / INSTRUCTIONS-IA.md. The English edition is
// deliberately poster-only until English native readings are supplied.
export const seoFigures = {
 workflow: {model:'workflow',drawingWidth:760,drawingHeight:520,slug:'automatisation-processus',width:1200,height:1078,
  fr:{alt:"Flux d'une demande de devis : réception, qualification, préparation, validation humaine, transmission au CRM",caption:'Automatisation des processus : du formulaire au CRM, avec la validation de votre équipe. Scénario illustratif.'},
  en:{alt:'Quote request workflow: intake, qualification, preparation, human approval and transfer to the CRM',caption:"Workflow automation: from form to CRM, with your team's approval. Illustrative scenario."}},
 ai: {model:'ia',drawingWidth:780,drawingHeight:500,slug:'integration-ia',width:1200,height:920,
  fr:{alt:"Assistant IA qui consulte les documents, le CRM et l'ERP autorisés, rédige une synthèse reliée à ses sources, puis attend la validation de l'équipe",caption:"Intégration IA : l'assistant puise seulement dans les sources autorisées, relie chaque point à sa source, et votre équipe décide. Scénario illustratif."},
  en:{alt:'AI assistant consulting authorized documents, CRM and ERP, preparing a source-linked summary, then waiting for the team’s approval',caption:'AI integration: the assistant only uses authorized sources, links each point to its source, and your team decides. Illustrative scenario.'}},
 software: {model:'logiciel',drawingWidth:780,drawingHeight:480,slug:'developpement-logiciel',width:1200,height:892,
  fr:{alt:'Tableau des opérations : une demande D-024 passe de reçue à terminée avec un responsable, puis met à jour le CRM',caption:'Logiciel sur mesure : une demande, un responsable, un état visible, relié à vos outils. Scénario illustratif.'},
  en:{alt:'Operations board: request D-024 moves from received to completed with an owner, then updates the CRM',caption:'Custom software: one request, one owner, one visible status, connected to your tools. Illustrative scenario.'}},
 security: {model:'security-engine',drawingWidth:760,drawingHeight:620,slug:'cybersecurite',width:1200,height:1208,
  fr:{alt:'Coffre-fort à tiroirs : domaines inspectés dans un périmètre autorisé, risque révélé, corrigé puis vérifié',caption:'Cybersécurité : audit autorisé, faiblesses priorisées, corrections vérifiées. Scénario illustratif.'},
  en:{alt:'Drawer vault: domains examined within an authorized scope, with a risk revealed, corrected and verified',caption:'Cybersecurity: authorized audit, prioritized weaknesses, verified fixes. Illustrative scenario.'}},
 expertise: {model:'aiguillage',drawingWidth:780,drawingHeight:500,slug:'expertises',width:1200,height:920,
  fr:{alt:"Aiguillage : chaque besoin est envoyé vers l'expertise qui convient, de l'automatisation à la cybersécurité",caption:'Le bon levier, au bon endroit : on part de ce qui vous ralentit et Bump oriente vers la bonne expertise. Scénario illustratif.'},
  en:{alt:'Switchyard routing each need to the right expertise, from workflow automation to cybersecurity',caption:'The right lever, in the right place: we start from what slows you down and route it to the right expertise. Illustrative scenario.'}},
 approach: {model:'methode',drawingWidth:780,drawingHeight:500,slug:'approche',width:1200,height:920,
  fr:{alt:"Carte des outils d'une PME : audit, analyse, proposition, implantation et maintenance, santé de 42 à 92",caption:'Notre méthode en 5 étapes : comprendre, choisir, convenir, construire, faire durer. Scénario illustratif.'},
  en:{alt:'An SME’s tool map: audit, analysis, proposal, implementation and maintenance, with health rising from 42 to 92',caption:'Our five-step method: understand, choose, agree, build, sustain. Illustrative scenario.'}},
 about: {model:'port',drawingWidth:820,drawingHeight:540,slug:'a-propos',width:1200,height:975,
  fr:{alt:'Port de Montréal : un navire arrive vide, est chargé de trois services, puis repart avec élan',caption:"Ancrés à Montréal, tournés vers la suite : la technologie doit vous donner de l'élan. Scénario illustratif."},
  en:{alt:'Port of Montréal: an empty ship arrives, loads three services and departs with momentum',caption:'Rooted in Montréal, looking ahead: technology should give you momentum. Illustrative scenario.'}},
};
export const caseFigureIds = {devis:'workflow',connaissances:'ai',interventions:'software',acces:'security'};
export function figureProps(id,locale='fr') {
 const entry=seoFigures[id];if(!entry)return null;
 return {poster:'/bump/'+entry.slug+'.webp',width:entry.width,height:entry.height,alt:entry[locale].alt,caption:entry[locale].caption,className:'seo-lazy-figure'};
}
export function sharingFigure(page) {
 const entry=seoFigures[page.id]||(['cases','faq'].includes(page.id)?seoFigures.expertise:null);
 return entry?{url:'/og/'+entry.slug+'.png',width:1200,height:630,type:'image/png',alt:entry[page.locale].alt}:null;
}
