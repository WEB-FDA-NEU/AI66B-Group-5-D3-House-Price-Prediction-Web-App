// Gentle, once-per-section reveals. No content is hidden while waiting for JS.
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
function initMotion() {
  if (reduced.matches || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    observer.unobserve(entry.target);
    if (reduced.matches) return;
    entry.target.animate([{opacity:.35,transform:'translateY(18px)'},{opacity:1,transform:'translateY(0)'}],{duration:520,easing:'cubic-bezier(.22,.7,.2,1)'});
  }), {threshold:.08});
  document.querySelectorAll('.section-heading,.intelligence-grid,.premium-teaser-inner,.process-grid,.model-section,.source-grid,.plans-section,.closing-cta').forEach(node => observer.observe(node));
  reduced.addEventListener('change', () => { if (reduced.matches) { observer.disconnect(); document.getAnimations().forEach(animation => animation.cancel()); } });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',initMotion,{once:true}); else initMotion();
