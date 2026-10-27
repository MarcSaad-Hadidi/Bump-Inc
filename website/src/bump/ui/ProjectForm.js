import {ArrowUpRight,CloseIcon} from '/runtime/assets/BumpUI.js';
import {r as React,j as R} from '/runtime/assets/components-BdJai906.js';
import {useAnimatedDialog} from '/runtime/assets/BumpUI.js';
import {CONTACT_EMAIL,CONTACT_SITE_KEY,contactIsAvailable} from '../contact.js';
import {postContact} from './contactRequest.js';
import {loadTurnstile} from './turnstile.js';
const h=(tag,props,...children)=>R.jsxs(tag,{...props,...(children.length?{children:children.flat()}:{})});
export function Dialog({open,onClose,label,children,className=''}){
  const ref=React.useRef(null);
  useAnimatedDialog(ref,open);
  return h('dialog',{ref,className:'bump-dialog '+className,'aria-label':label,onCancel:e=>{e.preventDefault();onClose();},onClose,onKeyDown:e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onClose();}},onClick:e=>{if(e.target===ref.current)onClose();}},
    h('div',{className:'bump-dialog-inner'},h('button',{type:'button',className:'bump-close',onClick:onClose,'aria-label':'Fermer'},h(CloseIcon,{})),children));
}

export function Brief({open,onClose}){
  const [values,setValues]=React.useState({}),[status,setStatus]=React.useState('idle');
  const [token,setToken]=React.useState(''),[challengeError,setChallengeError]=React.useState(false);
  const host=React.useRef(null),widget=React.useRef(null),sending=React.useRef(false),active=React.useRef(true);
  const available=contactIsAvailable(window.location.origin);
  React.useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  React.useEffect(()=>{
    if(!open||!available)return;
    let current=true;setChallengeError(false);
    loadTurnstile().then(sdk=>{
      if(!current||!host.current)return;
      widget.current=sdk.render(host.current,{
        sitekey:CONTACT_SITE_KEY,action:'contact',theme:'light',
        language:document.documentElement.lang.startsWith('en')?'en':'fr',
        size:window.matchMedia('(max-width:600px)').matches?'compact':'normal',
        callback:value=>{if(current){setToken(value);setChallengeError(false);}},
        'expired-callback':()=>{if(current)setToken('');},
        'error-callback':()=>{if(current){setToken('');setChallengeError(true);}},
      });
    }).catch(()=>{if(current)setChallengeError(true);});
    return()=>{
      current=false;setToken('');
      if(widget.current!==null){window.turnstile?.remove(widget.current);widget.current=null;}
    };
  },[open,available]);
  const fields=[
    {name:'name',label:'Votre nom',type:'text',placeholder:'Prénom et nom',autoComplete:'name',required:true,maxLength:100},
    {name:'email',label:'Votre courriel',type:'email',placeholder:'vous@entreprise.com',autoComplete:'email',required:true,maxLength:254},
    {name:'company',label:'Votre entreprise',type:'text',placeholder:'Nom de votre entreprise',autoComplete:'organization',maxLength:120},
    {name:'expertise',label:'Votre projet',type:'select',required:true,options:[{id:'process',label:'Optimisation des processus'},{id:'software',label:'IA et développement logiciel'},{id:'security',label:'Cybersécurité'},{id:'advisory',label:'Je souhaite être conseillé'}]},
    {name:'message',label:'Comment pouvons-nous vous aider ?',type:'textarea',placeholder:'Votre besoin, vos enjeux, vos idées…',required:true,minLength:10,maxLength:3000},
  ];
  const mail=()=>h('a',{href:'mailto:'+CONTACT_EMAIL,className:'bump-contact-email'},CONTACT_EMAIL);
  const resetChallenge=()=>{setToken('');if(widget.current!==null)window.turnstile?.reset(widget.current);};
  async function submit(event){
    event.preventDefault();
    if(sending.current)return;
    if(!available){setStatus('unavailable');return;}
    if(!token){setStatus('verification');return;}
    sending.current=true;setStatus('sending');
    const website=new FormData(event.currentTarget).get('website')||'';
    try{
      await postContact(values,token,website);
      if(active.current){setStatus('sent');setValues({});}
    }catch(error){
      if(active.current)setStatus(error.code==='rate_limited'?'rate_limited':error.code==='unavailable'?'unavailable':'error');
    }finally{
      sending.current=false;
      if(active.current)resetChallenge();
    }
  }
  const notices={
    verification:'Veuillez terminer la vérification de sécurité.',
    rate_limited:'Veuillez patienter une minute avant de réessayer.',
    unavailable:'Le formulaire est momentanément indisponible. Écrivez-nous directement.',
    error:'L’envoi n’a pas pu être confirmé. Réessayez ou écrivez-nous.',
  };
  return h(Dialog,{open,onClose,label:'Parlons de votre projet',className:'bump-brief bump-contact'},
    h('div',{className:'bump-contact-layout'},
      h('div',{className:'bump-contact-copy'},
        h('p',{className:'bump-eyebrow'},'UN PREMIER ÉCHANGE'),
        h('h2',{},'Parlons de votre projet.'),
        h('p',{className:'bump-brief-intro'},'Ce qui vous ralentit aujourd’hui peut devenir votre prochain élan.'),
        mail(),
        h('p',{className:'bump-contact-location'},'Montréal, Québec',h('span',{},'Des solutions pensées avec votre équipe.'))),
      h('form',{'aria-label':'Votre projet','aria-busy':status==='sending',onSubmit:submit},
        ...fields.map(f=>h('div',{key:f.name,className:'bump-field'+(f.type==='textarea'?' bump-field-wide':'')},
          h('label',{htmlFor:'bump-contact-'+f.name},f.label,f.required?h('span',{'aria-hidden':true},' *'):null),
          h(f.type==='textarea'?'textarea':f.type==='select'?'select':'input',{
            id:'bump-contact-'+f.name,name:f.name,type:['text','email'].includes(f.type)?f.type:undefined,
            required:f.required,placeholder:f.placeholder,autoComplete:f.autoComplete,value:values[f.name]||'',
            disabled:status==='sending',minLength:f.minLength,maxLength:f.maxLength,
            onChange:event=>{if(!sending.current){setValues(old=>({...old,[f.name]:event.target.value}));setStatus('idle');}},rows:f.type==='textarea'?4:undefined,
          },...(f.options?[h('option',{value:''},'Choisir une expertise'),...f.options.map(option=>h('option',{value:option.id,key:option.id},option.label))]:[]))
        )),
        h('input',{name:'website',type:'text',tabIndex:-1,autoComplete:'off',className:'bump-contact-trap','aria-hidden':true}),
        available?h('div',{ref:host,className:'bump-contact-turnstile','aria-label':'Vérification de sécurité'}):null,
        !available?h('p',{className:'bump-contact-note'},'Pour envoyer votre demande, écrivez-nous directement : ',mail()):null,
        available&&challengeError?h('p',{className:'bump-contact-note',role:'alert'},'La vérification est indisponible. Vous pouvez nous écrire directement : ',mail()):null,
        h('div',{className:'bump-contact-bottom'},h('p',{},'* Champs obligatoires'),h('button',{type:'submit',className:'bump-action',disabled:status==='sending'||!available},status==='sending'?'Envoi…':'Envoyer ma demande',h(ArrowUpRight,{}))),
        status==='sent'?h('p',{className:'bump-form-status',role:'status'},'Votre demande a bien été envoyée. Merci !'):
          notices[status]?h('p',{className:'bump-form-status',role:'alert'},notices[status],['unavailable','error'].includes(status)?mail():null):null
      ))
  );
}
