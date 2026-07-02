/* Site-wide motion: reveal-on-scroll + a gentle hero parallax. Pure enhancement — it no-ops under
 * prefers-reduced-motion and degrades gracefully (no JS → everything is already visible, since the
 * hiding .reveal class is only ever ADDED by this script). Dependency-free. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  // ---- 1. reveal on scroll -------------------------------------------------------------------------
  var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 }) : null;

  function reveal(n) {
    if (n.__rv) return; n.__rv = 1;
    n.classList.add('reveal');
    if (io) io.observe(n); else n.classList.add('is-in');
  }

  // section-level reveals (no stagger — each section reveals as you reach it).
  // NOTE: only ever reveal-animate elements that are VISIBLE on load. Do NOT include show/hide-toggled
  // elements (e.g. .switch-panel tab panels): a hidden panel never receives .is-in while it is scrolled
  // past, so its first reveal later collides with the tab's own animation and flashes (looked like a
  // quick page reload). The whole #compare section still reveals via 'main > section'.
  Array.prototype.forEach.call(document.querySelectorAll('main > section'), reveal);

  // granular GROUPS: items in a grid/row cascade in one after another (a per-parent stagger), so a
  // section does not just appear, its contents ripple into place. Delay is capped so long lists never drag.
  ['.feature-row', '.person', '.flist-item', '.recipe-card', '.specs li', '.steps li',
    '.testimonials blockquote, .quote'].forEach(function (sel) {
    Array.prototype.forEach.call(document.querySelectorAll(sel), function (n) {
      var p = n.parentElement || n; if (p.__rc == null) p.__rc = 0;
      n.style.setProperty('--rd', Math.min(p.__rc * 0.08, 0.5).toFixed(2) + 's');
      p.__rc++;
      n.classList.add('reveal-item');
      reveal(n);
    });
  });

  // ---- 2. hero parallax (palm photo drifts slower than the scroll) ----------------------------------
  var hero = document.querySelector('.hero-photo');
  if (hero) {
    var ticking = false;
    var apply = function () {
      var y = window.scrollY || window.pageYOffset || 0;
      if (y < window.innerHeight * 1.2) hero.style.backgroundPositionY = (y * 0.16).toFixed(1) + 'px';
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { window.requestAnimationFrame(apply); ticking = true; }
    }, { passive: true });
    apply();
  }
})();
