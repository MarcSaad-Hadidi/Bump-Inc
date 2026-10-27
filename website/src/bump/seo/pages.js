import content from '../content.json' with {type: 'json'};
import {buyerGuides} from './buyer-guides.js';
import {site} from './site.js';
import {revisions} from './editorial.js';

// HTML, markdown, structured data, discovery and navigation all use this catalog.
// Examples describe possible engagements, not clients or measured results.
const entries = [
  {
    id: 'expertise', type: 'hub', accent: 'olive', related: ['workflow', 'ai', 'software', 'security', 'approach'],
    fr: {
      path: '/expertises', title: 'La technologie,\nà votre mesure.', metaTitle: 'Consultation technologique pour PME à Montréal | Bump',
      description: 'Bump accompagne les PME du Québec : automatisation, intégration IA, logiciels sur mesure et cybersécurité. Découvrez nos expertises et notre méthode.',
      eyebrow: 'Nos expertises', lead: 'Des processus plus fluides. Des systèmes plus intelligents. Une entreprise mieux protégée.',
      answer: 'Bump est une firme de consultation technologique basée à Montréal. Nous aidons les PME à analyser leurs besoins, à connecter leurs outils, à développer les logiciels utiles à leurs opérations et à renforcer leur sécurité. Un mandat commence par votre réalité, puis une proposition définit ce qui sera implanté et maintenu.',
      figure: ['Vos opérations', 'Vos outils', 'Votre prochain élan'],
      sections: [
        {id: 'choisir', title: 'Partir de ce qui vous ralentit.', paragraphs: ['Une demande circule par courriel, un fichier est recopié dans trois outils, une information arrive trop tard. Le point de départ est souvent très concret. Nous cherchons avec votre équipe le changement qui simplifiera le travail sans ajouter une nouvelle couche de complexité.'], table: {headers: ['Votre situation', 'Le point de départ'], rows: [['Trop de tâches répétitives ou de transferts manuels', 'Analyser et automatiser le processus'], ['Des informations difficiles à retrouver ou à exploiter', 'Évaluer une intégration IA ciblée'], ['Les logiciels existants ne couvrent plus votre fonctionnement', 'Cadrer un logiciel sur mesure'], ['Des risques ou des accès à mieux maîtriser', 'Définir un audit de cybersécurité autorisé']]}},
        {id: 'divisions', title: 'Trois divisions. Un même fil conducteur.', paragraphs: ['Workflow Optimization, AI Integration & Software Development et Cybersecurity se complètent. Une intégration de logiciels doit aussi être maintenable. Une automatisation doit gérer les exceptions. Un agent IA doit respecter les accès et les validations de votre entreprise.'], items: ['Optimisation : comprendre le processus, simplifier les étapes et relier les outils.', 'IA et logiciels : construire ou intégrer les systèmes adaptés au besoin métier.', 'Cybersécurité : examiner les risques, prioriser les correctifs et renforcer les protections.']},
        {id: 'cadre', title: 'Savoir ce qu’on construit, et pourquoi.', paragraphs: ['Notre modèle suit cinq étapes : audit, analyse, proposition, implantation et maintenance. Le périmètre, les livrables, les dépendances et les critères de validation sont précisés avant l’implantation. La maintenance se définit selon les systèmes retenus et le niveau de suivi convenu.']},
      ],
      faqs: [
        {q: 'Faut-il déjà savoir quelle solution acheter ?', a: 'Non. Vous pouvez partir d’un problème opérationnel. L’analyse sert à déterminer si une amélioration de processus, une intégration, un logiciel ou une intervention de sécurité répond au besoin.'},
        {q: 'Bump travaille-t-elle avec les outils déjà en place ?', a: 'Oui, l’intégration des outils existants fait partie de nos services. Nous examinons leurs API, leurs droits d’accès et leurs limites avant de proposer une connexion.'},
      ],
    },
    en: {
      path: '/en/expertise', title: 'Technology,\nshaped around you.', metaTitle: 'Technology Consulting for SMEs in Montréal, Québec | Bump',
      description: 'Bump helps Québec SMEs with workflow automation, AI integration, custom software and cybersecurity. Explore our expertise and delivery approach.',
      eyebrow: 'Our expertise', lead: 'Smoother processes. Smarter systems. A better protected business.',
      answer: 'Bump is a technology consulting firm based in Montréal. We help small and medium-sized businesses understand their needs, connect their tools, develop software for their operations and strengthen their security. Each engagement starts with your situation, followed by a proposal defining implementation and maintenance.',
      figure: ['Your operations', 'Your tools', 'Your next step'],
      sections: [
        {id: 'choose', title: 'Start with what slows you down.', paragraphs: ['A request moves through email, a file gets copied into three tools, or information arrives too late. The starting point is usually concrete. With your team, we identify the change that simplifies the work without adding another layer of complexity.'], table: {headers: ['Your situation', 'Where to start'], rows: [['Repeated tasks or manual handoffs', 'Analyse and automate the process'], ['Information that is difficult to find or use', 'Assess a focused AI integration'], ['Existing software no longer fits your operations', 'Scope a custom software project'], ['Risks or access controls that need attention', 'Define an authorized cybersecurity audit']]}},
        {id: 'divisions', title: 'Three divisions. One connected approach.', paragraphs: ['Workflow Optimization, AI Integration & Software Development and Cybersecurity complement one another. Software integrations need to be maintainable. Automation needs to handle exceptions. AI agents need to respect your business’s access controls and approval requirements.'], items: ['Workflow: understand the process, simplify steps and connect tools.', 'AI and software: build or integrate systems around a business need.', 'Cybersecurity: examine risks, prioritize fixes and strengthen protection.']},
        {id: 'framework', title: 'Know what you are building, and why.', paragraphs: ['Our model follows five stages: audit, analysis, proposal, implementation and maintenance. Scope, deliverables, dependencies and acceptance criteria are defined before implementation. Maintenance depends on the selected systems and the level of follow-up agreed upon.']},
      ],
      faqs: [
        {q: 'Do we need to know which solution to buy?', a: 'No. You can start with an operational problem. The analysis determines whether a process improvement, integration, software project or security engagement fits the need.'},
        {q: 'Can Bump work with our existing tools?', a: 'Yes. Integrating existing tools is part of our services. We assess their APIs, access controls and limitations before proposing a connection.'},
      ],
    },
  },
  {
    id: 'workflow', type: 'service', accent: 'olive', chapter: 'sidekick', division: '01', related: ['software', 'ai', 'approach', 'faq', 'expertise'],
    fr: {
      path: '/services/automatisation-processus', title: 'Automatisation des processus\npour les PME.', metaTitle: 'Automatisation des processus pour PME à Montréal | Bump',
      description: 'Analysez vos processus, automatisez les tâches répétitives et connectez vos logiciels avec Bump à Montréal. Des workflows adaptés aux opérations de votre PME.',
      eyebrow: '01 — Workflow Optimization', lead: 'Moins de recopies. Moins de suivis manuels. Plus de temps pour faire avancer le travail.',
      answer: 'L’automatisation des processus consiste à confier aux systèmes les tâches répétitives d’un parcours de travail : réception d’une demande, classement, notifications, validation ou synchronisation. Bump commence par analyser ce parcours avec votre équipe, puis relie les outils utiles en conservant une intervention humaine pour les décisions et les exceptions.',
      figure: ['Recevoir la demande', 'Valider au bon moment', 'Synchroniser les outils'],
      sections: [
        {id: 'besoins', title: 'Repérer les tâches qui méritent d’être automatisées.', paragraphs: ['Un bon candidat revient souvent, suit des règles explicites et mobilise du temps sans demander un jugement nouveau à chaque occurrence. Il peut s’agir d’un suivi de demande, d’un transfert de données ou de la préparation d’un rapport. Automatiser un processus mal défini risque simplement d’en reproduire les problèmes plus vite.'], items: ['Doubles saisies entre formulaires, tableurs et CRM.', 'Rappels, notifications et demandes de validation.', 'Classement de documents et transfert d’informations.', 'Préparation de rapports à partir de données déjà disponibles.']},
        {id: 'existant', title: 'Faire collaborer ce qui fonctionne déjà.', paragraphs: ['Nous examinons vos logiciels avant de proposer de les remplacer. Une connexion peut passer par une API, un connecteur ou un échange de fichiers prévu par le système. Les possibilités dépendent des accès, des abonnements et des limites de chaque outil.', 'Le fonctionnement doit rester compréhensible : quelle source fait autorité, que se passe-t-il en cas d’erreur et qui peut reprendre une demande ? Ces questions font partie de la conception.']},
        {id: 'livrables', title: 'Des livrables pour exploiter le workflow.', table: {headers: ['Livrable à cadrer', 'Ce qu’il permet'], rows: [['Cartographie du processus', 'Comprendre les étapes, les responsabilités et les points de blocage'], ['Règles et exceptions', 'Définir les déclencheurs, les validations et les cas à reprendre'], ['Connexions et automatisations', 'Faire circuler les données entre les systèmes retenus'], ['Tests et documentation', 'Vérifier le parcours et expliquer son fonctionnement'], ['Plan de suivi', 'Préciser la surveillance, la maintenance et les évolutions']]}, paragraphs: ['La proposition précise les livrables retenus pour votre mandat. Une automatisation simple et une intégration entre plusieurs systèmes n’ont pas le même périmètre.']},
        {id: 'exemple', title: 'Du formulaire au CRM, sans perdre le suivi.', example: true, paragraphs: ['Une PME reçoit des demandes de devis par formulaire. Le workflow vérifie les champs, crée un dossier et prépare une demande de validation. Un responsable approuve ou demande une précision. Après approbation, les informations sont transmises au CRM et la personne concernée reçoit une notification.', 'Si le CRM est indisponible ou si une donnée manque, le parcours prévoit une reprise et un signalement. La décision commerciale reste humaine. Cet exemple illustre un type de mandat possible, sans représenter un résultat client.']},
        {id: 'mesure', title: 'Mesurer un changement utile.', paragraphs: ['Avant l’implantation, nous définissons ce qu’il est utile de suivre : temps de traitement, recopies, erreurs, demandes en attente ou interventions manuelles. Les gains dépendent du processus, de son volume et de son adoption. Ils se mesurent sur votre fonctionnement réel.']},
      ],
      faqs: [
        {q: 'Quelle différence entre optimiser et automatiser un processus ?', a: 'Optimiser consiste à améliorer le parcours : supprimer une étape inutile, clarifier une responsabilité ou simplifier une validation. Automatiser consiste à faire exécuter certaines étapes par les systèmes. L’optimisation précède généralement l’automatisation.'},
        {q: 'Peut-on conserver une approbation humaine ?', a: 'Oui. Le workflow peut s’arrêter avant une action sensible et attendre une décision explicite. Nous définissons aussi qui peut approuver, les informations présentées et le traitement d’un refus ou d’une demande de précision.'},
        {q: 'Une API est-elle nécessaire ?', a: 'Une API facilite souvent l’intégration, mais ce n’est pas la seule possibilité. Les connecteurs et échanges de fichiers peuvent convenir. La faisabilité se confirme après examen des outils, de leurs conditions et des accès disponibles.'},
        {q: 'Comment le coût est-il établi ?', a: 'Il dépend du nombre d’étapes, des outils à connecter, de la qualité des données, des exceptions et du suivi attendu. Bump prépare une proposition à partir du périmètre analysé, plutôt qu’un prix fondé uniquement sur un nombre de tâches.'},
      ],
    },
    en: {
      path: '/en/services/workflow-automation', title: 'Workflow automation\nfor small businesses.', metaTitle: 'Workflow Automation for SMEs in Montréal, Québec | Bump',
      description: 'Analyse processes, automate repetitive tasks and connect business software with Bump in Montréal. Workflows designed around your SME’s operations.',
      eyebrow: '01 — Workflow Optimization', lead: 'Less copying. Less manual follow-up. More time to move work forward.',
      answer: 'Workflow automation lets systems carry out repetitive steps such as receiving requests, filing information, sending notifications, collecting approvals or synchronizing data. Bump first analyses that process with your team, then connects the appropriate tools while keeping people involved in decisions and exceptions.',
      figure: ['Receive the request', 'Approve at the right time', 'Synchronize the tools'],
      sections: [
        {id: 'needs', title: 'Find the tasks worth automating.', paragraphs: ['A good candidate happens repeatedly, follows explicit rules and consumes time without requiring new judgment on every occurrence. It might involve following up on a request, transferring data or preparing a report. Automating an unclear process can simply repeat its problems faster.'], items: ['Duplicate entry between forms, spreadsheets and a CRM.', 'Reminders, notifications and approval requests.', 'Document filing and information transfers.', 'Reports prepared from data already available.']},
        {id: 'existing-tools', title: 'Make useful tools work together.', paragraphs: ['We assess your software before proposing replacements. A connection may use an API, a connector or a file exchange supported by the system. The options depend on each tool’s access, subscriptions and limitations.', 'The operation needs to remain understandable: which source is authoritative, what happens after an error and who can resume a request? These questions are part of the design.']},
        {id: 'deliverables', title: 'Deliverables for running the workflow.', table: {headers: ['Deliverable to scope', 'What it supports'], rows: [['Process map', 'Understand steps, responsibilities and bottlenecks'], ['Rules and exceptions', 'Define triggers, approvals and cases needing intervention'], ['Connections and automation', 'Move data between the selected systems'], ['Tests and documentation', 'Verify the journey and explain its operation'], ['Follow-up plan', 'Define monitoring, maintenance and future changes']]}, paragraphs: ['The proposal specifies the deliverables included in your engagement. A simple automation and an integration spanning several systems have different scopes.']},
        {id: 'example', title: 'From form to CRM, with a clear trail.', example: true, paragraphs: ['An SME receives quote requests through a form. The workflow checks the fields, creates a record and prepares an approval request. A responsible person approves or asks for clarification. After approval, the information is sent to the CRM and the appropriate person is notified.', 'If the CRM is unavailable or data is missing, the process includes recovery and an alert. The commercial decision remains human. This is an illustrative engagement, not a client result.']},
        {id: 'measure', title: 'Measure a useful change.', paragraphs: ['Before implementation, we define what is worth tracking: processing time, duplicate entries, errors, pending requests or manual interventions. Improvements depend on the process, volume and adoption. They are measured in your actual operations.']},
      ],
      faqs: [
        {q: 'What is the difference between process optimization and automation?', a: 'Optimization improves the process: removing an unnecessary step, clarifying responsibility or simplifying approval. Automation lets systems carry out selected steps. Optimization generally comes first.'},
        {q: 'Can we keep human approval?', a: 'Yes. A workflow can stop before a sensitive action and wait for an explicit decision. We also define who can approve, what information is presented and how rejection or requests for clarification are handled.'},
        {q: 'Is an API required?', a: 'An API often makes integration easier, but it is not the only option. Connectors and file exchanges can also fit. Feasibility is confirmed after assessing the tools, their conditions and available access.'},
        {q: 'How is the cost determined?', a: 'It depends on the number of steps, tools to connect, data quality, exceptions and expected follow-up. Bump prepares a proposal around the assessed scope rather than pricing solely by the number of tasks.'},
      ],
    },
  },
  {
    id: 'ai', type: 'service', accent: 'blue', chapter: 'online', division: '02', related: ['workflow', 'software', 'security', 'approach', 'faq'],
    fr: {
      path: '/services/integration-ia', title: 'Intégration IA\npour votre entreprise.', metaTitle: 'Intégration de l’IA pour PME à Montréal, Québec | Bump',
      description: 'Intégrez l’IA à vos outils et à vos processus avec Bump : agents ciblés, recherche documentaire, synthèses et tableaux de bord, avec validation humaine.',
      eyebrow: '02 — AI Integration & Software Development', lead: 'Une tâche précise. Les bonnes informations. Une décision qui reste entre vos mains.',
      answer: 'L’intégration IA relie un modèle ou un agent à vos données et à vos logiciels pour accomplir une tâche définie. Bump accompagne les PME dans le choix du cas d’usage, la connexion des sources, la définition des accès et l’évaluation des réponses. Les actions sensibles peuvent rester soumises à une validation humaine.',
      figure: ['Rassembler les sources', 'Préparer une recommandation', 'Faire valider l’action'],
      sections: [
        {id: 'cas-usage', title: 'Commencer par une tâche qui compte.', paragraphs: ['Une intégration utile répond à une question opérationnelle : que doit pouvoir faire l’utilisateur plus facilement ? Le choix d’un modèle vient ensuite. Nous distinguons les tâches qui bénéficient de l’IA de celles qu’une règle ou une automatisation classique peut traiter plus simplement.'], items: ['Retrouver une information dans un ensemble de documents autorisés.', 'Préparer une synthèse de dossier ou de demande.', 'Classer une demande et proposer une prochaine action.', 'Faire ressortir une tendance dans un dashboard.', 'Préparer un brouillon à vérifier avant son utilisation.']},
        {id: 'donnees', title: 'Des sources et des accès définis.', paragraphs: ['L’IA doit utiliser les informations pertinentes pour la tâche, dans le respect des droits de l’utilisateur. Nous examinons l’emplacement des données, leur qualité, les accès nécessaires et les contraintes des fournisseurs envisagés.', 'Une réponse plausible peut être incorrecte. La conception prévoit donc des critères d’évaluation, des cas où le système doit exprimer son incertitude et une façon de retrouver les sources lorsqu’elles sont disponibles.']},
        {id: 'cadre-humain', title: 'Assister une décision sans la rendre invisible.', table: {headers: ['À définir', 'Question à résoudre'], rows: [['Rôle de l’agent', 'Quelle tâche précise lui confier ?'], ['Sources autorisées', 'Quelles informations peut-il consulter ?'], ['Actions permises', 'Peut-il proposer, préparer ou exécuter ?'], ['Validation', 'Quelles actions nécessitent un accord humain ?'], ['Évaluation', 'Comment juger la qualité sur des cas représentatifs ?'], ['Suivi', 'Comment détecter les erreurs et réviser le système ?']]}},
        {id: 'exemple', title: 'Transformer des données en prochaine action.', example: true, paragraphs: ['Les données d’un CRM, d’un ERP et de formulaires alimentent un tableau de bord. Un changement inhabituel est mis en évidence. L’assistant prépare une synthèse, présente les éléments qui la soutiennent et propose des actions. L’équipe peut ensuite soumettre, modifier ou refuser la recommandation.', 'Le scénario explique le fonctionnement d’une intégration possible. Il ne représente ni une analyse de données client ni un agent Bump déjà commercialisé.']},
        {id: 'livrables', title: 'Une intégration à évaluer dans votre contexte.', paragraphs: ['Selon le mandat, les livrables peuvent comprendre le cadrage du cas d’usage, les connexions aux sources, l’interface, les règles de validation, un ensemble de cas de test et la documentation. Le pilote sert à vérifier l’utilité et les limites avant d’élargir le déploiement.', 'Cyber AI, Developer AI et Workflow AI appartiennent à notre vision future de systèmes spécialisés. Ils ne sont pas présentés comme des produits disponibles. Nos services actuels portent sur l’analyse, le développement et l’intégration selon un mandat défini.']},
      ],
      faqs: [
        {q: 'Quelle différence entre un chatbot et un agent IA intégré ?', a: 'Un chatbot échange des messages. Une intégration peut aussi consulter des sources autorisées, préparer des informations ou interagir avec des logiciels. Les capacités réelles dépendent des connexions, des permissions et du périmètre convenu.'},
        {q: 'L’IA peut-elle agir sans approbation ?', a: 'Cela dépend de l’action et du cadre retenu. Une recommandation peut rester un brouillon jusqu’à sa validation. Les opérations sensibles doivent avoir des permissions et des contrôles explicites, définis avant l’implantation.'},
        {q: 'Faut-il remplacer notre CRM ou notre ERP ?', a: 'Pas nécessairement. Nous évaluons d’abord les possibilités d’intégration des outils existants. Les accès API, les abonnements et la qualité des données déterminent ce qui est faisable.'},
        {q: 'Comment savoir si une intégration IA est utile ?', a: 'Il faut comparer ses résultats sur des cas représentatifs à des critères définis : qualité, temps de vérification, erreurs, coût d’utilisation et utilité pour l’équipe. Un pilote aide à prendre cette décision avant une généralisation.'},
      ],
    },
    en: {
      path: '/en/services/ai-integration', title: 'AI integration\nfor your business.', metaTitle: 'AI Integration for SMEs in Montréal, Québec | Bump',
      description: 'Integrate AI into business tools and processes with Bump: focused agents, document search, summaries and dashboards, with human approval.',
      eyebrow: '02 — AI Integration & Software Development', lead: 'A focused task. The right information. Decisions that stay in your hands.',
      answer: 'AI integration connects a model or agent to your data and software to perform a defined task. Bump helps SMEs select a use case, connect sources, define access and evaluate responses. Sensitive actions can remain subject to human approval.',
      figure: ['Bring sources together', 'Prepare a recommendation', 'Have the action approved'],
      sections: [
        {id: 'use-cases', title: 'Start with a task that matters.', paragraphs: ['A useful integration starts with an operational question: what should the user be able to do more easily? Model selection comes afterwards. We distinguish tasks that benefit from AI from those a rule or conventional automation can handle more simply.'], items: ['Find information in a set of authorized documents.', 'Prepare a summary of a record or request.', 'Classify a request and suggest a next action.', 'Highlight a trend in a dashboard.', 'Prepare a draft for review before use.']},
        {id: 'data', title: 'Defined sources and access.', paragraphs: ['AI should use information relevant to the task while respecting the user’s permissions. We assess where data lives, its quality, the access needed and the constraints of potential providers.', 'A plausible answer can be wrong. The design therefore includes evaluation criteria, situations where the system should express uncertainty and a way to trace sources when available.']},
        {id: 'human-control', title: 'Support a decision without hiding it.', table: {headers: ['Define', 'Question to answer'], rows: [['Agent’s role', 'Which specific task should it handle?'], ['Authorized sources', 'What information can it consult?'], ['Permitted actions', 'Can it suggest, prepare or execute?'], ['Approval', 'Which actions require human agreement?'], ['Evaluation', 'How is quality assessed on representative cases?'], ['Follow-up', 'How are errors detected and the system revised?']]}},
        {id: 'example', title: 'Turn data into a next action.', example: true, paragraphs: ['Data from a CRM, ERP and forms feeds a dashboard. An unusual change is highlighted. The assistant prepares a summary, presents supporting information and suggests actions. The team can then submit, change or reject the recommendation.', 'This scenario explains a possible integration. It is neither an analysis of client data nor a Bump agent already offered as a product.']},
        {id: 'deliverables', title: 'An integration to evaluate in context.', paragraphs: ['Depending on the engagement, deliverables may include use-case scoping, source connections, an interface, approval rules, a set of test cases and documentation. A pilot helps establish usefulness and limitations before a wider rollout.', 'Cyber AI, Developer AI and Workflow AI are part of our future vision for specialized systems. They are not presented as available products. Our current services focus on analysis, development and integration within a defined engagement.']},
      ],
      faqs: [
        {q: 'How is an integrated AI agent different from a chatbot?', a: 'A chatbot exchanges messages. An integration may also consult authorized sources, prepare information or interact with software. Its actual capabilities depend on connections, permissions and the agreed scope.'},
        {q: 'Can AI act without approval?', a: 'That depends on the action and the agreed framework. A recommendation can remain a draft until approved. Sensitive operations need explicit permissions and controls defined before implementation.'},
        {q: 'Do we need to replace our CRM or ERP?', a: 'Not necessarily. We assess integration options for existing tools first. API access, subscriptions and data quality determine what is feasible.'},
        {q: 'How do we know whether an AI integration is useful?', a: 'Compare its results on representative cases against defined criteria: quality, review time, errors, usage cost and usefulness to the team. A pilot supports that decision before a broader rollout.'},
      ],
    },
  },
  {
    id: 'software', type: 'service', accent: 'clay', chapter: 'online', division: '02', related: ['workflow', 'ai', 'security', 'approach', 'faq'],
    fr: {
      path: '/services/developpement-logiciel', title: 'Des logiciels conçus\npour vos opérations.', metaTitle: 'Développement logiciel sur mesure à Montréal | Bump',
      description: 'Applications web, portails et systèmes internes pour les PME du Québec. Bump conçoit des logiciels sur mesure reliés à vos CRM, ERP et API.',
      eyebrow: '02 — AI Integration & Software Development', lead: 'Un système qui suit votre façon de travailler, plutôt que l’inverse.',
      answer: 'Le développement logiciel sur mesure crée une application autour des besoins d’une entreprise : gestion de demandes, portail, suivi de dossiers ou système interne. Bump analyse le fonctionnement attendu, conçoit l’interface avec les utilisateurs et développe les fonctionnalités ainsi que les intégrations nécessaires aux outils existants.',
      figure: ['Définir le besoin métier', 'Construire avec l’équipe', 'Relier et faire évoluer'],
      sections: [
        {id: 'choix', title: 'Acheter, intégrer ou développer ?', paragraphs: ['Un logiciel sur mesure n’est pas automatiquement la meilleure réponse. Un outil du marché peut convenir si ses fonctions couvrent vos besoins et si son fonctionnement reste acceptable. Une intégration peut suffire lorsque le problème se situe entre deux logiciels. Le sur mesure devient pertinent quand votre processus exige des fonctions que l’existant couvre mal.'], table: {headers: ['Option', 'À privilégier lorsque…'], rows: [['Outil du marché', 'Les besoins sont largement couverts par une solution existante'], ['Intégration', 'Les outils conviennent mais les données circulent mal'], ['Logiciel sur mesure', 'Le besoin métier justifie une interface ou une logique spécifique']]}},
        {id: 'applications', title: 'Rassembler le travail au bon endroit.', paragraphs: ['Une application métier peut rendre visibles les étapes, les responsables et les informations nécessaires à une décision. L’objectif est de réduire les contournements et les recopies, pas de multiplier les écrans.'], items: ['Applications web adaptées aux tâches quotidiennes.', 'Portails pour centraliser demandes et documents.', 'Systèmes internes de suivi et de coordination.', 'Tableaux de bord et rapports connectés aux données utiles.', 'Connexions CRM, ERP et API.']},
        {id: 'construction', title: 'Construire à partir d’un périmètre clair.', paragraphs: ['Nous transformons le besoin métier en fonctionnalités, parcours et critères de validation. Les personnes qui utiliseront le système participent à la conception. Les droits d’accès, les données à reprendre, les dépendances et la maintenance sont examinés dès cette étape.', 'L’implantation avance selon le périmètre retenu. Les essais doivent couvrir les cas courants et les exceptions : accès refusé, donnée manquante, service indisponible ou action à reprendre.']},
        {id: 'exemple', title: 'Une demande, un responsable, un état visible.', example: true, paragraphs: ['Une équipe suit ses demandes dans plusieurs tableurs. Un portail peut centraliser leur réception, attribuer un responsable et présenter les étapes dans un tableau Kanban. Une validation déclenche ensuite une mise à jour du CRM, avec un retour visible en cas d’erreur.', 'Ce scénario illustre une application possible. Le contenu des démonstrations du site est fictif et ne représente pas un logiciel déjà livré à un client.']},
        {id: 'suite', title: 'Prévoir la vie du logiciel après son lancement.', paragraphs: ['Un logiciel dépend d’un hébergement, de bibliothèques, d’accès et parfois d’autres services. La proposition doit préciser les livrables, la documentation, les conditions de maintenance et la répartition des responsabilités. Les modalités de remise du code, d’exploitation et de propriété sont définies dans le mandat.', 'Les évolutions se priorisent selon l’usage réel. Un premier périmètre cohérent permet d’évaluer le fonctionnement avant d’ajouter d’autres capacités.']},
      ],
      faqs: [
        {q: 'Quel type de logiciel Bump peut-elle développer ?', a: 'Nos services couvrent les applications web, les portails, les systèmes internes, les dashboards et les intégrations. La faisabilité et le périmètre sont confirmés après analyse de votre besoin.'},
        {q: 'Le logiciel peut-il se connecter à nos systèmes actuels ?', a: 'Oui, les intégrations CRM, ERP et API font partie de notre offre. Il faut examiner les fonctions disponibles, les permissions, les limites et les éventuels coûts des services concernés.'},
        {q: 'Combien de temps prend le développement ?', a: 'Le délai dépend du périmètre, des intégrations, des données à reprendre et des validations. Nous précisons un calendrier dans la proposition une fois ces éléments analysés ; le site ne présente pas de délai universel.'},
        {q: 'La maintenance est-elle incluse ?', a: 'La maintenance est une étape de notre modèle, mais son périmètre et ses modalités sont définis dans la proposition. Il faut distinguer la correction, les mises à jour, l’exploitation et les nouvelles fonctionnalités.'},
      ],
    },
    en: {
      path: '/en/services/custom-software-development', title: 'Software built\naround your operations.', metaTitle: 'Custom Software Development for SMEs in Montréal | Bump',
      description: 'Web applications, portals and internal systems for Québec SMEs. Bump builds custom software connected to your CRM, ERP and APIs.',
      eyebrow: '02 — AI Integration & Software Development', lead: 'A system that follows the way you work, rather than the other way around.',
      answer: 'Custom software development creates an application around business needs, such as request management, a portal, case tracking or an internal system. Bump analyses the required operation, designs the interface with users and develops the features and integrations needed to connect existing tools.',
      figure: ['Define the business need', 'Build with the team', 'Connect and evolve'],
      sections: [
        {id: 'choice', title: 'Buy, integrate or build?', paragraphs: ['Custom software is not automatically the best answer. An existing product may fit if its features cover your needs and its operation remains acceptable. An integration may be enough when the problem sits between two tools. Custom development becomes relevant when your process requires features poorly covered by existing solutions.'], table: {headers: ['Option', 'Consider it when…'], rows: [['Existing product', 'An available solution covers most needs'], ['Integration', 'The tools fit but information does not move well between them'], ['Custom software', 'The business need justifies a specific interface or logic']]}},
        {id: 'applications', title: 'Bring work together in the right place.', paragraphs: ['A business application can make stages, owners and decision-relevant information visible. The aim is to reduce workarounds and repeated entry, not multiply screens.'], items: ['Web applications designed for daily tasks.', 'Portals that centralize requests and documents.', 'Internal tracking and coordination systems.', 'Dashboards and reports connected to useful data.', 'CRM, ERP and API connections.']},
        {id: 'building', title: 'Build around a clear scope.', paragraphs: ['We translate the business need into features, journeys and acceptance criteria. The people who will use the system contribute to its design. Access controls, data migration, dependencies and maintenance are considered from the start.', 'Implementation follows the agreed scope. Testing should cover everyday cases and exceptions: denied access, missing data, an unavailable service or an action that needs recovery.']},
        {id: 'example', title: 'A request, an owner, a visible status.', example: true, paragraphs: ['A team tracks requests in several spreadsheets. A portal can centralize intake, assign an owner and display progress on a Kanban board. Approval then triggers a CRM update, with visible feedback if an error occurs.', 'This scenario illustrates a possible application. The site’s demonstrations use fictional data and do not represent software already delivered to a client.']},
        {id: 'next', title: 'Plan for life after launch.', paragraphs: ['Software depends on hosting, libraries, access and sometimes other services. The proposal should specify deliverables, documentation, maintenance conditions and responsibilities. Code handover, operation and ownership terms are defined in the engagement.', 'Future changes are prioritized around actual use. A coherent initial scope lets the team evaluate operation before adding capabilities.']},
      ],
      faqs: [
        {q: 'What kinds of software can Bump develop?', a: 'Our services include web applications, portals, internal systems, dashboards and integrations. Feasibility and scope are confirmed after analysing your needs.'},
        {q: 'Can the software connect to our existing systems?', a: 'Yes. CRM, ERP and API integrations are part of our offer. Available features, permissions, limitations and potential service costs need to be assessed.'},
        {q: 'How long does development take?', a: 'The timeline depends on scope, integrations, data migration and approvals. We specify a schedule in the proposal after assessing these factors; the site does not state a universal delivery time.'},
        {q: 'Is maintenance included?', a: 'Maintenance is a stage in our model, but its scope and terms are defined in the proposal. Corrections, updates, operations and new features need to be distinguished.'},
      ],
    },
  },
  {
    id: 'security', type: 'service', accent: 'wine', chapter: 'operations', division: '03', related: ['workflow', 'ai', 'software', 'approach', 'faq'],
    fr: {
      path: '/services/cybersecurite', title: 'La cybersécurité,\navec un cadre clair.', metaTitle: 'Audits de cybersécurité pour PME à Montréal, Québec | Bump',
      description: 'Audits autorisés, identification des vulnérabilités, remédiation et sécurisation des systèmes. Bump accompagne les PME de Montréal et du Québec.',
      eyebrow: '03 — Cybersecurity', lead: 'Comprendre les risques. Corriger les faiblesses. Renforcer ce qui compte.',
      answer: 'Un audit de cybersécurité examine un périmètre autorisé pour identifier des vulnérabilités et proposer des corrections prioritaires. Bump accompagne les PME dans le cadrage de l’audit, l’analyse des risques, la sécurisation des applications et infrastructures, la remédiation et le suivi convenu après intervention.',
      figure: ['Définir le périmètre', 'Prioriser les faiblesses', 'Corriger et vérifier'],
      sections: [
        {id: 'autorisation', title: 'Définir les règles avant d’examiner les systèmes.', paragraphs: ['Un audit commence par une autorisation et un périmètre explicites. Il faut préciser les systèmes concernés, les exclusions, les accès, les plages d’intervention et les personnes à joindre en cas d’incident. Les tests sont adaptés aux contraintes de l’entreprise.', 'Un audit ponctuel ne garantit pas l’absence de toute vulnérabilité. Il fournit une analyse d’un périmètre, selon des conditions et à un moment donnés. La qualité du suivi et des corrections compte autant que la découverte.']},
        {id: 'examiner', title: 'Comprendre ce qui expose votre entreprise.', paragraphs: ['Selon le mandat, l’examen peut porter sur les applications, les configurations, les accès ou l’infrastructure. Les constats doivent être compréhensibles et associés à un impact potentiel, afin d’aider l’équipe à décider quoi traiter en premier.'], items: ['Identifier les faiblesses dans le périmètre autorisé.', 'Distinguer les faits observés des risques supposés.', 'Décrire les conditions et l’impact possible.', 'Prioriser les actions selon le risque et le contexte métier.']},
        {id: 'remediation', title: 'Passer du constat à la correction.', table: {headers: ['Étape', 'Résultat attendu à définir'], rows: [['Audit autorisé', 'Périmètre, conditions et responsabilités établis'], ['Analyse des constats', 'Faiblesses expliquées et priorisées'], ['Plan de remédiation', 'Actions proposées, responsables et dépendances identifiés'], ['Sécurisation', 'Correctifs et protections implantés dans le cadre convenu'], ['Vérification et suivi', 'Corrections contrôlées et prochaines actions documentées']]}, paragraphs: ['La remédiation peut faire partie du mandat ou être planifiée séparément. Le suivi continu et ses modalités doivent être précisés ; ils ne se déduisent pas automatiquement d’un audit.']},
        {id: 'exemple', title: 'Une faiblesse corrigée, puis vérifiée.', example: true, paragraphs: ['Dans un scénario illustratif, un accès trop large à une application est identifié. L’équipe examine les rôles nécessaires, réduit les permissions et vérifie que les utilisateurs autorisés peuvent toujours accomplir leurs tâches. Le constat et la correction sont documentés.', 'Ce scénario explique une démarche possible. Les indicateurs et vulnérabilités des démonstrations du site sont fictifs et ne décrivent aucun système client.']},
        {id: 'continuite', title: 'Garder des protections adaptées aux changements.', paragraphs: ['Les outils, les comptes et les intégrations évoluent. La maintenance peut prévoir des vérifications, le suivi des correctifs et une réévaluation après des changements significatifs. Le niveau de service, les délais et les responsabilités sont définis dans la proposition.', 'La proposition précise les protections retenues, les vérifications prévues et la façon de réévaluer les risques. Vous pouvez ainsi distinguer ce qui a été traité de ce qui reste à planifier.']},
      ],
      faqs: [
        {q: 'Un audit est-il la même chose qu’un test d’intrusion ?', a: 'Non. Un audit peut couvrir plusieurs types d’examen, alors qu’un test d’intrusion évalue des scénarios précis dans un périmètre autorisé. La méthode exacte est définie selon les objectifs, les risques et les conditions du mandat.'},
        {q: 'L’audit peut-il affecter nos opérations ?', a: 'Certaines vérifications peuvent présenter un risque opérationnel. C’est pourquoi le périmètre, les méthodes, les exclusions et les conditions d’arrêt sont définis avant intervention. L’organisation des tests dépend de vos contraintes.'},
        {q: 'Recevons-nous aussi un plan de correction ?', a: 'La proposition précise les livrables. Notre démarche inclut la priorisation des constats et des actions de remédiation ; leur implantation et leur vérification doivent être cadrées explicitement.'},
        {q: 'Peut-on demander seulement la remédiation de problèmes connus ?', a: 'Oui, les problèmes déjà identifiés peuvent servir de point de départ. Il faut disposer d’informations suffisantes pour comprendre le contexte, confirmer l’autorisation et définir les corrections ainsi que leur validation.'},
      ],
    },
    en: {
      path: '/en/services/cybersecurity', title: 'Cybersecurity,\nwith a clear framework.', metaTitle: 'Cybersecurity Audits for SMEs in Montréal, Québec | Bump',
      description: 'Authorized audits, vulnerability identification, remediation and system hardening. Bump supports SMEs in Montréal and Québec.',
      eyebrow: '03 — Cybersecurity', lead: 'Understand risks. Address weaknesses. Strengthen what matters.',
      answer: 'A cybersecurity audit examines an authorized scope to identify vulnerabilities and propose prioritized corrections. Bump helps SMEs scope an audit, assess risks, secure applications and infrastructure, remediate issues and define follow-up after the engagement.',
      figure: ['Define the scope', 'Prioritize weaknesses', 'Correct and verify'],
      sections: [
        {id: 'authorization', title: 'Agree on the rules before examining systems.', paragraphs: ['An audit starts with explicit authorization and scope. Systems, exclusions, access, intervention windows and incident contacts need to be defined. Tests are adapted to the business’s constraints.', 'A point-in-time audit does not guarantee the absence of every vulnerability. It analyses a defined scope under specific conditions at a given time. Follow-up and corrections matter as much as discovery.']},
        {id: 'examine', title: 'Understand what exposes your business.', paragraphs: ['Depending on the engagement, the assessment may cover applications, configurations, access or infrastructure. Findings should be understandable and tied to potential impact so the team can decide what to address first.'], items: ['Identify weaknesses within the authorized scope.', 'Distinguish observed facts from assumed risks.', 'Describe conditions and potential impact.', 'Prioritize actions around risk and business context.']},
        {id: 'remediation', title: 'Move from findings to fixes.', table: {headers: ['Stage', 'Expected outcome to define'], rows: [['Authorized audit', 'Agreed scope, conditions and responsibilities'], ['Findings analysis', 'Explained and prioritized weaknesses'], ['Remediation plan', 'Proposed actions, owners and dependencies'], ['Hardening', 'Corrections and protections implemented within the agreed scope'], ['Verification and follow-up', 'Checked corrections and documented next actions']]}, paragraphs: ['Remediation can be included in the engagement or planned separately. Ongoing follow-up and its terms need to be specified; they are not automatically implied by an audit.']},
        {id: 'example', title: 'A weakness corrected, then checked.', example: true, paragraphs: ['In an illustrative scenario, excessively broad application access is identified. The team reviews the required roles, reduces permissions and verifies that authorized users can still complete their tasks. The finding and correction are documented.', 'This scenario explains a possible approach. Indicators and vulnerabilities in the site’s demonstrations are fictional and do not describe any client system.']},
        {id: 'continuity', title: 'Keep protection aligned with change.', paragraphs: ['Tools, accounts and integrations evolve. Maintenance may include checks, remediation tracking and reassessment after significant changes. Service levels, timelines and responsibilities are defined in the proposal.', 'The proposal specifies the selected protections, planned checks and approach to reassessing risks. This helps distinguish what has been addressed from what remains to be planned.']},
      ],
      faqs: [
        {q: 'Is an audit the same as a penetration test?', a: 'No. An audit may include different types of assessment, while a penetration test examines specific scenarios within an authorized scope. The exact method depends on objectives, risks and engagement conditions.'},
        {q: 'Could an audit affect our operations?', a: 'Some checks may introduce operational risk. Scope, methods, exclusions and stop conditions are therefore agreed before intervention. Test planning depends on your constraints.'},
        {q: 'Will we receive a remediation plan?', a: 'The proposal specifies deliverables. Our approach includes prioritizing findings and remediation actions; implementation and verification need to be explicitly scoped.'},
        {q: 'Can we request remediation of known issues only?', a: 'Yes. Previously identified issues can be the starting point. Sufficient information is needed to understand the context, confirm authorization and define corrections and validation.'},
      ],
    },
  },
  {
    id: 'approach', type: 'approach', accent: 'clay', chapter: 'retail', related: ['workflow', 'ai', 'software', 'security', 'faq'],
    fr: {
      path: '/approche', title: 'Comprendre avant\nde construire.', metaTitle: 'Notre approche : audit, implantation et maintenance | Bump',
      description: 'Découvrez les cinq étapes d’un mandat Bump : audit, analyse, proposition, implantation et maintenance. Une démarche technologique adaptée aux PME.',
      eyebrow: 'Notre méthode', lead: 'Un besoin réel. Un périmètre clair. Une implantation qu’on peut suivre.',
      answer: 'Un mandat Bump suit cinq étapes : audit, analyse, proposition, implantation et maintenance. La première sert à comprendre l’existant. L’analyse priorise les besoins. La proposition définit le périmètre et les livrables. L’implantation met la solution en place, puis la maintenance organise le suivi convenu.',
      figure: ['Audit & analyse', 'Proposition & implantation', 'Maintenance'],
      sections: [
        {id: 'audit', title: '01. Audit — voir le fonctionnement réel.', paragraphs: ['Nous examinons avec vous les processus, les outils et les contraintes liés au besoin. L’objectif est de comprendre où le travail bloque, quelles données circulent et quelles personnes participent. Pour un audit de sécurité, l’autorisation et les conditions d’intervention sont définies explicitement.'], items: ['Identifier les interlocuteurs et les utilisateurs concernés.', 'Délimiter les systèmes et les processus à examiner.', 'Rassembler les informations utiles sans transmettre de secrets dans un formulaire public.']},
        {id: 'analyse', title: '02. Analyse — choisir ce qui mérite de changer.', paragraphs: ['Nous rapprochons les constats des priorités de l’entreprise. Une tâche peut être supprimée, un outil mieux utilisé, une intégration ajoutée ou un logiciel développé. Les risques, les dépendances et les contraintes d’adoption sont pris en compte avant de choisir une solution.'], items: ['Séparer les symptômes de leurs causes.', 'Comparer les options possibles.', 'Définir les critères qui permettront de juger le changement.']},
        {id: 'proposition', title: '03. Proposition — savoir à quoi s’engager.', paragraphs: ['La proposition présente les travaux retenus, les livrables, les exclusions et les responsabilités. Elle précise les hypothèses nécessaires, les validations attendues et les modalités de maintenance. Le budget et le calendrier se définissent à partir de ce périmètre.'], items: ['Décrire ce qui sera livré et comment ce sera validé.', 'Préciser les dépendances et les accès nécessaires.', 'Distinguer l’implantation, le suivi et les évolutions futures.']},
        {id: 'implantation', title: '04. Implantation — construire, vérifier, transmettre.', paragraphs: ['La solution est développée ou intégrée selon le cadre convenu. Les essais incluent les parcours courants et les exceptions importantes. La documentation et l’accompagnement aident l’équipe à comprendre ce qui change et à exploiter le système.'], items: ['Valider le fonctionnement avec les utilisateurs concernés.', 'Contrôler les accès et les échanges entre outils.', 'Préparer la mise en service et les conditions de reprise.']},
        {id: 'maintenance', title: '05. Maintenance — faire durer le changement.', paragraphs: ['Le suivi dépend des systèmes et du contrat retenus. Il peut couvrir les corrections, les mises à jour, le contrôle des intégrations ou l’ajustement de certains paramètres. Les nouvelles fonctionnalités se cadrent séparément lorsque nécessaire.'], items: ['Définir qui surveille, qui intervient et dans quelles conditions.', 'Garder une documentation utile lorsque les outils évoluent.', 'Prioriser les améliorations à partir de l’usage réel.']},
      ],
      faqs: [
        {q: 'Que préparer pour une première discussion ?', a: 'Décrivez le processus ou le problème, les outils concernés, les personnes qui les utilisent et le changement souhaité. Une description concrète suffit pour commencer. Évitez d’envoyer des mots de passe ou des données confidentielles via le formulaire public.'},
        {q: 'Peut-on commencer par un petit périmètre ?', a: 'Oui. Un périmètre limité peut permettre de vérifier le fonctionnement et l’utilité avant d’élargir le projet. Il doit rester suffisamment cohérent pour être évalué et exploité.'},
        {q: 'Faut-il acheter une plateforme Bump ?', a: 'Non. Bump propose des services de consultation, de développement, d’intégration et de cybersécurité. Les systèmes propriétaires évoqués dans notre vision sont des ambitions futures, pas des produits disponibles à acheter.'},
      ],
    },
    en: {
      path: '/en/approach', title: 'Understand before\nyou build.', metaTitle: 'Our Approach: Audit, Implementation and Maintenance | Bump',
      description: 'Explore the five stages of a Bump engagement: audit, analysis, proposal, implementation and maintenance. Technology consulting designed for SMEs.',
      eyebrow: 'Our method', lead: 'A real need. A clear scope. An implementation you can follow.',
      answer: 'A Bump engagement follows five stages: audit, analysis, proposal, implementation and maintenance. The audit establishes the current situation. Analysis prioritizes needs. The proposal defines scope and deliverables. Implementation puts the solution in place, followed by the agreed maintenance.',
      figure: ['Audit & analysis', 'Proposal & implementation', 'Maintenance'],
      sections: [
        {id: 'audit', title: '01. Audit — understand how work happens.', paragraphs: ['With your team, we examine the processes, tools and constraints related to the need. The aim is to understand where work stalls, which data moves and who is involved. For a security audit, authorization and intervention conditions are explicitly defined.'], items: ['Identify stakeholders and affected users.', 'Define the systems and processes to examine.', 'Gather relevant information without submitting secrets through a public form.']},
        {id: 'analysis', title: '02. Analysis — choose what is worth changing.', paragraphs: ['We connect findings to business priorities. A task might be removed, a tool used better, an integration added or software developed. Risks, dependencies and adoption constraints are considered before choosing a solution.'], items: ['Separate symptoms from causes.', 'Compare the available options.', 'Define criteria for evaluating the change.']},
        {id: 'proposal', title: '03. Proposal — know what you are agreeing to.', paragraphs: ['The proposal describes the selected work, deliverables, exclusions and responsibilities. It specifies assumptions, required approvals and maintenance terms. Budget and schedule are established around that scope.'], items: ['Describe what will be delivered and how it will be accepted.', 'Specify dependencies and required access.', 'Distinguish implementation, follow-up and future changes.']},
        {id: 'implementation', title: '04. Implementation — build, verify, hand over.', paragraphs: ['The solution is developed or integrated within the agreed framework. Testing covers everyday journeys and important exceptions. Documentation and guidance help the team understand changes and operate the system.'], items: ['Validate operation with the affected users.', 'Check access controls and exchanges between tools.', 'Prepare the rollout and recovery conditions.']},
        {id: 'maintenance', title: '05. Maintenance — make the change last.', paragraphs: ['Follow-up depends on the selected systems and agreement. It may cover corrections, updates, integration checks or parameter adjustments. New capabilities are scoped separately when necessary.'], items: ['Define who monitors, who intervenes and under what conditions.', 'Keep documentation useful as tools evolve.', 'Prioritize improvements based on actual use.']},
      ],
      faqs: [
        {q: 'What should we prepare for a first conversation?', a: 'Describe the process or problem, the tools involved, the people using them and the desired change. A concrete description is enough to begin. Avoid submitting passwords or confidential information through a public form.'},
        {q: 'Can we start with a small scope?', a: 'Yes. A limited scope can help verify operation and usefulness before expanding a project. It should still be coherent enough to evaluate and operate.'},
        {q: 'Do we need to buy a Bump platform?', a: 'No. Bump offers consulting, development, integration and cybersecurity services. Proprietary systems discussed in our vision are future ambitions, not products currently available to buy.'},
      ],
    },
  },
  {
    id: 'about', type: 'about', accent: 'olive', chapter: 'b2b', related: ['expertise', 'workflow', 'ai', 'security', 'approach'],
    fr: {
      path: '/a-propos', title: 'Ancrés à Montréal.\nTournés vers la suite.', metaTitle: 'À propos de Bump — consultation technologique à Montréal',
      description: 'Fondée par deux entrepreneurs à Montréal, Bump accompagne les PME en optimisation des processus, intégration IA, développement logiciel et cybersécurité.',
      eyebrow: 'Bump, consultation technologique', lead: 'Donnons de l’élan à votre entreprise.',
      answer: 'Bump est une entreprise de consultation technologique fondée par deux entrepreneurs à Montréal, au Québec. Notre mission est d’aider les PME à devenir plus efficaces, intelligentes et sécurisées grâce à des solutions adaptées à leurs besoins. Nos trois divisions couvrent les processus, l’IA et les logiciels, ainsi que la cybersécurité.',
      figure: ['Montréal', 'PME du Québec', 'Une vision internationale'],
      sections: [
        {id: 'mission', title: 'La technologie doit servir le travail.', paragraphs: ['Un système utile aide une équipe à accomplir une tâche, à comprendre une situation ou à prendre une décision. C’est dans cette perspective que nous abordons l’automatisation, le développement logiciel et la sécurité : partir des opérations, puis choisir les moyens techniques.', 'Nous voulons relier ce qui fonctionne déjà et construire ce qui manque, avec un périmètre clair. Une nouvelle application ou un agent IA n’est pas une fin en soi. Son rôle doit pouvoir être expliqué aux personnes qui l’utilisent.']},
        {id: 'quebec', title: 'Un point de départ québécois.', paragraphs: ['Notre clientèle initiale est composée de PME du Québec. Montréal est notre point d’ancrage, avec une identité et une présentation bilingue qui peuvent accompagner une croissance internationale.', 'Les besoins varient d’une entreprise à l’autre. La discussion porte sur les processus, les outils, les contraintes et les objectifs propres au mandat, plutôt que sur une solution identique pour tous.']},
        {id: 'metiers', title: 'Trois expertises qui se répondent.', items: ['Workflow Optimization : analyser les processus, automatiser la répétition et connecter les outils.', 'AI Integration & Software Development : développer des applications et intégrer l’IA à des usages définis.', 'Cybersecurity : réaliser des audits autorisés, corriger les faiblesses et organiser le suivi.'], paragraphs: ['Notre modèle commercial suit les étapes audit, analyse, proposition, implantation et maintenance. Les livrables, les responsabilités et le suivi sont définis dans le cadre de chaque projet.']},
        {id: 'vision', title: 'Une vision à construire, pas une promesse déjà livrée.', paragraphs: ['À long terme, nous souhaitons développer nos propres systèmes et agents spécialisés, notamment Cyber AI, Developer AI et Workflow AI. Cette infrastructure représente notre vision future.', 'Ces systèmes ne sont pas présentés comme des produits disponibles. Le site distingue cette ambition de nos services actuels de consultation, de développement et d’intégration. Les animations servent à expliquer ces services à l’aide de scénarios fictifs.']},
      ],
      faqs: [
        {q: 'Où Bump est-elle basée ?', a: 'Bump a été fondée à Montréal, au Québec. Sa clientèle initiale est composée de PME québécoises.'},
        {q: 'Bump vend-elle une plateforme d’agents IA ?', a: 'Notre offre actuelle est une offre de services. Cyber AI, Developer AI et Workflow AI décrivent des systèmes que nous souhaitons développer à long terme ; ils ne sont pas proposés comme produits disponibles.'},
      ],
    },
    en: {
      path: '/en/about', title: 'Rooted in Montréal.\nLooking ahead.', metaTitle: 'About Bump — Technology Consulting in Montréal, Québec',
      description: 'Founded by two entrepreneurs in Montréal, Bump helps SMEs become more efficient, intelligent and secure through technology suited to their needs.',
      eyebrow: 'Bump, technology consulting', lead: 'Give your business fresh momentum.',
      answer: 'Bump is a technology consulting company founded by two entrepreneurs in Montréal, Québec. Our mission is to help SMEs become more efficient, intelligent and secure through solutions suited to their needs. Our three divisions cover workflows, AI and software, and cybersecurity.',
      figure: ['Montréal', 'Québec SMEs', 'An international outlook'],
      sections: [
        {id: 'mission', title: 'Technology should serve the work.', paragraphs: ['A useful system helps a team complete a task, understand a situation or make a decision. We approach automation, software development and security from that perspective: start with operations, then choose the technical means.', 'We want to connect what already works and build what is missing within a clear scope. A new application or AI agent is not an end in itself. Its role should be understandable to the people using it.']},
        {id: 'quebec', title: 'A Québec starting point.', paragraphs: ['Our initial clients are Québec SMEs. Montréal is our base, with a bilingual identity and presentation designed to support international growth.', 'Needs differ from one business to another. Each conversation focuses on the processes, tools, constraints and goals of the engagement rather than a solution applied identically to everyone.']},
        {id: 'expertise', title: 'Three complementary areas of expertise.', items: ['Workflow Optimization: analyse processes, automate repetition and connect tools.', 'AI Integration & Software Development: develop applications and integrate AI into defined use cases.', 'Cybersecurity: carry out authorized audits, address weaknesses and organize follow-up.'], paragraphs: ['Our business model follows audit, analysis, proposal, implementation and maintenance. Deliverables, responsibilities and follow-up are defined within each project.']},
        {id: 'vision', title: 'A vision to build, not a promise already delivered.', paragraphs: ['In the long term, we aim to develop our own specialized systems and agents, including Cyber AI, Developer AI and Workflow AI. This infrastructure represents our future vision.', 'These systems are not presented as available products. The site distinguishes that ambition from our current consulting, development and integration services. Animations explain those services using fictional scenarios.']},
      ],
      faqs: [
        {q: 'Where is Bump based?', a: 'Bump was founded in Montréal, Québec. Its initial clients are Québec small and medium-sized businesses.'},
        {q: 'Does Bump sell an AI agent platform?', a: 'Our current offer is service-based. Cyber AI, Developer AI and Workflow AI describe systems we aim to develop in the long term; they are not offered as available products.'},
      ],
    },
  },
  {
    id: 'faq', type: 'faq', accent: 'blue', related: ['workflow', 'ai', 'software', 'security', 'approach'],
    fr: {
      path: '/faq', title: 'Les bonnes questions,\navant de commencer.', metaTitle: 'FAQ : automatisation, IA, logiciels et cybersécurité | Bump',
      description: 'Des réponses sur l’automatisation, l’IA, les logiciels et la cybersécurité pour PME : choix, budget, validation humaine et déroulement d’un mandat.',
      eyebrow: 'Questions fréquentes', lead: 'Des repères pour savoir par où commencer et à quoi s’attendre.',
      answer: 'Une première discussion avec Bump part d’un besoin concret : un processus à simplifier, des outils à relier, un logiciel à construire ou un risque à examiner. L’analyse permet de choisir une réponse adaptée. Le périmètre, le budget, les livrables et la maintenance sont précisés dans la proposition.',
      figure: ['Votre besoin', 'Les options possibles', 'Une décision éclairée'],
      sections: [{id: 'reperes', title: 'Un mandat adapté, plutôt qu’un forfait universel.', paragraphs: ['Les réponses ci-dessous donnent un cadre général. Les conditions précises dépendent des systèmes, des accès, des données et des validations de votre entreprise. Les pages de services détaillent chaque domaine et leurs points de vigilance.']}],
      faqs: [
        {q: 'Quels services Bump propose-t-elle aux PME ?', a: 'Bump propose l’analyse et l’optimisation des processus, l’automatisation, l’intégration de logiciels et d’API, le développement sur mesure, l’intégration IA et la cybersécurité. Ces services sont organisés en trois divisions complémentaires.'},
        {q: 'Comment choisir entre automatisation et intégration IA ?', a: 'Une automatisation classique convient souvent à des règles explicites et répétitives. L’IA peut aider lorsque la tâche implique du texte, une recherche d’information ou une recommandation à évaluer. Les deux peuvent se combiner, avec des validations et des limites définies.'},
        {q: 'Quand un logiciel sur mesure est-il pertinent ?', a: 'Lorsque les outils existants couvrent mal une exigence importante de votre fonctionnement et qu’une simple intégration ne suffit pas. La décision compare les besoins, les coûts, les dépendances et la maintenance. Un produit du marché peut rester une meilleure option dans d’autres cas.'},
        {q: 'Devons-nous remplacer nos outils actuels ?', a: 'Pas nécessairement. Bump examine les possibilités de conserver et de relier les logiciels utiles. Les API, les connecteurs, les permissions et les conditions des fournisseurs déterminent les options possibles.'},
        {q: 'Comment se déroule un mandat ?', a: 'Le modèle est audit, analyse, proposition, implantation, puis maintenance. Ces étapes permettent de comprendre l’existant, prioriser les besoins, préciser les travaux et organiser la mise en place ainsi que le suivi.'},
        {q: 'Quel budget prévoir pour un projet ?', a: 'Le coût dépend du périmètre, des intégrations, de la complexité des données, des exceptions et du suivi attendu. Bump prépare une proposition adaptée. Le site ne publie pas de tarif universel ni de rendement garanti.'},
        {q: 'Quel délai faut-il prévoir ?', a: 'Le calendrier dépend du périmètre, de la disponibilité des accès, des décisions et des essais. Un délai pertinent se définit après analyse. Un périmètre initial limité peut aider à évaluer une solution avant son extension.'},
        {q: 'Que signifie un audit de cybersécurité autorisé ?', a: 'Les systèmes, les méthodes, les exclusions et les conditions d’intervention sont convenus avec une personne habilitée à autoriser l’examen. L’audit reste limité à ce cadre ; il ne constitue pas une permission générale de tester d’autres systèmes.'},
        {q: 'L’IA peut-elle utiliser des informations confidentielles ?', a: 'Tout usage de données nécessite de vérifier les droits d’accès, les conditions des fournisseurs et les contraintes de l’entreprise. Le cadrage détermine quelles sources et quelles actions sont autorisées. Ne transmettez pas de secrets via un formulaire public.'},
        {q: 'Une validation humaine peut-elle être conservée ?', a: 'Oui. Un workflow ou un agent peut préparer une action et attendre une approbation avant son exécution. Les rôles, le contexte présenté et le traitement des refus doivent être précisés.'},
        {q: 'Les agents Cyber AI, Developer AI et Workflow AI sont-ils disponibles ?', a: 'Non. Ils font partie de la vision future de Bump. Les services actuels sont la consultation, l’intégration, le développement et la cybersécurité selon un mandat défini.'},
        {q: 'Que préparer avant de discuter de notre projet ?', a: 'Une description du problème, les outils concernés, les personnes impliquées et le résultat souhaité. Il n’est pas nécessaire d’avoir choisi une technologie. Gardez les identifiants, les données confidentielles et les rapports sensibles hors d’un formulaire public.'},
      ],
    },
    en: {
      path: '/en/faq', title: 'Good questions,\nbefore you begin.', metaTitle: 'FAQ: Automation, AI, Software and Cybersecurity | Bump',
      description: 'How do you choose between automation, AI and custom software? What does an audit cover? Answers for SMEs considering a technology engagement with Bump.',
      eyebrow: 'Frequently asked questions', lead: 'A clearer starting point and a better idea of what to expect.',
      answer: 'A first conversation with Bump starts with a concrete need: a process to simplify, tools to connect, software to build or a risk to examine. Analysis helps select a suitable response. Scope, budget, deliverables and maintenance are specified in the proposal.',
      figure: ['Your need', 'Available options', 'An informed decision'],
      sections: [{id: 'context', title: 'A tailored engagement, rather than a universal package.', paragraphs: ['These answers provide a general framework. Specific terms depend on your systems, access, data and approvals. Our service pages describe each area and the points to consider.']}],
      faqs: [
        {q: 'What services does Bump offer SMEs?', a: 'Bump offers process analysis and optimization, automation, software and API integration, custom development, AI integration and cybersecurity. These services are organized into three complementary divisions.'},
        {q: 'How do we choose between automation and AI integration?', a: 'Conventional automation often suits explicit, repetitive rules. AI may help when a task involves text, information retrieval or a recommendation to assess. They can be combined with defined approvals and boundaries.'},
        {q: 'When does custom software make sense?', a: 'When existing tools poorly cover an important operational requirement and a simple integration is insufficient. The decision compares needs, costs, dependencies and maintenance. An existing product may be a better option in other cases.'},
        {q: 'Do we need to replace our current tools?', a: 'Not necessarily. Bump assesses ways to retain and connect useful software. APIs, connectors, permissions and provider conditions determine the available options.'},
        {q: 'How does an engagement work?', a: 'The model is audit, analysis, proposal, implementation and maintenance. These stages establish the current situation, prioritize needs, specify work and organize implementation and follow-up.'},
        {q: 'What budget should we plan for a project?', a: 'Cost depends on scope, integrations, data complexity, exceptions and expected follow-up. Bump prepares a tailored proposal. The site does not publish a universal price or guaranteed return.'},
        {q: 'What timeline should we expect?', a: 'The schedule depends on scope, access availability, decisions and testing. A meaningful timeline is established after analysis. A limited initial scope can help evaluate a solution before expansion.'},
        {q: 'What does an authorized cybersecurity audit mean?', a: 'Systems, methods, exclusions and intervention conditions are agreed with a person authorized to approve the assessment. The audit remains limited to that scope; it is not general permission to test other systems.'},
        {q: 'Can AI use confidential information?', a: 'Any use of data requires reviewing access rights, provider conditions and business constraints. Scoping determines which sources and actions are authorized. Do not submit secrets through a public form.'},
        {q: 'Can human approval be retained?', a: 'Yes. A workflow or agent can prepare an action and wait for approval before execution. Roles, presented context and the handling of rejection need to be specified.'},
        {q: 'Are Cyber AI, Developer AI and Workflow AI available?', a: 'No. They belong to Bump’s future vision. Current services cover consulting, integration, development and cybersecurity within a defined engagement.'},
        {q: 'What should we prepare before discussing a project?', a: 'A description of the problem, tools involved, people affected and desired outcome. You do not need to have selected a technology. Keep credentials, confidential data and sensitive reports out of a public form.'},
      ],
    },
  },
];

