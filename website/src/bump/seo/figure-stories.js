// Host-only editorial accompaniment, ordered by the supplied native stages.
export const figureStories = {
 workflow: [
  ['Chaque demande trouve sa place.', 'Le besoin et les coordonnées du client sont réunis dès réception, pour préparer la suite sans repartir de zéro.'],
  ['Une saisie. Un dossier prêt à avancer.', 'Les informations utiles deviennent une demande structurée. Votre équipe retrouve le même contexte à chaque étape.'],
  ['Le travail répétitif avance.', 'La fiche client se crée, le document se prépare et votre équipe reçoit les informations nécessaires pour le vérifier.'],
  ['Votre équipe garde la décision.', 'Le parcours attend une approbation humaine. Les informations sont vérifiées avant toute transmission.'],
  ['Votre accord déclenche la suite.', 'Après validation, la demande rejoint le bon destinataire et les informations suivent dans les outils concernés.'],
  ['Le dossier avance. Vos outils suivent.', 'Le traitement et les mises à jour restent reliés. Votre équipe voit ce qui a été fait et peut prendre le relais.'],
 ],
 ia: [
  ['Commencer par une tâche utile.', 'Ici, préparer la synthèse d’un dossier client. Le besoin est précis : retrouver l’essentiel pour faciliter le travail de votre équipe.'],
  ['Consulter les bonnes informations.', 'L’assistant rassemble les documents, le CRM et l’ERP autorisés. Les informations protégées restent hors de son accès.'],
  ['Comprendre d’où vient la réponse.', 'La synthèse relie chaque point à sa source. Votre équipe peut retrouver les éléments utilisés et vérifier la proposition.'],
  ['Votre équipe décide de la suite.', 'La synthèse reste une proposition à valider, modifier ou refuser. L’IA prépare le travail ; la décision reste humaine.'],
 ],
 logiciel: [
  ['Une demande reçue au bon endroit.', 'La demande entre dans un espace commun. Son contexte est conservé pour éviter les informations dispersées entre plusieurs outils.'],
  ['Une personne sait quoi faire.', 'Un responsable et une prochaine action sont associés au dossier. Chacun sait qui prend le relais.'],
  ['Le travail devient visible.', 'La demande avance dans le tableau. Votre équipe retrouve son statut sans multiplier les messages de suivi.'],
  ['Vos outils restent au courant.', 'Une fois la demande terminée, le CRM est mis à jour. Le logiciel sur mesure reste relié aux systèmes de votre entreprise.'],
 ],
 aiguillage: [
  ['Moins de tâches répétitives.', 'Un processus prend trop de temps ? Nous clarifions les étapes et relions les outils pour automatiser ce qui peut l’être.'],
  ['Retrouver l’information utile.', 'Les réponses sont dispersées ? Une intégration IA ciblée aide votre équipe à exploiter les sources auxquelles elle a accès.'],
  ['Un logiciel qui suit vos opérations.', 'Les outils existants atteignent leurs limites ? Nous cadrons l’application ou l’intégration qui répond au besoin réel.'],
  ['Mieux maîtriser vos accès.', 'Une question de sécurité ? Un audit autorisé permet d’examiner les risques et de prioriser les corrections.'],
 ],
 methode: [
  ['Audit — Partir de vos outils.', 'Courriels, ventes, facturation : nous dressons la carte de votre fonctionnement et des informations qui circulent.'],
  ['Analyse — Trouver ce qui bloque.', 'Nous repérons les liens manquants et les doubles saisies qui ralentissent vos opérations.'],
  ['Proposition — Choisir le bon raccord.', 'Vous validez une approche adaptée : connecter vos outils, remplacer une limite ou simplifier une étape.'],
  ['Implantation — Relier, puis vérifier.', 'Nous mettons la connexion en place et vérifions le parcours avec votre équipe avant la mise en service.'],
  ['Maintenance — Garder le cap.', 'Nous suivons le fonctionnement, corrigeons les ralentissements et ajustons la solution à vos besoins.'],
 ],
 'security-engine': [
  ['Voir clair dans votre sécurité.', 'Nous définissons avec vous ce qui doit être examiné et les accès autorisés, pour concentrer l’audit sur votre entreprise.'],
  ['Examiner ce qui compte.', 'Applications, infrastructures, données et accès : nous examinons les éléments dont dépendent vos activités, dans le périmètre convenu.'],
  ['Repérer les faiblesses.', 'Les configurations et les accès sont examinés pour identifier les points qui pourraient exposer votre entreprise.'],
  ['Vérifier avant de conclure.', 'Les constats sont vérifiés et documentés. Votre équipe distingue ce qui est confirmé de ce qui demande une analyse.'],
  ['Comprendre la portée du risque.', 'Nous rapprochons les constats pour comprendre comment un même problème peut affecter plusieurs outils ou données.'],
  ['Savoir ce qu’il faut corriger.', 'Dans cet exemple fictif, un compte possède trop de permissions. Le problème et son impact sont expliqués à votre équipe.'],
  ['Valider un plan d’action clair.', 'Les corrections sont priorisées et présentées à votre équipe. Leur mise en œuvre commence après approbation.'],
  ['Corriger. Puis vérifier.', 'Les accès et les configurations sont ajustés, puis les corrections sont vérifiées. Chaque action reste documentée.'],
  ['Faire durer les protections.', 'Le suivi aide à maintenir les mesures en place et à préparer les ajustements nécessaires quand votre entreprise évolue.'],
 ],
 port: [
  ['Proches de votre réalité.', 'Deux entrepreneurs à Montréal, un même point de départ : vos outils, votre équipe et vos contraintes.'],
  ['Ancrés à Montréal.', 'Nous accompagnons les PME du Québec avec des solutions adaptées à leur quotidien.'],
  ['De nouveaux horizons.', 'Des systèmes qui évoluent avec votre entreprise, du Québec vers de nouvelles ambitions.'],
  ['Partir de votre besoin.', 'Un processus à simplifier, un outil à développer ou une faiblesse à corriger : le mandat part de votre réalité.'],
  ['Parlons de votre projet.', 'Décrivez votre besoin, vos enjeux et le résultat attendu. Construisons la suite ensemble.'],
 ],
};

export function currentFigureStep(controls, total) {
 const current = controls.find(button => button.hasAttribute('data-current'));
 const index = Number(current?.getAttribute('data-step') ?? 0);
 return Number.isInteger(index) && index >= 0 && index < total ? index : 0;
}
