/* ===========================================================================
   F1 Analytics Platform - shared client script
   Loaded on every page. Keep this lean: only cross-cutting UI behavior here.
   Page-specific logic lives in its own file (e.g. js/charts/exampleChart.js).
   =========================================================================== */
(function () {
  'use strict';

  // Auto-close the mobile navbar after a nav link is tapped.
  document.addEventListener('click', function (event) {
    const link = event.target.closest('.navbar-collapse .nav-link');
    if (!link) return;

    const collapse = document.querySelector('.navbar-collapse.show');
    if (collapse && window.bootstrap) {
      window.bootstrap.Collapse.getOrCreateInstance(collapse).hide();
    }
  });
})();
