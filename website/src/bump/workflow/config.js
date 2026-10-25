// Bump scenario using Render's WorkflowConfig / AnimationStep vocabulary.
const stages = [
  {id:'received',title:'Une demande arrive.',description:'Le formulaire transmet les informations à votre parcours.',activeNodes:['form'],activeEdges:[],complete:[],duration:1600},
  {id:'prepared',title:'Les informations sont préparées.',description:'La demande est organisée et les éléments à vérifier sont réunis.',activeNodes:['prepare'],activeEdges:['form-prepare'],complete:['form'],duration:2200},
  {id:'approval',title:'En attente de votre approbation.',description:'Le parcours s’arrête ici. Votre équipe valide avant que les outils prennent le relais.',activeNodes:['approval'],activeEdges:[],complete:['form','prepare'],duration:0},
  {id:'connected',title:'Vos outils prennent le relais.',description:'Après votre validation, le CRM est mis à jour et l’équipe est informée en parallèle.',activeNodes:['record','notify'],activeEdges:['approval-record','approval-notify'],complete:['form','prepare','approval'],duration:2400},
  {id:'complete',title:'La bonne information, au bon endroit.',description:'Le dossier est à jour. Votre équipe peut poursuivre le travail.',activeNodes:[],activeEdges:[],complete:['form','prepare','approval','record','notify'],duration:0}
];

export const workflows = [
  {id:'requests',name:'Demandes clients',document:'Demande #024',field:'Planifier un rendez-vous',nodes:[
    {id:'form',type:'trigger',label:'Formulaire',description:'Une demande reçue',icon:'form',detail:'Le besoin est recueilli dans votre formulaire habituel.',output:'Demande reçue'},
    {id:'prepare',type:'orchestrator',label:'Préparer',description:'Classer les informations',icon:'organize',detail:'Les informations sont regroupées dans le bon dossier et les éléments manquants sont repérés.',output:'Informations réunies'},
    {id:'approval',type:'task',label:'Votre équipe',description:'Vérifier et valider',icon:'person',detail:'Une personne vérifie les informations avant d’autoriser la suite du parcours.',output:'Demande validée'},
    {id:'record',type:'task',label:'Votre CRM',description:'Mettre le dossier à jour',icon:'database',detail:'La décision est enregistrée dans le CRM, sans nouvelle saisie manuelle.',output:'Dossier à jour'},
    {id:'notify',type:'task',label:'Votre équipe',description:'Informer la bonne personne',icon:'mail',detail:'Une notification transmet le contexte à la personne qui prend le relais.',output:'Équipe informée'}
  ],stages},
  {id:'documents',name:'Documents',document:'Document #018',field:'Pièce justificative',nodes:[
    {id:'form',type:'trigger',label:'Réception',description:'Un document reçu',icon:'document',detail:'Le document entre dans votre espace de réception habituel.',output:'Document reçu'},
    {id:'prepare',type:'orchestrator',label:'Classement',description:'Retrouver le bon dossier',icon:'organize',detail:'Le document est associé au dossier concerné et préparé pour la vérification.',output:'Document classé'},
    {id:'approval',type:'task',label:'Votre équipe',description:'Vérifier le document',icon:'person',detail:'Une personne contrôle le document avant son archivage.',output:'Document vérifié'},
    {id:'record',type:'task',label:'Vos dossiers',description:'Archiver la version vérifiée',icon:'database',detail:'La version vérifiée rejoint l’espace documentaire prévu.',output:'Version archivée'},
    {id:'notify',type:'task',label:'Notification',description:'Prévenir le responsable',icon:'mail',detail:'La personne responsable est informée que le document est disponible.',output:'Responsable informé'}
  ],stages:stages.map((s,i)=>({...s,...[
    {title:'Un document arrive.',description:'Le document rejoint votre espace de réception.'},
    {title:'Il retrouve son dossier.',description:'Les informations sont préparées pour la vérification.'},
    {title:'Une personne vérifie.',description:'Une personne vérifie le document avant son archivage.'},
    {title:'Le document devient accessible.',description:'La version vérifiée est archivée et le responsable est informé.'},
    {title:'Une version vérifiée et partagée.',description:'Le document et son contexte sont accessibles aux bonnes personnes.'}
  ][i]}))}
];

export const edges = [
  {id:'form-prepare',from:'form',to:'prepare'},
  {id:'prepare-approval',from:'prepare',to:'approval'},
  {id:'approval-record',from:'approval',to:'record'},
  {id:'approval-notify',from:'approval',to:'notify'}
];

export function layoutNodes(nodes,width,viewportHeight=900) {
  const compact=width<720;
  if(compact){
    const mainWidth=Math.min(230,width-36),branchWidth=Math.min(190,(width-20)/2);
    const short=viewportHeight<780;
    return {height:short?282:326,vertical:true,nodes:nodes.map((n,i)=>({...n,width:i<3?mainWidth:branchWidth,height:short?64:72,position:i<3?{x:(width-mainWidth)/2,y:6+i*(short?70:82)}:{x:i===3?0:width-branchWidth,y:short?216:252}}))};
  }
  const nodeWidth=Math.min(210,(width-150)/4),gap=(width-nodeWidth*4)/3;
  return {height:326,vertical:false,nodes:nodes.map((n,i)=>({...n,width:nodeWidth,height:112,position:{x:i<3?i*(nodeWidth+gap):3*(nodeWidth+gap),y:i<3?105:i===3?8:210}}))};
}
