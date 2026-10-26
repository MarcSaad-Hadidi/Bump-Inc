import {ArrowUpRight} from '/runtime/assets/BumpUI.js';
import {r as React,j as R} from '/runtime/assets/components-BdJai906.js';
import {useAnimatedDialog} from '/runtime/assets/BumpUI.js';
const h=(tag,props,...children)=>R.jsxs(tag,{...props,...(children.length?{children:children.flat()}:{})});
export function Dialog({open,onClose,label,children,className=''}){
  const ref=React.useRef(null);
  useAnimatedDialog(ref,open);
  return h('dialog',{ref,className:'bump-dialog '+className,'aria-label':label,onCancel:e=>{e.preventDefault();onClose();},onClose,onKeyDown:e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onClose();}},onClick:e=>{if(e.target===ref.current)onClose();}},
    h('div',{className:'bump-dialog-inner'},h('button',{type:'button',className:'bump-close',onClick:onClose,'aria-label':'Fermer'},'×'),children));
}


export function Brief({open,onClose}){
  const [values,setValues]=React.useState({}),[ready,setReady]=React.useState(false);
  const fields=[
    {name:'company',label:'Votre entreprise',type:'text',placeholder:'Nom de votre entreprise',autoComplete:'organization'},
    {name:'name',label:'Votre nom',type:'text',placeholder:'Prénom et nom',autoComplete:'name',required:true},
    {name:'email',label:'Votre courriel',type:'email',placeholder:'vous@entreprise.com',autoComplete:'email',required:true},
    {name:'expertise',label:'Votre projet',type:'select',required:true,options:['Optimisation des processus','IA et développement logiciel','Cybersécurité','Je souhaite être conseillé']},
    {name:'message',label:'Comment pouvons-nous vous aider ?',type:'textarea',placeholder:'Votre besoin, vos enjeux, vos idées…',required:true}
  ];
  return h(Dialog,{open,onClose,label:'Parlons de votre projet',className:'bump-brief bump-contact'},
    h('p',{className:'bump-eyebrow'},'DONNONS DE L’ÉLAN À VOS IDÉES'),
    h('h2',{},'Parlons de votre projet.'),
    h('p',{className:'bump-brief-intro'},'Parlez-nous de ce qui vous ralentit et de ce que vous souhaitez améliorer.'),
    h('form',{onSubmit:event=>{event.preventDefault();setReady(true);}},
      ...fields.map(f=>h('div',{key:f.name,className:'bump-field'+(f.type==='textarea'?' bump-field-wide':'')},
        h('label',{htmlFor:'bump-contact-'+f.name},f.label,f.required?h('span',{'aria-hidden':true},' *'):null),
        h(f.type==='textarea'?'textarea':f.type==='select'?'select':'input',{
          id:'bump-contact-'+f.name,name:f.name,type:['text','email'].includes(f.type)?f.type:undefined,
          required:f.required,placeholder:f.placeholder,autoComplete:f.autoComplete,value:values[f.name]||'',
          onChange:event=>{setValues({...values,[f.name]:event.target.value});setReady(false);},rows:f.type==='textarea'?4:undefined
        },...(f.options?[h('option',{value:''},'Choisir une expertise'),...f.options.map(option=>h('option',{value:option,key:option},option))]:[]))
      )),
      h('div',{className:'bump-contact-bottom'},h('p',{},'* Champs obligatoires'),h('button',{type:'submit',className:'bump-action'},'Envoyer ma demande',h(ArrowUpRight,{})))
    ),ready?h('p',{className:'bump-form-status',role:'status'},'Votre demande est prête.'):null
  );
}
