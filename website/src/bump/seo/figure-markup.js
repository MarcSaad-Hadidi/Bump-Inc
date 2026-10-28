import {figureProps,seoFigures} from './figures.js';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Equivalent initial markup of the supplied LazyFigure. These static editorial
// pages have no React server runtime; the original component hydrates this
// poster in French. English gets the same accessible HTML, without hydration.
export function figureMarkup(id,locale) {
 const props=figureProps(id,locale);if(!props)return '';
 return '<div class="seo-anatomy" data-seo-figure="'+id+'" data-seo-model="'+seoFigures[id].model+'"'+(locale==='en'?' data-poster-only="true"':'')+' style="--seo-figure-width:'+props.width+';--seo-figure-height:'+props.height+';--seo-drawing-ratio:'+(seoFigures[id].drawingHeight/seoFigures[id].drawingWidth)+'">'+
  '<figure class="seo-lazy-figure" style="margin:0"><img src="'+props.poster+'" alt="'+escape(props.alt)+'" width="'+props.width+'" height="'+props.height+'" loading="lazy" decoding="async" style="width:100%;height:auto;aspect-ratio:'+props.width+' / '+props.height+';display:block"/><figcaption>'+escape(props.caption)+'</figcaption></figure></div>';
}
