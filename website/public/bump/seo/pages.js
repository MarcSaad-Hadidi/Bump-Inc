// Progressive enhancement only: all page content and links work without JS.
import {installDiagramMotion} from './diagram-motion.js';
import {installWorkloadCalculators} from './workload.js';
installWorkloadCalculators();
import {installBackgroundMusic} from '../background-music.js';
const musicTrack = document.querySelector('[data-bump-background-audio]');
const musicButton = document.querySelector('.bump-background-music');
if (musicTrack && musicButton) installBackgroundMusic(musicTrack, musicButton);
let stopDiagrams = installDiagramMotion();
window.addEventListener('pagehide', () => {stopDiagrams();});
// Restore the clock when a page is brought back from the browser's page cache.
window.addEventListener('pageshow', event => {if (event.persisted) stopDiagrams = installDiagramMotion();});

for (const menu of document.querySelectorAll('.seo-expertise-menu')) {
  const summary = menu.querySelector('summary');
  menu.addEventListener('keydown', event => {
    if (event.key === 'Escape') {menu.open = false; summary.focus();}
    if (event.key === 'ArrowDown' && event.target === summary) {
      event.preventDefault(); menu.open = true; menu.querySelector('a')?.focus();
    }
  });
  document.addEventListener('pointerdown', event => {if (!menu.contains(event.target)) menu.open = false;});
  menu.addEventListener('focusout', event => {if (!menu.contains(event.relatedTarget)) menu.open = false;});
}

const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
for (const link of document.querySelectorAll('.story-faq-questions a')) {
  link.addEventListener('click', () => {
    const question = document.getElementById(link.hash.slice(1));
    if (question?.matches('.seo-faq-item')) {question.hidden = false; question.open = true;}
  });
}
const search = document.querySelector('[data-faq-search]');
if (search) {
  const questions = [...document.querySelectorAll('.seo-faq-item')];
  search.addEventListener('input', () => {
    const query = normalize(search.value.trim()); let shown = 0;
    for (const question of questions) {
      question.hidden = !normalize(question.textContent).includes(query);
      if (!question.hidden) shown++;
    }
    document.querySelector('.seo-filter-empty').hidden = shown > 0;
  });
}
const links = [...document.querySelectorAll('.seo-toc nav a')];
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (!visible) return;
    for (const link of links) {
      if (link.hash === '#' + visible.target.id) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current');
    }
  }, {rootMargin: '-5% 0px -65% 0px'});
  for (const link of links) { const section = document.getElementById(link.hash.slice(1)); if (section) observer.observe(section); }
}
