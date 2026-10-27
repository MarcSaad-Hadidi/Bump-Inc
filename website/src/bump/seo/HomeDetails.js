import {r as React,j as R} from '/runtime/assets/components-BdJai906.js';
import {homeQuestions,casePreviews,casePath} from './home-content.js';
const h=(tag,props,...children)=>R.jsxs(tag,{...props,...(children.length?{children:children.flat()}:{})});
const arrow=()=>h('svg',{viewBox:'0 0 24 24',width:20,height:20,fill:'none',stroke:'currentColor',strokeWidth:1.4,'aria-hidden':true},h('path',{d:'M5 19 19 5M5 5h14v14'}));

export default function HomeDetails(){
  const locale=document.documentElement.lang==='en'?'en':'fr',en=locale==='en';
  return h(React.Fragment,{},
    h('section',{className:'bump-home-details',id:'bump-home-examples','aria-labelledby':'bump-home-examples-title'},
      h('p',{className:'bump-home-eyebrow'},en?'ILLUSTRATIVE CASE STUDIES':'ÉTUDES DE CAS ILLUSTRATIVES'),
      h('h2',{id:'bump-home-examples-title'},en?'What could change in your day-to-day work?':'Qu’est-ce qui pourrait changer dans votre quotidien ?'),
      h('p',{className:'bump-home-lead'},en?'Four fictional scenarios, from the initial problem to checks to agree with your team. They are examples, not client results.':'Quatre scénarios fictifs, du problème de départ aux vérifications à convenir avec votre équipe. Des exemples, sans résultats clients revendiqués.'),
      h('div',{className:'bump-home-cases'},...casePreviews.map((item,index)=>h('a',{key:item.id,href:casePath(locale)+'#'+item.id},h('span',{className:'bump-home-case-number','aria-hidden':true},String(index+1).padStart(2,'0')),h('div',{},h('span',{className:'bump-home-eyebrow'},item[locale].label),h('h3',{},item[locale].title),h('p',{},item[locale].summary)),arrow()))),
      h('a',{className:'bump-home-text-link',href:casePath(locale)},en?'Explore the four scenarios':'Explorer les quatre scénarios',arrow())),
    h('section',{className:'bump-home-details bump-home-faq',id:'bump-home-questions','aria-labelledby':'bump-home-questions-title'},
      h('p',{className:'bump-home-eyebrow'},en?'A FEW ANSWERS BEFORE WE BEGIN':'QUELQUES RÉPONSES AVANT DE COMMENCER'),
      h('h2',{id:'bump-home-questions-title'},en?'How can we move forward together?':'Comment avancer ensemble ?'),
      h('div',{className:'bump-home-questions'},...homeQuestions[locale].map(faq=>h('details',{key:faq.q},h('summary',{},h('h3',{},faq.q),h('span',{'aria-hidden':true},'+')),h('p',{},faq.a)))),
      h('a',{className:'bump-home-text-link',href:en?'/en/faq':'/faq'},en?'All frequently asked questions':'Toutes les questions fréquentes',arrow())));
}
