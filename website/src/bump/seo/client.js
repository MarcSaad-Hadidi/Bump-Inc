// Progressive enhancement only: all page content and links work without JS.
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
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
