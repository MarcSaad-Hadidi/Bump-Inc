import {FIGURE_HTML} from '../../components/bump-anatomy/calibration/art.generated.ts';
import {translateHtml} from '../locales/translate.js';

// The original laboratory remains a working vector illustration. Its static
// drawing and explanation are present in the initial HTML, even without JS.
export function calibrationMarkup(locale){
 const en=locale==='en';
 const figure=en?translateHtml(FIGURE_HTML):FIGURE_HTML;
 return '<section class="seo-calibration" aria-labelledby="calibration-title">'+
  '<div class="seo-calibration-model bump-method-import" data-calibration-model data-bump-transport="true" data-bump-local-keys="true">'+
  '<div class="bump-method-live bump-calibration-live" data-bump-fixed-timing="true" data-method-active="false">'+
  '<h3 id="calibration-title" class="bump-method-heading">'+(en?'Compare before choosing.':'Comparer avant de choisir.')+'</h3>'+
  '<p class="seo-calibration-intro">'+(en?'Measure the problem, compare the options, then verify the change. This laboratory illustrates that approach with settings A, B and C.':'Mesurer le problème, comparer les options, puis vérifier le changement. Ce laboratoire illustre cette démarche avec les réglages A, B et C.')+'</p>'+
  '<div class="bump-method-figure"><div class="iso bump" data-theme="light">'+figure+'</div></div>'+
  '<div class="bump-method-description" aria-live="off"><span data-method-number>01</span><div><h4 data-method-title>'+(en?'Audit — Understand your reality.':'Audit — Comprendre votre réalité.')+'</h4><p data-method-detail>'+(en?'We review your processes, tools and constraints to understand what slows you down and define priorities.':'Nous passons en revue vos processus, vos outils et vos contraintes pour comprendre ce qui vous ralentit et définir les priorités.')+'</p></div></div>'+
  '<span class="bump-method-reading" data-method-reading aria-live="off">'+(en?'vibration 3.2 mm/s · threshold 1.0':'vibration 3,2 mm/s · seuil 1,0')+'</span>'+
  '<p class="bump-method-fiction">'+(en?'Illustrative laboratory · fictional measurements.':'Laboratoire illustratif · mesures fictives.')+'</p></div></div></section>';
}