const plain = value => value.replace(/<\/?p>|<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim();
const home = {
  id: 'home', type: 'home', accent: 'olive', related: ['expertise', 'workflow', 'ai', 'software', 'security', 'approach', 'about', 'faq'],
  fr: {path: '/', title: 'Un nouvel élan technologique.', metaTitle: 'Bump — Consultation technologique pour PME à Montréal', description: 'Bump, consultation technologique à Montréal pour PME : automatisation, intégration IA, logiciels sur mesure et cybersécurité.', eyebrow: 'Bump', lead: content.brand.subtitle, sections: content.chapters.map(chapter => ({id: chapter.handle, title: chapter.title, paragraphs: [plain(chapter.descriptionHtml)]})), faqs: []},
  en: {path: '/en', title: 'A new technological momentum.', metaTitle: 'Bump — Technology Consulting for SMEs in Montréal, Québec', description: 'Bump, technology consulting in Montréal: process optimization, automation, AI integration, custom software and cybersecurity for SMEs.', eyebrow: 'Bump', lead: 'Smoother processes. Smarter systems. A better protected business.', sections: [
    {id: 'sidekick', title: 'Workflow', paragraphs: ['Get your processes and tools working in the same direction.']},
    {id: 'online', title: 'AI & Software', paragraphs: ['Software built around your reality. AI integrated where it is useful.']},
    {id: 'operations', title: 'Cybersecurity', paragraphs: ['Understand risks. Address weaknesses. Strengthen what matters.']},
    {id: 'retail', title: 'Our method', paragraphs: ['Audit, analysis, proposal, implementation and maintenance.']},
    {id: 'developer', title: 'Our vision', paragraphs: ['Specialized systems and AI agents are our future vision, not currently available products.']},
    {id: 'b2b', title: 'Bump', paragraphs: ['A technology consulting company founded by two entrepreneurs in Montréal, Québec.']},
  ], faqs: []},
};

export const catalog = [home, ...entries];
export const locales = ['fr', 'en'];
export function pageFor(id, locale = 'fr') {
  const entry = catalog.find(page => page.id === id);
  if (!entry) return null;
  const page = {...entry, ...entry[locale], locale,
    published: entry.type === 'home' ? undefined : site.editorialPublished,
    revisions: revisions[id]?.[locale] || []};
  const guide = buyerGuides[id]?.[locale];
  if (guide) {
    page.sections = [...page.sections,guide.section];
    page.faqs = [...page.faqs,guide.faq];
    page.references = guide.references || [];
  }
  if (id === 'workflow') page.sections = [...page.sections, locale === 'fr' ? {
    id:'charge-manuelle',title:'Combien de temps représente ce travail répétitif ?',calculator:true,
    paragraphs:['Avant de choisir quoi automatiser, chiffrez le travail actuel : nombre de tâches par semaine × durée moyenne d’une tâche. Bump utilise ce point de départ pour discuter du périmètre, des exceptions et des contrôles à conserver.', 'Exemple illustratif : 25 demandes par semaine à 12 minutes chacune représentent 300 minutes, soit 5 heures de travail manuel. Ajustez les deux hypothèses ci-dessous. Le gain éventuel dépendra ensuite de la solution, de sa vérification et de son adoption.'],
  } : {
    id:'manual-workload',title:'How much time does the repeated work represent?',calculator:true,
    paragraphs:['Before choosing what to automate, quantify the current work: tasks per week × average time per task. Bump uses this starting point to discuss scope, exceptions and controls to retain.', 'Illustrative example: 25 requests per week at 12 minutes each represent 300 minutes, or 5 hours of manual work. Adjust the two assumptions below. Any future improvement will depend on the solution, its validation and adoption.'],
  }];
  if (id === 'approach') page.sections = page.sections.map(section => section.id === (locale === 'fr' ? 'proposition' : 'proposal') ? {...section, table: locale === 'fr' ? {
    headers:['Étape','Élément à remettre ou à convenir','Décision attendue'],
    rows:[['Audit','Constats sur le processus ou les systèmes examinés.','Quel problème faut-il résoudre ?'],['Analyse','Options, contraintes et dépendances.','Quelle option mérite d’être retenue ?'],['Proposition','Périmètre, livrables, budget et validation.','Quels travaux sont approuvés ?'],['Implantation','Solution, essais et documentation convenus.','Les critères d’acceptation sont-ils satisfaits ?'],['Maintenance','Responsabilités et suivi à prévoir.','Comment traiter les corrections et évolutions ?']],
  } : {
    headers:['Stage','Deliverable or agreement','Decision to make'],
    rows:[['Audit','Findings on the process or systems examined.','What problem needs to be solved?'],['Analysis','Options, constraints and dependencies.','Which option should be selected?'],['Proposal','Scope, deliverables, budget and validation.','Which work is approved?'],['Implementation','Agreed solution, tests and documentation.','Have the acceptance criteria been met?'],['Maintenance','Responsibilities and ongoing support.','How will fixes and changes be handled?']],
  }} : section);
  if (id === 'about') {
    page.sections = [...page.sections, locale === 'fr' ? {
      id:'redaction',title:'Qui prépare les informations publiées ici ?',
      paragraphs:['Bump est responsable des contenus de cette vitrine. Les pages expliquent notre offre de consultation et notre méthode. Elles distinguent les services actuels, les exemples illustratifs et notre vision future de systèmes spécialisés.', 'Chaque guide précise les décisions à prendre, les contrôles humains à conserver et les limites du scénario. Les références externes sont reliées au sujet qu’elles éclairent ; elles ne représentent ni une certification ni un partenariat.', 'La date de publication correspond à la première mise en ligne des pages éditoriales, le 26 octobre 2026. La date de révision et les changements sont indiqués sur chaque page. Les exemples calculés décrivent leurs hypothèses et ne sont pas présentés comme des résultats clients.'],
    } : {
      id:'editorial-policy',title:'Who prepares the information published here?',
      paragraphs:['Bump is responsible for the content on this website. The pages explain our consulting services and approach. They distinguish current services, illustrative examples and our future vision for specialized systems.', 'Each guide identifies decisions to make, human controls to retain and the scenario’s limits. External references relate to the topic they explain; they do not represent a certification or partnership.', 'The publication date records the first release of the editorial pages on October 26, 2026. Each page shows its revision date and changes. Calculated examples disclose their assumptions and are not presented as client results.'],
    }];
    page.references = [{url:site.sourceUrl,title:locale === 'fr' ? 'Code public de la vitrine Bump' : 'Public source of the Bump website',description:locale === 'fr' ? 'Les sources publiques de cette vitrine, pour examiner ses interfaces et ses interactions. Les agents propriétaires restent une vision future.' : 'The public source of this website, so you can examine its interfaces and interactions. Proprietary agents remain a future vision.'}];
  }
  if (id === 'faq') page.sections = page.sections.map(section => ({...section, table:locale === 'fr' ? {
    headers:['Avant un premier échange','À préparer'],rows:[['Le besoin','Un exemple de tâche ou de difficulté à améliorer.'],['Les outils','Le nom des logiciels concernés et des connexions souhaitées.'],['Les personnes','Qui utilise le processus et qui approuve les décisions.'],['Le résultat attendu','Ce qui permettrait de juger l’amélioration.'],['Les informations sensibles','Gardez mots de passe, dossiers clients et rapports confidentiels hors d’un formulaire public.']],
  } : {
    headers:['Before a first conversation','What to prepare'],rows:[['The need','An example of a task or difficulty to improve.'],['The tools','The software involved and connections you need.'],['The people','Who uses the process and who approves decisions.'],['The desired outcome','What would make the improvement useful.'],['Sensitive information','Keep passwords, client records and confidential reports out of a public form.']],
  }}));
  if (id === 'home') {
    const summaries = {sidekick:['workflow'],online:['ai','software'],operations:['security'],retail:['approach'],b2b:['about']};
    page.answer = locale === 'fr' ? 'Bump est une entreprise de consultation technologique fondée par deux entrepreneurs à Montréal. Bump accompagne les PME du Québec en optimisation des processus, intégration IA, développement logiciel et cybersécurité. Un mandat suit cinq étapes : audit, analyse, proposition, implantation et maintenance.' : 'Bump is a technology consulting company founded by two entrepreneurs in Montréal. Bump helps Québec SMEs with process optimization, AI integration, custom software and cybersecurity. Engagements follow five steps: audit, analysis, proposal, implementation and maintenance.';
    page.sections = page.sections.map(section => ({...section,paragraphs:[...section.paragraphs,...(summaries[section.id] || []).map(key => entries.find(item => item.id === key)[locale].answer)],
      ...(section.id === 'sidekick' ? {table:locale === 'fr' ? {
        caption:'Exemples illustratifs de processus et de contrôles à définir selon le mandat.',headers:['Processus','Contrôle à conserver'],rows:[['Demande de devis','Valider les informations et la proposition avant l’envoi.'],['Traitement d’une facture','Vérifier le document et les exceptions avant la suite.'],['Demande de support','Transférer les cas qui nécessitent une décision humaine.']],
      } : {caption:'Illustrative processes and controls to define for each engagement.',headers:['Process','Control to retain'],rows:[['Quote request','Validate information and the proposal before sending.'],['Invoice processing','Check the document and exceptions before proceeding.'],['Support request','Hand over cases requiring a human decision.']]}} : {}),
      ...(section.id === 'retail' ? {ordered: true,items:locale === 'fr' ? ['Audit : comprendre le fonctionnement actuel et les difficultés.', 'Analyse : comparer les options et les contraintes.', 'Proposition : convenir du périmètre, du budget et des livrables.', 'Implantation : construire, tester et transmettre la solution.', 'Maintenance : organiser les corrections et le suivi.'] : ['Audit: understand current work and difficulties.', 'Analysis: compare options and constraints.', 'Proposal: agree on scope, budget and deliverables.', 'Implementation: build, test and hand over the solution.', 'Maintenance: organize fixes and ongoing support.']} : {}),
    }));
  }
  return page;
}
export function listPages() {
  return catalog.flatMap(entry => locales.map(locale => pageFor(entry.id, locale)));
}
export function pageAt(path) {
  return listPages().find(page => page.path === path) || null;
}
