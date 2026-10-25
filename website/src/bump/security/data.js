import {Code2,Server,Lock,Network,Users,Blocks} from 'lucide-react';
export const DOMAINS=[
 {id:'applications',title:'Applications',detail:'12 systèmes',count:12,icon:Code2,x:21,y:18},
 {id:'infrastructure',title:'Infrastructures',detail:'8 environnements',count:8,icon:Server,x:79,y:23},
 {id:'users',title:'Utilisateurs',detail:'147 comptes',count:147,icon:Users,x:16,y:51},
 {id:'network',title:'Réseaux',detail:'3 sites',count:3,icon:Network,x:88,y:57},
 {id:'access',title:'Données & accès',detail:'6 dépôts sensibles',count:6,icon:Lock,x:27,y:82},
 {id:'external',title:'Services externes',detail:'9 intégrations',count:9,icon:Blocks,x:76,y:85}
];
export const STAGES=[
 ['Initialisation','Le périmètre prend forme.'],['Domaines','Vos systèmes, réunis dans un même cadre.'],['Analyse en cours','Les informations circulent entre les domaines.'],['Résultats partiels','Chaque constat est vérifié et documenté.'],['Corrélation','Les liens entre les domaines précisent le risque.'],['Détection du risque','Un accès trop large demande votre attention.'],['Recommandation','Un plan clair, à valider avec votre équipe.'],['Correction en cours','Les actions sont suivies, puis revérifiées.'],['Protection renforcée','Le périmètre est maîtrisé. Le suivi continue.']
];
export const ORBIT_STARTS=[0,1800,3800,7300,10000,12500,15500,18500,23800];
export const ORBIT_TIMES=[...ORBIT_STARTS.slice(1),4700,5600,6400,7700,8100,8500,8900,9300,10800,11600,16200,16900,17600,19700,20900,22100,23300,25300,27000].sort((a,b)=>a-b);
export const ACTIONS=['Réduire les accès','Appliquer le correctif','Vérifier la configuration','Confirmer la résolution'];
export const FINDINGS=[
 {id:'B-024',title:'Accès à privilèges trop larges',detail:'12 comptes concernés',risk:'Élevée',tone:'red',domain:'Accès & identités',impact:'Des permissions dépassent le rôle de certains comptes.',action:'Restreindre les droits et renforcer l’authentification.'},
 {id:'B-025',title:'Version de logiciel non supportée',detail:'3 systèmes concernés',risk:'Élevée',tone:'orange',domain:'Serveur Web',impact:'La version utilisée ne reçoit plus de correctifs.',action:'Planifier une mise à jour, puis vérifier la compatibilité.'},
 {id:'B-026',title:'Données sensibles non chiffrées',detail:'2 applications concernées',risk:'Moyenne',tone:'gold',domain:'Application',impact:'Des informations sensibles demandent une protection supplémentaire.',action:'Chiffrer les échanges et vérifier les accès.'},
 {id:'B-027',title:'Configuration de pare-feu',detail:'1 élément concerné',risk:'Faible',tone:'green',domain:'Infrastructure',impact:'Une règle mérite d’être documentée et ajustée.',action:'Réviser la règle avec l’équipe responsable.'}
];
export const RISK_DATA=[{date:'Jan',risk:100},{date:'Fév',risk:83},{date:'Mar',risk:64},{date:'Avr',risk:52},{date:'Mai',risk:43},{date:'Juin',risk:38}];
