// Shared by the real landing, its initial HTML and the editorial catalog.
// These are fictional engagement scenarios, never customer references.
export const homeQuestions = {
  fr: [
    {q:'Comment Bump peut-elle aider votre PME ?',a:'Bump accompagne les PME en optimisation des processus, automatisation, intégration IA, développement logiciel et cybersécurité. Nous partons de votre fonctionnement et de vos outils pour définir une intervention adaptée.'},
    {q:'Faut-il remplacer les outils déjà en place ?',a:'Pas nécessairement. Nous examinons ce qui peut être simplifié ou connecté avant de proposer un nouveau logiciel. Les accès, les API, les coûts et les limites des outils font partie de l’analyse.'},
    {q:'Comment commence un mandat avec Bump ?',a:'Un mandat suit cinq étapes : audit, analyse, proposition, implantation et maintenance. La proposition précise le périmètre, les livrables, le budget et les validations avant de commencer l’implantation.'},
    {q:'Les agents Cyber AI, Developer AI et Workflow AI sont-ils disponibles ?',a:'Non. Ces systèmes spécialisés font partie de notre vision future. Nos services actuels portent sur la consultation, l’intégration, le développement et la cybersécurité dans le cadre d’un mandat défini.'},
  ],
  en: [
    {q:'How can Bump help your business?',a:'Bump helps SMEs with process optimization, automation, AI integration, custom software and cybersecurity. We start with the way your team works and the tools it uses to define a suitable engagement.'},
    {q:'Do we have to replace our existing tools?',a:'Not necessarily. We examine what can be simplified or connected before proposing new software. Access, APIs, costs and tool limitations are part of the analysis.'},
    {q:'How does an engagement with Bump begin?',a:'An engagement follows five stages: audit, analysis, proposal, implementation and maintenance. The proposal defines scope, deliverables, budget and approvals before implementation begins.'},
    {q:'Are Cyber AI, Developer AI and Workflow AI available?',a:'No. These specialized systems are part of our future vision. Our current services cover consulting, integration, development and cybersecurity within a defined engagement.'},
  ],
};

export const casePreviews = [
  {id:'devis',service:'workflow',fr:{label:'Automatisation',title:'Du courriel au devis à valider.',summary:'Une demande est structurée, vérifiée puis transmise au CRM après une décision humaine.'},en:{label:'Automation',title:'From an email to a quote ready for review.',summary:'A request is structured, checked and sent to the CRM after a human decision.'}},
  {id:'connaissances',service:'ai',fr:{label:'Intégration IA',title:'Retrouver la bonne information.',summary:'Un assistant consulte les documents autorisés et relie sa réponse à des sources vérifiables.'},en:{label:'AI integration',title:'Find the information that matters.',summary:'An assistant searches authorized documents and connects its answer to verifiable sources.'}},
  {id:'interventions',service:'software',fr:{label:'Logiciel sur mesure',title:'Un suivi commun pour les interventions.',summary:'Demandes, responsables et prochaines actions se retrouvent dans un espace adapté à l’équipe.'},en:{label:'Custom software',title:'One place to coordinate service work.',summary:'Requests, owners and next actions come together in a workspace built around the team.'}},
  {id:'acces',service:'security',fr:{label:'Cybersécurité',title:'Du risque identifié au correctif vérifié.',summary:'Un audit autorisé examine les accès, priorise les écarts et organise leur correction.'},en:{label:'Cybersecurity',title:'From an identified risk to a verified fix.',summary:'An authorized audit reviews access, prioritizes findings and organizes remediation.'}},
];

export const casePath = locale => locale === 'en' ? '/en/use-cases' : '/cas-d-usage';
